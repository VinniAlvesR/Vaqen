import { describe, expect, it, vi } from "vitest"
import { FREE_LIMITS, hasProAccess } from "@/lib/plan-rules"

describe("regras de plano", () => {
  it("mantém os limites públicos do Gratuito", () => {
    expect(FREE_LIMITS).toEqual({ client: 5, project: 10, task: 50 })
  })

  it("libera Pro durante trial válido", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-01T12:00:00Z"))
    expect(hasProAccess({
      plan: "PRO",
      status: "TRIALING",
      trialEndsAt: new Date("2026-07-31T12:00:00Z"),
    })).toBe(true)
    vi.useRealTimers()
  })

  it("bloqueia Pro quando trial expirou", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-01T12:00:00Z"))
    expect(hasProAccess({
      plan: "PRO",
      status: "TRIALING",
      trialEndsAt: new Date("2026-07-31T12:00:00Z"),
    })).toBe(false)
    vi.useRealTimers()
  })
})
