import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

/**
 * Retorna exclusivamente o usuário da sessão persistida e validada.
 * IDs enviados pelo cliente nunca participam da decisão de autorização.
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user.id ?? null
}
