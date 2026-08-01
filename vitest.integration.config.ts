import "dotenv/config"
import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, ".") } },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
  },
})
