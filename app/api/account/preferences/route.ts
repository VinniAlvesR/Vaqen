import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

const schema = z.object({
  locale: z.literal("pt-BR"),
  timezone: z.enum(["America/Sao_Paulo", "America/Manaus", "America/Recife"]),
})

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  return NextResponse.json(await prisma.userPreference.findUnique({ where: { userId } }))
}

export async function PATCH(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Preferências inválidas" } }, { status: 400 })
  const preferences = await prisma.userPreference.upsert({
    where: { userId },
    update: parsed.data,
    create: { userId, ...parsed.data },
  })
  return NextResponse.json(preferences)
}
