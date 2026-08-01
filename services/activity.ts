import { prisma } from "@/lib/prisma"

export async function logActivity(
  userId: string,
  entity: string,
  entityId: string | number | null,
  action: string,
  detail?: string
) {
  return prisma.activityLog.create({
    data: { userId, entity, entityId: entityId === null ? null : String(entityId), action, detail },
  })
}

export async function fetchActivities(userId: string) {
  return prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
}
