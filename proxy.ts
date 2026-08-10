import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { enforceRateLimit } from "@/lib/rate-limit"

const protectedRoutes = [
  "/dashboard",
  "/today",
  "/clients",
  "/projects",
  "/tasks",
  "/trash",
  "/settings",
  "/finance",
  "/reports",
]

function requestOriginIsAllowed(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith("/api/")
  const skipsApiRateLimit = pathname.startsWith("/api/auth/")
    || pathname === "/api/billing/webhook"
    || pathname === "/api/config"
    || pathname === "/api/health"
    || pathname === "/api/notifications/cron"
    || pathname === "/api/trash/cron"
  const isWriteApi = isApi
    && !["GET", "HEAD", "OPTIONS"].includes(request.method)
    && !skipsApiRateLimit
  const isReadApi = isApi
    && ["GET", "HEAD"].includes(request.method)
    && !skipsApiRateLimit

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null

  if (isWriteApi || isReadApi) {
    session = await auth.api.getSession({ headers: request.headers })
  }

  if (isWriteApi) {
    if (!requestOriginIsAllowed(request)) {
      return NextResponse.json(
        { error: { code: "INVALID_ORIGIN", message: "Origem da requisicao invalida" } },
        { status: 403 }
      )
    }
    const limited = await enforceRateLimit(request, "write", session?.user.id ?? pathname)
    if (limited) return limited
  }

  if (isReadApi) {
    const limited = await enforceRateLimit(request, "read", session?.user.id ?? pathname)
    if (limited) return limited
  }

  if (isApi) return NextResponse.next()

  session ??= await auth.api.getSession({ headers: request.headers })
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/signup"

  if (isProtected && !session) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("callbackURL", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/today", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
