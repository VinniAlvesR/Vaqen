import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: "ok", database: "ok", latencyMs: Date.now() - startedAt })
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 })
  }
}
