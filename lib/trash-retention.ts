import type { PrismaClient } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export const TRASH_RETENTION_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

type TrashModel = Pick<PrismaClient, "task" | "project" | "client">
type TrashClient = PrismaClient | TrashModel

export function getTrashExpirationDate(deletedAt: Date) {
  return new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * MS_PER_DAY)
}

export function getTrashDaysRemaining(deletedAt: Date, now = new Date()) {
  const expiresAt = getTrashExpirationDate(deletedAt)
  return Math.max(Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY), 0)
}

export function getTrashRetentionCutoff(now = new Date()) {
  return new Date(now.getTime() - TRASH_RETENTION_DAYS * MS_PER_DAY)
}

export async function purgeExpiredTrash(userId: string, db: TrashClient = prisma) {
  const cutoff = getTrashRetentionCutoff()

  const [tasks, projects, clients] = await Promise.all([
    db.task.deleteMany({ where: { userId, deletedAt: { lt: cutoff } } }),
    db.project.deleteMany({ where: { userId, deletedAt: { lt: cutoff } } }),
    db.client.deleteMany({ where: { userId, deletedAt: { lt: cutoff } } }),
  ])

  return {
    deleted: {
      tasks: tasks.count,
      projects: projects.count,
      clients: clients.count,
      total: tasks.count + projects.count + clients.count,
    },
    cutoff,
  }
}

export async function purgeExpiredTrashForAllUsers(db: TrashClient = prisma) {
  const cutoff = getTrashRetentionCutoff()

  const [tasks, projects, clients] = await Promise.all([
    db.task.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    db.project.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    db.client.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
  ])

  return {
    deleted: {
      tasks: tasks.count,
      projects: projects.count,
      clients: clients.count,
      total: tasks.count + projects.count + clients.count,
    },
    cutoff,
  }
}
