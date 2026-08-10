import { expect, test } from "@playwright/test"

test("cookie de sessão forjado não autoriza APIs", async ({ request }) => {
  const response = await request.get("/api/clients", {
    headers: { cookie: "better-auth.session_token=forged-session-token" },
  })
  expect(response.status()).toBe(401)
})

test("logout revoga a sessão persistida", async ({ playwright }) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD
  test.skip(!email || !password, "Credenciais da conta de staging não configuradas")

  const context = await playwright.request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    extraHTTPHeaders: { origin: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000" },
  })
  try {
    const login = await context.post("/api/auth/sign-in/email", {
      data: { email, password },
    })
    expect(login.ok()).toBe(true)
    expect((await context.get("/api/clients")).status()).toBe(200)

    const logout = await context.post("/api/auth/sign-out", { data: {} })
    expect(logout.ok()).toBe(true)
    expect((await context.get("/api/clients")).status()).toBe(401)
  } finally {
    await context.dispose()
  }
})

test("pagina interna sem sessao redireciona para login", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/auth\/login/)
})

test("API privada sem sessao retorna 401", async ({ request }) => {
  const routes = ["/api/clients", "/api/projects", "/api/tasks", "/api/today", "/api/trash", "/api/billing/status"]
  for (const route of routes) {
    const response = await request.get(route)
    expect(response.status(), route).toBe(401)
  }
})

test("write API com origem invalida retorna 403", async ({ playwright }) => {
  const context = await playwright.request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    extraHTTPHeaders: { origin: "https://evil.example" },
  })
  try {
    const response = await context.post("/api/clients", { data: { name: "Ataque", email: "" } })
    expect(response.status()).toBe(403)
  } finally {
    await context.dispose()
  }
})