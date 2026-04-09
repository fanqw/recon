import type { ChildProcess } from "node:child_process";

/** 当前由测试启动的 Next dev 子进程，仅在 global setup / teardown 生命周期内有效。 */
let serverProcess: ChildProcess | null = null;

/**
 * 登记 global setup 中 `spawn` 得到的子进程，供 teardown 阶段统一结束。
 */
export function registerTestServerProcess(proc: ChildProcess): void {
  serverProcess = proc;
}

/**
 * 终止测试用 Next 开发服务器；先 SIGTERM，超时后尝试 SIGKILL。
 */
export async function stopTestServer(): Promise<void> {
  const proc = serverProcess;
  serverProcess = null;
  if (!proc?.pid) return;

  proc.kill("SIGTERM");

  await new Promise<void>((resolve) => {
    const maxWait = 10_000;
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* 进程可能已退出 */
      }
      resolve();
    }, maxWait);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
