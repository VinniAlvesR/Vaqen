import { z } from "zod"

const emptyToUndefined = (value: unknown) => typeof value === "string" && value.trim() === "" ? undefined : value
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional())
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional())
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional())
const optionalMinString = (min: number) => z.preprocess(emptyToUndefined, z.string().min(min).optional())

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_TRUSTED_ORIGINS: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  GMAIL_SMTP_USER: optionalEmail,
  GMAIL_SMTP_APP_PASSWORD: optionalString,
  EMAIL_FROM: z.string().min(1).default("Vaqen <no-reply@vaqen.app>"),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  BETA_INVITE_ONLY: z.enum(["true", "false"]).default("true"),
  LEGAL_TERMS_VERSION: z.string().default("2026-07-01"),
  LEGAL_PRIVACY_VERSION: z.string().default("2026-07-01"),
  CRON_SECRET: optionalMinString(16),
  BLOB_READ_WRITE_TOKEN: optionalString,
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
  ] as const

  const missing: string[] = required.filter((key) => !env[key])
  const hasEmailProvider = Boolean(env.RESEND_API_KEY || (env.GMAIL_SMTP_USER && env.GMAIL_SMTP_APP_PASSWORD))
  if (!hasEmailProvider) missing.push("RESEND_API_KEY ou GMAIL_SMTP_USER/GMAIL_SMTP_APP_PASSWORD")
  if (missing.length) {
    throw new Error(`Configuração de produção incompleta: ${missing.join(", ")}`)
  }
  return env
}
