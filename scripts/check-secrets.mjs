import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

const allowedFiles = new Set([".env.example", "scripts/check-secrets.mjs", ".github/workflows/ci.yml"])
const patterns = [
  { name: "Stripe live secret", regex: /sk_live_[A-Za-z0-9_]+/ },
  { name: "Stripe test secret", regex: /sk_test_[A-Za-z0-9_]+/ },
  { name: "Stripe webhook secret", regex: /whsec_[A-Za-z0-9_]+/ },
  { name: "Google API key", regex: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: "Gmail app password value", regex: /GMAIL_SMTP_APP_PASSWORD=(?!""|'')\S+/ },
  { name: "Database URL value", regex: /DATABASE_URL=(?!""|'')postgres(?:ql)?:\/\// },
  { name: "Direct database URL value", regex: /DIRECT_URL=(?!""|'')postgres(?:ql)?:\/\// },
  { name: "Better Auth secret value", regex: /BETTER_AUTH_SECRET=(?!""|'')\S{16,}/ },
  { name: "Upstash token value", regex: /UPSTASH_REDIS_REST_TOKEN=(?!""|'')\S+/ },
  { name: "VAPID private key value", regex: /VAPID_PRIVATE_KEY=(?!""|'')\S+/ },
]

const files = execSync("git ls-files", { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean)
const findings = []

for (const file of files) {
  if (allowedFiles.has(file)) continue
  let content
  try {
    content = readFileSync(file, "utf8")
  } catch {
    continue
  }
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) findings.push(file + ": " + pattern.name)
  }
}

if (findings.length) {
  console.error("Possiveis segredos encontrados em arquivos versionados:")
  for (const finding of findings) console.error("- " + finding)
  process.exit(1)
}

console.log("Nenhum segredo conhecido encontrado em arquivos versionados.")

