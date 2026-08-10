import { NextRequest } from "next/server"
import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/auth"
import { enforceRateLimit } from "@/lib/rate-limit"

const handler = toNextJsHandler(auth)
const rateLimitedPostPaths = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/request-password-reset",
  "/send-verification-email",
  "/reset-password",
])

function getAuthPath(request: NextRequest) {
  return request.nextUrl.pathname.replace(/^\/api\/auth/, "") || "/"
}

async function getEmailScope(request: NextRequest) {
  try {
    const body = await request.clone().json()
    return typeof body?.email === "string" ? body.email : null
  } catch {
    return null
  }
}

export const GET = handler.GET

export async function POST(request: NextRequest) {
  if (rateLimitedPostPaths.has(getAuthPath(request))) {
    const ipLimited = await enforceRateLimit(request, "auth-ip")
    if (ipLimited) return ipLimited

    const email = await getEmailScope(request)
    if (email) {
      const emailLimited = await enforceRateLimit(request, "auth-email", email)
      if (emailLimited) return emailLimited
    }
  }
  return handler.POST(request)
}
