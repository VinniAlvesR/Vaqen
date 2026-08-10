"use client"

import { useCallback, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

type NotificationItem = {
  id: string
  title: string
  message: string
  actionUrl?: string | null
  readAt?: string | null
}

const hiddenRoutes = ["/", "/terms", "/privacy", "/pricing", "/settings", "/help", "/about"]
const enabledKey = "vaqen:device-notifications"
const seenKey = "vaqen:device-notifications-seen"

export default function NotificationCenter() {
  const { isAuthenticated, loading } = useAuth()
  const pathname = usePathname()
  const shouldHide = loading || !isAuthenticated || pathname.startsWith("/auth") || hiddenRoutes.includes(pathname)

  const fetchNotifications = useCallback(async () => {
    if (shouldHide || typeof window === "undefined" || !("Notification" in window)) return
    if (window.localStorage.getItem(enabledKey) !== "true" || Notification.permission !== "granted") return

    try {
      const response = await fetch("/api/notifications?unread=true", { cache: "no-store" })
      if (!response.ok) return
      const data = await response.json()
      const items: NotificationItem[] = Array.isArray(data.items) ? data.items : []
      const seen = readSeenIds()

      for (const item of items) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        const notification = new Notification(item.title, { body: item.message, tag: item.id, icon: "/vaqen-icon.svg" })
        notification.onclick = () => {
          window.focus()
          if (item.actionUrl) window.location.assign(item.actionUrl)
        }
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, action: "mark_read" }),
        }).catch(() => null)
      }

      writeSeenIds(seen)
    } catch {
      // Notificações não devem bloquear a interface principal.
    }
  }, [shouldHide])

  useEffect(() => {
    fetchNotifications()
    const interval = window.setInterval(fetchNotifications, 60_000)
    const refresh = () => fetchNotifications()
    window.addEventListener("vaqen:data-changed", refresh)
    window.addEventListener("vaqen:notification-settings-changed", refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("vaqen:data-changed", refresh)
      window.removeEventListener("vaqen:notification-settings-changed", refresh)
    }
  }, [fetchNotifications])

  return null
}

function readSeenIds() {
  try {
    const value = window.localStorage.getItem(seenKey)
    const parsed = value ? JSON.parse(value) : []
    return new Set<string>(Array.isArray(parsed) ? parsed.slice(-100) : [])
  } catch {
    return new Set<string>()
  }
}

function writeSeenIds(ids: Set<string>) {
  window.localStorage.setItem(seenKey, JSON.stringify(Array.from(ids).slice(-100)))
}