"use client";

import { Button, Card, Input, Typography } from "@arco-design/web-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
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
      const targetPath = searchParams.get("from") || "/basic/category";
      router.replace(targetPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card style={{ width: 380 }}>
        <Typography.Title heading={5}>recon 登录</Typography.Title>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="text-sm text-[#4e5969]">用户名</label>
          <Input name="username" autoComplete="username" aria-label="用户名" required />
          <label className="text-sm text-[#4e5969]">密码</label>
          <Input.Password name="password" autoComplete="current-password" aria-label="密码" required />
          {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
          <Button htmlType="submit" type="primary" loading={loading}>
            {loading ? "登录中…" : "登录"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
