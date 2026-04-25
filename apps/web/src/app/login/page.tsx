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
          <div className="login-hero-content">
            <p className="login-hero-eyebrow">recon 工作台</p>
            <h2 id="login-hero-title">采购台账</h2>
            <p className="login-hero-lead">按订单、进货地、商品明细串起每一笔采购记录</p>
            <ul className="login-hero-points" aria-label="采购台账价值">
              <li>进货有来源</li>
              <li>金额可复核</li>
              <li>明细能追踪</li>
            </ul>
          </div>
        </section>
        <section className="login-form-panel" aria-label="登录表单区域">
          <LoginClient />
        </section>
      </div>
    </Suspense>
  );
}
