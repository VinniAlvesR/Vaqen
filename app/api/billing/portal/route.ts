import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/services/auth"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { getServerEnv } from "@/lib/env"
import { unauthorized } from "@/lib/api"

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: { code: "NO_BILLING_ACCOUNT", message: "Nenhuma assinatura encontrada" } }, { status: 404 })
  }
  const portal = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${getServerEnv().BETTER_AUTH_URL}/settings`,
  })
  return NextResponse.json({ url: portal.url })
}
