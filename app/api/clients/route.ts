import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiError, unauthorized } from "@/lib/api"
import { assertCanCreate, recordPlanCreation } from "@/lib/plans"
import { getUserIdFromRequest } from "@/services/auth"
import { logActivity } from "@/services/activity"

const clientInput = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  try {
    const search = request.nextUrl.searchParams.get("q")?.trim()
    const lifecycle = request.nextUrl.searchParams.get("lifecycle") ?? "active"
    const showDeleted = request.nextUrl.searchParams.get("showDeleted") === "true"

    const clients = await prisma.client.findMany({
      where: {
        userId,
        ...(showDeleted ? {} : { deletedAt: null }),
        ...(lifecycle === "archived"
          ? { archivedAt: { not: null } }
          : lifecycle === "active" ? { archivedAt: null } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(clients)
  } catch (cause) {
    return apiError(cause, "Não foi possível buscar clientes")
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  try {
    const input = clientInput.parse(await request.json())
    const client = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({ where: { userId } })
      await assertCanCreate(userId, "client", tx, subscription)
      const created = await tx.client.create({ data: { ...input, userId } })
      await recordPlanCreation(userId, "client", tx, subscription)
      return created
    })
    await logActivity(userId, "client", client.id, "created", `Cliente ${client.name} criado`)
    return NextResponse.json(client, { status: 201 })
  } catch (cause) {
    if (cause instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados do cliente inválidos" } }, { status: 400 })
    }
    return apiError(cause, "Não foi possível buscar clientes")
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const body = await request.json()
  const parsed = clientInput.safeParse(body)
  if (!parsed.success || typeof body.id !== "string") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados do cliente inválidos" } }, { status: 400 })
  }

  const updated = await prisma.client.updateMany({
    where: { id: body.id, userId, deletedAt: null },
    data: parsed.data,
  })
  if (!updated.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Cliente não encontrado" } }, { status: 404 })
  const client = await prisma.client.findUniqueOrThrow({ where: { id: body.id } })
  await logActivity(userId, "client", client.id, "updated", `Cliente ${client.name} atualizado`)
  return NextResponse.json(client)
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const { id } = await request.json()
  if (typeof id !== "string") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "ID inválido" } }, { status: 400 })

  const updated = await prisma.client.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  if (!updated.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Cliente não encontrado" } }, { status: 404 })
  await logActivity(userId, "client", id, "deleted", "Cliente movido para a lixeira")
  return NextResponse.json({ success: true })
}
