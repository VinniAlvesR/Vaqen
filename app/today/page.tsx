"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type TodayTask = {
  id: string
  title: string
  status: string
  priority: string | null
  dueDate: string | null
  projectName: string | null
  clientName: string | null
  daysOverdue?: number
}

type DueProject = {
  id: string
  name: string
  status: string
  dueDate: string
  clientName: string | null
  daysRemaining: number
}

type TodayData = {
  userName: string
  overdueTasks: TodayTask[]
  urgentTasks: TodayTask[]
  dueTodayTasks: TodayTask[]
  dueProjects: DueProject[]
  weeklyProgress: {
    completedTasks: number
    advancedProjects: number
  }
}

type MetricTone = "red" | "orange" | "blue" | "indigo"
type MetricIconName = "alert" | "bolt" | "calendar" | "flag"

const toneClass: Record<MetricTone, { text: string; bg: string; border: string; bar: string }> = {
  red: {
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-100 dark:border-red-900/60",
    bar: "bg-red-500",
  },
  orange: {
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-100 dark:border-orange-900/60",
    bar: "bg-orange-500",
  },
  blue: {
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-100 dark:border-blue-900/60",
    bar: "bg-blue-500",
  },
  indigo: {
    text: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-100 dark:border-indigo-900/60",
    bar: "bg-indigo-500",
  },
}

function formatDate(value: string | null) {
  if (!value) return "Sem prazo"
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
}

