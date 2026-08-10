import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/services/auth"
import { prisma } from "@/lib/prisma"
import { getPlanUsageSummary, hasProAccess } from "@/lib/plans"
import { unauthorized } from "@/lib/api"
import { enforceRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "billing", userId)
  if (limited) return limited

  const [subscription, usageSummary] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    getPlanUsageSummary(userId),
  ])

  const publicSubscription = subscription
    ? {
        plan: subscription.plan,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        hasStripeCustomer: Boolean(subscription.stripeCustomerId),
      }
    : null

  return NextResponse.json({
    subscription: publicSubscription,
    proAccess: subscription ? hasProAccess(subscription) : false,
    ...usageSummary,
    monthlyUsage: usageSummary.dailyUsage,
    monthlyLimits: usageSummary.dailyLimits,
    usage: {
      clients: usageSummary.storageUsage.client,
      projects: usageSummary.storageUsage.project,
      tasks: usageSummary.storageUsage.task,
    },
    limits: usageSummary.storageLimits,
  })
}


