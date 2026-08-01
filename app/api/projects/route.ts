import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiError, unauthorized } from "@/lib/api"
import { assertCanCreate } from "@/lib/plans"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"

const optionalDate = z.string().optional().nullable().transform((value) => value ? new Date(`${value}T12:00:00.000Z`) : null)
const projectInput = z.object({
  name: z.string().trim().min(1).max(200),
  clientId: z.string().cuid().optional().nullable(),
  status: z.string().min(1).max(40).default("Planejamento"),
  priority: z.string().min(1).max(40).default("Média"),
  startDate: optionalDate,
  dueDate: optionalDate,
  description: z.string().trim().max(5000).optional().default(""),
})

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const search = request.nextUrl.searchParams.get("q")?.trim()
  const lifecycle = request.nextUrl.searchParams.get("lifecycle") ?? "active"
  const showDeleted = request.nextUrl.searchParams.get("showDeleted") === "true"

  const projects = await prisma.project.findMany({
    where: {
      userId,
      ...(showDeleted ? {} : { deletedAt: null }),
      ...(lifecycle === "active" ? { archivedAt: null, completedAt: null } : {}),
      ...(lifecycle === "completed" ? { archivedAt: null, completedAt: { not: null } } : {}),
      ...(lifecycle === "archived" ? { archivedAt: { not: null } } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { client: { name: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(projects.map(({ client, ...project }) => ({ ...project, clientName: client?.name ?? null })))
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  try {
    const input = projectInput.parse(await request.json())
    await assertCanCreate(userId, "project")
    if (input.clientId) {
      const owner = await prisma.client.count({ where: { id: input.clientId, userId, deletedAt: null } })
      if (!owner) return NextResponse.json({ error: { code: "INVALID_CLIENT", message: "Cliente inválido" } }, { status: 404 })
    }
    const project = await prisma.project.create({ data: { ...input, userId } })
    await logActivity(userId, "project", project.id, "created", `Projeto ${project.name} criado`)
    return NextResponse.json(project, { status: 201 })
  } catch (cause) {
    if (cause instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados do projeto inválidos" } }, { status: 400 })
    return apiError(cause, "Não foi possível criar o projeto")
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const body = await request.json()
  const input = projectInput.safeParse(body)
  if (!input.success || typeof body.id !== "string") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados do projeto inválidos" } }, { status: 400 })
  if (input.data.clientId) {
    const owner = await prisma.client.count({ where: { id: input.data.clientId, userId, deletedAt: null } })
    if (!owner) return NextResponse.json({ error: { code: "INVALID_CLIENT", message: "Cliente inválido" } }, { status: 404 })
  }
  const current = await prisma.project.findFirst({ where: { id: body.id, userId, deletedAt: null } })
  if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Projeto não encontrado" } }, { status: 404 })
  const project = await prisma.project.update({ where: { id: current.id }, data: input.data })
  await logActivity(userId, "project", project.id, "updated", `Projeto ${project.name} atualizado`)
  if (current.status !== project.status) await logActivity(userId, "project", project.id, "status_updated", `Status alterado para ${project.status}`)
  if (current.dueDate?.getTime() !== project.dueDate?.getTime()) await logActivity(userId, "project", project.id, "deadline_updated", "Prazo do projeto alterado")
  return NextResponse.json(project)
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const { id } = await request.json()
  if (typeof id !== "string") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "ID inválido" } }, { status: 400 })
  const updated = await prisma.project.updateMany({ where: { id, userId, deletedAt: null }, data: { deletedAt: new Date() } })
  if (!updated.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Projeto não encontrado" } }, { status: 404 })
  await logActivity(userId, "project", id, "deleted", "Projeto movido para a lixeira")
  return NextResponse.json({ success: true })
}
