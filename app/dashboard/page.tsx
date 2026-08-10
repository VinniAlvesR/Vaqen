import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasProAccess } from "@/lib/plan-rules"
import { getDashboardMetrics } from "@/lib/dashboard-metrics"

const periodFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
})

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/login")

  const userId = session.user.id
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  const proAccess = subscription ? hasProAccess(subscription) : false

  if (!proAccess) return <LockedDashboard />

  const metrics = await getDashboardMetrics(userId)

  return (
    <main className="min-h-screen px-4 py-5 text-slate-950 dark:text-white sm:px-6 sm:py-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative isolate px-6 py-8 sm:px-8 lg:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.16),_transparent_32%),linear-gradient(135deg,_#ffffff_0%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.24),_transparent_35%),linear-gradient(135deg,_#0f172a_0%,_#111827_100%)]" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-indigo-600 dark:text-indigo-300">Dashboard Pro</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Visão completa da operação, produtividade e financeiro.</h1>
              <p className="mt-2 max-w-3xl text-base text-slate-600 dark:text-slate-300">Análise gerencial do mês atual. A execução diária continua na Tela Hoje.</p>
              <p className="mt-4 inline-flex rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-slate-950/70 dark:text-indigo-200">
                Período: {periodFormatter.format(metrics.period.start)} até {periodFormatter.format(metrics.period.end)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/today" className="inline-flex w-[150px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">Ir para Hoje</Link>
              <Link href="/finance" className="inline-flex w-[150px] items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">Ver financeiro</Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Clientes ativos" value={metrics.summary.activeClients} helper={`${metrics.summary.archivedClients} arquivados`} tone="indigo" href="/clients" />
            <MetricCard label="Projetos ativos" value={metrics.summary.activeProjects} helper={`${metrics.summary.totalProjects} projetos no total`} tone="sky" href="/projects" />
            <MetricCard label="Tarefas abertas" value={metrics.summary.openTasks} helper={`${metrics.summary.totalTasks} tarefas no total`} tone="amber" href="/tasks" />
            <MetricCard label="Conclusão" value={`${metrics.summary.completionRate}%`} helper="taxa geral das tarefas" tone="emerald" />
            <MetricCard label="Criadas no mês" value={metrics.summary.taskFlow.totalCreated} helper="novas tarefas registradas" tone="violet" href="/tasks" />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Tarefas atrasadas" value={metrics.summary.overdueTasks} helper={`${metrics.summary.dueSoonTasks} vencem em 7 dias`} tone="red" href="/tasks" />
        <MetricCard label="Projetos entregues" value={metrics.summary.deliveredProjectsThisMonth} helper="no mês atual" tone="emerald" />
        <MetricCard label="A receber" value={formatMoney(metrics.summary.receivableCents)} helper="recebíveis abertos" tone="indigo" />
        <MetricCard label="Recebido no mês" value={formatMoney(metrics.summary.receivedThisMonthCents)} helper="entrada confirmada" tone="sky" />
        <MetricCard label="Pagamentos atrasados" value={metrics.summary.overduePayments} helper={formatMoney(metrics.summary.overduePaymentCents)} tone="red" href="/finance" />
      </section>

      <section className="mt-6 grid items-stretch gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ChartPanel title="Produtividade" eyebrow="Diário" description="Tarefas concluídas no mês atual, com datas reais do calendário.">
          <LineChart data={metrics.charts.completedByDay} />
        </ChartPanel>
        <MonthlyTaskBalanceCard data={metrics.charts.taskFlowByDay} summary={metrics.summary.taskFlow} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Criadas vs concluídas" eyebrow="Semanal" description="Comparação por semanas reais do calendário.">
          <GroupedBars data={metrics.charts.weeklyProductivity} />
        </ChartPanel>
        <ChartPanel title="Financeiro" eyebrow="Mensal" description="Recebido, aberto e atrasado no mês atual.">
          <HorizontalBars data={metrics.charts.financeFlow.map((item) => ({ label: item.label, value: Math.round(item.value / 100) }))} />
        </ChartPanel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Projetos por ciclo" eyebrow="Carteira" description="Distribuição atual dos projetos.">
          <DonutChart data={metrics.charts.projectLifecycle} />
        </ChartPanel>
        <ChartPanel title="Tarefas por prioridade" eyebrow="Execução" description="Volume por nível de prioridade.">
          <HorizontalBars data={metrics.charts.taskPriorities} />
        </ChartPanel>
        <ChartPanel title="Tarefas por status" eyebrow="Operação" description="Abertas, andamento, concluídas e atrasadas.">
          <HorizontalBars data={metrics.charts.taskStatuses} />
        </ChartPanel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-red-200 bg-white p-5 shadow-sm dark:border-red-500/30 dark:bg-slate-900 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600 dark:text-red-300">Riscos operacionais</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <RiskCard label="Tarefas atrasadas" value={metrics.risks.overdueTasks} href="/tasks" />
            <RiskCard label="Tarefas paradas" value={metrics.risks.staleTasks} href="/tasks" />
            <RiskCard label="Projetos com atraso" value={metrics.risks.recurrentOverdueProjects} href="/projects" />
            <RiskCard label="Clientes sem movimento" value={metrics.risks.staleClients} href="/clients" />
            <RiskCard label="Pagamentos atrasados" value={metrics.risks.overduePayments} href="/finance" />
            <RiskCard label="Vencem em 7 dias" value={metrics.risks.dueSoonTasks} href="/today" />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Indicadores</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Saúde da operação</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <InsightCard label="Pressão de prazo" value={metrics.risks.overdueTasks + metrics.risks.dueSoonTasks} helper="tarefas atrasadas ou próximas" />
            <InsightCard label="Eficiência" value={`${metrics.summary.completionRate}%`} helper="taxa geral de conclusão" />
            <InsightCard label="Carteira ativa" value={metrics.summary.activeClients} helper={`${metrics.summary.activeProjects} projetos ativos`} />
            <InsightCard label="Receita em aberto" value={formatMoney(metrics.summary.receivableCents)} helper="pendente de recebimento" />
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Use estes sinais para entender gargalos, pressão de entrega e previsibilidade da operação.</p>
        </section>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Ranking title="Clientes e projetos" eyebrow="Clientes mais ativos" empty="Nenhum cliente com atividade." items={metrics.rankings.clients.map((item) => ({ id: item.id, href: `/clients/${item.id}`, name: item.name, helper: `${item.total} tarefas · ${item.completed} concluídas`, rate: item.rate }))} />
        <Ranking title="Entregas" eyebrow="Projetos com mais tarefas" empty="Nenhum projeto com tarefas." items={metrics.rankings.projects.map((item) => ({ id: item.id, href: `/projects/${item.id}`, name: item.name, helper: `${item.total} tarefas · ${item.overdue} atrasadas${item.clientName ? ` · ${item.clientName}` : ""}`, rate: item.rate }))} />
      </section>
    </main>
  )
}

function LockedDashboard() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-slate-950 dark:text-white sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-indigo-200 bg-indigo-50 p-8 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-950/20">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">Dashboard Pro</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Análise completa da operação.</h1>
        <p className="mt-3 max-w-3xl text-slate-700 dark:text-slate-300">Desbloqueie gráficos de produtividade, financeiro, riscos, clientes, projetos, tarefas e atividade geral do Vaqen.</p>
        <Link href="/pricing" className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Ver plano Pro</Link>
      </section>
      <section className="mt-6 grid gap-4 opacity-80 sm:grid-cols-2 lg:grid-cols-4">
        <PreviewCard title="Produtividade" />
        <PreviewCard title="Financeiro" />
        <PreviewCard title="Riscos" />
        <PreviewCard title="Carteira" />
      </section>
    </main>
  )
}

