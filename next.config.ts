import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const isProduction = process.env.NODE_ENV === "production"
const billingEnabled = Boolean(process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL)

const scriptSrc = ["'self'", "'unsafe-inline'", "https://vercel.live", ...(isProduction ? [] : ["'unsafe-eval'"])]
const connectSrc = [
  "'self'",
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://accounts.google.com",
  "https://*.vercel-insights.com",
  "https://vercel.live",
  "https://*.vercel-storage.com",
  "https://*.blob.vercel-storage.com",
  "https://*.neon.tech",
  "wss://*.neon.tech",
  ...(billingEnabled ? ["https://api.stripe.com", "https://checkout.stripe.com", "https://billing.stripe.com"] : []),
]
const frameSrc = ["'self'", "https://accounts.google.com", ...(billingEnabled ? ["https://checkout.stripe.com", "https://js.stripe.com", "https://billing.stripe.com"] : [])]

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSrc.join(" ")}`,
  `connect-src ${connectSrc.join(" ")}`,
  `frame-src ${frameSrc.join(" ")}`,
  "form-action 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ")

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
})
