import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import RecentItems from "@/components/RecentItems"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
})

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/login")

  const userId = session.user.id
  const now = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)

  const [
    clientCount,
    projectCount,
    activeProjectCount,
    archivedClientCount,
    tasksInProgressCount,
    openTaskCount,
    totalTaskCount,
    completedTaskCount,
    tasksCompletedLast7Days,
    overdueTaskCount,
    dueSoonTaskCount,
    clients,
    projects,
    dueSoonTasks,
    recentActivities,
  ] = await Promise.all([
    prisma.client.count({ where: { userId, deletedAt: null } }),
    prisma.project.count({ where: { userId, deletedAt: null } }),
    prisma.project.count({ where: { userId, deletedAt: null, completedAt: null, archivedAt: null } }),
    prisma.client.count({ where: { userId, deletedAt: null, archivedAt: { not: null } } }),
    prisma.task.count({ where: { userId, deletedAt: null, status: "Em andamento" } }),
    prisma.task.count({ where: { userId, deletedAt: null, completedAt: null } }),
    prisma.task.count({ where: { userId, deletedAt: null } }),
    prisma.task.count({ where: { userId, deletedAt: null, completedAt: { not: null } } }),
    prisma.task.count({ where: { userId, deletedAt: null, completedAt: { gte: sevenDaysAgo } } }),
    prisma.task.count({ where: { userId, deletedAt: null, completedAt: null, dueDate: { lt: startOfToday(now) } } }),
    prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        completedAt: null,
        dueDate: { gte: startOfToday(now), lte: addDays(startOfToday(now), 7) },
      },
    }),
    prisma.client.findMany({
      where: { userId, deletedAt: null },
      include: { projects: { where: { deletedAt: null }, include: { tasks: { where: { deletedAt: null } } } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.project.findMany({
      where: { userId, deletedAt: null },
      include: { client: true, tasks: { where: { deletedAt: null } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        completedAt: null,
        dueDate: { not: null },
      },
      include: { project: { include: { client: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ])

  const completionRate = totalTaskCount ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0
  const clientMetrics = clients
    .map((client) => {
      const tasks = client.projects.flatMap((project) => project.tasks)
      const completed = tasks.filter((task) => task.completedAt).length
      return { ...client, total: tasks.length, completed, rate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0 }
    })
    .sort((a, b) => b.total - a.total)
  const projectMetrics = projects
    .map((project) => {
      const completed = project.tasks.filter((task) => task.completedAt).length
      return { ...project, total: project.tasks.length, completed, rate: project.tasks.length ? Math.round((completed / project.tasks.length) * 100) : 0 }
    })
    .sort((a, b) => b.total - a.total)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="vaqen-dashboard-hero overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="relative isolate px-6 py-8 sm:px-8 lg:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.16),_transparent_32%),linear-gradient(135deg,_#ffffff_0%,_#eef2ff_100%)]" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Dashboard</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-3xl sm:text-4xl">Visão geral do Vaqen</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-600">
                Acompanhe carteira, entregas e execução em um painel único.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/today" className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                Ver prioridades
              </Link>
              <Link href="/projects" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700">
                Ver projetos
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Clientes" value={clientCount} helper={`${archivedClientCount} arquivados`} tone="indigo" />
            <StatCard label="Projetos ativos" value={activeProjectCount} helper={`${projectCount} projetos no total`} tone="sky" />
            <StatCard label="Tarefas abertas" value={openTaskCount} helper={`${tasksInProgressCount} em andamento`} tone="amber" />
            <StatCard label="Conclusão" value={`${completionRate}%`} helper={`${completedTaskCount} de ${totalTaskCount} tarefas`} tone="emerald" />
          </div>
        </div>
      </section>

      <div className="mt-6">
        <RecentItems />
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Execução</p>
              <h2 className="mt-1 text-2xl font-bold">Progresso das tarefas</h2>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              {tasksCompletedLast7Days} concluídas em 7 dias
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl sm:text-4xl sm:text-5xl font-bold tracking-tight">{completionRate}%</p>
                <p className="mt-2 text-sm text-slate-500">Taxa geral de conclusão</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>{completedTaskCount} concluídas</p>
                <p>{openTaskCount} abertas</p>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500" style={{ width: `${completionRate}%` }} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Atrasadas" value={overdueTaskCount} />
            <MiniStat label="Vencem em 7 dias" value={dueSoonTaskCount} />
            <MiniStat label="Em andamento" value={tasksInProgressCount} />
          </div>
        </div>

        <Panel title="Próximos vencimentos" eyebrow="Agenda" empty="Nenhuma tarefa com prazo definido.">
          {dueSoonTasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{task.project?.name ?? "Sem projeto"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  {task.dueDate ? dateFormatter.format(task.dueDate) : "Sem prazo"}
                </span>
              </div>
            </Link>
          ))}
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <MetricList
          title="Métricas por cliente"
          eyebrow="Carteira"
          empty="Nenhum cliente encontrado."
          items={clientMetrics.map((item) => ({
            id: item.id,
            href: `/clients/${item.id}`,
            name: item.name,
            total: item.total,
            completed: item.completed,
            rate: item.rate,
          }))}
        />
        <MetricList
          title="Métricas por projeto"
          eyebrow="Entregas"
          empty="Nenhum projeto encontrado."
          items={projectMetrics.map((item) => ({
            id: item.id,
            href: `/projects/${item.id}`,
            name: item.name,
            total: item.total,
            completed: item.completed,
            rate: item.rate,
          }))}
        />
      </section>

      <section className="mt-6">
        <Panel title="Atividade recente" eyebrow="Histórico" empty="Nenhuma atividade registrada ainda.">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{formatActivityAction(activity.action)}</p>
                  <p className="mt-1 text-sm text-slate-500">{activity.detail ?? formatEntity(activity.entity)}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-400">{dateFormatter.format(activity.createdAt)}</span>
              </div>
            </div>
          ))}
        </Panel>
      </section>
    </main>
  )
}

function StatCard({ label, value, helper, tone }: {
  label: string
  value: string | number
  helper: string
  tone: "indigo" | "sky" | "amber" | "emerald"
}) {
  const tones = {
    indigo: "from-indigo-500 to-violet-500",
    sky: "from-sky-500 to-cyan-500",
    amber: "from-amber-500 to-orange-500",
    emerald: "from-emerald-500 to-teal-500",
  }

  return (
    <article className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div className={`mb-4 h-2 w-14 rounded-full bg-gradient-to-r ${tones[tone]}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function Panel({ title, eyebrow, empty, children }: {
  title: string
  eyebrow: string
  empty: string
  children: React.ReactNode[]
}) {
  const hasChildren = children.length > 0

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
      {!hasChildren ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="mt-5 space-y-3">{children}</div>
      )}
    </section>
  )
}

function MetricList({ title, eyebrow, empty, items }: {
  title: string
  eyebrow: string
  empty: string
  items: Array<{ id: string; href: string; name: string; total: number; completed: number; rate: number }>
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
      {!items.length ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.total} tarefas · {item.completed} concluídas</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${item.rate}%` }} />
                  </div>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-white">{item.rate}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function startOfToday(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function formatActivityAction(action: string) {
  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatEntity(entity: string) {
  const labels: Record<string, string> = {
    client: "Cliente",
    project: "Projeto",
    task: "Tarefa",
  }

  return labels[entity] ?? entity
}
