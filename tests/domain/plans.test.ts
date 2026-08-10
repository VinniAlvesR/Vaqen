import { describe, expect, it, vi } from "vitest"
import { FREE_DAILY_CREATE_LIMITS, FREE_STORAGE_LIMITS, getCurrentPlanPeriodKey, hasProAccess } from "@/lib/plan-rules"

describe("regras de plano", () => {
  it("mantém os limites oficiais do Gratuito", () => {
    expect(FREE_STORAGE_LIMITS).toEqual({ client: 9, project: 9, task: 9 })
    expect(FREE_DAILY_CREATE_LIMITS).toEqual({ client: 3, project: 3, task: 3 })
  })

  it("calcula o período diário em America/Sao_Paulo", () => {
    expect(getCurrentPlanPeriodKey(new Date("2026-08-01T02:30:00.000Z"))).toBe("2026-07-31")
    expect(getCurrentPlanPeriodKey(new Date("2026-08-01T03:30:00.000Z"))).toBe("2026-08-01")
  })

  it("libera Pro durante trial válido vinculado à Stripe", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-01T12:00:00Z"))
    expect(hasProAccess({
      plan: "PRO",
      status: "TRIALING",
      trialEndsAt: new Date("2026-07-31T12:00:00Z"),
      stripeSubscriptionId: "sub_test",
    })).toBe(true)
    vi.useRealTimers()
  })

  it("bloqueia Pro sem assinatura Stripe vinculada", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-01T12:00:00Z"))
    expect(hasProAccess({
      plan: "PRO",
      status: "TRIALING",
      trialEndsAt: new Date("2026-07-31T12:00:00Z"),
    })).toBe(false)
    vi.useRealTimers()
  })

  it("bloqueia Pro quando trial expirou", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-01T12:00:00Z"))
    expect(hasProAccess({
      plan: "PRO",
      status: "TRIALING",
      trialEndsAt: new Date("2026-07-31T12:00:00Z"),
      stripeSubscriptionId: "sub_test",
    })).toBe(false)
    vi.useRealTimers()
  })
})
