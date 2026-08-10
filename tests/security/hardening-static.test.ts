import { existsSync, readFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { describe, expect, it } from "vitest"
import { normalizeRateLimitPart } from "@/lib/rate-limit"

describe("hardening de seguranca", () => {
  it("normaliza identificadores de rate limit sem caracteres perigosos", () => {
    expect(normalizeRateLimitPart(" User+Teste@Email.COM <script> ")).toBe("user_teste@email.com__script_")
  })

  it("CSP de producao nao permite unsafe-eval", () => {
    const config = readFileSync("next.config.ts", "utf8")
    expect(config).toContain(`...(isProduction ? [] : ["'unsafe-eval'"])`)
  })

  it("exportacao LGPD nao seleciona identificadores internos da Stripe", () => {
    const route = readFileSync("app/api/account/export/route.ts", "utf8")
    expect(route).not.toContain("stripeCustomerId: true")
    expect(route).not.toContain("stripeSubscriptionId: true")
    expect(route).not.toContain("stripePriceId: true")
  })

  it("upload de avatar valida assinatura binaria de imagem", () => {
    const route = readFileSync("app/api/account/avatar/route.ts", "utf8")
    expect(route).toContain("hasValidImageSignature")
    expect(route).toContain("INVALID_FILE_SIGNATURE")
  })
  it("billing status expõe apenas assinatura pública", () => {
    const route = readFileSync("app/api/billing/status/route.ts", "utf8")
    const settings = readFileSync("app/settings/page.tsx", "utf8")
    expect(route).toContain("publicSubscription")
    expect(route).toContain("hasStripeCustomer: Boolean(subscription.stripeCustomerId)")
    expect(route).not.toContain("subscription,\n    proAccess")
    expect(settings).toContain("hasStripeCustomer")
    expect(settings).not.toContain("stripeCustomerId?:")
    expect(settings).not.toContain("subscription?.stripeCustomerId")
  })

  it("arquivos de frontend não acessam variáveis sensíveis do servidor", () => {
    const files = execSync("git ls-files app components hooks", { encoding: "utf8" })
      .trim()
      .split(/\r?\n/)
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.startsWith("app/api/") && existsSync(file))
    const forbidden = [
      "DATABASE_URL",
      "DIRECT_URL",
      "BETTER_AUTH_SECRET",
      "GOOGLE_CLIENT_SECRET",
      "GMAIL_SMTP_APP_PASSWORD",
      "RESEND_API_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRO_PRICE_ID",
      "UPSTASH_REDIS_REST_TOKEN",
      "BLOB_READ_WRITE_TOKEN",
      "VAPID_PRIVATE_KEY",
    ]

    const leaks = []
    for (const file of files) {
      const content = readFileSync(file, "utf8")
      for (const key of forbidden) {
        if (content.includes(`process.env.${key}`) || content.includes(`env.${key}`)) leaks.push(`${file}: ${key}`)
      }
    }

    expect(leaks).toEqual([])
  })
  it("proxy aplica rate limit para leituras e escritas de API", () => {
    const proxy = readFileSync("proxy.ts", "utf8")
    const rateLimit = readFileSync("lib/rate-limit.ts", "utf8")
    expect(rateLimit).toContain("read: { count: 300, window: \"1 m\" }")
    expect(proxy).toContain("const isReadApi = isApi")
    expect(proxy).toContain("enforceRateLimit(request, \"read\"")
    expect(proxy).toContain("enforceRateLimit(request, \"write\"")
    expect(proxy).toContain("pathname === \"/api/config\"")
    expect(proxy).toContain("pathname === \"/api/health\"")
  })
  it("todas as APIs privadas exigem autenticacao ou segredo proprio", () => {
    const files = execSync("git ls-files app/api", { encoding: "utf8" })
      .trim()
      .split(/\r?\n/)
      .filter((file) => file.endsWith("route.ts") && existsSync(file))

    const publicOrExternallyVerified = new Set([
      "app/api/auth/[...all]/route.ts",
      "app/api/config/route.ts",
      "app/api/health/route.ts",
      "app/api/billing/webhook/route.ts",
      "app/api/notifications/cron/route.ts",
    ])

    const unprotected = []
    for (const file of files) {
      if (publicOrExternallyVerified.has(file.replaceAll("\\", "/"))) continue
      const content = readFileSync(file, "utf8")
      const hasHandler = /export async function (GET|POST|PATCH|PUT|DELETE)\b/.test(content)
      const hasAuth = content.includes("getUserIdFromRequest") || content.includes("requireUser") || content.includes("auth.api.getSession")
      if (hasHandler && !hasAuth) unprotected.push(file)
    }

    expect(unprotected).toEqual([])
  })

  it("rotas públicas especiais usam validação compatível com o risco", () => {
    const webhook = readFileSync("app/api/billing/webhook/route.ts", "utf8")
    const cron = readFileSync("app/api/notifications/cron/route.ts", "utf8")
    const config = readFileSync("app/api/config/route.ts", "utf8")

    expect(webhook).toContain("constructEvent")
    expect(webhook).toContain("STRIPE_WEBHOOK_SECRET")
    expect(cron).toContain("CRON_SECRET")
    expect(cron).toContain("authorization")
    expect(config).not.toContain("GOOGLE_CLIENT_SECRET:")
    expect(config).not.toContain("STRIPE_SECRET_KEY:")
    expect(config).not.toContain("VAPID_PRIVATE_KEY:")
    expect(config).not.toContain("BLOB_READ_WRITE_TOKEN:")
  })
  it("proxy protege todas as paginas internas principais", () => {
    const proxy = readFileSync("proxy.ts", "utf8")
    const protectedPages = ["/dashboard", "/today", "/clients", "/projects", "/tasks", "/trash", "/settings", "/finance", "/reports"]
    for (const page of protectedPages) expect(proxy).toContain(`"${page}"`)
    expect(proxy).toContain("callbackURL")
    expect(proxy).toContain("/auth/login")
  })
})

