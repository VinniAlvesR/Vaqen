import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const project = await prisma.project.findFirst({
    where: { id, userId, deletedAt: null },
    include: { client: { select: { name: true } }, tasks: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } } },
  })
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  const activities = await prisma.activityLog.findMany({
    where: { userId, entity: "project", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  const { client, tasks, ...data } = project
  const completedTasks = tasks.filter((task) => task.completedAt).length
  return NextResponse.json({
    ...data,
    clientName: client?.name ?? null,
    tasks,
    completedTasks,
    totalTasks: tasks.length,
    openTasks: tasks.length - completedTasks,
    activities,
  })
}
