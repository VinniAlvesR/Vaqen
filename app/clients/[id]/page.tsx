"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Project } from "@/types/project"
import { Task } from "@/types/task"
import { addRecentItem } from "@/lib/recent-items"

interface Activity {
  id: string
  action: string
  detail: string | null
  createdAt: string
}

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  company?: string
  createdAt: string
  archivedAt?: string | null
  projects: Project[]
  tasks: Task[]
  activities: Activity[]
  summary: { activeProjects: number; completedProjects: number; openTasks: number }
}

export default function ClientDetailPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function toggleArchive() {
    if (!client) return
    try {
      const response = await fetch(`/api/clients/${client.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !client.archivedAt }),
      })
      if (!response.ok) throw new Error("Não foi possível alterar o cliente")
      const result = await response.json()
      setClient({ ...client, archivedAt: result.archivedAt })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${params.id}`)
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error ?? "Não foi possível carregar o cliente")
        }
        const data = await res.json()
        setClient(data)
        addRecentItem({ id: data.id, type: "client", name: data.name, href: `/clients/${data.id}` })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar cliente")
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-700 dark:text-slate-300 mb-6">{error || "Cliente nao encontrado"}</p>
          <Link href="/clients" className="text-indigo-600 hover:text-indigo-700 underline">
            Voltar para clientes
          </Link>
        </div>
      </div>
    )
  }

  const projectCount = client.projects?.length || 0
  const taskCount = client.tasks?.length || 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/clients" className="text-indigo-600 hover:text-indigo-700 underline text-sm mb-4 inline-block">
            Voltar para clientes
          </Link>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 mb-6 sm:flex-row sm:items-start">
              <div>
                <h1 className="text-3xl font-bold sm:text-4xl text-gray-900 dark:text-white mb-2">{client.name}</h1>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${client.archivedAt ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {client.archivedAt ? "Arquivado" : "Ativo"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/clients?edit=${client.id}`} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">Editar</Link>
                <a href="#client-projects" className="rounded-lg border border-indigo-200 px-4 py-2 font-semibold text-indigo-700 hover:bg-indigo-50">Ver projetos</a>
                <a href={`/api/reports?type=client&id=${client.id}&format=pdf`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">PDF</a>
                <a href={`/api/reports?type=client&id=${client.id}&format=csv`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">CSV</a>
                <a href={`/api/reports?type=client&id=${client.id}&format=pdf`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">PDF</a>
                <a href={`/api/reports?type=client&id=${client.id}&format=csv`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">CSV</a>
                <button onClick={toggleArchive} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-900">
                  {client.archivedAt ? "Reativar cliente" : "Arquivar cliente"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2 sm:gap-6">
              {client.email && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Email</p>
                  <p className="text-gray-900 dark:text-white">{client.email}</p>
                </div>
              )}
              {client.phone && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Telefone</p>
                  <p className="text-gray-900 dark:text-white">{client.phone}</p>
                </div>
              )}
              {client.company && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Empresa</p>
                  <p className="text-gray-900 dark:text-white">{client.company}</p>
                </div>
              )}
              {client.address && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Endereço</p>
                  <p className="text-gray-900 dark:text-white">{client.address}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600 dark:text-slate-300 font-medium">Criado em</p>
                <p className="text-gray-900 dark:text-white">{new Date(client.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-6 mb-8 sm:grid-cols-3">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Projetos ativos</p>
            <p className="text-3xl font-bold sm:text-4xl text-indigo-600 mt-2">{client.summary.activeProjects}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Projetos concluídos</p>
            <p className="text-3xl font-bold sm:text-4xl text-emerald-600 mt-2">{client.summary.completedProjects}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Tarefas abertas</p>
            <p className="text-3xl font-bold sm:text-4xl text-amber-600 mt-2">{client.summary.openTasks}</p>
          </div>
        </div>

        {/* Projects Section */}
        {projectCount > 0 && (
          <div id="client-projects" className="scroll-mt-24 bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Projetos ({projectCount})</h2>
            <div className="space-y-4">
              {client.projects?.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-indigo-600 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{project.description}</p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Prazo: {project.dueDate ? new Date(`${project.dueDate}T00:00:00`).toLocaleDateString("pt-BR") : "Não informado"} - Prioridade: {project.priority || "Média"}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.completedAt
                          ? "bg-green-100 text-green-800"
                          : project.status === "Em andamento"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {project.completedAt ? "Concluído" : project.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {taskCount > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tarefas ({taskCount})</h2>
            <div className="space-y-4">
              {client.tasks?.slice(0, 10).map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block p-4 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-indigo-600 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{task.description}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${
                        task.completedAt
                          ? "bg-green-100 text-green-800"
                          : task.status === "Em andamento"
                          ? "bg-blue-100 text-blue-800"
                          : task.status === "Bloqueada"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {task.completedAt ? "Concluída" : task.status}
                    </span>
                  </div>
                </Link>
              ))}
              {taskCount > 10 && (
                <p className="text-sm text-gray-600 dark:text-slate-300 text-center py-4">
                  E mais {taskCount - 10} tarefas...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Atividades recentes</h2>
          <div className="space-y-3">
            {client.activities.length ? client.activities.map((activity) => (
              <div key={activity.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:flex-row sm:justify-between">
                <div><strong className="capitalize">{activity.action}</strong>{activity.detail && <p className="text-sm text-slate-600 dark:text-slate-300">{activity.detail}</p>}</div>
                <time className="text-xs text-slate-500 dark:text-slate-400">{new Date(activity.createdAt).toLocaleString("pt-BR")}</time>
              </div>
            )) : <p className="text-slate-500 dark:text-slate-400">Nenhuma atividade registrada para este cliente.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
