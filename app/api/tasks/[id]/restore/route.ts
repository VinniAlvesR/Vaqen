import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { apiError, unauthorized } from "@/lib/api"
import { assertCanRestore } from "@/lib/plans"
import { purgeExpiredTrash } from "@/lib/trash-retention"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  await purgeExpiredTrash(userId)
  try {
    const task = await prisma.task.findFirst({ where: { id, userId, deletedAt: { not: null } } })
    if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Tarefa não encontrada na lixeira" } }, { status: 404 })
    await prisma.$transaction(async (tx) => {
      await assertCanRestore(userId, "task", tx)
      await tx.task.update({ where: { id }, data: { deletedAt: null } })
    })
    await logActivity(userId, "task", id, "restored", `Tarefa "${task.title}" restaurada da lixeira`)
    return NextResponse.json({ success: true, restoredAt: new Date() })
  } catch (cause) {
    return apiError(cause, "Não foi possível restaurar a tarefa")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  await purgeExpiredTrash(userId)
  const task = await prisma.task.findFirst({ where: { id, userId, deletedAt: { not: null } } })
  if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Tarefa não encontrada na lixeira" } }, { status: 404 })
  await prisma.task.delete({ where: { id } })
  await logActivity(userId, "task", id, "permanent_delete", `Tarefa "${task.title}" excluída permanentemente`)
  return NextResponse.json({ success: true })
}
