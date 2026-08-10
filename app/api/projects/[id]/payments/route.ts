import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { formatPayment, financeDelegatesAvailable, migrationRequired, proFeatureRequired, requireFinanceAccess } from "@/lib/finance"
import { getUserIdFromRequest } from "@/services/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  if (!await requireFinanceAccess(userId)) return proFeatureRequired()
  if (!financeDelegatesAvailable()) return migrationRequired()

  const projectId = (await params).id
  const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } })
  if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Projeto não encontrado" } }, { status: 404 })

  const [plans, payments] = await Promise.all([
    prisma.projectPaymentPlan.findMany({ where: { userId, projectId }, orderBy: { createdAt: "desc" } }),
    prisma.projectPayment.findMany({ where: { userId, projectId }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] }),
  ])

  const receivedCents = payments.filter((payment) => payment.paidAt || payment.status === "PAID").reduce((sum, payment) => sum + payment.amountCents, 0)
  const canceledCents = payments.filter((payment) => payment.status === "CANCELED").reduce((sum, payment) => sum + payment.amountCents, 0)
  const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0)

  return NextResponse.json({
    plans,
    payments: payments.map(formatPayment),
    summary: {
      totalCents,
      receivedCents,
      pendingCents: Math.max(totalCents - receivedCents - canceledCents, 0),
      canceledCents,
    },
  })
}
