"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

type DisplayStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELED"

type Payment = {
  id: string
  projectId: string
  description: string
  amountCents: number
  dueDate: string
  paidAt: string | null
  status: DisplayStatus
  displayStatus: DisplayStatus
  method: string
  notes?: string | null
  project: { id: string; name: string; client?: { id: string; name: string } | null }
}

type FinanceSummary = {
  periodKey: string
  totals: {
    receivableCents: number
    receivedThisMonthCents: number
    overdueCents: number
    dueThisMonthCents: number
    overdueCount: number
    openCount: number
  }
  upcomingPayments: Payment[]
  payments: Payment[]
  topClients: Array<{ id: string; name: string; amountCents: number }>
  topProjects: Array<{ id: string; name: string; clientName: string | null; amountCents: number }>
}

type Option = { id: string; name: string; clientName?: string | null }

const statusOptions = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendentes" },
  { value: "OVERDUE", label: "Atrasados" },
  { value: "PAID", label: "Recebidos" },
  { value: "CANCELED", label: "Cancelados" },
]

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [clients, setClients] = useState<Option[]>([])
  const [projects, setProjects] = useState<Option[]>([])
  const [status, setStatus] = useState("ALL")
  const [clientId, setClientId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ status, month })
      if (clientId) params.set("clientId", clientId)
      if (projectId) params.set("projectId", projectId)
      const response = await fetch(`/api/finance/summary?${params.toString()}`, { cache: "no-store" })
      if (response.status === 403) {
        setLocked(true)
        setSummary(null)
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível carregar o financeiro")
      setLocked(false)
      setSummary(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [clientId, month, projectId, status])

  useEffect(() => {
    Promise.all([fetch("/api/clients"), fetch("/api/projects?lifecycle=all")]).then(async ([clientRes, projectRes]) => {
      if (clientRes.ok) setClients(await clientRes.json())
      if (projectRes.ok) setProjects(await projectRes.json())
    }).catch(() => null)
  }, [])

  useEffect(() => { load() }, [load])

  const visibleProjects = useMemo(() => clientId ? projects.filter((project) => project.clientName && clients.find((client) => client.id === clientId)?.name === project.clientName) : projects, [clientId, clients, projects])

  async function markAsPaid(payment: Payment) {
    try {
      setBusyId(payment.id)
      const response = await fetch(`/api/projects/${payment.projectId}/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message ?? "Não foi possível marcar como recebido")
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setBusyId(null)
    }
  }

  if (locked) return <LockedFinance />

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-slate-950 dark:text-white sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-indigo-600 dark:text-indigo-300">Pro</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Central Financeira</h1>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Controle recebíveis, pagamentos atrasados e receita por cliente/projeto sem processar cobrança pelo Vaqen.</p>
          </div>
          <Link href="/projects" className="w-fit rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Criar plano em um projeto</Link>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Mês"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={inputClass} /></Field>
          <Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <Field label="Cliente"><select value={clientId} onChange={(event) => { setClientId(event.target.value); setProjectId("") }} className={inputClass}><option value="">Todos</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
          <Field label="Projeto"><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={inputClass}><option value="">Todos</option>{visibleProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
        </div>
      </section>

      {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}
      {loading ? <p className="mt-8 text-slate-500 dark:text-slate-400">Carregando financeiro...</p> : null}

      {summary ? (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-4">
            <MetricCard label="A receber" value={formatMoney(summary.totals.receivableCents)} helper={`${summary.totals.openCount} parcela(s) abertas`} tone="indigo" />
            <MetricCard label="Recebido no mês" value={formatMoney(summary.totals.receivedThisMonthCents)} helper={`Período ${summary.periodKey}`} tone="emerald" />
            <MetricCard label="Atrasado" value={formatMoney(summary.totals.overdueCents)} helper={`${summary.totals.overdueCount} parcela(s) vencidas`} tone="red" />
            <MetricCard label="Vence no mês" value={formatMoney(summary.totals.dueThisMonthCents)} helper="Previsão de entrada" tone="sky" />
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black">Recebíveis</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">Até 100 itens</span></div>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead><tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400"><th className="py-3 pr-4">Descrição</th><th className="px-4 py-3">Projeto</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="py-3 pl-4 text-right">Ação</th></tr></thead>
                  <tbody>{summary.payments.length ? summary.payments.map((payment) => <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-800"><td className="py-4 pr-4 font-semibold text-slate-900 dark:text-white">{payment.description}</td><td className="px-4 py-4"><Link href={`/projects/${payment.projectId}`} className="text-indigo-700 hover:underline dark:text-indigo-300">{payment.project.name}</Link><p className="text-xs text-slate-500">{payment.project.client?.name ?? "Sem cliente"}</p></td><td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatDate(payment.dueDate)}</td><td className="px-4 py-4 font-bold">{formatMoney(payment.amountCents)}</td><td className="px-4 py-4"><StatusBadge status={payment.displayStatus} /></td><td className="py-4 pl-4 text-right">{payment.displayStatus !== "PAID" && payment.displayStatus !== "CANCELED" ? <button disabled={busyId === payment.id} onClick={() => markAsPaid(payment)} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">Recebido</button> : <span className="text-xs text-slate-400">-</span>}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">Nenhum recebível encontrado.</td></tr>}</tbody>
                </table>
              </div>
            </div>

            <aside className="space-y-6">
              <Ranking title="Clientes com maior valor" items={summary.topClients.map((item) => ({ id: item.id, name: item.name, helper: formatMoney(item.amountCents) }))} />
              <Ranking title="Projetos mais valiosos" items={summary.topProjects.map((item) => ({ id: item.id, name: item.name, helper: `${formatMoney(item.amountCents)}${item.clientName ? ` · ${item.clientName}` : ""}` }))} />
            </aside>
          </section>
        </>
      ) : null}
    </main>
  )
}

function LockedFinance() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-950 dark:text-white sm:px-6">
      <section className="rounded-[2rem] border border-indigo-200 bg-indigo-50 p-8 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-950/20">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">Pro</p>
        <h1 className="mt-3 text-3xl font-black">Central Financeira</h1>
        <p className="mt-3 max-w-2xl text-slate-700 dark:text-slate-300">Veja valores a receber, pagamentos atrasados, receita por cliente e previsibilidade de entrada. Este diagnóstico financeiro é exclusivo para assinantes Pro.</p>
        <Link href="/pricing" className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Ver plano Pro</Link>
      </section>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>{children}</label>
}

const inputClass = "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"

function MetricCard({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: "indigo" | "emerald" | "red" | "sky" }) {
  const tones = { indigo: "from-indigo-500 to-violet-500", emerald: "from-emerald-500 to-teal-500", red: "from-red-500 to-rose-500", sky: "from-sky-500 to-cyan-500" }
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className={`mb-4 h-2 w-14 rounded-full bg-gradient-to-r ${tones[tone]}`} /><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{helper}</p></article>
}

function Ranking({ title, items }: { title: string; items: Array<{ id: string; name: string; helper: string }> }) {
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="font-black text-slate-950 dark:text-white">{title}</h2><div className="mt-4 space-y-3">{items.length ? items.map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="font-bold text-slate-900 dark:text-white">{item.name}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.helper}</p></div>) : <p className="text-sm text-slate-500 dark:text-slate-400">Sem dados suficientes.</p>}</div></section>
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  const labels = { PENDING: "Pendente", PAID: "Recebido", OVERDUE: "Atrasado", CANCELED: "Cancelado" }
  const colors = { PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300", OVERDUE: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300", CANCELED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" }
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors[status]}`}>{labels[status]}</span>
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value ?? 0) / 100)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}
