import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const params = request.nextUrl.searchParams
  const search = params.get("q")?.trim()
  const entity = params.get("entity")
  const action = params.get("action")
  const page = Math.max(Number(params.get("page") ?? 1), 1)
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 12), 1), 50)
  const activities = await prisma.activityLog.findMany({
    where: {
      userId,
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
      ...(search ? { OR: [
        { entity: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { detail: { contains: search, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit + 1,
  })
  return NextResponse.json({ activities: activities.slice(0, limit), hasMore: activities.length > limit, page })
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const { activityId, clearAll, entity, action } = await request.json()
  if (clearAll) {
    await prisma.activityLog.deleteMany({ where: { userId, ...(entity ? { entity } : {}), ...(action ? { action } : {}) } })
    return NextResponse.json({ success: true })
  }
  if (typeof activityId !== "string") return NextResponse.json({ error: "Parâmetro inválido" }, { status: 400 })
  const deleted = await prisma.activityLog.deleteMany({ where: { id: activityId, userId } })
  if (!deleted.count) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
  return NextResponse.json({ success: true })
}
