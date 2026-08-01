import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/services/auth"
import { getServerEnv } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { unauthorized } from "@/lib/api"

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const env = getServerEnv()
  if (!env.STRIPE_PRO_PRICE_ID) {
    return NextResponse.json({ error: { code: "BILLING_NOT_CONFIGURED", message: "Cobrança indisponível" } }, { status: 503 })
  }

  const [user, subscription] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.subscription.findUniqueOrThrow({ where: { userId } }),
  ])
  const stripe = getStripe()
  let customerId = subscription.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId },
    })
    customerId = customer.id
    await prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customerId },
    })
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const trialEnd = Math.floor(subscription.trialEndsAt.getTime() / 1000)
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${env.BETTER_AUTH_URL}/settings?billing=success`,
    cancel_url: `${env.BETTER_AUTH_URL}/pricing?billing=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
      ...(trialEnd > nowSeconds ? { trial_end: trialEnd } : {}),
    },
  })

  return NextResponse.json({ url: checkout.url })
}
