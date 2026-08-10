import { prisma } from "@/lib/prisma"
import { sendPushToUser } from "@/lib/web-push"

type NotificationInput = {
  userId: string
  title: string
  message: string
  type?: "INFO" | "SUCCESS" | "WARNING" | "DANGER"
  entity?: string | null
  entityId?: string | number | null
  actionUrl?: string | null
  dedupeKey?: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function createNotification(input: NotificationInput) {
  const data = {
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type ?? "INFO",
    entity: input.entity ?? null,
    entityId: input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
    actionUrl: input.actionUrl ?? null,
    dedupeKey: input.dedupeKey ?? null,
  }

  const notification = data.dedupeKey
    ? await prisma.notification.upsert({
      where: { userId_dedupeKey: { userId: data.userId, dedupeKey: data.dedupeKey } },
      update: { title: data.title, message: data.message, type: data.type, actionUrl: data.actionUrl, updatedAt: new Date() },
      create: data,
    })
    : await prisma.notification.create({ data })

  if (!notification.pushedAt) {
    await sendPushToUser(notification.userId, { title: notification.title, body: notification.message, url: notification.actionUrl, tag: notification.id }).catch(() => null)
    await prisma.notification.updateMany({ where: { id: notification.id, pushedAt: null }, data: { pushedAt: new Date() } }).catch(() => null)
  }

  return notification
}

export async function createActivityNotification(userId: string, entity: string, entityId: string | number | null, action: string, detail?: string) {
  const id = entityId === null ? null : String(entityId)
  const url = getEntityUrl(entity, id)
  const message = detail || "Atualização registrada no Vaqen."
  const base = { userId, entity, entityId: id, actionUrl: url, message, dedupeKey: id ? "activity-" + action + "-" + entity + "-" + id + "-" + Date.now() : null }

  if (["created", "restored"].includes(action)) return createNotification({ ...base, title: getTitle(entity, action), type: "SUCCESS" })
  if (["completed", "archived"].includes(action)) return createNotification({ ...base, title: getTitle(entity, action), type: "SUCCESS" })
  if (["deleted", "permanent_delete"].includes(action)) return createNotification({ ...base, title: getTitle(entity, action), type: "WARNING", actionUrl: action === "deleted" ? "/trash" : url })
  if (["payment_plan_created", "payment_updated"].includes(action)) return createNotification({ ...base, title: "Financeiro atualizado", type: "INFO", actionUrl: entity === "project" && id ? "/projects/" + id + "#project-finance" : "/finance" })
  if (["deadline_updated", "status_updated"].includes(action)) return createNotification({ ...base, title: getTitle(entity, action), type: "INFO" })

  return null
}

export async function syncSystemNotifications(userId: string) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS)
  const weekEnd = new Date(todayStart.getTime() + DAY_MS * 7)
  const actions: Promise<unknown>[] = []

  const [overdueTasks, todayTasks, soonProjects] = await Promise.all([
    prisma.task.findMany({ where: { userId, deletedAt: null, completedAt: null, dueDate: { lt: todayStart } }, select: { id: true, title: true, dueDate: true }, take: 20, orderBy: { dueDate: "asc" } }),
    prisma.task.findMany({ where: { userId, deletedAt: null, completedAt: null, dueDate: { gte: todayStart, lt: tomorrowStart } }, select: { id: true, title: true }, take: 20, orderBy: { dueDate: "asc" } }),
    prisma.project.findMany({ where: { userId, deletedAt: null, archivedAt: null, completedAt: null, dueDate: { gte: todayStart, lt: weekEnd } }, select: { id: true, name: true, dueDate: true }, take: 20, orderBy: { dueDate: "asc" } }),
  ])

  for (const task of overdueTasks) {
    actions.push(createNotification({ userId, title: "Tarefa atrasada", message: task.title + " passou do prazo.", type: "DANGER", entity: "task", entityId: task.id, actionUrl: "/tasks/" + task.id, dedupeKey: "task-overdue-" + task.id }))
  }

  for (const task of todayTasks) {
    actions.push(createNotification({ userId, title: "Tarefa vence hoje", message: task.title + " precisa de atenção hoje.", type: "WARNING", entity: "task", entityId: task.id, actionUrl: "/tasks/" + task.id, dedupeKey: "task-due-today-" + task.id + "-" + formatDateKey(todayStart) }))
  }

  for (const project of soonProjects) {
    const days = Math.max(0, Math.ceil(((project.dueDate?.getTime() ?? todayStart.getTime()) - todayStart.getTime()) / DAY_MS))
    actions.push(createNotification({ userId, title: "Projeto próximo do prazo", message: project.name + " vence em " + days + " dia(s).", type: "WARNING", entity: "project", entityId: project.id, actionUrl: "/projects/" + project.id, dedupeKey: "project-due-soon-" + project.id + "-" + formatDateKey(todayStart) }))
  }

  const client = prisma as typeof prisma & { projectPayment?: { findMany: (args: unknown) => Promise<Array<{ id: string; projectId: string; description: string }>> } }
  if (client.projectPayment) {
    try {
      const overduePayments = await client.projectPayment.findMany({
        where: { userId, paidAt: null, status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: todayStart }, project: { deletedAt: null } },
        select: { id: true, projectId: true, description: true },
        take: 20,
        orderBy: { dueDate: "asc" },
      })
      for (const payment of overduePayments) {
        actions.push(createNotification({ userId, title: "Pagamento atrasado", message: payment.description + " está pendente no financeiro.", type: "DANGER", entity: "project", entityId: payment.projectId, actionUrl: "/projects/" + payment.projectId + "#project-finance", dedupeKey: "payment-overdue-" + payment.id }))
      }
    } catch {
      // Financeiro pode estar sem migration no ambiente local; notificações continuam funcionando.
    }
  }

  await Promise.allSettled(actions)
}

function getEntityUrl(entity: string, id: string | null) {
  if (!id) return null
  if (entity === "client") return "/clients/" + id
  if (entity === "project") return "/projects/" + id
  if (entity === "task") return "/tasks/" + id
  return null
}

function getTitle(entity: string, action: string) {
  const names: Record<string, string> = { client: "Cliente", project: "Projeto", task: "Tarefa" }
  const name = names[entity] ?? "Registro"
  const labels: Record<string, string> = {
    created: name + " criado",
    restored: name + " restaurado",
    completed: name + " concluído",
    archived: name + " arquivado",
    deleted: name + " apagado",
    permanent_delete: name + " excluído definitivamente",
    deadline_updated: "Prazo atualizado",
    status_updated: "Status atualizado",
  }
  return labels[action] ?? name + " atualizado"
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}
