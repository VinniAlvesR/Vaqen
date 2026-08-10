"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Project } from "@/types/project"
import type { Task } from "@/types/task"

type Client = { id: string; name: string }
type ChecklistTemplate = { id: string; name: string; items: string[] }
type ProjectTemplate = { id: string; name: string; description?: string | null; priority: string; taskTitles: string[]; checklistItems: string[] }
type RecurringTask = { id: string; title: string; priority: string; frequency: string; nextDueDate: string; active: boolean; projectName: string | null }
type KitData = { proAccess: boolean; checklistTemplates: ChecklistTemplate[]; projectTemplates: ProjectTemplate[]; recurringTasks: RecurringTask[] }

const boxClass = "rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
const buttonClass = "rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"

export default function ProProductivityKit({ projects, onTasksChanged }: { projects: Project[]; onTasksChanged: () => void }) {
  const [data, setData] = useState<KitData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [checklistName, setChecklistName] = useState("")
  const [checklistItems, setChecklistItems] = useState("Briefing\nExecução\nRevisão\nEntrega")
  const [applyChecklistId, setApplyChecklistId] = useState("")
  const [applyTaskId, setApplyTaskId] = useState("")

  const [projectTemplateName, setProjectTemplateName] = useState("")
  const [projectTemplateTasks, setProjectTemplateTasks] = useState("Briefing\nPlanejamento\nExecução\nRevisão\nEntrega")
  const [projectTemplateChecklist, setProjectTemplateChecklist] = useState("Validar requisitos\nAtualizar cliente\nConferir entrega")
  const [applyProjectTemplateId, setApplyProjectTemplateId] = useState("")
  const [applyProjectClientId, setApplyProjectClientId] = useState("")
  const [applyProjectName, setApplyProjectName] = useState("")

  const [recurringTitle, setRecurringTitle] = useState("")
  const [recurringProjectId, setRecurringProjectId] = useState("")
  const [recurringFrequency, setRecurringFrequency] = useState("weekly")
  const [recurringDate, setRecurringDate] = useState(new Date().toISOString().slice(0, 10))

  const openTasks = useMemo(() => tasks.filter((task) => !task.completedAt), [tasks])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [kitResponse, tasksResponse, clientsResponse] = await Promise.all([
        fetch("/api/pro/productivity-kit", { cache: "no-store" }),
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/clients", { cache: "no-store" }),
      ])
      if (!kitResponse.ok) throw new Error("Não foi possível carregar recursos Pro")
      setData(await kitResponse.json())
      if (tasksResponse.ok) setTasks(await tasksResponse.json())
      if (clientsResponse.ok) setClients(await clientsResponse.json())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function post(body: Record<string, unknown>, successMessage: string) {
    try {
      setSubmitting(true)
      setError(null)
      setMessage(null)
      const response = await fetch("/api/pro/productivity-kit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível concluir a ação")
      setMessage(successMessage)
      await load()
      onTasksChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <section className={boxClass}><p className="text-slate-600 dark:text-slate-300">Carregando kit Pro...</p></section>
  if (!data?.proAccess) {
    return (
      <section className="rounded-[2rem] border border-indigo-200 bg-indigo-50 p-5 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-950/20">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">Pro</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Modelos e tarefas recorrentes</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">No Pro, você cria checklists reutilizáveis, projetos modelo e tarefas recorrentes para reduzir trabalho repetitivo.</p>
      </section>
    )
  }

  return (
    <section className={boxClass}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Kit Pro</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Modelos e recorrência</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Automatize trabalho repetitivo sem adicionar complexidade ao fluxo principal.</p>
        </div>
        <button type="button" disabled={submitting} onClick={() => post({ action: "runRecurringDue" }, "Tarefas recorrentes verificadas.")} className={buttonClass}>Gerar recorrentes vencidas</button>
      </div>

      {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
      {message && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">{message}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="font-black text-slate-950 dark:text-white">Checklist padrão</h3>
          <div className="mt-4 space-y-3">
            <input className={inputClass} value={checklistName} onChange={(event) => setChecklistName(event.target.value)} placeholder="Nome do modelo" />
            <textarea className={inputClass} rows={5} value={checklistItems} onChange={(event) => setChecklistItems(event.target.value)} placeholder="Um item por linha" />
            <button type="button" disabled={submitting || !checklistName.trim()} onClick={() => post({ action: "createChecklistTemplate", name: checklistName, items: lines(checklistItems) }, "Modelo de checklist criado.")} className={buttonClass}>Salvar modelo</button>
            <div className="grid gap-2">
              <select className={inputClass} value={applyChecklistId} onChange={(event) => setApplyChecklistId(event.target.value)}><option value="">Modelo</option>{data.checklistTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>
              <select className={inputClass} value={applyTaskId} onChange={(event) => setApplyTaskId(event.target.value)}><option value="">Tarefa aberta</option>{openTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select>
              <button type="button" disabled={submitting || !applyChecklistId || !applyTaskId} onClick={() => post({ action: "applyChecklistTemplate", templateId: applyChecklistId, taskId: applyTaskId }, "Checklist aplicado na tarefa.")} className={buttonClass}>Aplicar na tarefa</button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="font-black text-slate-950 dark:text-white">Projeto modelo</h3>
          <div className="mt-4 space-y-3">
            <input className={inputClass} value={projectTemplateName} onChange={(event) => setProjectTemplateName(event.target.value)} placeholder="Nome do modelo" />
            <textarea className={inputClass} rows={4} value={projectTemplateTasks} onChange={(event) => setProjectTemplateTasks(event.target.value)} placeholder="Tarefas do projeto" />
            <textarea className={inputClass} rows={3} value={projectTemplateChecklist} onChange={(event) => setProjectTemplateChecklist(event.target.value)} placeholder="Checklist padrão das tarefas" />
            <button type="button" disabled={submitting || !projectTemplateName.trim()} onClick={() => post({ action: "createProjectTemplate", name: projectTemplateName, taskTitles: lines(projectTemplateTasks), checklistItems: lines(projectTemplateChecklist) }, "Modelo de projeto criado.")} className={buttonClass}>Salvar modelo</button>
            <select className={inputClass} value={applyProjectTemplateId} onChange={(event) => setApplyProjectTemplateId(event.target.value)}><option value="">Modelo</option>{data.projectTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>
            <select className={inputClass} value={applyProjectClientId} onChange={(event) => setApplyProjectClientId(event.target.value)}><option value="">Cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
            <input className={inputClass} value={applyProjectName} onChange={(event) => setApplyProjectName(event.target.value)} placeholder="Nome do novo projeto" />
            <button type="button" disabled={submitting || !applyProjectTemplateId || !applyProjectClientId || !applyProjectName.trim()} onClick={() => post({ action: "applyProjectTemplate", templateId: applyProjectTemplateId, clientId: applyProjectClientId, name: applyProjectName }, "Projeto criado a partir do modelo.")} className={buttonClass}>Criar projeto</button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="font-black text-slate-950 dark:text-white">Tarefa recorrente</h3>
          <div className="mt-4 space-y-3">
            <input className={inputClass} value={recurringTitle} onChange={(event) => setRecurringTitle(event.target.value)} placeholder="Título da tarefa" />
            <select className={inputClass} value={recurringProjectId} onChange={(event) => setRecurringProjectId(event.target.value)}><option value="">Sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
            <select className={inputClass} value={recurringFrequency} onChange={(event) => setRecurringFrequency(event.target.value)}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select>
            <input type="date" className={inputClass} value={recurringDate} onChange={(event) => setRecurringDate(event.target.value)} />
            <button type="button" disabled={submitting || !recurringTitle.trim()} onClick={() => post({ action: "createRecurringTask", title: recurringTitle, projectId: recurringProjectId || null, frequency: recurringFrequency, nextDueDate: recurringDate }, "Tarefa recorrente criada.")} className={buttonClass}>Salvar recorrência</button>
            <div className="space-y-2 pt-2">
              {data.recurringTasks.slice(0, 4).map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900"><p className="font-bold text-slate-950 dark:text-white">{item.title}</p><p className="text-slate-500 dark:text-slate-400">{labelFrequency(item.frequency)} · {new Date(item.nextDueDate).toLocaleDateString("pt-BR")}</p></div>)}
              {!data.recurringTasks.length && <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma recorrência criada.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean)
}

function labelFrequency(value: string) {
  if (value === "daily") return "Diária"
  if (value === "monthly") return "Mensal"
  return "Semanal"
}