import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserIdFromRequest } from "@/services/auth"
import { unauthorized } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const id = (await params).id
  const client = await prisma.client.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      projects: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { tasks: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } } },
      },
    },
  })
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  const projectIds = client.projects.map((project) => project.id)
  const taskIds = client.projects.flatMap((project) => project.tasks.map((task) => task.id))
  const activities = await prisma.activityLog.findMany({
    where: {
      userId,
      OR: [
        { entity: "client", entityId: id },
        { entity: "project", entityId: { in: projectIds } },
        { entity: "task", entityId: { in: taskIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const projects = client.projects.map(({ tasks: _tasks, ...project }) => project)
  const tasks = client.projects.flatMap((project) => project.tasks.map((task) => ({ ...task, projectName: project.name })))
  return NextResponse.json({
    ...client,
    projects,
    tasks,
    activities,
    summary: {
      activeProjects: projects.filter((project) => !project.completedAt && !project.archivedAt).length,
      completedProjects: projects.filter((project) => project.completedAt).length,
      openTasks: tasks.filter((task) => !task.completedAt).length,
    },
  })
}
