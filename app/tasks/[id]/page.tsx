"use client"

import { useConfirm } from "@/components/ConfirmDialog"
import Link from "next/link"
import { useParams } from "next/navigation"
import { FormEvent, useCallback, useEffect, useState } from "react"
import { addRecentItem } from "@/lib/recent-items"

type Activity = { id: string; action: string; detail: string | null; createdAt: string }
type ChecklistItem = { id: string; text: string; completed: boolean; position: number }
type Subtask = { id: string; title: string; status: string; completedAt: string | null }
type Comment = { id: string; content: string; userId: string; userName: string; createdAt: string }

type Task = {
  id: string
  title: string
  projectId?: string | null
  description?: string
  status: string
  priority: string
  dueDate?: string
  clientName?: string
  projectName?: string
  completedAt?: string | null
  createdAt: string
  activities: Activity[]
  checklist: ChecklistItem[]
  subtasks: Subtask[]
  comments: Comment[]
  summary: {
    checklist: { completed: number; total: number }
    subtasks: { completed: number; total: number }
    comments: number
  }
}

const subtaskStatuses = ["Pendente", "Em andamento", "Concluída"]

export default function TaskDetailPage() {
  const confirmAction = useConfirm()
  const params = useParams<{ id: string }>()
  const taskId = params.id as string
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [checklistText, setChecklistText] = useState("")
  const [subtaskTitle, setSubtaskTitle] = useState("")
  const [commentContent, setCommentContent] = useState("")

  const fetchTask = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(`/api/tasks/${taskId}?t=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Tarefa não encontrada")
      const data = await response.json()
      setTask(data)
      addRecentItem({ id: data.id, type: "task", name: data.title, href: `/tasks/${data.id}` })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tarefa")
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  async function request<T = unknown>(path: string, method: "POST" | "PATCH" | "DELETE", body: object, busy: string): Promise<T | true | false> {
    try {
      setBusyKey(busy)
      setError(null)
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Não foi possível salvar a alteração")
      }
      const data = await response.json().catch(() => null)
      await fetchTask()
      return (data as T | null) ?? true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return false
    } finally {
      setBusyKey(null)
    }
  }

  async function addChecklistItem(event: FormEvent) {
    event.preventDefault()
    if (!checklistText.trim()) return
    if (await request(`/api/tasks/${taskId}/checklist`, "POST", { text: checklistText }, "checklist-new")) {
      setChecklistText("")
    }
  }

  async function toggleChecklistItem(item: ChecklistItem) {
    if (!task) return
    const completed = !Boolean(item.completed)
    const allWillBeCompleted = completed && task.checklist.every((current) => current.id === item.id || Boolean(current.completed))
    const saved = await request(
      `/api/tasks/${taskId}/checklist`, "PATCH", { itemId: item.id, completed }, `checklist-${item.id}`
    )
    if (saved && allWillBeCompleted && !task.completedAt && await confirmAction({ title: "Concluir tarefa?", description: "Todos os itens do checklist foram concluídos. Deseja marcar a tarefa como concluída?", confirmLabel: "Concluir", variant: "primary" })) {
      await request(`/api/tasks/${taskId}/complete`, "PATCH", { completed: true }, "task-complete")
    }
  }

  async function addSubtask(event: FormEvent) {
    event.preventDefault()
    if (!subtaskTitle.trim()) return
    const created = await request<Subtask>(`/api/tasks/${taskId}/subtasks`, "POST", { title: subtaskTitle }, "subtask-new")
    if (created) {
      setSubtaskTitle("")
      if (created !== true && typeof created === "object") {
        setTask((current) => {
          if (!current || current.subtasks.some((subtask) => subtask.id === created.id)) return current
          return {
            ...current,
            subtasks: [...current.subtasks, created],
            summary: {
              ...current.summary,
              subtasks: {
                completed: current.summary.subtasks.completed + (created.completedAt ? 1 : 0),
                total: current.summary.subtasks.total + 1,
              },
            },
          }
        })
      }
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault()
    if (!commentContent.trim()) return
    if (await request(`/api/tasks/${taskId}/comments`, "POST", { content: commentContent }, "comment-new")) {
      setCommentContent("")
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl p-5 sm:p-8 text-slate-600 dark:text-slate-300">Carregando tarefa...</main>
  }

  if (!task) {
    return (
      <main className="mx-auto max-w-4xl p-5 sm:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="text-xl font-bold">Erro</h1>
          <p className="mt-2">{error || "Tarefa não encontrada"}</p>
          <Link href="/tasks" className="mt-4 inline-block underline">Voltar para tarefas</Link>
        </div>
      </main>
    )
  }

  const checklistProgress = task.summary.checklist.total
    ? Math.round((task.summary.checklist.completed / task.summary.checklist.total) * 100)
    : 0
  const isOverdue = task.dueDate && new Date(`${task.dueDate}T23:59:59`) < new Date() && !task.completedAt

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-5 sm:p-8">
      <Link href="/tasks" className="text-sm font-semibold text-indigo-700 hover:underline">Voltar para tarefas</Link>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow sm:p-6-sm sm:p-5 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Resumo da tarefa</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{task.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">{task.status}</span>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">{task.priority}</span>
              {isOverdue && <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">Atrasada</span>}
              {task.completedAt && <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">Concluída</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/tasks?edit=${task.id}`} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">Editar</Link>
            <a href="#comments" className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">Adicionar comentário</a>
            {!task.completedAt && (
              <button
              type="button"
              disabled={busyKey === "task-complete"}
              onClick={() => request(`/api/tasks/${taskId}/complete`, "PATCH", { completed: true }, "task-complete")}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyKey === "task-complete" ? "Concluindo..." : "Concluir tarefa"}
              </button>
            )}
          </div>
        </div>

        {task.description && <p className="mt-6 rounded-xl bg-slate-50 dark:bg-slate-950 p-4 text-slate-700 dark:text-slate-300">{task.description}</p>}

        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><span className="text-slate-500 dark:text-slate-400">Projeto</span><p className="font-semibold">{task.projectId ? <Link href={`/projects/${task.projectId}`} className="text-indigo-700 hover:underline">{task.projectName || "Abrir projeto"}</Link> : "Sem projeto"}</p></div>
          <div><span className="text-slate-500 dark:text-slate-400">Cliente</span><p className="font-semibold">{task.clientName || "Sem cliente"}</p></div>
          <div><span className="text-slate-500 dark:text-slate-400">Prazo</span><p className="font-semibold">{task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR") : "Sem prazo"}</p></div>
          <div><span className="text-slate-500 dark:text-slate-400">Criada em</span><p className="font-semibold">{new Date(task.createdAt).toLocaleDateString("pt-BR")}</p></div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-indigo-50 p-4"><strong className="text-2xl text-indigo-800">{task.summary.checklist.completed}/{task.summary.checklist.total}</strong><p className="text-sm text-indigo-700">Checklist</p></div>
          <div className="rounded-xl bg-violet-50 p-4"><strong className="text-2xl text-violet-800">{task.summary.subtasks.completed}/{task.summary.subtasks.total}</strong><p className="text-sm text-violet-700">Subtarefas</p></div>
          <div className="rounded-xl bg-sky-50 p-4"><strong className="text-2xl text-sky-800">{task.summary.comments}</strong><p className="text-sm text-sky-700">Comentários</p></div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow sm:p-6-sm">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Progresso</p><h2 className="text-2xl font-bold">Checklist</h2></div>
            <strong className="text-2xl text-indigo-700">{checklistProgress}%</strong>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${checklistProgress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{task.summary.checklist.completed} de {task.summary.checklist.total} concluídos</p>

          <form onSubmit={addChecklistItem} className="mt-5 flex gap-2">
            <input value={checklistText} onChange={(event) => setChecklistText(event.target.value)} maxLength={300} placeholder="Novo item do checklist" className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2" />
            <button disabled={busyKey === "checklist-new"} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Adicionar</button>
          </form>

          <div className="mt-4 space-y-2">
            {task.checklist.length ? task.checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <input type="checkbox" checked={Boolean(item.completed)} disabled={busyKey === `checklist-${item.id}`} onChange={() => toggleChecklistItem(item)} className="h-5 w-5 accent-indigo-600" />
                <span className={`min-w-0 flex-1 ${item.completed ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-200"}`}>{item.text}</span>
                <button type="button" onClick={() => request(`/api/tasks/${taskId}/checklist`, "DELETE", { itemId: item.id }, `checklist-delete-${item.id}`)} className="text-sm font-semibold text-red-600 hover:underline">Excluir</button>
              </div>
            )) : <p className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">Divida a tarefa em passos menores.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow sm:p-6-sm">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Estrutura</p>
          <h2 className="text-2xl font-bold">Subtarefas</h2>
          <form onSubmit={addSubtask} className="mt-5 flex gap-2">
            <input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Nova subtarefa" className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2" />
            <button disabled={busyKey === "subtask-new"} className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Adicionar</button>
          </form>
          <div className="mt-4 space-y-3">
            {task.subtasks.length ? task.subtasks.map((subtask) => (
              <div key={subtask.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className={`min-w-0 flex-1 font-medium ${subtask.status === "Concluída" ? "text-slate-400 line-through" : ""}`}>{subtask.title}</span>
                  <select value={subtask.status} disabled={busyKey === `subtask-${subtask.id}`} onChange={(event) => request(`/api/tasks/${taskId}/subtasks`, "PATCH", { subtaskId: subtask.id, status: event.target.value }, `subtask-${subtask.id}`)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-2 text-sm">
                    {subtaskStatuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <button type="button" onClick={() => request(`/api/tasks/${taskId}/subtasks`, "DELETE", { subtaskId: subtask.id }, `subtask-delete-${subtask.id}`)} className="text-sm font-semibold text-red-600 hover:underline">Excluir</button>
                </div>
              </div>
            )) : <p className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">Nenhuma subtarefa adicionada.</p>}
          </div>
        </section>
      </div>

      <section id="comments" className="mt-6 scroll-mt-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow sm:p-6-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-600">Contexto</p>
        <h2 className="text-2xl font-bold">Comentários</h2>
        <form onSubmit={addComment} className="mt-5">
          <textarea value={commentContent} onChange={(event) => setCommentContent(event.target.value)} maxLength={2000} rows={3} placeholder="Registre uma decisão, observação ou bloqueio..." className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-3" />
          <button disabled={busyKey === "comment-new"} className="mt-2 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Adicionar comentário</button>
        </form>
        <div className="mt-5 space-y-3">
          {task.comments.length ? task.comments.map((comment) => (
            <article key={comment.id} className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-4">
                <div><strong>{comment.userName}</strong><time className="ml-2 text-xs text-slate-500 dark:text-slate-400">{new Date(comment.createdAt).toLocaleString("pt-BR")}</time></div>
                <button type="button" onClick={() => request(`/api/tasks/${taskId}/comments`, "DELETE", { commentId: comment.id }, `comment-delete-${comment.id}`)} className="text-sm font-semibold text-red-600 hover:underline">Excluir</button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{comment.content}</p>
            </article>
          )) : <p className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">Nenhum comentário registrado.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow sm:p-6-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Auditoria</p>
        <h2 className="text-2xl font-bold">Histórico automático</h2>
        <div className="mt-5 space-y-3">
          {task.activities.length ? task.activities.map((activity) => (
            <article key={activity.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div><strong className="text-slate-900 dark:text-white">{activity.action}</strong>{activity.detail && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{activity.detail}</p>}</div>
              <time className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{new Date(activity.createdAt).toLocaleString("pt-BR")}</time>
            </article>
          )) : <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma atividade registrada.</p>}
        </div>
      </section>
    </main>
  )
}
