import webpush from "web-push"
import { prisma } from "@/lib/prisma"
import { getServerEnv } from "@/lib/env"

type PushPayload = {
  title: string
  body: string
  url?: string | null
  tag?: string | null
}

let configured = false

function configureWebPush() {
  if (configured) return true
  const env = getServerEnv()
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  configured = true
  return true
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configureWebPush()) return
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
  if (!subscriptions.length) return

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/today",
    tag: payload.tag ?? undefined,
    icon: "/vaqen-icon.svg",
  })

  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, body)
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: unknown }).statusCode) : 0
      if ([404, 410].includes(statusCode)) {
        await prisma.pushSubscription.deleteMany({ where: { id: subscription.id, userId } })
      }
    }
  }))
}
