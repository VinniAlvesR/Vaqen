import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"

export type RateLimitKind = "auth-ip" | "auth-email" | "read" | "write" | "read-heavy" | "billing" | "notification" | "upload" | "export" | "account-delete"
const limiters = new Map<RateLimitKind, Ratelimit>()

const limits: Record<RateLimitKind, { count: number; window: Parameters<typeof Ratelimit.slidingWindow>[1] }> = {
  "auth-ip": { count: 20, window: "10 m" },
  "auth-email": { count: 5, window: "10 m" },
  read: { count: 300, window: "1 m" },
  write: { count: 120, window: "1 m" },
  "read-heavy": { count: 60, window: "1 m" },
  billing: { count: 20, window: "10 m" },
  notification: { count: 30, window: "1 m" },
  upload: { count: 10, window: "10 m" },
  export: { count: 3, window: "1 h" },
  "account-delete": { count: 3, window: "1 h" },
}

function getLimiter(kind: RateLimitKind) {
  const cached = limiters.get(kind)
  if (cached) return cached
  const env = getServerEnv()
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })
  const config = limits[kind]
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.count, config.window),
    prefix: `vaqen:${kind}`,
    analytics: true,
  })
  limiters.set(kind, limiter)
  return limiter
}

export function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown"
}

export function normalizeRateLimitPart(value: string | null | undefined) {
  return (value || "unknown").trim().toLowerCase().slice(0, 160).replace(/[^a-z0-9@._:-]/g, "_")
}

export function getRateLimitIdentifier(request: NextRequest, scope?: string | null) {
  return scope ? `${getClientIp(request)}:${normalizeRateLimitPart(scope)}` : getClientIp(request)
}

export async function enforceRateLimit(request: NextRequest, kind: RateLimitKind, scope?: string | null) {
  const limiter = getLimiter(kind)
  if (!limiter) return null
  const result = await limiter.limit(getRateLimitIdentifier(request, scope))
  if (result.success) return null

  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente mais tarde." } },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) },
    }
  )
}

