import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

/**
 * Retorna exclusivamente o usuario da sessao persistida e validada.
 * IDs enviados pelo cliente nunca participam da decisao de autorizacao.
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user.id ?? null
}

export async function requireUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user ?? null
}
