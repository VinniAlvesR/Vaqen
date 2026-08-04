import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/services/auth"
import { getServerEnv } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { unauthorized } from "@/lib/api"
import { hasProAccess } from "@/lib/plans"

const STRIPE_MIN_TRIAL_SECONDS = 48 * 60 * 60
const MANAGEABLE_STATUSES = new Set(["ACTIVE", "TRIALING", "PAST_DUE", "UNPAID", "PAUSED"])

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const env = getServerEnv()
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRO_PRICE_ID) {
    return NextResponse.json({ error: { code: "BILLING_NOT_CONFIGURED", message: "Cobrança indisponível" } }, { status: 503 })
  }

  const [user, existingSubscription] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.subscription.findUnique({ where: { userId } }),
  ])

  const trialEndsAt = existingSubscription?.trialEndsAt ?? trialEndFromNow(30)
  const subscription = existingSubscription ?? await prisma.subscription.create({
    data: { userId, trialEndsAt },
  })

  const stripe = getStripe()
  let customerId = subscription.stripeCustomerId

  if (customerId && (hasProAccess(subscription) || MANAGEABLE_STATUSES.has(subscription.status))) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.BETTER_AUTH_URL}/settings`,
    })
    return NextResponse.json({ url: portal.url })
  }

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
  const trialEnd = Math.floor(trialEndsAt.getTime() / 1000)
  const shouldApplyTrial = trialEnd >= nowSeconds + STRIPE_MIN_TRIAL_SECONDS

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${env.BETTER_AUTH_URL}/settings?billing=success`,
    cancel_url: `${env.BETTER_AUTH_URL}/pricing?billing=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    payment_method_collection: "always",
    customer_update: {
      name: "auto",
      address: "auto",
    },
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
      ...(shouldApplyTrial
        ? {
            trial_end: trialEnd,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
          }
        : {}),
    },
  })

  return NextResponse.json({ url: checkout.url })
}

function trialEndFromNow(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

