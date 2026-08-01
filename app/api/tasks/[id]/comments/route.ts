import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { unauthorized } from "@/lib/api"

async function ownedTask(taskId: string, userId: string) {
  return prisma.task.count({ where: { id: taskId, userId, deletedAt: null } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const taskId = (await params).id
  const content = String((await request.json()).content ?? "").trim()
  if (!content || content.length > 2000) return NextResponse.json({ error: "Comentário inválido" }, { status: 400 })
  if (!await ownedTask(taskId, userId)) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  const comment = await prisma.taskComment.create({
    data: { taskId, userId, content },
    include: { user: { select: { name: true } } },
  })
  await logActivity(userId, "task", taskId, "comment_added", "Comentário adicionado")
  const { user, ...data } = comment
  return NextResponse.json({ ...data, userName: user.name }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const taskId = (await params).id
  const { commentId } = await request.json()
  if (!await ownedTask(taskId, userId)) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  const deleted = await prisma.taskComment.deleteMany({ where: { id: commentId, taskId, userId } })
  if (!deleted.count) return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 })
  await logActivity(userId, "task", taskId, "comment_deleted", "Comentário removido")
  return NextResponse.json({ success: true })
}
