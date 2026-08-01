"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getRecentItems, RecentItem, setRecentItems } from "@/lib/recent-items"
import { Client } from "@/types/client"
import { Project } from "@/types/project"
import { Task } from "@/types/task"

const labels = { client: "Cliente", project: "Projeto", task: "Tarefa" }

export default function RecentItems() {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    let active = true

    async function refresh() {
      const recentItems = getRecentItems()
      if (!recentItems.length) {
        if (active) setItems([])
        return
      }

      try {
        const [clientsResponse, projectsResponse, tasksResponse] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/projects"),
          fetch("/api/tasks"),
        ])

        const [clients, projects, tasks] = await Promise.all([
          clientsResponse.ok ? clientsResponse.json() as Promise<Client[]> : Promise.resolve([]),
          projectsResponse.ok ? projectsResponse.json() as Promise<Project[]> : Promise.resolve([]),
          tasksResponse.ok ? tasksResponse.json() as Promise<Task[]> : Promise.resolve([]),
        ])

        const activeClientIds = new Set(clients.filter((client) => !client.archivedAt).map((client) => client.id))
        const activeProjectIds = new Set(projects.filter((project) => !project.completedAt && !project.archivedAt).map((project) => project.id))
        const activeTaskIds = new Set(tasks.filter((task) => !task.completedAt).map((task) => task.id))

        const visibleItems = recentItems.filter((item) => {
          if (item.type === "client") return activeClientIds.has(item.id)
          if (item.type === "project") return activeProjectIds.has(item.id)
          return activeTaskIds.has(item.id)
        })

        setRecentItems(visibleItems)
        if (active) setItems(visibleItems)
      } catch {
        if (active) setItems(recentItems)
      }
    }

    refresh()
    window.addEventListener("vaqen:recent-items", refresh)

    return () => {
      active = false
      window.removeEventListener("vaqen:recent-items", refresh)
    }
  }, [])

  if (!items.length) return null

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Retomar trabalho</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Últimos acessados</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-300">Até 8 itens</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.href}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/40"
          >
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{labels[item.type]}</span>
            <p className="mt-1 truncate font-semibold text-slate-900 dark:text-white">{item.name}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}