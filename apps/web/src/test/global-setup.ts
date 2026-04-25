import { execSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import { registerTestServerProcess, stopTestServer } from "./global-teardown";
import {
  loadWebEnv,
  resetDatabaseToSeed,
  withTestDatabaseEnv,
} from "./test-db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 在启动 Next 子进程前迁移并种子，避免 `login` 等接口因空库/缺表返回 500。
 */
function prepareDatabaseForVitest(webRoot: string, env: NodeJS.ProcessEnv): void {
  const opts = { cwd: webRoot, env, stdio: "inherit" as const };
  try {
    execSync("pnpm exec prisma migrate deploy", opts);
    execSync("pnpm exec prisma db seed", opts);
  } catch {
    throw new Error(
      "Vitest 全局 setup：数据库迁移或种子失败。请在仓库根目录执行 `docker compose up -d postgres`，或配置可用的 `DATABASE_URL`（默认可用 postgresql://recon:recon@127.0.0.1:5432/recon），并确保 `apps/web/.env` 或环境中含 `SESSION_SECRET`（≥32 字符）；详见 apps/web/.env.example。"
    );
  }
}

/**
 * 读取 `apps/web/.env` 键值并合并进环境（Vitest 进程默认不会自动加载该文件，子进程需显式注入 `DATABASE_URL` 等）。
 */
/**
 * 在本机绑定随机可用端口（先 listen 0 再释放）。
 */
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        if (addr && typeof addr === "object") resolve(addr.port);
        else reject(new Error("无法解析可用端口"));
      });
    });
  });
}

/**
 * 探测是否已有可访问的 Next 实例（例如本机已执行 `pnpm dev`），避免同目录再启第二个 `next dev` 被 Next 单例锁拒绝。
 */
async function tryUseExistingDevServer(baseURL: string): Promise<boolean> {
  const root = baseURL.replace(/\/$/, "");
  const loginUrl = `${root}/login`;
  try {
    const res = await fetch(loginUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(2500),
    });
    return (
      res.status === 200 ||
      res.status === 302 ||
      res.status === 307 ||
      res.status === 308
    );
  } catch {
    return false;
  }
}

/**
 * 轮询 HTTP 直到路由可响应或超时（用于等待 `next dev` 就绪）。
 */
async function waitForServerReady(baseURL: string, timeoutMs: number): Promise<void> {
  const loginUrl = `${baseURL}/login`;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(loginUrl, { redirect: "manual" });
      if (
        res.status === 200 ||
        res.status === 302 ||
        res.status === 307 ||
        res.status === 308
      ) {
        return;
      }
    } catch {
      /* 连接未就绪，继续重试 */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`等待 Next 开发服务就绪超时: ${loginUrl}`);
}

/**
 * Vitest 全局前置：在 `apps/web` 下以随机端口启动 `next dev`，并通过 `provide` 注入 `testBaseUrl`。
 * 返回的 teardown 负责结束子进程。
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const webRoot = path.resolve(__dirname, "../..");
  const reuseUrl =
    process.env.RECON_TEST_BASE_URL?.trim() || "http://localhost:3000";
  const sharedEnv = withTestDatabaseEnv(loadWebEnv(webRoot));

  if (await tryUseExistingDevServer(reuseUrl)) {
    const baseURL = reuseUrl.replace(/\/$/, "");
    project.provide("testBaseUrl", baseURL);
    return async () => {
      resetDatabaseToSeed(webRoot, sharedEnv);
    };
  }

  const port = await getFreePort();
  const baseURL = `http://127.0.0.1:${port}`;
  const childEnv = loadWebEnv(webRoot);
  /** 避免子进程继承 Vitest 注入的 `NODE_OPTIONS`（会导致 Next 启动失败）。 */
  const parentEnv = { ...process.env };
  delete parentEnv.NODE_OPTIONS;
  const env: NodeJS.ProcessEnv = withTestDatabaseEnv({
    ...parentEnv,
    ...childEnv,
    NEXT_TELEMETRY_DISABLED: "1",
  });

  prepareDatabaseForVitest(webRoot, env);

  const nextCli = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");
  let stderrBuf = "";
  const child = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], {
    cwd: webRoot,
    stdio: ["ignore", "ignore", "pipe"],
    env,
  });

  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderrBuf += String(chunk);
    if (stderrBuf.length > 16_000) {
      stderrBuf = stderrBuf.slice(-16_000);
    }
  });

  registerTestServerProcess(child);

  child.on("error", (err) => {
    console.error("[vitest global-setup] 启动 next dev 失败:", err);
  });

  child.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(
        "[vitest global-setup] next dev 异常退出:",
        "code=",
        code,
        "signal=",
        signal
      );
      if (stderrBuf.trim()) {
        console.error("[vitest global-setup] stderr（节选）:\n", stderrBuf.trim().slice(-4000));
      }
    }
  });

  await waitForServerReady(baseURL, 60_000);

  project.provide("testBaseUrl", baseURL);

  return async () => {
    await stopTestServer();
    resetDatabaseToSeed(webRoot, env);
  };
}
