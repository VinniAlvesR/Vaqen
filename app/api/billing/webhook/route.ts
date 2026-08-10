import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { getServerEnv } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { SubscriptionStatus } from "@/generated/prisma/enums"

const statusMap: Record<string, SubscriptionStatus> = {
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  paused: "PAUSED",
}

function fromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null
}

type BillingTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function resolveCheckoutUserId(tx: BillingTx, checkout: Stripe.Checkout.Session) {
  const referencedUserId = checkout.client_reference_id || checkout.metadata?.userId
  if (referencedUserId) {
    const user = await tx.user.findUnique({ where: { id: referencedUserId }, select: { id: true } })
    if (user) return user.id
  }

  const email = checkout.customer_details?.email || checkout.customer_email
  if (!email) return null
  const user = await tx.user.findUnique({ where: { email }, select: { id: true } })
  return user?.id ?? null
}

export async function POST(request: NextRequest) {
  const secret = getServerEnv().STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 })
  const signature = request.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 })
  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 })
  }

  if (await prisma.stripeEvent.findUnique({ where: { id: event.id } })) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  await prisma.$transaction(async (tx) => {
    await tx.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        livemode: event.livemode,
        payloadHash: createHash("sha256").update(rawBody).digest("hex"),
      },
    })

    if (event.type === "checkout.session.completed") {
      const checkout = event.data.object as Stripe.Checkout.Session
      const userId = await resolveCheckoutUserId(tx, checkout)
      if (userId) {
        await tx.subscription.upsert({
          where: { userId },
          update: {
            stripeCustomerId: checkout.customer ? String(checkout.customer) : undefined,
            stripeSubscriptionId: checkout.subscription ? String(checkout.subscription) : undefined,
          },
          create: {
            userId,
            plan: "FREE",
            status: "INCOMPLETE",
            trialEndsAt: new Date(),
            stripeCustomerId: checkout.customer ? String(checkout.customer) : null,
            stripeSubscriptionId: checkout.subscription ? String(checkout.subscription) : null,
          },
        })
      }
      return
    }

    if (event.type.startsWith("customer.subscription.")) {
      const stripeSubscription = event.data.object as Stripe.Subscription
      const item = stripeSubscription.items.data[0]
      const customerId = String(stripeSubscription.customer)
      const userId = stripeSubscription.metadata.userId
      await tx.subscription.updateMany({
        where: {
          ...(userId ? { userId } : { stripeCustomerId: customerId }),
          stripeEventCreatedAt: { lt: event.created },
        },
        data: {
          plan: stripeSubscription.status === "canceled" ? "FREE" : "PRO",
          status: statusMap[stripeSubscription.status] ?? "INCOMPLETE",
          stripeCustomerId: customerId,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: item?.price.id,
          trialEndsAt: fromUnix(stripeSubscription.trial_end) ?? new Date(),
          currentPeriodStart: fromUnix(item?.current_period_start),
          currentPeriodEnd: fromUnix(item?.current_period_end),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          stripeEventCreatedAt: event.created,
        },
      })
    }
  })

  return NextResponse.json({ received: true })
}
