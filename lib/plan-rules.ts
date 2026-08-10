export const FREE_STORAGE_LIMITS = {
  client: 9,
  project: 9,
  task: 9,
} as const

export const FREE_DAILY_CREATE_LIMITS = {
  client: 3,
  project: 3,
  task: 3,
} as const

export type LimitedResource = keyof typeof FREE_STORAGE_LIMITS

export const PLAN_USAGE_TIMEZONE = "America/Sao_Paulo"

export function hasProAccess(subscription: {
  plan: string
  status: string
  trialEndsAt: Date
  stripeSubscriptionId?: string | null
}) {
  const hasStripeSubscription = Boolean(subscription.stripeSubscriptionId)
  const activeStatus = subscription.status === "ACTIVE" && hasStripeSubscription
  const activeTrial = subscription.status === "TRIALING" && subscription.trialEndsAt > new Date() && hasStripeSubscription
  return subscription.plan === "PRO" && (activeStatus || activeTrial)
}

export function getCurrentPlanPeriodKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLAN_USAGE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  if (!year || !month || !day) throw new Error("Não foi possível calcular o período de uso")
  return `${year}-${month}-${day}`
}
