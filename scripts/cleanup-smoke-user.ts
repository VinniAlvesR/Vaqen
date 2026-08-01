import "dotenv/config"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "../generated/prisma/client"

const email = process.env.SMOKE_EMAIL?.trim().toLowerCase()
const prefix = process.env.SMOKE_EMAIL_PREFIX?.trim().toLowerCase()
const allowed = email?.endsWith("@resend.dev") || email?.endsWith("@example.test")

if ((!email || !allowed) && prefix !== "delivered+vaqen-signup-") {
  throw new Error("SMOKE_EMAIL ausente ou fora dos domínios permitidos")
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL ausente")

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })

async function main() {
  const result = await prisma.user.deleteMany({
    where: prefix
      ? { email: { startsWith: prefix, endsWith: "@resend.dev" } }
      : { email },
  })
  console.log(`cleanup.deleted=${result.count}`)
}

main()
  .catch(() => {
    console.error("cleanup.failed=true")
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
