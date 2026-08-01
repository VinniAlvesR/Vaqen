import { expect, test } from "@playwright/test"
import { neon } from "@neondatabase/serverless"

type DbUser = { id: string }
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>

function buildUniqueEmail(baseEmail: string) {
  const [local, domain] = baseEmail.split("@")
  return `${local}+vaqen-e2e-${Date.now()}@${domain}`
}

async function waitForUser(sql: Sql, email: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rows = await sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1` as DbUser[]
    const user = rows[0]
    if (user) return user
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error("Usuário E2E não foi criado no banco")
}

test("fluxo beta: cadastro, verificação, login e criação de registros", async ({ page }) => {
  const invite = process.env.E2E_SIGNUP_INVITE
  const baseEmail = process.env.E2E_SIGNUP_EMAIL
  const databaseUrl = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL
  test.skip(!invite || !baseEmail || !databaseUrl, "E2E de cadastro requer E2E_SIGNUP_INVITE, E2E_SIGNUP_EMAIL e E2E_DATABASE_URL")

  const email = buildUniqueEmail(baseEmail!)
  const password = `Vaqen-e2e-${Date.now()}`
  const sql = neon(databaseUrl!) as unknown as Sql

  try {
    await page.goto("/auth/signup")
    await page.getByLabel("Código do convite").fill(invite!)
    await page.getByLabel("Nome").fill("Usuário E2E Vaqen")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Senha", { exact: true }).fill(password)
    await page.getByLabel("Confirmar senha").fill(password)
    await page.getByLabel(/Aceito os Termos de Uso/).check()
    await page.getByRole("button", { name: "Criar conta" }).click()

    await expect(page).toHaveURL(/\/auth\/verify-email/)
    await expect(page.getByText(email)).toBeVisible()

    const user = await waitForUser(sql, email)
    await sql`UPDATE "user" SET "emailVerified" = true WHERE id = ${user.id}`

    await page.goto("/auth/login")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Senha").fill(password)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    const client = await page.request.post("/api/clients", {
      data: { name: "Cliente E2E", email: "cliente.e2e@example.com", company: "Vaqen QA" },
    })
    expect(client.status()).toBe(201)
    const clientBody = await client.json()

    const project = await page.request.post("/api/projects", {
      data: { name: "Projeto E2E", clientId: clientBody.id, status: "Planejamento", priority: "Média", description: "Criado pelo E2E beta" },
    })
    expect(project.status()).toBe(201)
    const projectBody = await project.json()

    const task = await page.request.post("/api/tasks", {
      data: { title: "Tarefa E2E", projectId: projectBody.id, status: "Pendente", priority: "Média", description: "Criada pelo E2E beta" },
    })
    expect(task.status()).toBe(201)

    await page.goto("/dashboard")
    await expect(page.getByText("Visão geral do Vaqen")).toBeVisible()
  } finally {
    await sql`DELETE FROM "user" WHERE email = ${email}`
  }
})
