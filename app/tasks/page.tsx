"use client"


import { useConfirm } from "@/components/ConfirmDialog"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import ContextMenu from "@/components/ContextMenu"
import { Project } from "@/types/project"
import { Task } from "@/types/task"

const statusOptions = ["Pendente", "Em andamento", "Concluída"]
const priorityOptions = ["Baixa", "Média", "Alta", "Urgente"]

export default function TasksPage() {
  const confirmAction = useConfirm()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [filterDueDateFrom, setFilterDueDateFrom] = useState("")
  const [filterDueDateTo, setFilterDueDateTo] = useState("")
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [title, setTitle] = useState("")
  const [projectId, setProjectId] = useState<string>("")
  const [status, setStatus] = useState(statusOptions[0])
  const [priority, setPriority] = useState(priorityOptions[1])
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowForm(true)
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Não foi possível carregar projetos")
      setProjects(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (filterStatus) params.set("status", filterStatus)
      if (filterPriority) params.set("priority", filterPriority)
      if (filterDueDateFrom) params.set("dueDateFrom", filterDueDateFrom)
      if (filterDueDateTo) params.set("dueDateTo", filterDueDateTo)
      if (filterOverdue) params.set("overdue", "true")

      const res = await fetch(`/api/tasks${params.toString() ? `?${params.toString()}` : ""}`)
      if (!res.ok) throw new Error("Não foi possível carregar tarefas")
      const data: Task[] = await res.json()
      setTasks(data)

      const editId = new URLSearchParams(window.location.search).get("edit")
      const taskToEdit = editId ? data.find((task) => task.id === editId) : undefined
      if (taskToEdit) {
        setTitle(taskToEdit.title)
        setProjectId(taskToEdit.projectId ?? "")
        setStatus(taskToEdit.status)
        setPriority(taskToEdit.priority ?? priorityOptions[1])
        setDueDate(taskToEdit.dueDate?.slice(0, 10) ?? "")
        setDescription(taskToEdit.description ?? "")
        setEditingTask(taskToEdit)
        setShowForm(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [filterDueDateFrom, filterDueDateTo, filterOverdue, filterPriority, filterStatus, search])

  useEffect(() => {
    Promise.all([fetchProjects(), fetchTasks()])
  }, [fetchProjects, fetchTasks])

  useEffect(() => {
    const refresh = (event: Event) => {
      if ((event as CustomEvent<{ entity: string }>).detail?.entity === "task") fetchTasks()
    }
    window.addEventListener("vaqen:data-changed", refresh)
    return () => window.removeEventListener("vaqen:data-changed", refresh)
  }, [fetchTasks])

  function resetForm() {
    setTitle("")
    setProjectId("")
    setStatus(statusOptions[0])
    setPriority(priorityOptions[1])
    setDueDate("")
    setDescription("")
    setEditingTask(null)
  }

  function openNewTaskForm() {
    resetForm()
    setShowForm(true)
  }

  function openEditTask(task: Task) {
    setTitle(task.title)
    setProjectId(task.projectId ?? "")
    setStatus(task.status)
    setPriority(task.priority ?? priorityOptions[1])
    setDueDate(task.dueDate?.slice(0, 10) ?? "")
    setDescription(task.description ?? "")
    setEditingTask(task)
    setShowForm(true)
    setError(null)
  }

  async function handleSaveTask() {
    if (!title || !status) {
      setError("Preencha título e status")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const body = { title, projectId: projectId === "" ? null : projectId, status, priority, dueDate, description }
      const res = await fetch("/api/tasks", {
        method: editingTask ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTask ? { id: editingTask.id, ...body } : body),
      })

      if (!res.ok) throw new Error("Erro ao salvar tarefa")

      await fetchTasks()
      resetForm()
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteTask(id: string) {
    if (!(await confirmAction({ title: "Apagar tarefa?", description: "A tarefa será movida para a lixeira e poderá ser restaurada depois.", confirmLabel: "Apagar", variant: "danger" }))) return

    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Erro ao excluir tarefa")
      setTasks((prev) => prev.filter((task) => task.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      await fetchTasks()
    }
  }

  async function handleCompleteTask(task: Task) {
    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completedAt }),
      })
      if (!res.ok) throw new Error("Não foi possível alterar a tarefa")
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }

  const completedCount = tasks.filter((task) => task.completedAt).length
  const inProgressCount = tasks.filter((task) => task.status === "Em andamento" && !task.completedAt).length
  const overdueCount = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && !task.completedAt).length

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow sm:p-6-sm sm:p-5 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Execução</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-3xl sm:text-4xl">Tarefas</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Controle prioridades, prazos e próximos passos de cada projeto.
            </p>
          </div>
          <button onClick={openNewTaskForm} className="w-fit rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            + Nova tarefa
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Na listagem" value={tasks.length} />
          <SummaryCard label="Em andamento" value={inProgressCount} />
          <SummaryCard label="Concluídas" value={completedCount} />
          <SummaryCard label="Atrasadas" value={overdueCount} />
        </div>
      </section>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div> : null}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4 lg:items-end">
          <Field label="Buscar tarefas"><input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título, descrição ou projeto" /></Field>
          <Field label="Status">
            <select className={inputClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Prioridade">
            <select className={inputClass} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">Todas</option>
              {priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <button
            onClick={() => {
              setSearch("")
              setFilterStatus("")
              setFilterPriority("")
              setFilterDueDateFrom("")
              setFilterDueDateTo("")
              setFilterOverdue(false)
            }}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Limpar filtros
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4 lg:items-end">
          <Field label="Prazo inicial"><input type="date" className={inputClass} value={filterDueDateFrom} onChange={(e) => setFilterDueDateFrom(e.target.value)} /></Field>
          <Field label="Prazo final"><input type="date" className={inputClass} value={filterDueDateTo} onChange={(e) => setFilterDueDateTo(e.target.value)} /></Field>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input type="checkbox" checked={filterOverdue} onChange={(e) => setFilterOverdue(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-700">Apenas atrasadas</span>
          </label>
        </div>
      </section>

      {showForm ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm">
          <h2 className="text-2xl font-bold">{editingTask ? "Editar tarefa" : "Nova tarefa"}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Título"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Projeto">
              <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Sem projeto</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Prioridade">
              <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Prazo"><input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          </div>
          <Field label="Descrição" className="mt-4"><textarea className={inputClass} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={handleSaveTask} disabled={isSubmitting} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Salvando..." : "Salvar"}</button>
            <button onClick={() => { resetForm(); setShowForm(false) }} disabled={isSubmitting} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        {loading ? (
          <EmptyState title="Carregando tarefas..." description="Buscando execução no banco de dados." />
        ) : tasks.length === 0 ? (
          <EmptyState title="Nenhuma tarefa encontrada" description="Crie uma tarefa ou ajuste os filtros para ver outros registros." />
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => {
              const overdue = Boolean(task.dueDate && new Date(task.dueDate) < new Date() && !task.completedAt)
              return (
                <article key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-bold text-slate-950">{task.title}</h3>
                        <TaskStatusBadge task={task} />
                        {overdue ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Atrasada</span> : null}
                      </div>
                      {task.description ? <p className="mt-2 text-sm text-slate-600">{task.description}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/tasks/${task.id}`} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">Detalhes</Link>
                      <ContextMenu>
                        <button onClick={() => openEditTask(task)}>Editar</button>
                        <button onClick={() => handleCompleteTask(task)}>{task.completedAt ? "Reabrir" : "Concluir"}</button>
                        <button onClick={() => handleDeleteTask(task.id)} className="text-red-700">Apagar</button>
                      </ContextMenu>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <Info label="Projeto" value={task.projectName ?? "Sem projeto"} />
                    <Info label="Prioridade" value={task.priority ?? "Média"} />
                    <Info label="Prazo" value={task.dueDate ? formatDate(task.dueDate) : "Sem prazo"} />
                    <Info label="Conclusão" value={task.completedAt ? formatDate(task.completedAt) : "Aberta"} />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>
}

function TaskStatusBadge({ task }: { task: Task }) {
  const text = task.completedAt ? "Concluída" : task.status
  const color = task.completedAt ? "bg-emerald-100 text-emerald-700" : task.status === "Em andamento" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-800"
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{text}</span>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-700">{value}</p></div>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 sm:p-8 text-center shadow-sm"><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-2 text-slate-500">{description}</p></div>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR")
}
