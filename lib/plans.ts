import { prisma } from "@/lib/prisma"
import { FREE_LIMITS, hasProAccess, LimitedResource } from "@/lib/plan-rules"

export { FREE_LIMITS, hasProAccess }
export type { LimitedResource }

export class PlanLimitError extends Error {
  readonly code = "PLAN_LIMIT_REACHED"
  constructor(
    readonly resource: LimitedResource,
    readonly limit: number
  ) {
    super(`O plano Gratuito permite até ${limit} ${resource === "client" ? "clientes" : resource === "project" ? "projetos" : "tarefas"}.`)
  }
}

export async function assertCanCreate(userId: string, resource: LimitedResource) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (subscription && hasProAccess(subscription)) return

  const where = { userId, deletedAt: null }
  const count = resource === "client"
    ? await prisma.client.count({ where })
    : resource === "project"
      ? await prisma.project.count({ where })
      : await prisma.task.count({ where })

  const limit = FREE_LIMITS[resource]
  if (count >= limit) throw new PlanLimitError(resource, limit)
}
