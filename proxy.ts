import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { enforceRateLimit } from "@/lib/rate-limit"

const protectedRoutes = [
  "/dashboard",
  "/today",
  "/clients",
  "/projects",
  "/tasks",
  "/activity",
  "/trash",
  "/settings",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isWriteApi = pathname.startsWith("/api/")
    && !["GET", "HEAD", "OPTIONS"].includes(request.method)
    && !pathname.startsWith("/api/auth/")
    && pathname !== "/api/billing/webhook"
  if (isWriteApi) {
    const origin = request.headers.get("origin")
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
    if (origin && host && new URL(origin).host !== host) {
      return NextResponse.json(
        { error: { code: "INVALID_ORIGIN", message: "Origem da requisição inválida" } },
        { status: 403 }
      )
    }
    const limited = await enforceRateLimit(request, "write")
    if (limited) return limited
  }
  if (pathname.startsWith("/api/")) return NextResponse.next()
  const session = await auth.api.getSession({ headers: request.headers })
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/signup"

  if (isProtected && !session) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("callbackURL", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
