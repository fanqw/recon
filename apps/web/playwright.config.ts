import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";

const devOrigin = "http://localhost:3000";
const sessionSecret = process.env.SESSION_SECRET?.trim() || randomBytes(32).toString("hex");

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
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://recon:recon@127.0.0.1:5432/recon",
      SESSION_SECRET: sessionSecret,
    },
  },
});
