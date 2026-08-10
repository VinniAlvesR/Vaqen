import { NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"

export async function GET() {
  const env = getServerEnv()
  return NextResponse.json(
    {
      googleAuthEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      emailDeliveryEnabled: Boolean(env.RESEND_API_KEY || (env.GMAIL_SMTP_USER && env.GMAIL_SMTP_APP_PASSWORD)),
      billingEnabled: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRO_PRICE_ID),
      pushNotificationsEnabled: Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
      vapidPublicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
