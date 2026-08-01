import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/services/auth"
import { prisma } from "@/lib/prisma"
import { hasProAccess, FREE_LIMITS } from "@/lib/plans"
import { unauthorized } from "@/lib/api"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const [subscription, clients, projects, tasks] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.client.count({ where: { userId, deletedAt: null } }),
    prisma.project.count({ where: { userId, deletedAt: null } }),
    prisma.task.count({ where: { userId, deletedAt: null } }),
  ])
  return NextResponse.json({
    subscription,
    proAccess: subscription ? hasProAccess(subscription) : false,
    usage: { clients, projects, tasks },
    limits: FREE_LIMITS,
  })
}
