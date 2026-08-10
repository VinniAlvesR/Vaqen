import JSZip from "jszip"
import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/services/auth"
import { prisma } from "@/lib/prisma"
import { toCsv } from "@/lib/csv"
import { unauthorized } from "@/lib/api"
import { enforceRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "export", userId)
  if (limited) return limited

  const [user, clients, projects, tasks, checklist, subtasks, comments, activities, consents] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        preferences: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            trialEndsAt: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.client.findMany({ where: { userId } }),
    prisma.project.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { userId } }),
    prisma.checklistItem.findMany({ where: { task: { userId } } }),
    prisma.subtask.findMany({ where: { task: { userId } } }),
    prisma.taskComment.findMany({ where: { userId } }),
    prisma.activityLog.findMany({ where: { userId } }),
    prisma.legalConsent.findMany({ where: { userId } }),
  ])

  const data = { exportedAt: new Date().toISOString(), user, clients, projects, tasks, checklist, subtasks, comments, activities, consents }
  const zip = new JSZip()
  zip.file("vaqen-dados.json", JSON.stringify(data, null, 2))
  for (const [name, rows] of Object.entries({ clients, projects, tasks, checklist, subtasks, comments, activities, consents })) {
    zip.file(`${name}.csv`, toCsv(rows as unknown as Array<Record<string, unknown>>))
  }
  const body = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="vaqen-export-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
