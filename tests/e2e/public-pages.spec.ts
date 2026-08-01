import { expect, test } from "@playwright/test"

test("páginas públicas essenciais respondem", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/Vaqen/i)
  await page.goto("/terms")
  await expect(page.getByRole("heading", { name: "Termos de Uso" })).toBeVisible()
  await page.goto("/privacy")
  await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible()
})
