"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * 登录表单客户端逻辑：提交后携带 Cookie 跳转。
 */
export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** 登录失败时的提示文案 */
  const [error, setError] = useState<string | null>(null);
  /** 提交中禁用按钮 */
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement)
      .value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "登录失败");
        return;
      }
      // 登录成功：优先回到 from 参数指向的受保护页
      const targetPath = searchParams.get("from") || "/basic/category";
      router.replace(targetPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-zinc-900">
          recon 登录
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm text-zinc-600"
            >
              用户名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              aria-label="用户名"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm text-zinc-600"
            >
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-label="密码"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
