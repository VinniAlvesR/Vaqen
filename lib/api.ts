import { NextResponse } from "next/server"
import { PlanLimitError } from "@/lib/plans"

export function unauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Não autenticado" } },
    { status: 401 }
  )
}

export function apiError(cause: unknown, fallback = "Não foi possível concluir a operação") {
  if (cause instanceof PlanLimitError) {
    return NextResponse.json(
      {
        error: {
          code: cause.code,
          message: cause.message,
          resource: cause.resource,
          limit: cause.limit,
        },
      },
      { status: 403 }
    )
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: fallback } },
    { status: 500 }
  )
}
