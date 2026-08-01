import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"

type RateLimitKind = "auth" | "write"
const limiters = new Map<RateLimitKind, Ratelimit>()

function getLimiter(kind: RateLimitKind) {
  const cached = limiters.get(kind)
  if (cached) return cached
  const env = getServerEnv()
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })
  const limiter = new Ratelimit({
    redis,
    limiter: kind === "auth"
      ? Ratelimit.slidingWindow(10, "10 m")
      : Ratelimit.slidingWindow(120, "1 m"),
    prefix: `vaqen:${kind}`,
    analytics: true,
  })
  limiters.set(kind, limiter)
  return limiter
}

export async function enforceRateLimit(request: NextRequest, kind: RateLimitKind) {
  const limiter = getLimiter(kind)
  if (!limiter) return null
  const identifier = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const result = await limiter.limit(identifier)
  if (result.success) return null

  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente mais tarde." } },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) },
    }
  )
}
