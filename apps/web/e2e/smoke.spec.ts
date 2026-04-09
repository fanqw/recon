import { expect, test } from "@playwright/test";

/**
 * 冒烟：与同一 BrowserContext 的 `page.request` 登录后写入 Cookie，再验证受保护页与按钮交互。
 * （纯表单点击依赖客户端 hydrate 时机，易在自动化中不稳定；登录 API 行为由 Vitest 覆盖。）
 */
test("登录后可访问分类页并点击新建", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();

  await page.goto("/basic/category");
  await expect(
    page.getByRole("heading", { name: "分类", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();
});
