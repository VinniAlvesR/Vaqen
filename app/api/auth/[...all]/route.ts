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

export const GET = handler.GET

export async function POST(request: NextRequest) {
  if (rateLimitedPostPaths.has(getAuthPath(request))) {
    const limited = await enforceRateLimit(request, "auth")
    if (limited) return limited
  }
  return handler.POST(request)
}