function TaskCard({ task, overdue, onComplete, onComment, completing }: {
  task: TodayTask
  overdue?: boolean
  onComplete: (id: string) => void
  onComment: (task: TodayTask) => void
  completing: boolean
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950 dark:text-white">{task.title}</h3>
            {task.priority && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/60">
                {task.priority}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {task.projectName || "Sem projeto"}{task.clientName ? ` - ${task.clientName}` : ""}
          </p>
          <p className={`mt-1 text-sm font-semibold ${overdue ? "text-red-700 dark:text-red-300" : "text-slate-600 dark:text-slate-300"}`}>
            {overdue ? `${task.daysOverdue} dia(s) em atraso` : `Prazo: ${formatDate(task.dueDate)}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/tasks/${task.id}`} className="rounded-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Abrir
          </Link>
          <button type="button" onClick={() => onComment(task)} className="rounded-full border border-sky-200 px-3 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-50 dark:border-sky-900/70 dark:text-sky-300 dark:hover:bg-sky-950/40">Comentar</button>
          <button
            type="button"
            onClick={() => onComplete(task.id)}
            disabled={completing}
            className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {completing ? "Concluindo..." : "Concluir"}
          </button>
        </div>
      </div>
    </article>
  )
}

function MetricCard({ icon, count, label, tone }: { icon: MetricIconName; count: number; label: string; tone: MetricTone }) {
  const classes = toneClass[tone]

  return (
    <article className={`relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm dark:bg-slate-900 ${classes.border}`}>
      <div className={`absolute inset-x-0 top-0 h-1.5 ${classes.bar}`} />
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-black ${classes.bg} ${classes.text} ${classes.border}`}>
        <MetricIcon name={icon} />
      </div>
      <p className={`mt-4 text-4xl font-black ${classes.text}`}>{count}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</p>
    </article>
  )
}


function MetricIcon({ name }: { name: MetricIconName }) {
  const common = {
    className: "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  switch (name) {
    case "alert":
      return <svg {...common}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
    case "bolt":
      return <svg {...common}><path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" /></svg>
    case "calendar":
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M9 15h.01" /><path d="M13 15h.01" /></svg>
    case "flag":
      return <svg {...common}><path d="M5 22V4" /><path d="M5 4h10l-1 4 1 4H5" /></svg>
  }
}
function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{children}</p>
}

export default function TodayPage() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [commentTask, setCommentTask] = useState<TodayTask | null>(null)
  const [comment, setComment] = useState("")
  const [commenting, setCommenting] = useState(false)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  const loadToday = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/today", { cache: "no-store" })
      if (!response.ok) throw new Error("Nao foi possivel carregar suas prioridades")
      setData(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  async function completeTask(taskId: string) {
    try {
      setCompletingId(taskId)
      setError(null)
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      })
      if (!response.ok) throw new Error("Nao foi possivel concluir a tarefa")
      await loadToday()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setCompletingId(null)
    }
  }

  async function saveComment() {
    if (!commentTask || !comment.trim()) return
    try {
      setCommenting(true)
      setError(null)
      const response = await fetch(`/api/tasks/${commentTask.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      })
      if (!response.ok) throw new Error("Nao foi possivel adicionar o comentario")
      setComment("")
      setCommentTask(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setCommenting(false)
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-7xl p-6 text-slate-600 dark:text-slate-300">Carregando sua central de foco...</main>
  }

  if (!data) {
    return <main className="mx-auto max-w-7xl p-6 text-red-700 dark:text-red-300">{error || "Nao foi possivel carregar a Tela Hoje."}</main>
  }

  const attentionCount = data.overdueTasks.length + data.urgentTasks.length + data.dueTodayTasks.length

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <section className="vaqen-dashboard-hero overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-800">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Central de foco</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{greeting}, {data.userName || "vamos comecar"}</h1>
            <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Veja o que precisa de atencao agora e resolva as prioridades sem trocar de tela.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/tasks?new=1" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">+ Nova tarefa</Link>
            <Link href="/projects?new=1" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">+ Novo projeto</Link>
            <Link href="/clients?new=1" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">+ Novo cliente</Link>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="alert" count={data.overdueTasks.length} label="tarefas atrasadas" tone="red" />
          <MetricCard icon="bolt" count={data.urgentTasks.length} label="tarefas urgentes" tone="orange" />
          <MetricCard icon="calendar" count={data.dueTodayTasks.length} label="vencendo hoje" tone="blue" />
          <MetricCard icon="flag" count={data.dueProjects.length} label="projetos proximos" tone="indigo" />
        </section>
      </section>

      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">{error}</div>}

      {attentionCount === 0 && data.dueProjects.length === 0 && (
        <section className="vaqen-empty-success mt-7 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm sm:p-8 dark:border-emerald-900/60">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Tudo certo</p>
          <h2 className="mt-2 text-2xl font-black text-emerald-950 dark:text-white">Tudo organizado</h2>
          <p className="mt-2 text-emerald-800 dark:text-emerald-200">Nenhuma tarefa urgente para hoje.</p>
        </section>
      )}

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">Atrasadas</h2>
          <div className="mt-4 space-y-3">
            {data.overdueTasks.length ? data.overdueTasks.map((task) => (
              <TaskCard key={task.id} task={task} overdue onComplete={completeTask} onComment={setCommentTask} completing={completingId === task.id} />
            )) : <EmptyText>Nenhuma tarefa atrasada.</EmptyText>}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">Urgentes</h2>
          <div className="mt-4 space-y-3">
            {data.urgentTasks.length ? data.urgentTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={completeTask} onComment={setCommentTask} completing={completingId === task.id} />
            )) : <EmptyText>Nenhuma tarefa urgente.</EmptyText>}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">Vencendo hoje</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {data.dueTodayTasks.length ? data.dueTodayTasks.map((task) => (
            <TaskCard key={task.id} task={task} onComplete={completeTask} onComment={setCommentTask} completing={completingId === task.id} />
          )) : <EmptyText>Nenhuma tarefa vence hoje.</EmptyText>}
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">Projetos proximos do prazo</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.dueProjects.length ? data.dueProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/60">
              <h3 className="font-bold text-slate-950 dark:text-white">{project.name}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{project.clientName || "Sem cliente"}</p>
              <p className="mt-3 font-bold text-indigo-700 dark:text-indigo-300">
                {project.daysRemaining === 0 ? "Vence hoje" : `${project.daysRemaining} dia(s) restante(s)`}
              </p>
            </Link>
          )) : <EmptyText>Nenhum projeto vence nos proximos 7 dias.</EmptyText>}
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Progresso semanal</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950"><strong className="text-3xl text-slate-950 dark:text-white">{data.weeklyProgress.completedTasks}</strong><p className="text-slate-600 dark:text-slate-300">tarefas concluidas esta semana</p></div>
          <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950"><strong className="text-3xl text-slate-950 dark:text-white">{data.weeklyProgress.advancedProjects}</strong><p className="text-slate-600 dark:text-slate-300">projetos avancaram</p></div>
        </div>
      </section>

      {commentTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Comentar em {commentTask.title}</h2>
            <textarea autoFocus value={comment} onChange={(event) => setComment(event.target.value)} rows={4} maxLength={2000} className="mt-4 w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-950 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20" placeholder="Registre uma observacao..." />
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setComment(""); setCommentTask(null) }} className="rounded-full border border-slate-300 px-4 py-2 font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancelar</button><button type="button" onClick={saveComment} disabled={commenting || !comment.trim()} className="rounded-full bg-sky-600 px-4 py-2 font-bold text-white disabled:opacity-60">{commenting ? "Salvando..." : "Salvar comentario"}</button></div>
          </div>
        </div>
      )}
    </main>
  )
}