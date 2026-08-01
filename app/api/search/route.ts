import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  const contains = { contains: query, mode: "insensitive" as const }
  const [clients, projects, tasks] = await Promise.all([
    prisma.client.findMany({ where: { userId, deletedAt: null, OR: [{ name: contains }, { email: contains }, { company: contains }] }, take: 20 }),
    prisma.project.findMany({ where: { userId, deletedAt: null, OR: [{ name: contains }, { description: contains }, { client: { name: contains } }] }, include: { client: true }, take: 20 }),
    prisma.task.findMany({ where: { userId, deletedAt: null, OR: [{ title: contains }, { description: contains }, { project: { name: contains } }] }, include: { project: true }, take: 20 }),
  ])
  return NextResponse.json([
    ...clients.map((item) => ({ id: item.id, title: item.name, subtitle: item.company, detail: item.email, entity: "client", createdAt: item.createdAt })),
    ...projects.map((item) => ({ id: item.id, title: item.name, subtitle: item.client?.name, detail: item.description, entity: "project", createdAt: item.createdAt })),
    ...tasks.map((item) => ({ id: item.id, title: item.title, subtitle: item.project?.name, detail: item.description, entity: "task", createdAt: item.createdAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
}
