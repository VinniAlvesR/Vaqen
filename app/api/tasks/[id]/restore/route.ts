import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { unauthorized } from "@/lib/api"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const task = await prisma.task.findFirst({ where: { id, userId, deletedAt: { not: null } } })
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada na lixeira" }, { status: 404 })
  await prisma.task.update({ where: { id }, data: { deletedAt: null } })
  await logActivity(userId, "task", id, "restored", `Tarefa "${task.title}" restaurada da lixeira`)
  return NextResponse.json({ success: true, restoredAt: new Date() })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const task = await prisma.task.findFirst({ where: { id, userId, deletedAt: { not: null } } })
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada na lixeira" }, { status: 404 })
  await prisma.task.delete({ where: { id } })
  await logActivity(userId, "task", id, "permanent_delete", `Tarefa "${task.title}" excluída permanentemente`)
  return NextResponse.json({ success: true })
}
