export type RecentItem = {
  id: string
  type: "client" | "project" | "task"
  name: string
  href: string
  accessedAt: string
}

const storageKey = "vaqen:recent-items"

export function addRecentItem(item: Omit<RecentItem, "accessedAt">) {
  if (typeof window === "undefined") return
  const current = getRecentItems().filter((recent) => !(recent.type === item.type && recent.id === item.id))
  const next = [{ ...item, accessedAt: new Date().toISOString() }, ...current].slice(0, 8)
  window.localStorage.setItem(storageKey, JSON.stringify(next))
  window.dispatchEvent(new Event("vaqen:recent-items"))
}

export function getRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return []
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}
export function setRecentItems(items: RecentItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey, JSON.stringify(items.slice(0, 8)))
}
