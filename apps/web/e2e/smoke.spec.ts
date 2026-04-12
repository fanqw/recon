import { expect, test } from "@playwright/test";

/**
 * 冒烟：与同一 BrowserContext 的 `page.request` 登录后写入 Cookie，再验证受保护页与按钮交互。
 * （纯表单点击依赖客户端 hydrate 时机，易在自动化中不稳定；登录 API 行为由 Vitest 覆盖。）
 */
test("登录页展示台账视觉区块并可提交", async ({ page }) => {
  await page.goto("/login", { waitUntil: "load" });
  await expect(page.getByText("采购台账")).toBeVisible();
  await page.getByLabel("用户名").waitFor({ state: "visible" });
  await page.waitForTimeout(800);
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin123");
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/auth/login") &&
        r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "登录" }).click(),
  ]);
  await expect(page).toHaveURL(/\/basic\/category/, { timeout: 15_000 });
});

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
