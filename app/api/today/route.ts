import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

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

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, preferences: { select: { timezone: true } } },
  })
  const timeZone = user?.preferences?.timezone ?? "America/Sao_Paulo"
  const now = new Date()
  const today = dateKey(now, timeZone)
  const { start: todayStart, end: tomorrowStart } = localDay(today, timeZone)
  const weekStart = new Date(todayStart)
  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now)
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName)
  weekStart.setUTCDate(weekStart.getUTCDate() - (weekday === 0 ? 6 : weekday - 1))
  const projectLimit = new Date(tomorrowStart)
  projectLimit.setUTCDate(projectLimit.getUTCDate() + 7)
  const taskInclude = { project: { include: { client: { select: { name: true } } } } } as const
  const open = { userId, deletedAt: null, completedAt: null }

  const [overdue, urgent, dueToday, projects, weeklyTasks] = await Promise.all([
    prisma.task.findMany({ where: { ...open, dueDate: { lt: todayStart } }, include: taskInclude, orderBy: { dueDate: "asc" } }),
    prisma.task.findMany({ where: { ...open, priority: "Urgente" }, include: taskInclude, orderBy: { dueDate: "asc" } }),
    prisma.task.findMany({ where: { ...open, dueDate: { gte: todayStart, lt: tomorrowStart } }, include: taskInclude, orderBy: { priority: "asc" } }),
    prisma.project.findMany({
      where: { userId, deletedAt: null, archivedAt: null, completedAt: null, dueDate: { gte: todayStart, lt: projectLimit } },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, deletedAt: null, completedAt: { gte: weekStart, lt: tomorrowStart } },
      select: { projectId: true },
    }),
  ])

  const normalizeTask = (task: typeof overdue[number]) => ({
    ...task,
    projectName: task.project?.name ?? null,
    clientName: task.project?.client?.name ?? null,
    project: undefined,
  })
  return NextResponse.json({
    userName: user?.name ?? "",
    date: today,
    overdueTasks: overdue.map((task) => ({
      ...normalizeTask(task),
      daysOverdue: Math.max(1, Math.floor((todayStart.getTime() - (task.dueDate?.getTime() ?? todayStart.getTime())) / 86_400_000)),
    })),
    urgentTasks: urgent.map(normalizeTask),
    dueTodayTasks: dueToday.map(normalizeTask),
    dueProjects: projects.map(({ client, ...project }) => ({
      ...project,
      clientName: client?.name ?? null,
      daysRemaining: Math.max(0, Math.ceil(((project.dueDate?.getTime() ?? todayStart.getTime()) - todayStart.getTime()) / 86_400_000)),
    })),
    weeklyProgress: {
      completedTasks: weeklyTasks.length,
      advancedProjects: new Set(weeklyTasks.map((task) => task.projectId).filter(Boolean)).size,
    },
  })
}
