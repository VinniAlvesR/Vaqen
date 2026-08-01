export const FREE_LIMITS = {
  client: 5,
  project: 10,
  task: 50,
} as const

export type LimitedResource = keyof typeof FREE_LIMITS

export function hasProAccess(subscription: {
  plan: string
  status: string
  trialEndsAt: Date
}) {
  const activeStatus = subscription.status === "ACTIVE"
  const activeTrial = subscription.status === "TRIALING" && subscription.trialEndsAt > new Date()
  return subscription.plan === "PRO" && (activeStatus || activeTrial)
}
