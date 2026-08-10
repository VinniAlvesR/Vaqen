import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiError, unauthorized } from "@/lib/api"
import { assertCanCreate, recordPlanCreation } from "@/lib/plans"
import { hasProAccess } from "@/lib/plan-rules"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"

const checklistTemplateInput = z.object({ action: z.literal("createChecklistTemplate"), name: z.string().trim().min(1).max(120), items: z.array(z.string().trim().min(1).max(300)).min(1).max(30) })
const projectTemplateInput = z.object({ action: z.literal("createProjectTemplate"), name: z.string().trim().min(1).max(160), description: z.string().trim().max(2000).optional().default(""), priority: z.string().trim().min(1).max(40).default("Média"), taskTitles: z.array(z.string().trim().min(1).max(240)).min(1).max(40), checklistItems: z.array(z.string().trim().min(1).max(300)).max(30).default([]) })
const applyChecklistInput = z.object({ action: z.literal("applyChecklistTemplate"), templateId: z.string().cuid(), taskId: z.string().cuid() })
const applyProjectInput = z.object({ action: z.literal("applyProjectTemplate"), templateId: z.string().cuid(), clientId: z.string().cuid(), name: z.string().trim().min(1).max(200), startDate: z.string().optional().nullable(), dueDate: z.string().optional().nullable() })
const recurringInput = z.object({ action: z.literal("createRecurringTask"), title: z.string().trim().min(1).max(240), projectId: z.string().cuid().optional().nullable(), description: z.string().trim().max(2000).optional().default(""), priority: z.string().trim().min(1).max(40).default("Média"), frequency: z.enum(["daily", "weekly", "monthly"]), nextDueDate: z.string().min(1) })
const runRecurringInput = z.object({ action: z.literal("runRecurringDue") })
const deleteInput = z.object({ action: z.literal("delete"), type: z.enum(["checklistTemplate", "projectTemplate", "recurringTask"]), id: z.string().cuid() })
const toggleRecurringInput = z.object({ action: z.literal("toggleRecurringTask"), id: z.string().cuid(), active: z.boolean() })
const actionInput = z.discriminatedUnion("action", [checklistTemplateInput, projectTemplateInput, applyChecklistInput, applyProjectInput, recurringInput, runRecurringInput, deleteInput, toggleRecurringInput])

type ProductivityPrisma = typeof prisma & {
  checklistTemplate?: typeof prisma.checklistTemplate
  projectTemplate?: typeof prisma.projectTemplate
  recurringTask?: typeof prisma.recurringTask
}

async function getProState(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  return { subscription, proAccess: subscription ? hasProAccess(subscription) : false }
}

function forbiddenPro() {
  return NextResponse.json({ error: { code: "PRO_REQUIRED", message: "Este recurso está disponível no Vaqen Pro." } }, { status: 403 })
}

function migrationRequired() {
  return NextResponse.json({ error: { code: "MIGRATION_REQUIRED", message: "O servidor local ainda está com Prisma/banco desatualizado. Rode prisma generate, aplique as migrations pendentes e reinicie o servidor." } }, { status: 503 })
}

function getProductivityDelegates() {
  const client = prisma as ProductivityPrisma
  if (!client.checklistTemplate || !client.projectTemplate || !client.recurringTask) return null
  return client
}

function parseDate(value?: string | null) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null
}

