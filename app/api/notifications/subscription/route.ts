import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getUserIdFromRequest } from "@/services/auth"

const subscriptionInput = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(16).max(256),
  }),
})

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "notification", userId)
  if (limited) return limited

  const parsed = subscriptionInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Assinatura push invalida." } }, { status: 400 })

  const input = parsed.data
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { userId, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: request.headers.get("user-agent") },
    create: { userId, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: request.headers.get("user-agent") },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "notification", userId)
  if (limited) return limited

  const body = await request.json().catch(() => ({}))
  if (typeof body?.endpoint !== "string") return NextResponse.json({ success: true })
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint: body.endpoint } })
  return NextResponse.json({ success: true })
}

