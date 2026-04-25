import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadWebEnv(webRoot) {
  const env = { ...process.env };
  try {
    const raw = readFileSync(path.join(webRoot, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch {}
  return env;
}

export default async function globalTeardown() {
  const webRoot = path.dirname(fileURLToPath(import.meta.url));
  const env = {
    ...loadWebEnv(webRoot),
    DATABASE_URL:
      process.env.DATABASE_URL || "postgresql://recon:recon@127.0.0.1:5432/recon",
    SESSION_SECRET:
      process.env.SESSION_SECRET || "playwright-recon-session-secret-32-characters-min!!",
  };
  execSync("pnpm exec prisma db seed", {
    cwd: webRoot,
    env,
    stdio: "inherit",
  });
}
