"use client"

import { FormEvent, useEffect, useState } from "react"
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


type PaymentDisplayStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELED"

type ProjectPayment = {
  id: string
  projectId: string
  description: string
  amountCents: number
  dueDate: string
  paidAt: string | null
  status: PaymentDisplayStatus
  displayStatus: PaymentDisplayStatus
  method: string
}

type ProjectPaymentsData = {
  payments: ProjectPayment[]
  summary: {
    totalCents: number
    receivedCents: number
    pendingCents: number
    canceledCents: number
  }
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
  projectValueCents?: number | null
  commercialStatus?: string | null
  internalNotes?: string | null
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
  const [paymentsData, setPaymentsData] = useState<ProjectPaymentsData | null>(null)
  const [financeLocked, setFinanceLocked] = useState(false)
  const [financeLoading, setFinanceLoading] = useState(false)
  const [financeError, setFinanceError] = useState<string | null>(null)
  const [financeBusy, setFinanceBusy] = useState<string | null>(null)
  const [planValue, setPlanValue] = useState("")
  const [planInstallments, setPlanInstallments] = useState("1")
  const [firstDueDate, setFirstDueDate] = useState("")
  const [planNotes, setPlanNotes] = useState("")


  async function loadProjectPayments(projectId: string) {
    try {
      setFinanceLoading(true)
      setFinanceError(null)
      const response = await fetch(`/api/projects/${projectId}/payments`, { cache: "no-store" })
      if (response.status === 403) {
        setFinanceLocked(true)
        setPaymentsData(null)
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível carregar o financeiro do projeto")
      setFinanceLocked(false)
      setPaymentsData(payload)
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setFinanceLoading(false)
    }
  }

  async function createPaymentPlan(event: FormEvent) {
    event.preventDefault()
    if (!project) return
    const totalAmountCents = Math.round(Number(planValue.replace(",", ".")) * 100)
    const installments = Number(planInstallments)
    if (!totalAmountCents || !installments || !firstDueDate) {
      setFinanceError("Informe valor, parcelas e primeiro vencimento.")
      return
    }
    try {
      setFinanceBusy("plan")
      setFinanceError(null)
      const response = await fetch(`/api/projects/${project.id}/payments/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAmountCents, installments, firstDueDate, notes: planNotes || null }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível criar o plano financeiro")
      setPlanValue("")
      setPlanInstallments("1")
      setFirstDueDate("")
      setPlanNotes("")
      setProject((current) => current ? { ...current, projectValueCents: totalAmountCents } : current)
      await loadProjectPayments(project.id)
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setFinanceBusy(null)
    }
  }

  async function markPaymentAsPaid(payment: ProjectPayment) {
    if (!project) return
    try {
      setFinanceBusy(payment.id)
      setFinanceError(null)
      const response = await fetch(`/api/projects/${project.id}/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível marcar como recebido")
      await loadProjectPayments(project.id)
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setFinanceBusy(null)
    }
  }
  async function updateLifecycle(action: "complete" | "archive") {
    if (!project) return
    try {
      const response = await fetch(`/api/projects/${project.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "complete" ? { completed: !project.completedAt } : { archived: !project.archivedAt }),
      })
      if (!response.ok) throw new Error("Não foi possível alterar o projeto")
      const result = await response.json()
      setProject({
        ...project,
        completedAt: action === "complete" ? result.completedAt : project.completedAt,
        archivedAt: action === "archive" ? result.archivedAt : null,
        status: result.status ?? (action === "complete" ? (result.completedAt ? "Concluído" : "Planejamento") : project.status),
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
          throw new Error(body?.error ?? "Não foi possível carregar o projeto")
        }
        const data = await res.json()
        setProject(data)
        if (data.projectValueCents) setPlanValue(String(data.projectValueCents / 100))
        await loadProjectPayments(data.id)
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
                    Concluído
                  </span>
                )}
                {project.archivedAt && <span className="ml-2 inline-block rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">Arquivado</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/projects?edit=${project.id}`} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">Editar</Link>
                <a href="#project-tasks" className="rounded-lg border border-indigo-200 px-4 py-2 font-semibold text-indigo-700 hover:bg-indigo-50">Ver tarefas</a>
                <a href="#project-finance" className="rounded-lg border border-emerald-200 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30">Financeiro</a>
                <a href={`/api/reports?type=project&id=${project.id}&format=pdf`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">PDF</a>
                <a href={`/api/reports?type=project&id=${project.id}&format=csv`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">CSV</a>
                <a href={`/api/reports?type=project&id=${project.id}&format=pdf`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">PDF</a>
                <a href={`/api/reports?type=project&id=${project.id}&format=csv`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">CSV</a>
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
                <p className="text-gray-900 dark:text-white">{project.priority || "Média"}</p>
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
              {project.projectValueCents ? (<div><p className="text-gray-600 dark:text-slate-300 font-medium">Valor do projeto</p><p className="text-gray-900 dark:text-white">{formatMoney(project.projectValueCents)}</p></div>) : null}
              {project.commercialStatus ? (<div><p className="text-gray-600 dark:text-slate-300 font-medium">Status comercial</p><p className="text-gray-900 dark:text-white">{project.commercialStatus}</p></div>) : null}
              {project.projectValueCents ? (<div><p className="text-gray-600 dark:text-slate-300 font-medium">Valor do projeto</p><p className="text-gray-900 dark:text-white">{formatMoney(project.projectValueCents)}</p></div>) : null}
              {project.commercialStatus ? (<div><p className="text-gray-600 dark:text-slate-300 font-medium">Status comercial</p><p className="text-gray-900 dark:text-white">{project.commercialStatus}</p></div>) : null}
              {project.internalNotes ? (<div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"><p className="font-medium text-amber-800 dark:text-amber-300">Observações internas</p><p className="mt-1 text-sm text-amber-900 dark:text-amber-200">{project.internalNotes}</p></div>) : null}
              {project.description && (
                <div className="col-span-2">
                  <p className="text-gray-600 dark:text-slate-300 font-medium">Descrição</p>
                  <p className="text-gray-900 dark:text-white">{project.description}</p>
                </div>
              )}
              {project.completedAt && (
                <div><p className="text-gray-600 dark:text-slate-300 font-medium">Concluído em</p><p className="text-gray-900 dark:text-white">{new Date(project.completedAt).toLocaleDateString("pt-BR")}</p></div>
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
            <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Concluídas</p>
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


        <div id="project-finance" className="mb-8 scroll-mt-24 rounded-lg bg-white p-5 shadow-lg dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">Pro</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Financeiro do projeto</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Controle parcelas, recebidos e pendências deste projeto.</p>
            </div>
            <Link href="/finance" className="w-fit rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Abrir Central Financeira</Link>
          </div>

          {financeLocked ? (
            <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-500/40 dark:bg-indigo-950/20">
              <h3 className="font-bold text-slate-950 dark:text-white">Recurso exclusivo Pro</h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Assinantes Pro acompanham valores a receber, atrasos e receita por projeto.</p>
              <Link href="/pricing" className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Ver plano Pro</Link>
            </div>
          ) : (
            <>
              {financeError ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{financeError}</div> : null}
              {financeLoading ? <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Carregando financeiro...</p> : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <FinanceMiniCard label="Valor contratado" value={formatMoney(paymentsData?.summary.totalCents || project.projectValueCents || 0)} />
                <FinanceMiniCard label="Recebido" value={formatMoney(paymentsData?.summary.receivedCents || 0)} />
                <FinanceMiniCard label="Pendente" value={formatMoney(paymentsData?.summary.pendingCents || 0)} />
              </div>

              <form onSubmit={createPaymentPlan} className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="font-bold text-slate-950 dark:text-white">Criar plano de pagamento</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <label><span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Valor total</span><input type="number" min="0" step="0.01" value={planValue} onChange={(event) => setPlanValue(event.target.value)} className={projectFinanceInputClass} placeholder="0,00" /></label>
                  <label><span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Parcelas</span><input type="number" min="1" max="36" value={planInstallments} onChange={(event) => setPlanInstallments(event.target.value)} className={projectFinanceInputClass} /></label>
                  <label><span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">1º vencimento</span><input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} className={projectFinanceInputClass} /></label>
                  <label><span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Observação</span><input value={planNotes} onChange={(event) => setPlanNotes(event.target.value)} className={projectFinanceInputClass} placeholder="Opcional" /></label>
                </div>
                <button disabled={financeBusy === "plan"} className="mt-4 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{financeBusy === "plan" ? "Criando..." : "Gerar parcelas"}</button>
              </form>

              <div className="mt-6 space-y-3">
                {paymentsData?.payments.length ? paymentsData.payments.map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950 dark:text-white">{payment.description}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Vence em {formatDate(payment.dueDate)} · {formatMoney(payment.amountCents)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PaymentStatusBadge status={payment.displayStatus} />
                      {payment.displayStatus !== "PAID" && payment.displayStatus !== "CANCELED" ? <button type="button" disabled={financeBusy === payment.id} onClick={() => markPaymentAsPaid(payment)} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">Recebido</button> : null}
                    </div>
                  </div>
                )) : <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Nenhum plano financeiro criado para este projeto.</p>}
              </div>
            </>
          )}
        </div>
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
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Status: {task.completedAt ? "Concluída" : task.status} - Prioridade: {task.priority || "Média"} - Prazo: {task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR") : "Não informado"}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${
                        task.completedAt
                          ? "bg-green-100 text-green-800"
                          : task.priority === "Alta"
                          ? "bg-red-100 text-red-800"
                          : task.priority === "Média"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {task.completedAt ? "Concluída" : task.priority}
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Histórico do projeto</h2>
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


const projectFinanceInputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-950"

function FinanceMiniCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{value}</p></div>
}

function PaymentStatusBadge({ status }: { status: PaymentDisplayStatus }) {
  const labels = { PENDING: "Pendente", PAID: "Recebido", OVERDUE: "Atrasado", CANCELED: "Cancelado" }
  const colors = { PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300", OVERDUE: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300", CANCELED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" }
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors[status]}`}>{labels[status]}</span>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}
function formatMoney(value?: number | null) {
  if (!value) return "Não informado"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100)
}