function nextDueDate(current: Date, frequency: string) {
  const next = new Date(current)
  if (frequency === "daily") next.setUTCDate(next.getUTCDate() + 1)
  else if (frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7)
  else next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const { proAccess } = await getProState(userId)
  if (!proAccess) return NextResponse.json({ proAccess, checklistTemplates: [], projectTemplates: [], recurringTasks: [] })

  const db = getProductivityDelegates()
  if (!db) return migrationRequired()

  try {
    const [checklistTemplates, projectTemplates, recurringTasks] = await Promise.all([
      db.checklistTemplate!.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      db.projectTemplate!.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      db.recurringTask!.findMany({ where: { userId }, include: { project: { select: { name: true } } }, orderBy: [{ active: "desc" }, { nextDueDate: "asc" }] }),
    ])
    return NextResponse.json({ proAccess, checklistTemplates, projectTemplates, recurringTasks: recurringTasks.map(({ project, ...task }) => ({ ...task, projectName: project?.name ?? null })) })
  } catch (cause) {
    if (isMissingMigrationError(cause)) return migrationRequired()
    return apiError(cause, "Não foi possível carregar recursos Pro")
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const { subscription, proAccess } = await getProState(userId)
  if (!proAccess) return forbiddenPro()

  const db = getProductivityDelegates()
  if (!db) return migrationRequired()

  try {
    const input = actionInput.parse(await request.json())

    if (input.action === "createChecklistTemplate") {
      const template = await db.checklistTemplate!.create({ data: { userId, name: input.name, items: input.items } })
      await logActivity(userId, "task", template.id, "checklist_template_created", `Modelo de checklist criado: ${template.name}`)
      return NextResponse.json(template, { status: 201 })
    }

    if (input.action === "createProjectTemplate") {
      const template = await db.projectTemplate!.create({ data: { userId, name: input.name, description: input.description, priority: input.priority, taskTitles: input.taskTitles, checklistItems: input.checklistItems } })
      await logActivity(userId, "project", template.id, "project_template_created", `Modelo de projeto criado: ${template.name}`)
      return NextResponse.json(template, { status: 201 })
    }

    if (input.action === "applyChecklistTemplate") {
      const template = await db.checklistTemplate!.findFirst({ where: { id: input.templateId, userId } })
      const task = await prisma.task.findFirst({ where: { id: input.taskId, userId, deletedAt: null } })
      if (!template || !task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Modelo ou tarefa não encontrados" } }, { status: 404 })
      const last = await prisma.checklistItem.aggregate({ where: { taskId: task.id }, _max: { position: true } })
      await prisma.checklistItem.createMany({ data: template.items.map((text, index) => ({ taskId: task.id, text, position: (last._max.position ?? -1) + index + 1 })) })
      await logActivity(userId, "task", task.id, "checklist_template_applied", `Modelo aplicado: ${template.name}`)
      return NextResponse.json({ success: true })
    }

    if (input.action === "applyProjectTemplate") {
      const template = await db.projectTemplate!.findFirst({ where: { id: input.templateId, userId } })
      if (!template) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Modelo não encontrado" } }, { status: 404 })
      const client = await prisma.client.findFirst({ where: { id: input.clientId, userId, deletedAt: null } })
      if (!client) return NextResponse.json({ error: { code: "INVALID_CLIENT", message: "Cliente inválido" } }, { status: 404 })
      const project = await prisma.$transaction(async (tx) => {
        await assertCanCreate(userId, "project", tx, subscription)
        const createdProject = await tx.project.create({ data: { userId, clientId: client.id, name: input.name, description: template.description, priority: template.priority, status: "Planejamento", startDate: parseDate(input.startDate), dueDate: parseDate(input.dueDate) } })
        await recordPlanCreation(userId, "project", tx, subscription)
        for (const title of template.taskTitles) {
          await assertCanCreate(userId, "task", tx, subscription)
          const task = await tx.task.create({ data: { userId, projectId: createdProject.id, title, priority: template.priority, status: "Pendente", description: "" } })
          await recordPlanCreation(userId, "task", tx, subscription)
          if (template.checklistItems.length) await tx.checklistItem.createMany({ data: template.checklistItems.map((text, index) => ({ taskId: task.id, text, position: index })) })
        }
        return createdProject
      })
      await logActivity(userId, "project", project.id, "project_template_applied", `Projeto criado a partir do modelo ${template.name}`)
      return NextResponse.json(project, { status: 201 })
    }

    if (input.action === "createRecurringTask") {
      if (input.projectId) {
        const project = await prisma.project.findFirst({ where: { id: input.projectId, userId, deletedAt: null } })
        if (!project) return NextResponse.json({ error: { code: "INVALID_PROJECT", message: "Projeto inválido" } }, { status: 404 })
      }
      const recurring = await db.recurringTask!.create({ data: { userId, projectId: input.projectId ?? null, title: input.title, description: input.description, priority: input.priority, frequency: input.frequency, nextDueDate: parseDate(input.nextDueDate) ?? new Date() } })
      await logActivity(userId, "task", recurring.id, "recurring_task_created", `Tarefa recorrente criada: ${recurring.title}`)
      return NextResponse.json(recurring, { status: 201 })
    }

    if (input.action === "runRecurringDue") {
      const due = await db.recurringTask!.findMany({ where: { userId, active: true, nextDueDate: { lte: new Date() } }, orderBy: { nextDueDate: "asc" }, take: 20 })
      const created = []
      for (const recurring of due) {
        const task = await prisma.$transaction(async (tx) => {
          await assertCanCreate(userId, "task", tx, subscription)
          const createdTask = await tx.task.create({ data: { userId, projectId: recurring.projectId, title: recurring.title, description: recurring.description ?? "", priority: recurring.priority, status: "Pendente", dueDate: recurring.nextDueDate } })
          await recordPlanCreation(userId, "task", tx, subscription)
          await tx.recurringTask.update({ where: { id: recurring.id }, data: { lastCreatedAt: new Date(), nextDueDate: nextDueDate(recurring.nextDueDate, recurring.frequency) } })
          return createdTask
        })
        created.push(task)
        await logActivity(userId, "task", task.id, "recurring_task_generated", `Tarefa gerada por recorrência: ${task.title}`)
      }
      return NextResponse.json({ createdCount: created.length, created })
    }

    if (input.action === "toggleRecurringTask") {
      const updated = await db.recurringTask!.updateMany({ where: { id: input.id, userId }, data: { active: input.active } })
      if (!updated.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Recorrência não encontrada" } }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    if (input.action === "delete") {
      if (input.type === "checklistTemplate") await db.checklistTemplate!.deleteMany({ where: { id: input.id, userId } })
      if (input.type === "projectTemplate") await db.projectTemplate!.deleteMany({ where: { id: input.id, userId } })
      if (input.type === "recurringTask") await db.recurringTask!.deleteMany({ where: { id: input.id, userId } })
      return NextResponse.json({ success: true })
    }
  } catch (cause) {
    if (cause instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados inválidos" } }, { status: 400 })
    if (isMissingMigrationError(cause)) return migrationRequired()
    return apiError(cause, "Não foi possível executar o recurso Pro")
  }
}

function isMissingMigrationError(cause: unknown) {
  return typeof cause === "object" && cause !== null && "code" in cause && ["P2021", "P2022"].includes(String((cause as { code?: unknown }).code))
}