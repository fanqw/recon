import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export const DEFAULT_TEST_DATABASE_URL =
  "postgresql://recon:recon@127.0.0.1:5432/recon";

export const DEFAULT_TEST_SESSION_SECRET =
  "vitest-recon-session-secret-32-characters-min!!";

export function loadWebEnv(webRoot: string): NodeJS.ProcessEnv {
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
  } catch {
    /* 无 .env 时依赖调用方环境变量 */
  }
  return env;
}

export function withTestDatabaseEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    DATABASE_URL: env.DATABASE_URL || DEFAULT_TEST_DATABASE_URL,
    SESSION_SECRET: env.SESSION_SECRET || DEFAULT_TEST_SESSION_SECRET,
  };
}

export function resetDatabaseToSeed(webRoot: string, env: NodeJS.ProcessEnv): void {
  execSync("pnpm exec prisma db seed", {
    cwd: webRoot,
    env,
    stdio: "inherit",
  });
}
