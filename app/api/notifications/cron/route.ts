import { NextRequest, NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { syncSystemNotifications } from "@/services/notifications"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const env = getServerEnv()
  const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null
  const received = request.headers.get("authorization")

  if (!expected || received !== expected) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Rotina não autorizada." } }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true },
    take: 500,
  })

  const results = await Promise.allSettled(users.map((user) => syncSystemNotifications(user.id)))
  const processed = results.filter((result) => result.status === "fulfilled").length
  const failed = results.length - processed

  return NextResponse.json({ users: users.length, processed, failed })
}
