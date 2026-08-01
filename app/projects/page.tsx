"use client"


import { useConfirm } from "@/components/ConfirmDialog"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import ContextMenu from "@/components/ContextMenu"
import { Client } from "@/types/client"
import { Project } from "@/types/project"

const statusOptions = ["Planejamento", "Em andamento"]
const priorityOptions = ["Baixa", "Média", "Alta", "Urgente"]

export default function ProjectsPage() {
  const confirmAction = useConfirm()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState("")
  const [lifecycle, setLifecycle] = useState<"active" | "completed" | "archived" | "all">("active")

  const [name, setName] = useState("")
  const [clientId, setClientId] = useState<string>("")
  const [status, setStatus] = useState(statusOptions[0])
  const [priority, setPriority] = useState(priorityOptions[1])
  const [startDate, setStartDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")

  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowForm(true)
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch("/api/clients")
      if (!response.ok) throw new Error("Não foi possível carregar os clientes")
      setClients(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      const editId = new URLSearchParams(window.location.search).get("edit")
      params.set("lifecycle", editId ? "all" : lifecycle)
      const response = await fetch(`/api/projects${params.toString() ? `?${params.toString()}` : ""}`)
      if (!response.ok) throw new Error("Não foi possível carregar os projetos")
      const data: Project[] = await response.json()
      setProjects(data)

      const projectToEdit = editId ? data.find((project) => project.id === editId) : undefined
      if (projectToEdit) {
        setName(projectToEdit.name)
        setClientId(projectToEdit.clientId)
        setStatus(projectToEdit.status)
        setPriority(projectToEdit.priority ?? priorityOptions[1])
        setStartDate(projectToEdit.startDate?.slice(0, 10) ?? "")
        setDueDate(projectToEdit.dueDate?.slice(0, 10) ?? "")
        setDescription(projectToEdit.description ?? "")
        setEditingProject(projectToEdit)
        setShowForm(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [lifecycle, search])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    const refresh = (event: Event) => {
      if ((event as CustomEvent<{ entity: string }>).detail?.entity === "project") fetchProjects()
    }
    window.addEventListener("vaqen:data-changed", refresh)
    return () => window.removeEventListener("vaqen:data-changed", refresh)
  }, [fetchProjects])

  function resetForm() {
    setName("")
    setClientId("")
    setStatus(statusOptions[0])
    setPriority(priorityOptions[1])
    setStartDate("")
    setDueDate("")
    setDescription("")
    setEditingProject(null)
  }

  function openNewProjectForm() {
    resetForm()
    setShowForm(true)
  }

  function openEditProject(project: Project) {
    setName(project.name)
    setClientId(project.clientId)
    setStatus(project.status)
    setPriority(project.priority ?? priorityOptions[1])
    setStartDate(project.startDate?.slice(0, 10) ?? "")
    setDueDate(project.dueDate?.slice(0, 10) ?? "")
    setDescription(project.description ?? "")
    setEditingProject(project)
    setShowForm(true)
    setError(null)
  }

  async function handleSaveProject() {
    if (!name || !clientId || !status || !startDate) {
      setError("Preencha nome, cliente, status e data de início")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const body = { name, clientId, status, priority, startDate, dueDate: dueDate || null, description }
      const response = await fetch("/api/projects", {
        method: editingProject ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProject ? { id: editingProject.id, ...body } : body),
      })

      if (!response.ok) throw new Error("Erro ao salvar o projeto")

      await fetchProjects()
      resetForm()
      setShowForm(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      setError(message)
      console.error("Erro ao salvar projeto:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteProject(id: string) {
    if (!(await confirmAction({ title: "Apagar projeto?", description: "O projeto será movido para a lixeira e poderá ser restaurado depois.", confirmLabel: "Apagar", variant: "danger" }))) return

    try {
      const response = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error("Erro ao excluir o projeto")
      setProjects((prev) => prev.filter((project) => project.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      setError(message)
      console.error("Erro ao excluir projeto:", err)
      await fetchProjects()
    }
  }

  async function handleProjectLifecycle(project: Project, action: "complete" | "archive") {
    try {
      const archived = action === "archive" ? !project.archivedAt : undefined
      const response = await fetch(`/api/projects/${project.id}/${action === "complete" ? "complete" : "archive"}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "complete" ? { completed: !project.completedAt } : { archived }),
      })
      if (!response.ok) throw new Error("Não foi possível alterar o projeto")
      await fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }

  const activeCount = projects.filter((project) => !project.archivedAt && !project.completedAt).length
  const completedCount = projects.filter((project) => project.completedAt).length
  const archivedCount = projects.filter((project) => project.archivedAt).length

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow sm:p-6-sm sm:p-5 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Entregas</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-3xl sm:text-4xl">Projetos</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Acompanhe status, prazos e prioridades de cada entrega vinculada aos clientes.
            </p>
          </div>
          <button onClick={openNewProjectForm} className="w-fit rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            + Novo projeto
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Na listagem" value={projects.length} />
          <SummaryCard label="Ativos" value={activeCount} />
          <SummaryCard label="Concluídos" value={completedCount} />
          <SummaryCard label="Arquivados" value={archivedCount} />
        </div>
      </section>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div> : null}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <Field label="Buscar projetos">
            <input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, cliente ou descrição" />
          </Field>
          <Field label="Ciclo de vida">
            <select className={inputClass} value={lifecycle} onChange={(event) => setLifecycle(event.target.value as "active" | "completed" | "archived" | "all")}>
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="completed">Concluídos</option>
              <option value="archived">Arquivados</option>
            </select>
          </Field>
          <button onClick={() => { setSearch(""); setLifecycle("active") }} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700">
            Limpar
          </button>
        </div>
      </section>

      {showForm ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm">
          <h2 className="text-2xl font-bold">{editingProject ? "Editar projeto" : "Novo projeto"}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nome"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Cliente">
              <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecione o cliente</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Prioridade">
              <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {priorityOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Data de início"><input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
            <Field label="Prazo final"><input type="date" className={inputClass} value={dueDate} min={startDate || undefined} onChange={(e) => setDueDate(e.target.value)} /></Field>
          </div>
          <Field label="Descrição" className="mt-4">
            <textarea className={inputClass} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <FormActions
            isSubmitting={isSubmitting}
            onSave={handleSaveProject}
            onCancel={() => { resetForm(); setShowForm(false) }}
          />
        </section>
      ) : null}

      <section className="mt-6">
        {loading ? (
          <EmptyState title="Carregando projetos..." description="Buscando entregas no banco de dados." />
        ) : projects.length === 0 ? (
          <EmptyState title="Nenhum projeto encontrado" description="Crie um projeto ou ajuste os filtros para ver outros registros." />
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <article key={project.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-xl font-bold text-slate-950">{project.name}</h3>
                      <StatusBadge project={project} />
                    </div>
                    {project.description ? <p className="mt-2 text-sm text-slate-600">{project.description}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/projects/${project.id}`} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                      Detalhes
                    </Link>
                    <ContextMenu>
                      <button onClick={() => openEditProject(project)}>Editar</button>
                      {!project.archivedAt && <button onClick={() => handleProjectLifecycle(project, "complete")}>{project.completedAt ? "Reabrir" : "Concluir"}</button>}
                      <button onClick={() => handleProjectLifecycle(project, "archive")}>{project.archivedAt ? "Desarquivar" : "Arquivar"}</button>
                      <button onClick={() => handleDeleteProject(project.id)} className="text-red-700">Apagar</button>
                    </ContextMenu>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <Info label="Cliente" value={project.clientName || "Não informado"} />
                  <Info label="Início" value={formatDate(project.startDate)} />
                  <Info label="Prazo" value={project.dueDate ? formatDate(project.dueDate) : "Não informado"} />
                  <Info label="Prioridade" value={project.priority || "Média"} />
                </div>
              </article>
            ))}
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

function FormActions({ isSubmitting, onSave, onCancel }: { isSubmitting: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <button onClick={onSave} disabled={isSubmitting} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Salvando..." : "Salvar"}</button>
      <button onClick={onCancel} disabled={isSubmitting} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
    </div>
  )
}

function StatusBadge({ project }: { project: Project }) {
  const text = project.archivedAt ? "Arquivado" : project.completedAt ? "Concluído" : project.status
  const color = project.archivedAt ? "bg-slate-200 text-slate-700" : project.completedAt ? "bg-emerald-100 text-emerald-700" : project.status === "Em andamento" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-800"
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
