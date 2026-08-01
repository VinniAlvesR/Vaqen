import "dotenv/config"
import { createHash } from "node:crypto"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "../generated/prisma/client"

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL é obrigatória")

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })

async function main() {
  const inviteCode = process.env.BETA_SEED_INVITE
  if (!inviteCode) return

  const expiresAt = new Date()
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 30)
  const codeHash = createHash("sha256").update(inviteCode).digest("hex")
  await prisma.betaInvite.upsert({
    where: { codeHash },
    update: { expiresAt, revokedAt: null },
    create: { codeHash, expiresAt, maxUses: 50 },
  })
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Falha no seed")
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
