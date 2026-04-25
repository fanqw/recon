"use client";

import { Button, Card, Input, Typography } from "@arco-design/web-react";
import { FieldErrorText } from "@/components/form/FieldErrorText";
import { RequiredFieldLabel } from "@/components/form/RequiredFieldLabel";
import { validateLoginFields, type LoginFieldErrors } from "@/lib/forms/login-validation";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const nextFieldErrors = validateLoginFields({ username, password });
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setLoading(true);
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
    <div className="w-full max-w-[380px]">
      <Card className="w-full">
        <Typography.Title heading={4}>管理员登录</Typography.Title>
        <Typography.Paragraph type="secondary" className="mt-2 !mb-0">
          登录后继续处理分类、订单和工作台数据
        </Typography.Paragraph>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <RequiredFieldLabel htmlFor="login-username" label="用户名" />
          <Input
            id="login-username"
            name="username"
            autoComplete="username"
            aria-label="用户名"
            status={fieldErrors.username ? "error" : undefined}
          />
          <FieldErrorText message={fieldErrors.username} />
          <RequiredFieldLabel htmlFor="login-password" label="密码" />
          <Input.Password
            id="login-password"
            name="password"
            autoComplete="current-password"
            aria-label="密码"
            status={fieldErrors.password ? "error" : undefined}
          />
          <FieldErrorText message={fieldErrors.password} />
          {error ? <Typography.Text type="error">{error}</Typography.Text> : null}
          <Button htmlType="submit" type="primary" loading={loading}>
            {loading ? "登录中…" : "登录"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
