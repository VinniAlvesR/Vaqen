import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/services/auth"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { getServerEnv } from "@/lib/env"
import { unauthorized } from "@/lib/api"
import { enforceRateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "billing", userId)
  if (limited) return limited

  const env = getServerEnv()
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: { code: "BILLING_NOT_CONFIGURED", message: "Cobrança indisponível" } }, { status: 503 })
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: { code: "NO_BILLING_ACCOUNT", message: "Nenhuma assinatura encontrada" } }, { status: 404 })
  }

  const portal = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${env.BETTER_AUTH_URL}/settings`,
  })
  return NextResponse.json({ url: portal.url })
}


