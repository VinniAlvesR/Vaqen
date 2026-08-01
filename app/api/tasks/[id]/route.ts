import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const task = await prisma.task.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      project: { include: { client: { select: { name: true } } } },
      checklist: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
      subtasks: { orderBy: { createdAt: "asc" } },
      comments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  const activities = await prisma.activityLog.findMany({
    where: { userId, entity: "task", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  const { project, checklist, subtasks, comments, ...data } = task
  const normalizedComments = comments.map(({ user, ...comment }) => ({ ...comment, userName: user.name }))
  return NextResponse.json({
    ...data,
    projectName: project?.name ?? null,
    clientName: project?.client?.name ?? null,
    activities,
    checklist,
    subtasks,
    comments: normalizedComments,
    summary: {
      checklist: { completed: checklist.filter((item) => item.completed).length, total: checklist.length },
      subtasks: { completed: subtasks.filter((item) => item.completedAt).length, total: subtasks.length },
      comments: comments.length,
    },
  })
}
