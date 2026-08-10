import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { getUserIdFromRequest } from "@/services/auth"
import { syncSystemNotifications } from "@/services/notifications"
import { enforceRateLimit } from "@/lib/rate-limit"

const patchInput = z.object({
  id: z.string().cuid().optional(),
  action: z.enum(["mark_read", "mark_unread", "mark_all_read"]),
})

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "notification", userId)
  if (limited) return limited

  await syncSystemNotifications(userId)

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true"
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ])

  return NextResponse.json({ items, unreadCount })
}

export async function PATCH(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "notification", userId)
  if (limited) return limited

  const parsed = patchInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados da notificação inválidos" } }, { status: 400 })

  const { id, action } = parsed.data
  if (action === "mark_all_read") {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
    return NextResponse.json({ success: true })
  }

  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados da notificação inválidos" } }, { status: 400 })
  const updated = await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: action === "mark_read" ? new Date() : null } })
  if (!updated.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Notificação não encontrada" } }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "notification", userId)
  if (limited) return limited
  const body = await request.json().catch(() => ({}))
  if (body?.id && typeof body.id === "string") {
    await prisma.notification.deleteMany({ where: { id: body.id, userId } })
  } else {
    await prisma.notification.deleteMany({ where: { userId, readAt: { not: null } } })
  }
  return NextResponse.json({ success: true })
}

