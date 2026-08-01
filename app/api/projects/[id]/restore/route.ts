import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { unauthorized } from "@/lib/api"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const project = await prisma.project.findFirst({ where: { id, userId, deletedAt: { not: null } } })
  if (!project) return NextResponse.json({ error: "Projeto não encontrado na lixeira" }, { status: 404 })
  await prisma.project.update({ where: { id }, data: { deletedAt: null } })
  await logActivity(userId, "project", id, "restored", `Projeto "${project.name}" restaurado da lixeira`)
  return NextResponse.json({ success: true, restoredAt: new Date() })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const project = await prisma.project.findFirst({ where: { id, userId, deletedAt: { not: null } } })
  if (!project) return NextResponse.json({ error: "Projeto não encontrado na lixeira" }, { status: 404 })
  await prisma.project.delete({ where: { id } })
  await logActivity(userId, "project", id, "permanent_delete", `Projeto "${project.name}" excluído permanentemente`)
  return NextResponse.json({ success: true })
}
