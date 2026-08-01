import { describe, expect, it } from "vitest"
import { toCsv } from "@/lib/csv"

describe("exportação CSV", () => {
  it("escapa aspas e neutraliza fórmulas", () => {
    const csv = toCsv([{ name: "Empresa \"X\"", note: "=IMPORTXML(A1)" }])
    expect(csv).toContain('Empresa ""X""')
    expect(csv).toContain("'=IMPORTXML")
  })
})
