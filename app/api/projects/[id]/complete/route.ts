import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"
import { unauthorized } from "@/lib/api"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const { completed } = await request.json()
  if (typeof completed !== "boolean") return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
  const project = await prisma.project.findFirst({ where: { id, userId, deletedAt: null } })
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  const completedAt = completed ? new Date() : null
  await prisma.project.update({ where: { id }, data: { completedAt, archivedAt: null, status: completed ? "Concluído" : "Planejamento" } })
  await logActivity(userId, "project", id, completed ? "completed" : "reopened", `Projeto ${project.name} ${completed ? "concluído" : "reaberto"}`)
  return NextResponse.json({ success: true, completedAt })
}
