import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { unauthorized } from "@/lib/api"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const client = await prisma.client.findFirst({ where: { id, userId, deletedAt: { not: null } } })
  if (!client) return NextResponse.json({ error: "Cliente não encontrado na lixeira" }, { status: 404 })
  await prisma.client.update({ where: { id }, data: { deletedAt: null } })
  await logActivity(userId, "client", id, "restored", `Cliente "${client.name}" restaurado da lixeira`)
  return NextResponse.json({ success: true, restoredAt: new Date() })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const client = await prisma.client.findFirst({ where: { id, userId, deletedAt: { not: null } } })
  if (!client) return NextResponse.json({ error: "Cliente não encontrado na lixeira" }, { status: 404 })
  await prisma.client.delete({ where: { id } })
  await logActivity(userId, "client", id, "permanent_delete", `Cliente "${client.name}" excluído permanentemente`)
  return NextResponse.json({ success: true })
}
