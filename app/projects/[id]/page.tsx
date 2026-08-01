"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Task } from "@/types/task"
import { addRecentItem } from "@/lib/recent-items"

interface Activity {
  id: string
  action: string
  detail: string | null
  createdAt: string
}

interface Project {
  id: string
  clientId: string
  name: string
  description?: string
  status: string
  priority?: string
  startDate?: string
  dueDate?: string
  clientName?: string
  completedAt?: string | null
  archivedAt?: string | null
  createdAt: string
  tasks: Task[]
  completedTasks?: number
  totalTasks?: number
  openTasks?: number
  activities: Activity[]
}

export default function ProjectDetailPage() {
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function updateLifecycle(action: "complete" | "archive") {
    if (!project) return
    try {
      const response = await fetch(`/api/projects/${project.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "complete" ? { completed: !project.completedAt } : { archived: !project.archivedAt }),
      })
      if (!response.ok) throw new Error("Nao foi possivel alterar o projeto")
      const result = await response.json()
      setProject({
        ...project,
        completedAt: action === "complete" ? result.completedAt : project.completedAt,
        archivedAt: action === "archive" ? result.archivedAt : null,
        status: result.status ?? (action === "complete" ? (result.completedAt ? "Concluido" : "Planejamento") : project.status),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${params.id}`)
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error ?? "Nao foi possivel carregar o projeto")
        }
        const data = await res.json()
        setProject(data)
        addRecentItem({ id: data.id, type: "project", name: data.name, href: `/projects/${data.id}` })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar projeto")
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-700 dark:text-slate-300 mb-6">{error || "Projeto nao encontrado"}</p>
          <Link href="/projects" className="text-indigo-600 hover:text-indigo-700 underline">
            Voltar para projetos
          </Link>
        </div>
      </div>
    )
  }

  const taskCount = project.tasks?.length || 0
  const completedTaskCount = project.completedTasks || 0
  const progressPercentage = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/projects" className="text-indigo-600 hover:text-indigo-700 underline text-sm mb-4 inline-block">
            Voltar para projetos
          </Link>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 mb-6 sm:flex-row sm:items-start">
              <div>
                <h1 className="text-3xl font-bold sm:text-4xl text-gray-900 dark:text-white mb-2">{project.name}</h1>
                {project.completedAt && (
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Concluido
                  </span>
                )}
                {project.archivedAt && <span className="ml-2 inline-block rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">Arquivado</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/projects?edit=${project.id}`} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">Editar</Link>
                <a href="#project-tasks" className="rounded-lg border border-indigo-200 px-4 py-2 font-semibold text-indigo-700 hover:bg-indigo-50">Ver tarefas</a>
                {!project.archivedAt && <button onClick={() => updateLifecycle("complete")} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">{project.completedAt ? "Reabrir" : "Concluir projeto"}</button>}
                <button onClick={() => updateLifecycle("archive")} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-900">{project.archivedAt ? "Desarquivar" : "Arquivar projeto"}</button>
              </div>
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2 sm:gap-6">
              {project.clientName && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Cliente</p>
                  <Link href={`/clients/${project.clientId}`} className="font-semibold text-indigo-700 hover:underline">{project.clientName}</Link>
                </div>
              )}
              <div>
                <p className="text-gray-600 dark:text-slate-300 font-medium">Status</p>
                <p className="text-gray-900 dark:text-white">{project.status}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-slate-300 font-medium">Prioridade</p>
                <p className="text-gray-900 dark:text-white">{project.priority || "Media"}</p>
              </div>
              {project.startDate && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Data de Inicio</p>
                  <p className="text-gray-900 dark:text-white">{new Date(project.startDate).toLocaleDateString("pt-BR")}</p>
                </div>
              )}
              {project.dueDate && (
                <div>
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Data de Termino</p>
                  <p className="text-gray-900 dark:text-white">{new Date(`${project.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</p>
                </div>
              )}
              {project.description && (
                <div className="col-span-2">
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Descricao</p>
                  <p className="text-gray-900 dark:text-white">{project.description}</p>
                </div>
              )}
              {project.completedAt && (
                <div><p className="text-gray-600 dark:text-slate-300 font-medium">Concluido em</p><p className="text-gray-900 dark:text-white">{new Date(project.completedAt).toLocaleDateString("pt-BR")}</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 mb-8 sm:grid-cols-3 sm:gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Tarefas</p>
            <p className="text-3xl font-bold sm:text-4xl text-indigo-600 mt-2">{taskCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Concluidas</p>
            <p className="text-3xl font-bold sm:text-4xl text-green-600 mt-2">{completedTaskCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Abertas</p>
            <p className="text-3xl font-bold sm:text-4xl text-amber-600 mt-2">{project.openTasks ?? taskCount - completedTaskCount}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {taskCount > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 mb-8">
            <div className="mb-3 flex items-center justify-between"><p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Andamento do projeto</p><strong className="text-blue-700">{progressPercentage}% concluido</strong></div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {taskCount > 0 && (
          <div id="project-tasks" className="scroll-mt-24 bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tarefas ({taskCount})</h2>
            <div className="space-y-4">
              {project.tasks?.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block p-4 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-indigo-600 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{task.description}</p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Status: {task.completedAt ? "Concluida" : task.status} - Prioridade: {task.priority || "Media"} - Prazo: {task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR") : "Nao informado"}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${
                        task.completedAt
                          ? "bg-green-100 text-green-800"
                          : task.priority === "Alta"
                          ? "bg-red-100 text-red-800"
                          : task.priority === "Media"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {task.completedAt ? "Concluida" : task.priority}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {taskCount === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 text-center sm:p-8">
            <p className="text-gray-600 dark:text-slate-300">Nenhuma tarefa neste projeto ainda</p>
          </div>
        )}

        <div className="mt-8 bg-white dark:bg-slate-900 rounded-lg shadow-lg p-5 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Historico do projeto</h2>
          <div className="space-y-3">
            {project.activities.length ? project.activities.map((activity) => (
              <div key={activity.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:flex-row sm:justify-between">
                <div><strong className="capitalize">{activity.action}</strong>{activity.detail && <p className="text-sm text-slate-600 dark:text-slate-300">{activity.detail}</p>}</div>
                <time className="text-xs text-slate-500 dark:text-slate-400">{new Date(activity.createdAt).toLocaleString("pt-BR")}</time>
              </div>
            )) : <p className="text-slate-500 dark:text-slate-400">Nenhuma atividade registrada para este projeto.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
