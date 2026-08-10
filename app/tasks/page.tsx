"use client"

import { useConfirm } from "@/components/ConfirmDialog"
import ContextMenu from "@/components/ContextMenu"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { suggestedChecklists } from "@/lib/suggested-checklists"
import { Project } from "@/types/project"
import { Task } from "@/types/task"

const statusOptions = ["Pendente", "Em andamento", "Concluída"]
const priorityOptions = ["Baixa", "Média", "Alta", "Urgente"]

type BillingStatus = {
  proAccess: boolean
}

type HealthIssue = {
  task: Task
  label: string
  tone: "danger" | "warning" | "info"
  score: number
}

export default function TasksPage() {
  const confirmAction = useConfirm()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
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
  const [suggestedChecklistId, setSuggestedChecklistId] = useState("")
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

  const fetchBillingStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status")
      if (!res.ok) return setBillingStatus({ proAccess: false })
      setBillingStatus(await res.json())
    } catch {
      setBillingStatus({ proAccess: false })
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
      if (taskToEdit) openEditTask(taskToEdit)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [filterDueDateFrom, filterDueDateTo, filterOverdue, filterPriority, filterStatus, search])

  useEffect(() => {
    Promise.all([fetchProjects(), fetchTasks(), fetchBillingStatus()])
  }, [fetchProjects, fetchTasks, fetchBillingStatus])

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
    setSuggestedChecklistId("")
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
    setSuggestedChecklistId("")
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
      const body = { title, projectId: projectId === "" ? null : projectId, status, priority, dueDate, description, suggestedChecklistId: billingStatus?.proAccess && !editingTask ? suggestedChecklistId || null : null }
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
      const res = await fetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error("Erro ao excluir tarefa")
      setTasks((prev) => prev.filter((task) => task.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      await fetchTasks()
    }
  }

  async function handleCompleteTask(task: Task) {
    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !task.completedAt }) })
      if (!res.ok) throw new Error("Não foi possível alterar a tarefa")
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }

  const selectedSuggestedChecklist = suggestedChecklists.find((checklist) => checklist.id === suggestedChecklistId) ?? null
  const proAccess = Boolean(billingStatus?.proAccess)
  const completedCount = tasks.filter((task) => task.completedAt).length
  const inProgressCount = tasks.filter((task) => task.status === "Em andamento" && !task.completedAt).length
  const overdueCount = tasks.filter((task) => isOverdue(task)).length

  return (
    <main className="min-h-screen px-4 py-5 text-slate-950 sm:px-6 sm:py-6 lg:px-8 dark:text-white">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Execução</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tarefas</h1>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Controle prioridades, prazos e próximos passos de cada projeto.</p>
          </div>
          <button onClick={openNewTaskForm} className="w-fit rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">+ Nova tarefa</button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Na listagem" value={tasks.length} />
          <SummaryCard label="Em andamento" value={inProgressCount} />
          <SummaryCard label="Concluídas" value={completedCount} />
          <SummaryCard label="Atrasadas" value={overdueCount} />
        </div>
      </section>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">{error}</div> : null}

      <TaskHealthPanel tasks={tasks} projects={projects} proAccess={proAccess} loading={billingStatus === null} />

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 lg:grid-cols-4 lg:items-end">
          <Field label="Buscar tarefas"><input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título, descrição ou projeto" /></Field>
          <Field label="Status"><select className={inputClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">Todos</option>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
          <Field label="Prioridade"><select className={inputClass} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}><option value="">Todas</option>{priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
          <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterPriority(""); setFilterDueDateFrom(""); setFilterDueDateTo(""); setFilterOverdue(false) }} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">Limpar filtros</button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4 lg:items-end">
          <Field label="Prazo inicial"><input type="date" className={inputClass} value={filterDueDateFrom} onChange={(e) => setFilterDueDateFrom(e.target.value)} /></Field>
          <Field label="Prazo final"><input type="date" className={inputClass} value={filterDueDateTo} onChange={(e) => setFilterDueDateTo(e.target.value)} /></Field>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950"><input type="checkbox" checked={filterOverdue} onChange={(e) => setFilterOverdue(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Apenas atrasadas</span></label>
        </div>
      </section>

      {showForm ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-2xl font-bold">{editingTask ? "Editar tarefa" : "Nova tarefa"}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Título"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Projeto"><select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Status"><select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="Prioridade"><select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>{priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="Prazo"><input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          </div>
          <Field label="Descrição" className="mt-4"><textarea className={inputClass} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          {!editingTask ? (
            <SmartChecklistPicker
              proAccess={proAccess}
              selectedId={suggestedChecklistId}
              onSelect={setSuggestedChecklistId}
              selectedChecklist={selectedSuggestedChecklist}
            />
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={handleSaveTask} disabled={isSubmitting} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Salvando..." : "Salvar"}</button>
            <button onClick={() => { resetForm(); setShowForm(false) }} disabled={isSubmitting} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">Cancelar</button>
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        {loading ? <EmptyState title="Carregando tarefas..." description="Buscando execução no banco de dados." /> : tasks.length === 0 ? <EmptyState title="Nenhuma tarefa encontrada" description="Crie uma tarefa ou ajuste os filtros para ver outros registros." /> : <div className="grid gap-4">{tasks.map((task) => { const overdue = isOverdue(task); return <article key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-xl font-bold text-slate-950 dark:text-white">{task.title}</h3><TaskStatusBadge task={task} />{overdue ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">Atrasada</span> : null}</div>{task.description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{task.description}</p> : null}</div><div className="flex shrink-0 items-center gap-2"><Link href={`/tasks/${task.id}`} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">Detalhes</Link><ContextMenu><button onClick={() => openEditTask(task)}>Editar</button><button onClick={() => handleCompleteTask(task)}>{task.completedAt ? "Reabrir" : "Concluir"}</button><button onClick={() => handleDeleteTask(task.id)} className="text-red-700">Apagar</button></ContextMenu></div></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Info label="Projeto" value={task.projectName ?? "Sem projeto"} /><Info label="Prioridade" value={task.priority ?? "Média"} /><Info label="Prazo" value={task.dueDate ? formatDate(task.dueDate) : "Sem prazo"} /><Info label="Conclusão" value={task.completedAt ? formatDate(task.completedAt) : "Aberta"} /></div></article> })}</div>}
      </section>
    </main>
  )
}

const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"


function SmartChecklistPicker({ proAccess, selectedId, onSelect, selectedChecklist }: { proAccess: boolean; selectedId: string; onSelect: (id: string) => void; selectedChecklist: (typeof suggestedChecklists)[number] | null }) {
  const previewItems = selectedChecklist?.items ?? suggestedChecklists[0]?.items ?? []
  const previewExamples = suggestedChecklists.slice(0, 3)

  return (
    <section className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950 dark:text-white">Checklists Inteligentes</h3>
            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-black text-white">Pro</span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Comece com uma execução pronta para este tipo de entrega.</p>
        </div>
        {!proAccess ? <Link href="/pricing" className="inline-flex justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700">Ver plano Pro</Link> : null}
      </div>

      {proAccess ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Field label="Tipo de entrega">
            <select className={inputClass} value={selectedId} onChange={(event) => onSelect(event.target.value)}>
              <option value="">Sem checklist inteligente</option>
              {suggestedChecklists.map((checklist) => <option key={checklist.id} value={checklist.id}>{checklist.name}</option>)}
            </select>
          </Field>
          <ChecklistPreview checklist={selectedChecklist} fallbackItems={previewItems} locked={false} />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {previewExamples.map((checklist) => (
            <div key={checklist.id} className="rounded-2xl border border-indigo-100 bg-white p-4 dark:border-indigo-900/50 dark:bg-slate-900">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">{checklist.category}</p>
              <h4 className="mt-2 font-black text-slate-950 dark:text-white">{checklist.name}</h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{checklist.items.length} passos prontos para aplicar no Pro.</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ChecklistPreview({ checklist, fallbackItems, locked }: { checklist: (typeof suggestedChecklists)[number] | null; fallbackItems: string[]; locked: boolean }) {
  const items = (checklist?.items ?? fallbackItems).slice(0, 5)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-white">{checklist ? checklist.name : "Prévia do checklist"}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{checklist ? checklist.description : "Selecione um tipo para ver os primeiros passos."}</p>
        </div>
        {checklist ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">{checklist.recommendedPriority}</span> : null}
      </div>
      <ul className={`mt-4 space-y-2 ${locked ? "opacity-60" : ""}`}>
        {items.map((item) => <li key={item} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />{item}</li>)}
      </ul>
    </div>
  )
}
function TaskHealthPanel({ tasks, projects, proAccess, loading }: { tasks: Task[]; projects: Project[]; proAccess: boolean; loading: boolean }) {
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects])
  const openTasks = tasks.filter((task) => !task.completedAt)
  const noDeadline = openTasks.filter((task) => !task.dueDate)
  const noProject = openTasks.filter((task) => !task.projectId)
  const overdue = openTasks.filter((task) => isOverdue(task))
  const noDescription = openTasks.filter((task) => !task.description?.trim())
  const reviewItems = buildHealthIssues(openTasks).slice(0, 5)

  if (loading) {
    return (
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-950" />)}
        </div>
      </section>
    )
  }

  if (!proAccess) {
    return (
      <section className="mt-6 overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-sm dark:border-indigo-900/60 dark:bg-slate-900">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Recurso Pro</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Saúde das tarefas</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Veja tarefas sem prazo, sem projeto, atrasadas ou sem contexto antes que elas atrapalhem sua rotina.</p>
          </div>
          <Link href="/pricing" className="inline-flex justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">Ver plano Pro</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Diagnóstico Pro</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Saúde das tarefas</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Revise pontos que deixam a execução menos previsível.</p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">{reviewItems.length} pontos para revisar</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HealthStat label="Sem prazo" value={noDeadline.length} tone="warning" />
        <HealthStat label="Sem projeto" value={noProject.length} tone="info" />
        <HealthStat label="Atrasadas" value={overdue.length} tone="danger" />
        <HealthStat label="Sem descrição" value={noDescription.length} tone="info" />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-slate-950 dark:text-white">Pontos para revisar</h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Até 5 tarefas</span>
        </div>
        <div className="mt-4 space-y-3">
          {reviewItems.length ? reviewItems.map((issue) => (
            <div key={`${issue.task.id}-${issue.label}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bold text-slate-950 dark:text-white">{issue.task.title}</p>
                  <IssueBadge issue={issue} />
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{issue.task.projectName ?? (issue.task.projectId ? projectById.get(issue.task.projectId) : null) ?? "Sem projeto"}</p>
              </div>
              <Link href={`/tasks/${issue.task.id}`} className="inline-flex shrink-0 justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">Abrir</Link>
            </div>
          )) : <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">Nenhum ponto crítico encontrado nas tarefas abertas.</p>}
        </div>
      </div>
    </section>
  )
}

function HealthStat({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "info" }) {
  const toneClass = tone === "danger" ? "bg-red-500" : tone === "warning" ? "bg-amber-500" : "bg-sky-500"
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className={`block h-1.5 w-12 rounded-full ${toneClass}`} />
      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  )
}

function IssueBadge({ issue }: { issue: HealthIssue }) {
  const color = issue.tone === "danger" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : issue.tone === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{issue.label}</span>
}

function buildHealthIssues(tasks: Task[]) {
  return tasks
    .map((task): HealthIssue | null => {
      if (isOverdue(task)) return { task, label: "Atrasada", tone: "danger", score: 100 }
      if (task.priority === "Urgente" && !task.dueDate) return { task, label: "Urgente sem prazo", tone: "warning", score: 80 }
      if (!task.projectId) return { task, label: "Sem projeto", tone: "info", score: 60 }
      if (!task.description?.trim()) return { task, label: "Sem descrição", tone: "info", score: 40 }
      if (!task.dueDate) return { task, label: "Sem prazo", tone: "warning", score: 30 }
      return null
    })
    .filter((issue): issue is HealthIssue => Boolean(issue))
    .sort((a, b) => b.score - a.score)
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p></div>
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>{children}</label>
}

function TaskStatusBadge({ task }: { task: Task }) {
  const text = task.completedAt ? "Concluída" : task.status
  const color = task.completedAt ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : task.status === "Em andamento" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{text}</span>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</p></div>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2><p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p></div>
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.completedAt) return false
  return new Date(`${task.dueDate.slice(0, 10)}T00:00:00`) < startOfToday()
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR")
}