function PreviewCard({ title }: { title: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="h-2 w-16 rounded-full bg-indigo-500" /><h2 className="mt-5 font-black text-slate-950 dark:text-white">{title}</h2><div className="mt-4 space-y-2">{[70, 45, 88].map((width) => <div key={width} className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" style={{ width: `${width}%` }} />)}</div></div>
}

function MetricCard({ label, value, helper, tone, href }: { label: string; value: string | number; helper: string; tone: "indigo" | "sky" | "amber" | "emerald" | "red" | "violet"; href?: string }) {
  const tones = { indigo: "from-indigo-500 to-violet-500", sky: "from-sky-500 to-cyan-500", amber: "from-amber-500 to-orange-500", emerald: "from-emerald-500 to-teal-500", red: "from-red-500 to-rose-500", violet: "from-violet-500 to-fuchsia-500" }
  const card = <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/60"><div className={`mb-4 h-2 w-14 rounded-full bg-gradient-to-r ${tones[tone]}`} /><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{helper}</p></article>
  return href ? <Link href={href} className="block">{card}</Link> : card
}

function ChartPanel({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: React.ReactNode }) {
  return <section className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">{eyebrow}</p><h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p><div className="mt-6 flex flex-1 flex-col">{children}</div></section>
}

function LineChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  const points = data.map((item, index) => `${(index / Math.max(data.length - 1, 1)) * 100},${100 - (item.value / max) * 88}`).join(" ")
  return <div><svg viewBox="0 0 100 110" className="h-40 w-full overflow-visible sm:h-44"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-600 dark:text-indigo-300" strokeLinecap="round" strokeLinejoin="round" />{data.map((item, index) => <circle key={`${item.label}-${index}`} cx={(index / Math.max(data.length - 1, 1)) * 100} cy={100 - (item.value / max) * 88} r="1.5" className="fill-indigo-600 dark:fill-indigo-300"><title>{`${item.label}: ${item.value}`}</title></circle>)}<line x1="0" y1="100" x2="100" y2="100" className="stroke-slate-200 dark:stroke-slate-800" /></svg><ChartScale data={data} /></div>
}

function MonthlyTaskBalanceCard({ data, summary }: { data: Array<{ label: string; cumulativeBalance: number }>; summary: { totalCreated: number; totalCompleted: number; netBalance: number } }) {
  const totalMovement = summary.totalCreated + summary.totalCompleted
  const values = data.map((item) => item.cumulativeBalance)
  const maxValue = Math.max(0, ...values)
  const minValue = Math.min(0, ...values)
  const range = Math.max(1, maxValue - minValue)
  const y = (value: number) => 88 - ((value - minValue) / range) * 72
  const x = (index: number) => (index / Math.max(data.length - 1, 1)) * 100
  const points = data.map((item, index) => `${x(index)},${y(item.cumulativeBalance)}`).join(" ")
  const baseY = y(0)
  const balanceLabel = summary.netBalance > 0 ? `+${summary.netBalance}` : String(summary.netBalance)
  const reading = totalMovement === 0
    ? "Nenhuma movimentação neste mês."
    : summary.netBalance > 0
      ? `Você acumulou ${summary.netBalance} tarefa${summary.netBalance === 1 ? "" : "s"}.`
      : summary.netBalance < 0
        ? `Você reduziu ${Math.abs(summary.netBalance)} tarefa${Math.abs(summary.netBalance) === 1 ? "" : "s"}.`
        : "Entrada e saída equilibradas."
  const tone = totalMovement === 0
    ? "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
    : summary.netBalance > 0
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200"
      : summary.netBalance < 0
        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-200"
        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"

  return (
    <section className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Fluxo</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Saldo do mês</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Entrada menos saída de tarefas.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-5xl font-black tracking-tight text-slate-950 dark:text-white">{balanceLabel}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">saldo líquido</p>
        </div>
        <div className={`max-w-[13rem] rounded-2xl border px-3 py-2 text-right text-sm font-bold ${tone}`}>{reading}</div>
      </div>

      <svg viewBox="0 0 100 96" className="mt-5 h-24 w-full overflow-visible rounded-3xl bg-slate-50 p-3 dark:bg-slate-950 sm:h-28" role="img" aria-label="Saldo acumulado de tarefas no mês">
        <line x1="0" y1={baseY} x2="100" y2={baseY} className="stroke-slate-300 dark:stroke-slate-700" strokeDasharray="4 4" />
        {totalMovement > 0 ? <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Criadas</p>
          <p className="mt-1 text-2xl font-black text-sky-600 dark:text-sky-300">{summary.totalCreated}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Concluídas</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-300">{summary.totalCompleted}</p>
        </div>
      </div>
    </section>
  )
}
function GroupedBars({ data }: { data: Array<{ label: string; created: number; completed: number }> }) {
  const max = Math.max(1, ...data.flatMap((item) => [item.created, item.completed]))
  return <div className="space-y-4">{data.map((item) => <div key={item.label}><div className="mb-2 flex justify-between gap-4 text-xs font-bold text-slate-500 dark:text-slate-400"><span>{item.label}</span><span>{item.created} criadas · {item.completed} concluídas</span></div><div className="grid gap-2"><div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(item.created / max) * 100}%` }} /></div><div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.completed / max) * 100}%` }} /></div></div></div>)}</div>
}

