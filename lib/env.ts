import { z } from "zod"

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  GMAIL_SMTP_USER: z.string().email().optional(),
  GMAIL_SMTP_APP_PASSWORD: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default("Vaqen <no-reply@vaqen.app>"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),
  BETA_INVITE_ONLY: z.enum(["true", "false"]).default("false"),
  LEGAL_TERMS_VERSION: z.string().default("2026-07-01"),
  LEGAL_PRIVACY_VERSION: z.string().default("2026-07-01"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).default("mailto:vaqen.suporte@gmail.com"),
  CRON_SECRET: z.string().min(16).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | undefined

export function getServerEnv(): ServerEnv {
  if (cached) return cached

  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")
    throw new Error(`Configuração de ambiente inválida: ${keys}`)
  }

  cached = parsed.data
  return cached
}

export function validateProductionEnv() {
  const env = getServerEnv()
  if (env.NODE_ENV !== "production") return env

  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_PRICE_ID",
  ] as const

  const missing: string[] = required.filter((key) => !env[key])
  const hasEmailProvider = Boolean(env.RESEND_API_KEY || (env.GMAIL_SMTP_USER && env.GMAIL_SMTP_APP_PASSWORD))
  if (!hasEmailProvider) missing.push("RESEND_API_KEY ou GMAIL_SMTP_USER/GMAIL_SMTP_APP_PASSWORD")
  if (missing.length) {
    throw new Error(`Configuração de produção incompleta: ${missing.join(", ")}`)
  }
  return env
}
