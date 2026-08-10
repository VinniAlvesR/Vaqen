import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/services/auth"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { unauthorized } from "@/lib/api"
import { enforceRateLimit } from "@/lib/rate-limit"

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "account-delete", userId)
  if (limited) return limited

  const confirmation = request.headers.get("x-account-delete-confirmation")
  if (confirmation !== "EXCLUIR MINHA CONTA") {
    return NextResponse.json(
      { error: { code: "CONFIRMATION_REQUIRED", message: "Confirmacao de exclusao invalida" } },
      { status: 400 }
    )
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (subscription?.stripeSubscriptionId && subscription.status !== "CANCELED") {
    await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId)
  }
  await prisma.user.delete({ where: { id: userId } })

  const response = NextResponse.json({ success: true })
  response.cookies.delete("better-auth.session_token")
  return response
}
