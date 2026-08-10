import { NextRequest, NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"
import { purgeExpiredTrashForAllUsers, TRASH_RETENTION_DAYS } from "@/lib/trash-retention"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const env = getServerEnv()
  const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null
  const received = request.headers.get("authorization")

  if (!expected || received !== expected) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Rotina não autorizada." } }, { status: 401 })
  }

  const result = await purgeExpiredTrashForAllUsers()
  return NextResponse.json({ retentionDays: TRASH_RETENTION_DAYS, ...result })
}
