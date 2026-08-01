import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { unauthorized } from "@/lib/api"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const { archived } = await request.json()
  if (typeof archived !== "boolean") return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
  const client = await prisma.client.findFirst({ where: { id, userId, deletedAt: null } })
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  const archivedAt = archived ? new Date() : null
  await prisma.client.update({ where: { id }, data: { archivedAt } })
  await logActivity(userId, "client", id, archived ? "archived" : "unarchived", `Cliente ${client.name} ${archived ? "arquivado" : "desarquivado"}`)
  return NextResponse.json({ success: true, archivedAt })
}
