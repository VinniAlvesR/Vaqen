import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiError, unauthorized } from "@/lib/api"
import { addMonths, parseDateInput, financeDelegatesAvailable, migrationRequired, proFeatureRequired, requireFinanceAccess } from "@/lib/finance"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"

const inputSchema = z.object({
  totalAmountCents: z.number().int().min(1).max(999999999),
  installments: z.number().int().min(1).max(36),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(2000).optional().nullable(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  if (!await requireFinanceAccess(userId)) return proFeatureRequired()
  if (!financeDelegatesAvailable()) return migrationRequired()

  const projectId = (await params).id
  try {
    const input = inputSchema.parse(await request.json())
    const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } })
    if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Projeto não encontrado" } }, { status: 404 })

    const firstDueDate = parseDateInput(input.firstDueDate)
    const baseAmount = Math.floor(input.totalAmountCents / input.installments)
    const remainder = input.totalAmountCents - baseAmount * input.installments

    const plan = await prisma.$transaction(async (tx) => {
      const createdPlan = await tx.projectPaymentPlan.create({
        data: {
          userId,
          projectId,
          totalAmountCents: input.totalAmountCents,
          installments: input.installments,
          notes: input.notes || null,
        },
      })

      await tx.projectPayment.createMany({
        data: Array.from({ length: input.installments }, (_, index) => ({
          userId,
          projectId,
          paymentPlanId: createdPlan.id,
          description: `Parcela ${index + 1}/${input.installments} - ${project.name}`,
          amountCents: baseAmount + (index === 0 ? remainder : 0),
          dueDate: addMonths(firstDueDate, index),
          status: "PENDING" as const,
          method: "OTHER" as const,
        })),
      })

      await tx.project.update({ where: { id: project.id }, data: { projectValueCents: input.totalAmountCents } })
      return createdPlan
    })

    await logActivity(userId, "project", projectId, "payment_plan_created", `Plano financeiro criado com ${input.installments} parcela(s)`)
    return NextResponse.json(plan, { status: 201 })
  } catch (cause) {
    if (cause instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados financeiros inválidos" } }, { status: 400 })
    return apiError(cause, "Não foi possível criar o plano financeiro")
  }
}
