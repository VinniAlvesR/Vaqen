import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiError, unauthorized } from "@/lib/api"
import { assertCanCreate } from "@/lib/plans"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"

const taskInput = z.object({
  title: z.string().trim().min(1).max(240),
  projectId: z.string().cuid().optional().nullable(),
  status: z.string().min(1).max(40).default("Pendente"),
  priority: z.string().min(1).max(40).default("Média"),
  dueDate: z.string().optional().nullable().transform((value) => value ? new Date(`${value}T12:00:00.000Z`) : null),
  description: z.string().trim().max(5000).optional().default(""),
})

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const params = request.nextUrl.searchParams
  const status = params.get("status")
  const priority = params.get("priority")
  const search = params.get("q")?.trim()
  const from = params.get("dueDateFrom")
  const to = params.get("dueDateTo")
  const overdue = params.get("overdue") === "true"
  const showDeleted = params.get("showDeleted") === "true"

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(showDeleted ? {} : { deletedAt: null }),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(from || to || overdue ? {
        dueDate: {
          ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
          ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          ...(overdue ? { lt: new Date() } : {}),
        },
      } : {}),
      ...(overdue ? { completedAt: null } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { project: { name: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(tasks.map(({ project, ...task }) => ({ ...task, projectName: project?.name ?? null })))
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  try {
    const input = taskInput.parse(await request.json())
    await assertCanCreate(userId, "task")
    if (input.projectId) {
      const owner = await prisma.project.count({ where: { id: input.projectId, userId, deletedAt: null } })
      if (!owner) return NextResponse.json({ error: { code: "INVALID_PROJECT", message: "Projeto inválido" } }, { status: 404 })
    }
    const task = await prisma.task.create({
      data: {
        ...input,
        userId,
        completedAt: input.status === "Concluída" ? new Date() : null,
      },
    })
    await logActivity(userId, "task", task.id, "created", `Tarefa ${task.title} criada`)
    return NextResponse.json(task, { status: 201 })
  } catch (cause) {
    if (cause instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados da tarefa inválidos" } }, { status: 400 })
    return apiError(cause, "Não foi possível criar a tarefa")
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const body = await request.json()
  const input = taskInput.safeParse(body)
  if (!input.success || typeof body.id !== "string") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados da tarefa inválidos" } }, { status: 400 })
  if (input.data.projectId) {
    const owner = await prisma.project.count({ where: { id: input.data.projectId, userId, deletedAt: null } })
    if (!owner) return NextResponse.json({ error: { code: "INVALID_PROJECT", message: "Projeto inválido" } }, { status: 404 })
  }
  const current = await prisma.task.findFirst({ where: { id: body.id, userId, deletedAt: null } })
  if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Tarefa não encontrada" } }, { status: 404 })
  const task = await prisma.task.update({
    where: { id: current.id },
    data: {
      ...input.data,
      completedAt: input.data.status === "Concluída" ? current.completedAt ?? new Date() : null,
    },
  })
  await logActivity(userId, "task", task.id, "updated", `Tarefa ${task.title} atualizada`)
  return NextResponse.json(task)
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const { id } = await request.json()
  if (typeof id !== "string") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "ID inválido" } }, { status: 400 })
  const updated = await prisma.task.updateMany({ where: { id, userId, deletedAt: null }, data: { deletedAt: new Date() } })
  if (!updated.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Tarefa não encontrada" } }, { status: 404 })
  await logActivity(userId, "task", id, "deleted", "Tarefa movida para a lixeira")
  return NextResponse.json({ success: true })
}
