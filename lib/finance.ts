import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hasProAccess } from "@/lib/plan-rules"
import type { ProjectPayment, ProjectPaymentStatus } from "@/generated/prisma/client"

export function proFeatureRequired(message = "Central Financeira é um recurso do Vaqen Pro.") {
  return NextResponse.json({ error: { code: "PRO_FEATURE_REQUIRED", message } }, { status: 403 })
}

export async function userHasProAccess(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  return Boolean(subscription && hasProAccess(subscription))
}

export async function requireFinanceAccess(userId: string) {
  const proAccess = await userHasProAccess(userId)
  if (!proAccess) return false
  return true
}

export function parseDateInput(value: string) {
  return new Date(`${value}T12:00:00.000Z`)
}

export function getSaoPauloMonthRange(monthKey?: string | null) {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now)
  const currentYear = parts.find((part) => part.type === "year")?.value ?? String(now.getUTCFullYear())
  const currentMonth = parts.find((part) => part.type === "month")?.value ?? String(now.getUTCMonth() + 1).padStart(2, "0")
  const key = monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : `${currentYear}-${currentMonth}`
  const [year, month] = key.split("-").map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1, 3, 0, 0, 0))
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 3, 0, 0, 0))
  return { key, start, end }
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + amount)
  return next
}

export function isPaymentOverdue(payment: Pick<ProjectPayment, "status" | "dueDate" | "paidAt">, now = new Date()) {
  return !payment.paidAt && payment.status !== "PAID" && payment.status !== "CANCELED" && payment.dueDate < startOfTodaySaoPaulo(now)
}

export function normalizePaymentStatus(payment: Pick<ProjectPayment, "status" | "dueDate" | "paidAt">): ProjectPaymentStatus {
  if (payment.status === "CANCELED") return "CANCELED"
  if (payment.paidAt || payment.status === "PAID") return "PAID"
  if (isPaymentOverdue(payment)) return "OVERDUE"
  return "PENDING"
}

export function formatPayment(payment: ProjectPayment) {
  return {
    ...payment,
    displayStatus: normalizePaymentStatus(payment),
  }
}

function startOfTodaySaoPaulo(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0))
}

export type FinancePrisma = typeof prisma & {
  projectPayment?: unknown
  projectPaymentPlan?: unknown
}

export function financeDelegatesAvailable() {
  const client = prisma as FinancePrisma
  return Boolean(client.projectPayment && client.projectPaymentPlan)
}

export function migrationRequired() {
  return NextResponse.json(
    { error: { code: "MIGRATION_REQUIRED", message: "A Central Financeira ainda não recebeu a migration no banco local. Rode pnpm prisma migrate dev e reinicie o servidor." } },
    { status: 503 }
  )
}
export function isMissingFinanceMigrationError(cause: unknown) {
  return typeof cause === "object" && cause !== null && "code" in cause && ["P2021", "P2022"].includes(String((cause as { code?: unknown }).code))
}