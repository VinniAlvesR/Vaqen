import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ConsentType } from "@/generated/prisma/enums"
import { getServerEnv } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

const inputSchema = z.object({
  terms: z.literal(true),
  privacy: z.literal(true),
  marketing: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const parsed = inputSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: { code: "CONSENT_REQUIRED", message: "Aceite obrigatório" } }, { status: 400 })
  const env = getServerEnv()
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const userAgent = request.headers.get("user-agent")
  const records = [
    { type: ConsentType.TERMS, version: env.LEGAL_TERMS_VERSION, accepted: true },
    { type: ConsentType.PRIVACY, version: env.LEGAL_PRIVACY_VERSION, accepted: true },
    { type: ConsentType.MARKETING, version: env.LEGAL_PRIVACY_VERSION, accepted: parsed.data.marketing },
  ]
  await prisma.legalConsent.createMany({
    data: records.map((record) => ({ ...record, userId, ipAddress, userAgent })),
  })
  return NextResponse.json({ success: true }, { status: 201 })
}
