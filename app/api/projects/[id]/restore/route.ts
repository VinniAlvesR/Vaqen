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
    const project = await prisma.project.findFirst({ where: { id, userId, deletedAt: { not: null } } })
    if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Projeto não encontrado na lixeira" } }, { status: 404 })
    await prisma.$transaction(async (tx) => {
      await assertCanRestore(userId, "project", tx)
      await tx.project.update({ where: { id }, data: { deletedAt: null } })
    })
    await logActivity(userId, "project", id, "restored", `Projeto "${project.name}" restaurado da lixeira`)
    return NextResponse.json({ success: true, restoredAt: new Date() })
  } catch (cause) {
    return apiError(cause, "Não foi possível restaurar o projeto")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  await purgeExpiredTrash(userId)
  const project = await prisma.project.findFirst({ where: { id, userId, deletedAt: { not: null } } })
  if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Projeto não encontrado na lixeira" } }, { status: 404 })
  await prisma.project.delete({ where: { id } })
  await logActivity(userId, "project", id, "permanent_delete", `Projeto "${project.name}" excluído permanentemente`)
  return NextResponse.json({ success: true })
}
