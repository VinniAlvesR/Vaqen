import { NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"

export async function GET() {
  const env = getServerEnv()
  return NextResponse.json(
    {
      googleAuthEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      emailDeliveryEnabled: Boolean(env.RESEND_API_KEY),
      billingEnabled: Boolean(
        env.STRIPE_SECRET_KEY
        && env.STRIPE_WEBHOOK_SECRET
        && env.STRIPE_PRO_PRICE_ID
      ),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  )
}
