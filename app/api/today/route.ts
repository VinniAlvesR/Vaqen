import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"
import { hasProAccess } from "@/lib/plan-rules"

const MS_PER_DAY = 86_400_000

function dateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function localDay(key: string, timeZone: string) {
  const offset = timeZone === "America/Manaus" ? "04" : "03"
  const start = new Date(`${key}T${offset}:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

function startOfWeek(todayStart: Date, now: Date, timeZone: string) {
  const weekStart = new Date(todayStart)
  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now)
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName)
  weekStart.setUTCDate(weekStart.getUTCDate() - (weekday === 0 ? 6 : weekday - 1))
  return weekStart
}

function diffDays(from: Date, to: Date) {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY))
}

function taskScore(task: TodayTaskSource, todayStart: Date) {
  const dueDate = task.dueDate
  const overdueDays = dueDate && dueDate < todayStart ? Math.max(1, Math.floor((todayStart.getTime() - dueDate.getTime()) / MS_PER_DAY)) : 0
  const daysUntilDue = dueDate ? Math.max(0, Math.ceil((dueDate.getTime() - todayStart.getTime()) / MS_PER_DAY)) : 30
  const priorityScore = task.priority === "Urgente" ? 45 : task.priority === "Alta" ? 28 : task.priority === "Média" || task.priority === "Media" ? 12 : 4
  const deadlineScore = overdueDays ? overdueDays * 18 + 60 : Math.max(0, 35 - daysUntilDue * 5)
  const statusScore = task.status === "Em andamento" ? 8 : 0
  return priorityScore + deadlineScore + statusScore
}

type TodayTaskSource = Awaited<ReturnType<typeof getOpenTasks>>[number]

async function getOpenTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId, deletedAt: null, completedAt: null },
    include: { project: { include: { client: { select: { name: true } } } } },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
  })
}

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      preferences: { select: { timezone: true } },
      subscription: true,
    },
  })

  const proAccess = user?.subscription ? hasProAccess(user.subscription) : false
  const timeZone = user?.preferences?.timezone ?? "America/Sao_Paulo"
  const now = new Date()
  const today = dateKey(now, timeZone)
  const { start: todayStart, end: tomorrowStart } = localDay(today, timeZone)
  const weekStart = startOfWeek(todayStart, now, timeZone)
  const weekEnd = new Date(tomorrowStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  const projectLimit = new Date(tomorrowStart)
  projectLimit.setUTCDate(projectLimit.getUTCDate() + 7)
  const staleTaskLimit = new Date(now)
  staleTaskLimit.setUTCDate(staleTaskLimit.getUTCDate() - 7)
  const staleClientLimit = new Date(now)
  staleClientLimit.setUTCDate(staleClientLimit.getUTCDate() - 30)

  const [openTasks, projects, weeklyTasks, staleTasks, staleClients] = await Promise.all([
    getOpenTasks(userId),
    prisma.project.findMany({
      where: { userId, deletedAt: null, archivedAt: null, completedAt: null, dueDate: { gte: todayStart, lt: projectLimit } },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, deletedAt: null, completedAt: { gte: weekStart, lt: tomorrowStart } },
      select: { projectId: true },
    }),
    prisma.task.findMany({
      where: { userId, deletedAt: null, completedAt: null, updatedAt: { lt: staleTaskLimit } },
      include: { project: { include: { client: { select: { name: true } } } } },
      orderBy: { updatedAt: "asc" },
      take: 8,
    }),
    prisma.client.findMany({
      where: { userId, deletedAt: null, archivedAt: null, updatedAt: { lt: staleClientLimit } },
      select: { id: true, name: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 8,
    }),
  ])

  const normalizeTask = (task: TodayTaskSource) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    updatedAt: task.updatedAt,
    projectId: task.projectId,
    projectName: task.project?.name ?? null,
    clientName: task.project?.client?.name ?? null,
  })

  const overdue = openTasks.filter((task) => task.dueDate && task.dueDate < todayStart)
  const urgent = openTasks.filter((task) => task.priority === "Urgente")
  const dueToday = openTasks.filter((task) => task.dueDate && task.dueDate >= todayStart && task.dueDate < tomorrowStart)
  const dueThisWeek = openTasks.filter((task) => task.dueDate && task.dueDate >= tomorrowStart && task.dueDate < weekEnd)

  const priorityQueue = openTasks
    .map((task) => ({ ...normalizeTask(task), score: taskScore(task, todayStart) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  const nextAction = priorityQueue[0] ?? null
  const groupMap = new Map<string, { id: string; name: string; type: "project" | "client" | "none"; openTasks: number; overdueTasks: number; urgentTasks: number }>()
  for (const task of openTasks) {
    const id = task.projectId ?? task.project?.client?.name ?? "none"
    const name = task.project?.name ?? task.project?.client?.name ?? "Sem projeto"
    const type = task.projectId ? "project" : task.project?.client?.name ? "client" : "none"
    const current = groupMap.get(id) ?? { id, name, type, openTasks: 0, overdueTasks: 0, urgentTasks: 0 }
    current.openTasks += 1
    if (task.dueDate && task.dueDate < todayStart) current.overdueTasks += 1
    if (task.priority === "Urgente") current.urgentTasks += 1
    groupMap.set(id, current)
  }

  const alerts = [
    ...dueToday.slice(0, 4).map((task) => ({
      type: "task_due_today",
      title: "Tarefa vence hoje",
      message: task.title,
      href: `/tasks/${task.id}`,
      severity: "high",
    })),
    ...projects.slice(0, 4).map((project) => ({
      type: "project_due_soon",
      title: "Projeto próximo do prazo",
      message: `${project.name} vence em ${diffDays(todayStart, project.dueDate ?? todayStart)} dia(s)`,
      href: `/projects/${project.id}`,
      severity: "medium",
    })),
    ...staleTasks.slice(0, 4).map((task) => ({
      type: "stale_task",
      title: "Tarefa parada",
      message: `${task.title} está sem atualização há mais de 7 dias`,
      href: `/tasks/${task.id}`,
      severity: "medium",
    })),
    ...staleClients.slice(0, 4).map((client) => ({
      type: "stale_client",
      title: "Cliente sem movimento recente",
      message: client.name,
      href: `/clients/${client.id}`,
      severity: "low",
    })),
  ].slice(0, 10)

  return NextResponse.json({
    userName: user?.name ?? "",
    date: today,
    proAccess,
    overdueTasks: overdue.map((task) => ({
      ...normalizeTask(task),
      daysOverdue: Math.max(1, Math.floor((todayStart.getTime() - (task.dueDate?.getTime() ?? todayStart.getTime())) / MS_PER_DAY)),
    })),
    urgentTasks: urgent.map(normalizeTask),
    dueTodayTasks: dueToday.map(normalizeTask),
    dueProjects: projects.map(({ client, ...project }) => ({
      ...project,
      clientName: client?.name ?? null,
      daysRemaining: Math.max(0, Math.ceil(((project.dueDate?.getTime() ?? todayStart.getTime()) - todayStart.getTime()) / MS_PER_DAY)),
    })),
    weeklyProgress: {
      completedTasks: weeklyTasks.length,
      advancedProjects: new Set(weeklyTasks.map((task) => task.projectId).filter(Boolean)).size,
    },
    pro: proAccess ? {
      nextAction,
      priorityQueue,
      dueThisWeekTasks: dueThisWeek.map(normalizeTask),
      groupedFocus: Array.from(groupMap.values()).sort((a, b) => (b.overdueTasks + b.urgentTasks) - (a.overdueTasks + a.urgentTasks)).slice(0, 6),
      alerts,
    } : null,
  })
}
