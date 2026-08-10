import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { getUserIdFromRequest } from "@/services/auth"
import { financeDelegatesAvailable, formatPayment, getSaoPauloMonthRange, isMissingFinanceMigrationError, migrationRequired, normalizePaymentStatus, proFeatureRequired, requireFinanceAccess } from "@/lib/finance"
import { enforceRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "read-heavy", userId)
  if (limited) return limited
  if (!await requireFinanceAccess(userId)) return proFeatureRequired()
  if (!financeDelegatesAvailable()) return migrationRequired()

  const params = request.nextUrl.searchParams
  const status = params.get("status")
  const clientId = params.get("clientId")
  const projectId = params.get("projectId")
  const { key: periodKey, start, end } = getSaoPauloMonthRange(params.get("month"))

  const projectFilter = {
    userId,
    deletedAt: null,
    ...(clientId ? { clientId } : {}),
    ...(projectId ? { id: projectId } : {}),
  }

  try {
    const payments = await prisma.projectPayment.findMany({
    where: {
      userId,
      project: projectFilter,
      ...(projectId ? { projectId } : {}),
      ...(status && status !== "ALL" ? { status: status as never } : {}),
    },
    include: { project: { select: { id: true, name: true, projectValueCents: true, client: { select: { id: true, name: true } } } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  })

  const normalized = payments.map((payment) => ({ ...payment, displayStatus: normalizePaymentStatus(payment) }))
  const filtered = status === "OVERDUE" ? normalized.filter((payment) => payment.displayStatus === "OVERDUE") : normalized
  const monthPaid = filtered.filter((payment) => payment.paidAt && payment.paidAt >= start && payment.paidAt < end)
  const monthDue = filtered.filter((payment) => payment.dueDate >= start && payment.dueDate < end)
  const receivable = filtered.filter((payment) => payment.displayStatus === "PENDING" || payment.displayStatus === "OVERDUE")
  const overdue = filtered.filter((payment) => payment.displayStatus === "OVERDUE")

  const clients = new Map<string, { id: string; name: string; amountCents: number }>()
  const projects = new Map<string, { id: string; name: string; clientName: string | null; amountCents: number }>()

  for (const payment of filtered) {
    if (payment.displayStatus === "CANCELED") continue
    const client = payment.project.client
    if (client) {
      const current = clients.get(client.id) ?? { id: client.id, name: client.name, amountCents: 0 }
      current.amountCents += payment.amountCents
      clients.set(client.id, current)
    }
    const currentProject = projects.get(payment.project.id) ?? { id: payment.project.id, name: payment.project.name, clientName: client?.name ?? null, amountCents: 0 }
    currentProject.amountCents += payment.amountCents
    projects.set(payment.project.id, currentProject)
  }

    return NextResponse.json({
      periodKey,
    totals: {
      receivableCents: receivable.reduce((sum, payment) => sum + payment.amountCents, 0),
      receivedThisMonthCents: monthPaid.reduce((sum, payment) => sum + payment.amountCents, 0),
      overdueCents: overdue.reduce((sum, payment) => sum + payment.amountCents, 0),
      dueThisMonthCents: monthDue.reduce((sum, payment) => sum + payment.amountCents, 0),
      overdueCount: overdue.length,
      openCount: receivable.length,
    },
    upcomingPayments: receivable.slice(0, 8).map(formatPayment),
    payments: filtered.slice(0, 100).map(formatPayment),
    topClients: Array.from(clients.values()).sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
      topProjects: Array.from(projects.values()).sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
    })
  } catch (cause) {
    if (isMissingFinanceMigrationError(cause)) return migrationRequired()
    throw cause
  }
}