function HorizontalBars({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  return <div className="space-y-4">{data.map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-700 dark:text-slate-200">{item.label}</span><span className="text-slate-500 dark:text-slate-400">{item.value}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${(item.value / max) * 100}%` }} /></div></div>)}</div>
}

function DonutChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0))
  const colors = ["#4f46e5", "#10b981", "#64748b"]
  const segments = data.map((item, index) => {
    const value = (item.value / total) * 100
    const previous = data.slice(0, index).reduce((sum, current) => sum + (current.value / total) * 100, 0)

    return { ...item, color: colors[index % colors.length], strokeDasharray: `${value} ${100 - value}`, strokeDashoffset: 25 - previous }
  })

  return <div className="grid gap-5 sm:grid-cols-[160px_1fr] sm:items-center"><svg viewBox="0 0 42 42" className="h-40 w-40"><circle cx="21" cy="21" r="15.915" fill="transparent" stroke="currentColor" strokeWidth="7" className="text-slate-100 dark:text-slate-800" />{segments.map((item) => <circle key={item.label} cx="21" cy="21" r="15.915" fill="transparent" stroke={item.color} strokeWidth="7" strokeDasharray={item.strokeDasharray} strokeDashoffset={item.strokeDashoffset} />)}<text x="21" y="23" textAnchor="middle" className="fill-slate-950 text-[0.38rem] font-black dark:fill-white">{total}</text></svg><div className="space-y-3">{segments.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200"><span className="h-3 w-3 rounded-full" style={{ background: item.color }} />{item.label}</span><span className="text-slate-500 dark:text-slate-400">{item.value}</span></div>)}</div></div>
}

function RiskCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const card = <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-red-300 hover:bg-red-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-red-500/50 dark:hover:bg-red-950/20"><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p></div>
  return href ? <Link href={href} className="block">{card}</Link> : card
}

function InsightCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helper}</p></div>
}

function Ranking({ title, eyebrow, empty, items }: { title: string; eyebrow: string; empty: string; items: Array<{ id: string; href: string; name: string; helper: string; rate: number }> }) {
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{eyebrow}</p><h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{title}</h2>{items.length ? <div className="mt-5 space-y-3">{items.map((item) => <Link key={item.id} href={item.href} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800"><div className="flex items-center justify-between gap-4"><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-950 dark:text-white">{item.name}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.helper}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-900"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${item.rate}%` }} /></div></div><span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-white dark:bg-white dark:text-slate-950">{item.rate}%</span></div></Link>)}</div> : <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{empty}</p>}</section>
}

function ChartScale({ data }: { data: Array<{ label: string; value: number }> }) {
  const visible = data.filter((_, index) => index === 0 || index === data.length - 1 || index % 7 === 0)
  return <div className="mt-3 flex justify-between gap-2 text-[11px] font-bold text-slate-400">{visible.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div>
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value ?? 0) / 100)
}
