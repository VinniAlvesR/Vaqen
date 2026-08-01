import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { unauthorized } from "@/lib/api"

async function ownedTask(taskId: string, userId: string) {
  return prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const taskId = (await params).id
  const text = String((await request.json()).text ?? "").trim()
  if (!text || text.length > 300) return NextResponse.json({ error: "Item inválido" }, { status: 400 })
  if (!await ownedTask(taskId, userId)) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  const last = await prisma.checklistItem.aggregate({ where: { taskId }, _max: { position: true } })
  const item = await prisma.checklistItem.create({
    data: { taskId, text, position: (last._max.position ?? -1) + 1 },
  })
  await logActivity(userId, "task", taskId, "checklist_added", `Checklist adicionado: ${text}`)
  return NextResponse.json(item, { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const taskId = (await params).id
  const { itemId, completed, text } = await request.json()
  if (typeof itemId !== "string" || !await ownedTask(taskId, userId)) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
  const item = await prisma.checklistItem.findFirst({ where: { id: itemId, taskId } })
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
  const nextText = typeof text === "string" && text.trim() ? text.trim() : item.text
  const nextCompleted = typeof completed === "boolean" ? completed : item.completed
  const updated = await prisma.checklistItem.update({ where: { id: item.id }, data: { text: nextText, completed: nextCompleted } })
  await logActivity(userId, "task", taskId, "checklist_updated", `${nextCompleted ? "Checklist concluído" : "Checklist reaberto"}: ${nextText}`)
  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const taskId = (await params).id
  const { itemId } = await request.json()
  if (!await ownedTask(taskId, userId)) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  const item = await prisma.checklistItem.findFirst({ where: { id: itemId, taskId } })
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
  await prisma.checklistItem.delete({ where: { id: item.id } })
  await logActivity(userId, "task", taskId, "checklist_deleted", `Checklist removido: ${item.text}`)
  return NextResponse.json({ success: true })
}
