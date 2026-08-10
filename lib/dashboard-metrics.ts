import { prisma } from "@/lib/prisma"
import { normalizePaymentStatus } from "@/lib/finance"

const TIMEZONE = "America/Sao_Paulo"

export type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>

type FinancePayment = {
  amountCents: number
  dueDate: Date
  paidAt: Date | null
  status: string
}

type DashboardDay = {
  key: string
  label: string
  date: Date
}

export async function getDashboardMetrics(userId: string, now = new Date()) {
  const todayStart = startOfToday(now)
  const tomorrowStart = addDays(todayStart, 1)
  const monthStart = startOfMonth(now)
  const days = buildDays(monthStart, tomorrowStart)
  const weeks = buildWeeks(monthStart, tomorrowStart)

  const [clients, projects, tasks, finance] = await Promise.all([
    prisma.client.findMany({
      where: { userId, deletedAt: null },
      include: { projects: { where: { deletedAt: null }, include: { tasks: { where: { deletedAt: null } } } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId, deletedAt: null },
      include: { client: { select: { id: true, name: true } }, tasks: { where: { deletedAt: null } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { userId, deletedAt: null },
      include: { project: { select: { id: true, name: true, client: { select: { name: true } } } } },
      orderBy: { updatedAt: "desc" },
    }),

    getFinanceMetrics(userId, todayStart, monthStart),
  ])

  const openTasks = tasks.filter((task) => !isTaskCompleted(task))
  const completedTasks = tasks.filter((task) => isTaskCompleted(task))
  const tasksCreatedThisMonth = tasks.filter((task) => task.createdAt >= monthStart && task.createdAt < tomorrowStart)
  const tasksCompletedThisMonth = completedTasks.filter((task) => {
    const completedDate = getTaskCompletedDate(task)
    return completedDate >= monthStart && completedDate < tomorrowStart
  })
  const monthlyTaskIds = new Set([...tasksCreatedThisMonth, ...tasksCompletedThisMonth].map((task) => task.id))
  const monthlyTaskBase = monthlyTaskIds.size
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < todayStart)
  const dueSoonTasks = openTasks.filter((task) => task.dueDate && task.dueDate >= todayStart && task.dueDate <= addDays(todayStart, 7))
  const completionRate = monthlyTaskBase ? Math.round((tasksCompletedThisMonth.length / monthlyTaskBase) * 100) : 0
  const deliveredProjectsThisMonth = projects.filter((project) => project.completedAt && project.completedAt >= monthStart && project.completedAt < tomorrowStart).length

  const createdByDay = countByDay(tasksCreatedThisMonth.map((task) => task.createdAt), days)
  const completedByDay = countByDay(tasksCompletedThisMonth.map((task) => getTaskCompletedDate(task)), days)

  let cumulativeTaskBalance = 0
  const taskFlowByDay = days.map((day) => {
    const created = createdByDay.get(day.key) ?? 0
    const completed = completedByDay.get(day.key) ?? 0
    const dailyBalance = created - completed
    cumulativeTaskBalance += dailyBalance
    return { label: day.label, created, completed, dailyBalance, cumulativeBalance: cumulativeTaskBalance }
  })
  const totalTasksCreatedThisMonth = taskFlowByDay.reduce((sum, item) => sum + item.created, 0)
  const totalTasksCompletedThisMonth = taskFlowByDay.reduce((sum, item) => sum + item.completed, 0)
  const taskNetBalance = totalTasksCreatedThisMonth - totalTasksCompletedThisMonth
  const emptyTaskFlowDay = { label: "", created: 0, completed: 0, dailyBalance: 0, cumulativeBalance: 0 }
  const bestExitDay = taskFlowByDay.reduce((best, item) => item.completed > best.completed ? item : best, taskFlowByDay[0] ?? emptyTaskFlowDay)
  const worstAccumulationDay = taskFlowByDay.reduce((worst, item) => item.dailyBalance > worst.dailyBalance ? item : worst, taskFlowByDay[0] ?? emptyTaskFlowDay)

  const weeklyProductivity = weeks.map((week) => ({
    label: `${dayLabel(week.start)} a ${dayLabel(addDays(week.end, -1))}`,
    created: tasksCreatedThisMonth.filter((task) => task.createdAt >= week.start && task.createdAt < week.end).length,
    completed: tasksCompletedThisMonth.filter((task) => {
      const completedDate = getTaskCompletedDate(task)
      return completedDate >= week.start && completedDate < week.end
    }).length,
  }))

  const projectLifecycle = [
    { label: "Ativos", value: projects.filter((project) => !project.completedAt && !project.archivedAt).length },
    { label: "Concluídos", value: projects.filter((project) => project.completedAt).length },
    { label: "Arquivados", value: projects.filter((project) => project.archivedAt).length },
  ]

  const taskPriorities = ["Urgente", "Alta", "Média", "Media", "Baixa"]
    .map((priority) => ({
      label: priority === "Media" ? "Média" : priority,
      value: tasks.filter((task) => task.priority === priority).length,
    }))
    .reduce((items, item) => {
      const current = items.find((entry) => entry.label === item.label)
      if (current) current.value += item.value
      else items.push(item)
      return items
    }, [] as Array<{ label: string; value: number }>)

  const taskStatuses = [
    { label: "Abertas", value: openTasks.length },
    { label: "Em andamento", value: openTasks.filter((task) => task.status === "Em andamento").length },
    { label: "Concluídas", value: completedTasks.length },
    { label: "Atrasadas", value: overdueTasks.length },
  ]

  const clientRanking = clients
    .map((client) => {
      const clientTasks = client.projects.flatMap((project) => project.tasks).filter((task) => isTaskInPeriod(task, monthStart, tomorrowStart))
      const completed = clientTasks.filter((task) => {
        if (!isTaskCompleted(task)) return false
        const completedDate = getTaskCompletedDate(task)
        return completedDate >= monthStart && completedDate < tomorrowStart
      }).length
      return { id: client.id, name: client.name, total: clientTasks.length, completed, rate: clientTasks.length ? Math.round((completed / clientTasks.length) * 100) : 0 }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const projectRanking = projects
    .map((project) => {
      const projectTasks = project.tasks.filter((task) => isTaskInPeriod(task, monthStart, tomorrowStart))
      const completed = projectTasks.filter((task) => {
        if (!isTaskCompleted(task)) return false
        const completedDate = getTaskCompletedDate(task)
        return completedDate >= monthStart && completedDate < tomorrowStart
      }).length
      return {
        id: project.id,
        name: project.name,
        clientName: project.client?.name ?? null,
        total: projectTasks.length,
        completed,
        rate: projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0,
        overdue: project.tasks.filter((task) => !isTaskCompleted(task) && task.dueDate && task.dueDate < todayStart).length,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const recurrentOverdueProjects = projectRanking.filter((project) => project.overdue > 0).length
  const staleTasks = openTasks.filter((task) => task.updatedAt < addDays(todayStart, -7)).length
  const staleClients = clients.filter((client) => client.updatedAt < addDays(todayStart, -30)).length

  return {
    period: { label: "Mês atual", start: monthStart, end: now },
    summary: {
      activeClients: clients.filter((client) => !client.archivedAt).length,
      archivedClients: clients.filter((client) => client.archivedAt).length,
      activeProjects: projects.filter((project) => !project.completedAt && !project.archivedAt).length,
      totalProjects: projects.length,
      openTasks: openTasks.length,
      totalTasks: tasks.length,
      completionRate,
      overdueTasks: overdueTasks.length,
      dueSoonTasks: dueSoonTasks.length,
      deliveredProjectsThisMonth,
      receivedThisMonthCents: finance.receivedThisMonthCents,
      receivableCents: finance.receivableCents,
      overduePayments: finance.overdueCount,
      overduePaymentCents: finance.overdueCents,
      taskFlow: {
        totalCreated: totalTasksCreatedThisMonth,
        totalCompleted: totalTasksCompletedThisMonth,
        netBalance: taskNetBalance,
        bestExitDay: bestExitDay.label ? { label: bestExitDay.label, value: bestExitDay.completed } : null,
        worstAccumulationDay: worstAccumulationDay.label ? { label: worstAccumulationDay.label, value: worstAccumulationDay.dailyBalance } : null,
      },
    },
    charts: {
      completedByDay: days.map((day) => ({ label: day.label, value: completedByDay.get(day.key) ?? 0 })),
      weeklyProductivity,
      projectLifecycle,
      taskPriorities,
      taskStatuses,
      financeFlow: [
        { label: "Recebido", value: finance.receivedThisMonthCents },
        { label: "A receber", value: finance.receivableCents },
        { label: "Atrasado", value: finance.overdueCents },
      ],
      createdVsCompletedByDay: taskFlowByDay.map(({ label, created, completed }) => ({ label, created, completed })),
      taskFlowByDay,
    },
    rankings: { clients: clientRanking, projects: projectRanking },
    risks: { overdueTasks: overdueTasks.length, dueSoonTasks: dueSoonTasks.length, recurrentOverdueProjects, staleTasks, staleClients, overduePayments: finance.overdueCount },
  }
}

async function getFinanceMetrics(userId: string, todayStart: Date, monthStart: Date) {
  const client = prisma as typeof prisma & {
    projectPayment?: {
      findMany: (args: unknown) => Promise<FinancePayment[]>
    }
  }

  if (!client.projectPayment) return emptyFinance()

  try {
    const payments = await client.projectPayment.findMany({
      where: { userId, project: { deletedAt: null } },
      select: { amountCents: true, dueDate: true, paidAt: true, status: true },
    })
    const normalized = payments.map((payment) => ({ ...payment, displayStatus: normalizePaymentStatus(payment as never) }))
    const receivable = normalized.filter((payment) => payment.displayStatus === "PENDING" || payment.displayStatus === "OVERDUE")
    const overdue = normalized.filter((payment) => payment.displayStatus === "OVERDUE" || (!payment.paidAt && payment.status !== "CANCELED" && payment.dueDate < todayStart))
    const receivedThisMonth = normalized.filter((payment) => payment.paidAt && payment.paidAt >= monthStart)
    return {
      receivableCents: receivable.reduce((sum, payment) => sum + payment.amountCents, 0),
      receivedThisMonthCents: receivedThisMonth.reduce((sum, payment) => sum + payment.amountCents, 0),
      overdueCents: overdue.reduce((sum, payment) => sum + payment.amountCents, 0),
      overdueCount: overdue.length,
    }
  } catch (cause) {
    if (isMissingFinanceMigrationError(cause)) return emptyFinance()
    throw cause
  }
}

function emptyFinance() {
  return { receivableCents: 0, receivedThisMonthCents: 0, overdueCents: 0, overdueCount: 0 }
}

function countByDay(dates: Date[], days: DashboardDay[]) {
  const allowed = new Set(days.map((day) => day.key))
  const result = new Map<string, number>()
  for (const date of dates) {
    const key = dateKey(date)
    if (allowed.has(key)) result.set(key, (result.get(key) ?? 0) + 1)
  }
  return result
}

function buildDays(start: Date, endExclusive: Date): DashboardDay[] {
  const days: DashboardDay[] = []
  for (let current = start; current < endExclusive; current = addDays(current, 1)) {
    days.push({ key: dateKey(current), label: dayLabel(current), date: current })
  }
  return days
}

function buildWeeks(start: Date, endExclusive: Date) {
  const weeks: Array<{ start: Date; end: Date }> = []
  for (let current = start; current < endExclusive; current = addDays(current, 7)) {
    const end = addDays(current, 7)
    weeks.push({ start: current, end: end < endExclusive ? end : endExclusive })
  }
  return weeks
}

function isTaskInPeriod(task: { createdAt: Date; updatedAt: Date; completedAt: Date | null; status: string }, start: Date, endExclusive: Date) {
  const completedDate = isTaskCompleted(task) ? getTaskCompletedDate(task) : null
  return (task.createdAt >= start && task.createdAt < endExclusive) || Boolean(completedDate && completedDate >= start && completedDate < endExclusive)
}

function isTaskCompleted(task: { completedAt: Date | null; status: string }) {
  return Boolean(task.completedAt) || task.status.toLowerCase().includes("conclu")
}

function getTaskCompletedDate(task: { updatedAt: Date; completedAt: Date | null }) {
  return task.completedAt ?? task.updatedAt
}

function startOfToday(date: Date) {
  const [year, month, day] = dateKey(date).split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0))
}

function startOfMonth(date: Date) {
  const [year, month] = dateKey(date).split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, 1, 3, 0, 0))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit" }).format(date)
}

function isMissingFinanceMigrationError(cause: unknown) {
  return typeof cause === "object" && cause !== null && "code" in cause && ["P2021", "P2022"].includes(String((cause as { code?: unknown }).code))
}
