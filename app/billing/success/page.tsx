import Link from "next/link"
import { headers } from "next/headers"
import Stripe from "stripe"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { getServerEnv } from "@/lib/env"
import type { SubscriptionStatus } from "@/generated/prisma/enums"

export const dynamic = "force-dynamic"

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

type PageProps = {
  searchParams?: Promise<{ session_id?: string }>
}

type SyncResult =
  | { status: "synced"; plan: string; subscriptionStatus: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null }
  | { status: "pending"; message: string }
  | { status: "error"; message: string }

export default async function BillingSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sessionId = params?.session_id
  const session = await auth.api.getSession({ headers: await headers() })
  const result = session?.user.id
    ? await syncCheckoutSession({ sessionId, userId: session.user.id, userEmail: session.user.email })
    : { status: "error", message: "Faca login novamente para confirmar sua assinatura." } satisfies SyncResult

  const synced = result.status === "synced"

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-bold uppercase tracking-[0.35em] text-indigo-300">Assinatura Vaqen</p>
        <h1 className="mt-4 text-3xl font-black">
          {synced ? "Pro liberado para sua conta" : "Estamos confirmando sua assinatura"}
        </h1>

        {synced ? (
          <div className="mt-5 space-y-4 leading-7 text-slate-300">
            <p>
              A assinatura foi localizada na Stripe e sincronizada com o Vaqen. Seu acesso Pro já deve aparecer em Configurações.
            </p>
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
              <p>Status: {formatStatus(result.subscriptionStatus)}</p>
              {result.trialEndsAt ? <p>Trial ate: {formatDate(result.trialEndsAt)}</p> : null}
              {result.currentPeriodEnd ? <p>Periodo atual ate: {formatDate(result.currentPeriodEnd)}</p> : null}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4 leading-7 text-slate-300">
            <p>{result.message}</p>
            <p className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-sm leading-6 text-indigo-100">
              Se você acabou de concluir o checkout, aguarde alguns segundos e atualize esta página. Em ambiente local, essa tela também tenta sincronizar direto pela Stripe quando recebe o session_id.
            </p>
          </div>
        )}

        <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
          Dados de cartao sao processados pela Stripe. O Vaqen recebe apenas dados minimos para vincular a assinatura a sua conta, como identificadores da assinatura, status e periodo.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/settings" className="rounded-full bg-indigo-500 px-5 py-3 font-semibold text-white hover:bg-indigo-400">
            Ver plano
          </Link>
          <Link href="/today" className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/10">
            Ir para Hoje
          </Link>
        </div>
      </section>
    </main>
  )
}

async function syncCheckoutSession({ sessionId, userId, userEmail }: { sessionId?: string; userId: string; userEmail: string }): Promise<SyncResult> {
  const env = getServerEnv()
  if (!env.STRIPE_SECRET_KEY) return { status: "error", message: "Stripe nao configurada no servidor local." }

  if (!sessionId) {
    return syncLatestSubscriptionByEmail({ userId, userEmail })
  }

  try {
    const checkout = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.items.data.price"],
    })

    const referencedUserId = checkout.client_reference_id || checkout.metadata?.userId
    const checkoutEmail = checkout.customer_details?.email || checkout.customer_email
    const belongsToUser = referencedUserId === userId || normalizeEmail(checkoutEmail) === normalizeEmail(userEmail)

    if (!belongsToUser) {
      return { status: "error", message: "A sessao de pagamento nao pertence ao usuario logado." }
    }

    if (checkout.mode !== "subscription" || !checkout.subscription) {
      return { status: "pending", message: "Checkout localizado, mas a assinatura ainda nao foi criada pela Stripe." }
    }

    const stripeSubscription = typeof checkout.subscription === "string"
      ? await getStripe().subscriptions.retrieve(checkout.subscription, { expand: ["items.data.price"] })
      : checkout.subscription

    return persistStripeSubscription({ userId, stripeSubscription })
  } catch (error) {
    console.error("Falha ao sincronizar checkout de billing", error)
    return { status: "error", message: "Não foi possível confirmar a assinatura na Stripe agora." }
  }
}

async function syncLatestSubscriptionByEmail({ userId, userEmail }: { userId: string; userEmail: string }): Promise<SyncResult> {
  try {
    const customers = await getStripe().customers.list({ email: userEmail, limit: 10 })
    const subscriptions = [] as Stripe.Subscription[]

    for (const customer of customers.data) {
      const customerSubscriptions = await getStripe().subscriptions.list({
        customer: customer.id,
        limit: 10,
        status: "all",
        expand: ["data.items.data.price"],
      })
      subscriptions.push(...customerSubscriptions.data)
    }

    const usable = subscriptions
      .filter((subscription) => ["trialing", "active", "past_due", "unpaid", "paused"].includes(subscription.status))
      .sort((a, b) => b.created - a.created)[0]

    if (!usable) {
      return {
        status: "pending",
        message: "Não encontrei uma assinatura ativa ou em trial na Stripe para o email da conta logada.",
      }
    }

    return persistStripeSubscription({ userId, stripeSubscription: usable })
  } catch (error) {
    console.error("Falha ao sincronizar assinatura por email", error)
    return { status: "error", message: "Não foi possível buscar sua assinatura na Stripe agora." }
  }
}

async function persistStripeSubscription({ userId, stripeSubscription }: { userId: string; stripeSubscription: Stripe.Subscription }): Promise<SyncResult> {
  const item = stripeSubscription.items.data[0]
  const subscriptionAny = stripeSubscription as Stripe.Subscription & {
    current_period_start?: number | null
    current_period_end?: number | null
  }
  const itemAny = item as typeof item & {
    current_period_start?: number | null
    current_period_end?: number | null
  }
  const trialEndsAt = fromUnix(stripeSubscription.trial_end) ?? new Date()
  const currentPeriodStart = fromUnix(subscriptionAny.current_period_start ?? itemAny?.current_period_start)
  const currentPeriodEnd = fromUnix(subscriptionAny.current_period_end ?? itemAny?.current_period_end)
  const status = statusMap[stripeSubscription.status] ?? "INCOMPLETE"
  const plan = stripeSubscription.status === "canceled" ? "FREE" : "PRO"

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status,
      stripeCustomerId: String(stripeSubscription.customer),
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: item?.price.id,
      trialEndsAt,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      stripeEventCreatedAt: Math.floor(Date.now() / 1000),
    },
    create: {
      userId,
      plan,
      status,
      stripeCustomerId: String(stripeSubscription.customer),
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: item?.price.id,
      trialEndsAt,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      stripeEventCreatedAt: Math.floor(Date.now() / 1000),
    },
  })

  return { status: "synced", plan, subscriptionStatus: status, trialEndsAt, currentPeriodEnd }
}

function fromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? ""
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    TRIALING: "Trial ativo",
    ACTIVE: "Ativa",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Cancelada",
    UNPAID: "Não paga",
    INCOMPLETE: "Incompleta",
    INCOMPLETE_EXPIRED: "Expirada",
    PAUSED: "Pausada",
  }
  return labels[status] ?? status
}
