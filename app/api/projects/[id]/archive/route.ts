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
  const project = await prisma.project.findFirst({ where: { id, userId, deletedAt: null } })
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  const archivedAt = archived ? new Date() : null
  const status = archived ? "Arquivado" : project.completedAt ? "Concluído" : "Planejamento"
  await prisma.project.update({ where: { id }, data: { archivedAt, status } })
  await logActivity(userId, "project", id, archived ? "archived" : "unarchived", `Projeto ${project.name} ${archived ? "arquivado" : "desarquivado"}`)
  return NextResponse.json({ success: true, archivedAt, status })
}
