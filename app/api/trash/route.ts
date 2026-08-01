import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const entity = request.nextUrl.searchParams.get("entity")
  const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? 1), 1)
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 12), 1), 50)
  const [clients, projects, tasks] = await Promise.all([
    !entity || entity === "client" ? prisma.client.findMany({ where: { userId, deletedAt: { not: null } } }) : [],
    !entity || entity === "project" ? prisma.project.findMany({ where: { userId, deletedAt: { not: null } }, include: { client: { select: { name: true } } } }) : [],
    !entity || entity === "task" ? prisma.task.findMany({ where: { userId, deletedAt: { not: null } }, include: { project: { select: { name: true } } } }) : [],
  ])
  const all = [
    ...clients.map((item) => ({ id: item.id, name: item.name, type: "client", deletedAt: item.deletedAt, archivedAt: item.archivedAt })),
    ...projects.map((item) => ({ id: item.id, name: item.name, type: "project", deletedAt: item.deletedAt, parentName: item.client?.name })),
    ...tasks.map((item) => ({ id: item.id, name: item.title, type: "task", deletedAt: item.deletedAt, parentName: item.project?.name })),
  ].sort((a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0))
  const offset = (page - 1) * limit
  return NextResponse.json({ items: all.slice(offset, offset + limit), hasMore: all.length > offset + limit, page })
}
