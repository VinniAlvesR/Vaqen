import { NextResponse } from "next/server"
import { z } from "zod"
import { PlanLimitError, PlanDailyQuotaError } from "@/lib/plans"

export function unauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Nao autenticado" } },
    { status: 401 }
  )
}

export function forbidden(message = "Acesso negado") {
  return NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 })
}

export function validationError(message = "Dados invalidos") {
  return NextResponse.json({ error: { code: "VALIDATION_ERROR", message } }, { status: 400 })
}

export function notFound(message = "Registro nao encontrado") {
  return NextResponse.json({ error: { code: "NOT_FOUND", message } }, { status: 404 })
}

export function apiError(cause: unknown, fallback = "Nao foi possivel concluir a operacao") {
  if (cause instanceof PlanLimitError || cause instanceof PlanDailyQuotaError) {
    return NextResponse.json(
      {
        error: {
          code: cause.code,
          message: cause.message,
          resource: cause.resource,
          limit: cause.limit,
          used: cause.used,
          ...(cause instanceof PlanDailyQuotaError ? { periodKey: cause.periodKey } : {}),
        },
      },
      { status: 403 }
    )
  }

  if (cause instanceof z.ZodError) {
    return validationError()
  }

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: fallback } },
    { status: 500 }
  )
}
