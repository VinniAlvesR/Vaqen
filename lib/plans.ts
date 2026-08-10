import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import {
  FREE_DAILY_CREATE_LIMITS,
  FREE_STORAGE_LIMITS,
  getCurrentPlanPeriodKey,
  hasProAccess,
  LimitedResource,
} from "@/lib/plan-rules"

export { FREE_DAILY_CREATE_LIMITS, FREE_STORAGE_LIMITS, getCurrentPlanPeriodKey, hasProAccess }
export type { LimitedResource }

type PlanTx = typeof prisma | Prisma.TransactionClient
type PlanSubscription = Awaited<ReturnType<typeof prisma.subscription.findUnique>>

const resourceLabels: Record<LimitedResource, string> = {
  client: "clientes",
  project: "projetos",
  task: "tarefas",
}

export class PlanLimitError extends Error {
  readonly code = "PLAN_LIMIT_REACHED"
  constructor(
    readonly resource: LimitedResource,
    readonly limit: number,
    readonly used: number
  ) {
    super(`O plano Gratuito permite até ${limit} ${resourceLabels[resource]}.`)
  }
}

export class PlanDailyQuotaError extends Error {
  readonly code = "PLAN_DAILY_QUOTA_REACHED"
  constructor(
    readonly resource: LimitedResource,
    readonly limit: number,
    readonly used: number,
    readonly periodKey: string
  ) {
    super(`Você atingiu o limite diário de ${limit} ${resourceLabels[resource]} criados no plano Gratuito.`)
  }
}

export async function assertCanCreate(userId: string, resource: LimitedResource, tx: PlanTx = prisma, subscription?: PlanSubscription) {
  const currentSubscription = subscription ?? await tx.subscription.findUnique({ where: { userId } })
  if (currentSubscription && hasProAccess(currentSubscription)) return

  await assertStorageLimit(userId, resource, tx)
  await assertDailyCreateLimit(userId, resource, tx)
}

export async function assertCanRestore(userId: string, resource: LimitedResource, tx: PlanTx = prisma, subscription?: PlanSubscription) {
  const currentSubscription = subscription ?? await tx.subscription.findUnique({ where: { userId } })
  if (currentSubscription && hasProAccess(currentSubscription)) return

  await assertStorageLimit(userId, resource, tx)
}

export async function recordPlanCreation(userId: string, resource: LimitedResource, tx: PlanTx = prisma, subscription?: PlanSubscription) {
  const currentSubscription = subscription ?? await tx.subscription.findUnique({ where: { userId } })
  if (currentSubscription && hasProAccess(currentSubscription)) return

  const periodKey = getCurrentPlanPeriodKey()
  const limit = FREE_DAILY_CREATE_LIMITS[resource]

  const updated = await incrementExistingPlanUsage(userId, resource, periodKey, limit, tx)
  if (updated) return

  const current = await tx.planUsage.findUnique({ where: { userId_resource_periodKey: { userId, resource, periodKey } } })
  if (current) throw new PlanDailyQuotaError(resource, limit, current.createdCount, periodKey)

  try {
    await tx.planUsage.create({ data: { userId, resource, periodKey, createdCount: 1 } })
  } catch (cause) {
    if (!isUniqueConstraintError(cause)) throw cause
    const retried = await incrementExistingPlanUsage(userId, resource, periodKey, limit, tx)
    if (retried) return
    const usage = await tx.planUsage.findUnique({ where: { userId_resource_periodKey: { userId, resource, periodKey } } })
    throw new PlanDailyQuotaError(resource, limit, usage?.createdCount ?? limit, periodKey)
  }
}

export async function getPlanUsageSummary(userId: string, tx: PlanTx = prisma) {
  const periodKey = getCurrentPlanPeriodKey()
  const [clients, projects, tasks, dailyRows] = await Promise.all([
    tx.client.count({ where: { userId, deletedAt: null } }),
    tx.project.count({ where: { userId, deletedAt: null } }),
    tx.task.count({ where: { userId, deletedAt: null } }),
    tx.planUsage.findMany({ where: { userId, periodKey } }),
  ])

  const dailyUsage = { client: 0, project: 0, task: 0 }
  for (const row of dailyRows) {
    if (isLimitedResource(row.resource)) dailyUsage[row.resource] = row.createdCount
  }

  return {
    periodKey,
    storageUsage: { client: clients, project: projects, task: tasks },
    storageLimits: FREE_STORAGE_LIMITS,
    dailyUsage,
    dailyLimits: FREE_DAILY_CREATE_LIMITS,
  }
}

async function assertStorageLimit(userId: string, resource: LimitedResource, tx: PlanTx) {
  const used = await getStorageCount(userId, resource, tx)
  const limit = FREE_STORAGE_LIMITS[resource]
  if (used >= limit) throw new PlanLimitError(resource, limit, used)
}

async function assertDailyCreateLimit(userId: string, resource: LimitedResource, tx: PlanTx) {
  const periodKey = getCurrentPlanPeriodKey()
  const usage = await tx.planUsage.findUnique({ where: { userId_resource_periodKey: { userId, resource, periodKey } } })
  const used = usage?.createdCount ?? 0
  const limit = FREE_DAILY_CREATE_LIMITS[resource]
  if (used >= limit) throw new PlanDailyQuotaError(resource, limit, used, periodKey)
}


async function incrementExistingPlanUsage(userId: string, resource: LimitedResource, periodKey: string, limit: number, tx: PlanTx) {
  const result = await tx.planUsage.updateMany({
    where: { userId, resource, periodKey, createdCount: { lt: limit } },
    data: { createdCount: { increment: 1 } },
  })
  return result.count > 0
}

function isUniqueConstraintError(cause: unknown) {
  return typeof cause === "object" && cause !== null && "code" in cause && (cause as { code?: unknown }).code === "P2002"
}
function getStorageCount(userId: string, resource: LimitedResource, tx: PlanTx) {
  const where = { userId, deletedAt: null }
  if (resource === "client") return tx.client.count({ where })
  if (resource === "project") return tx.project.count({ where })
  return tx.task.count({ where })
}

function isLimitedResource(resource: string): resource is LimitedResource {
  return resource === "client" || resource === "project" || resource === "task"
}
