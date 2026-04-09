import { defineConfig } from "@playwright/test";

const devOrigin = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: devOrigin },
  webServer: {
    command: "pnpm dev",
    cwd: __dirname,
    url: devOrigin,
    /** 与 Next 默认 “Local: http://localhost:3000” 一致，便于复用已运行的 dev */
    reuseExistingServer: process.env.CI !== "true" && process.env.CI !== "1",
    timeout: 120_000,
  },
});
