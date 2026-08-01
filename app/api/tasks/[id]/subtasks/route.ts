import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { unauthorized } from "@/lib/api"

const statuses = ["Pendente", "Em andamento", "Concluída"]
async function ownedTask(taskId: string, userId: string) {
  return prisma.task.count({ where: { id: taskId, userId, deletedAt: null } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const taskId = (await params).id
  const title = String((await request.json()).title ?? "").trim()
  if (!title) return NextResponse.json({ error: "Informe a subtarefa" }, { status: 400 })
  if (!await ownedTask(taskId, userId)) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  const subtask = await prisma.subtask.create({ data: { taskId, title } })
  await logActivity(userId, "task", taskId, "subtask_added", `Subtarefa adicionada: ${title}`)
  return NextResponse.json(subtask, { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const taskId = (await params).id
  const { subtaskId, title, status } = await request.json()
  if (!await ownedTask(taskId, userId)) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  const current = await prisma.subtask.findFirst({ where: { id: subtaskId, taskId } })
  if (!current) return NextResponse.json({ error: "Subtarefa não encontrada" }, { status: 404 })
  const nextStatus = typeof status === "string" ? status : current.status
  if (!statuses.includes(nextStatus)) return NextResponse.json({ error: "Status inválido" }, { status: 400 })
  const subtask = await prisma.subtask.update({
    where: { id: current.id },
    data: {
      title: typeof title === "string" && title.trim() ? title.trim() : current.title,
      status: nextStatus,
      completedAt: nextStatus === "Concluída" ? current.completedAt ?? new Date() : null,
    },
  })
  await logActivity(userId, "task", taskId, "subtask_updated", `Subtarefa ${subtask.title}: ${subtask.status}`)
  return NextResponse.json(subtask)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const taskId = (await params).id
  const { subtaskId } = await request.json()
  if (!await ownedTask(taskId, userId)) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  const subtask = await prisma.subtask.findFirst({ where: { id: subtaskId, taskId } })
  if (!subtask) return NextResponse.json({ error: "Subtarefa não encontrada" }, { status: 404 })
  await prisma.subtask.delete({ where: { id: subtask.id } })
  await logActivity(userId, "task", taskId, "subtask_deleted", `Subtarefa removida: ${subtask.title}`)
  return NextResponse.json({ success: true })
}
