import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiError, unauthorized } from "@/lib/api"
import { parseDateInput, financeDelegatesAvailable, migrationRequired, proFeatureRequired, requireFinanceAccess } from "@/lib/finance"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"

const statusValues = ["PENDING", "PAID", "OVERDUE", "CANCELED"] as const
const methodValues = ["PIX", "CARD", "TRANSFER", "CASH", "OTHER"] as const

const patchSchema = z.object({
  description: z.string().trim().min(1).max(200).optional(),
  amountCents: z.number().int().min(1).max(999999999).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paid: z.boolean().optional(),
  status: z.enum(statusValues).optional(),
  method: z.enum(methodValues).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  if (!await requireFinanceAccess(userId)) return proFeatureRequired()
  if (!financeDelegatesAvailable()) return migrationRequired()

  const { id: projectId, paymentId } = await params
  try {
    const input = patchSchema.parse(await request.json())
    const payment = await prisma.projectPayment.findFirst({ where: { id: paymentId, projectId, userId, project: { deletedAt: null } } })
    if (!payment) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Pagamento não encontrado" } }, { status: 404 })

    const data = {
      ...(input.description ? { description: input.description } : {}),
      ...(typeof input.amountCents === "number" ? { amountCents: input.amountCents } : {}),
      ...(input.dueDate ? { dueDate: parseDateInput(input.dueDate) } : {}),
      ...(input.method ? { method: input.method } : {}),
      ...("notes" in input ? { notes: input.notes || null } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.paid === true ? { status: "PAID" as const, paidAt: new Date() } : {}),
      ...(input.paid === false ? { status: "PENDING" as const, paidAt: null } : {}),
    }

    const updated = await prisma.projectPayment.update({ where: { id: payment.id }, data })
    await logActivity(userId, "project", projectId, "payment_updated", input.paid === true ? `Pagamento marcado como recebido: ${updated.description}` : `Pagamento atualizado: ${updated.description}`)
    return NextResponse.json(updated)
  } catch (cause) {
    if (cause instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados do pagamento inválidos" } }, { status: 400 })
    return apiError(cause, "Não foi possível atualizar o pagamento")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  if (!await requireFinanceAccess(userId)) return proFeatureRequired()
  if (!financeDelegatesAvailable()) return migrationRequired()

  const { id: projectId, paymentId } = await params
  const payment = await prisma.projectPayment.findFirst({ where: { id: paymentId, projectId, userId, project: { deletedAt: null } } })
  if (!payment) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Pagamento não encontrado" } }, { status: 404 })

  await prisma.projectPayment.delete({ where: { id: payment.id } })
  await logActivity(userId, "project", projectId, "payment_deleted", `Pagamento removido: ${payment.description}`)
  return NextResponse.json({ success: true })
}
