import { createHash } from "node:crypto"
import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { prisma } from "@/lib/prisma"
import { validateProductionEnv } from "@/lib/env"
import { sendAuthEmail } from "@/lib/email"

const env = validateProductionEnv()
const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
const emailProviderEnabled = Boolean(env.RESEND_API_KEY || (env.GMAIL_SMTP_USER && env.GMAIL_SMTP_APP_PASSWORD))
const emailVerificationRequired = env.NODE_ENV === "production" || emailProviderEnabled

export const auth = betterAuth({
  appName: "Vaqen",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: emailVerificationRequired,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Redefina sua senha do Vaqen",
        heading: "Redefinição de senha",
        message: "Use o botão abaixo para escolher uma nova senha.",
        actionLabel: "Redefinir senha",
        actionUrl: url,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: emailVerificationRequired,
    sendOnSignIn: emailVerificationRequired,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Confirme seu email no Vaqen",
        heading: "Confirme seu email",
        message: "Confirme o endereço para ativar sua conta.",
        actionLabel: "Confirmar email",
        actionUrl: url,
      })
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
          disableSignUp: env.BETA_INVITE_ONLY === "true",
        },
      }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
    },
  },
  user: {
    changeEmail: { enabled: true },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (env.BETA_INVITE_ONLY !== "true") return
      if (ctx.path !== "/sign-up/email") return

      if (ctx.path === "/sign-up/email" && ctx.headers?.get("x-legal-accepted") !== "true") {
        throw new APIError("BAD_REQUEST", { message: "É necessário aceitar os Termos e a Política de Privacidade." })
      }

      const code = ctx.headers?.get("x-beta-invite")?.trim()
      if (!code) {
        throw new APIError("FORBIDDEN", { message: "Este Beta requer um convite válido." })
      }
      const codeHash = createHash("sha256").update(code).digest("hex")
      const invite = await prisma.betaInvite.findUnique({ where: { codeHash } })
      if (!invite || invite.revokedAt || invite.expiresAt <= new Date() || invite.useCount >= invite.maxUses) {
        throw new APIError("FORBIDDEN", { message: "Convite inválido ou expirado." })
      }
      const result = await prisma.betaInvite.updateMany({
        where: {
          id: invite.id,
          useCount: invite.useCount,
        },
        data: { useCount: { increment: 1 } },
      })
      if (!result.count) {
        throw new APIError("FORBIDDEN", { message: "Convite inválido ou expirado." })
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" || ctx.headers?.get("x-legal-accepted") !== "true") return
      const email = typeof ctx.body?.email === "string" ? ctx.body.email : null
      if (!email) return
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return
      const marketing = ctx.headers?.get("x-marketing-consent") === "true"
      const ipAddress = ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim()
      const userAgent = ctx.headers?.get("user-agent")
      await prisma.legalConsent.createMany({
        data: [
          { userId: user.id, type: "TERMS", version: env.LEGAL_TERMS_VERSION, accepted: true, ipAddress, userAgent },
          { userId: user.id, type: "PRIVACY", version: env.LEGAL_PRIVACY_VERSION, accepted: true, ipAddress, userAgent },
          { userId: user.id, type: "MARKETING", version: env.LEGAL_PRIVACY_VERSION, accepted: marketing, ipAddress, userAgent },
        ],
      })
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.$transaction([
            prisma.subscription.upsert({
              where: { userId: user.id },
              update: {},
              create: { userId: user.id, plan: "FREE", status: "INCOMPLETE", trialEndsAt: new Date() },
            }),
            prisma.userPreference.upsert({
              where: { userId: user.id },
              update: {},
              create: { userId: user.id },
            }),
          ])
        },
      },
    },
  },
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
