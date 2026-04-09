import { Suspense } from "react";
import { LoginClient } from "./login-client";

/**
 * 登录路由：Suspense 包裹含 useSearchParams 的客户端表单。
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-zinc-500">
          加载中…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
