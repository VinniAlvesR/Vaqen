import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@/generated/prisma/client"
import { getServerEnv } from "@/lib/env"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: getServerEnv().DATABASE_URL,
  })
  return new PrismaClient({ adapter })
}

function isStaleClient(client: PrismaClient | undefined) {
  if (!client) return true
  const maybeClient = client as PrismaClient & {
    checklistTemplate?: unknown
    projectTemplate?: unknown
    recurringTask?: unknown
    notification?: unknown
  }
  return !maybeClient.checklistTemplate || !maybeClient.projectTemplate || !maybeClient.recurringTask || !maybeClient.notification
}

export const prisma = isStaleClient(globalForPrisma.prisma) ? createPrismaClient() : globalForPrisma.prisma!

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}