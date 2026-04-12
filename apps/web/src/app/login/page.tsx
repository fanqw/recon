import { Suspense } from "react";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-shell items-center justify-center text-[var(--muted)]">
          加载中…
        </div>
      }
    >
      <div className="login-shell">
        <section className="login-hero" aria-labelledby="login-hero-title">
          <h2 id="login-hero-title">采购台账</h2>
          <p>进销存与对账一体化</p>
        </section>
        <section className="login-form-panel" aria-label="登录表单区域">
          <LoginClient />
        </section>
      </div>
    </Suspense>
  );
}
