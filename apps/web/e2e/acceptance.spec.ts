import { expect, test } from "@playwright/test";

/**
 * 未携带会话时访问受保护路由，中间件应重定向到登录页（可带 `from` 查询参数）。
 */
test("未登录访问受保护页重定向到登录", async ({ page }) => {
  await page.goto("/basic/category", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
});

/**
 * 登录页：填充并提交表单（等待 load 与短延迟以降低未 hydrate 即点击的风险）。
 */
test("登录页可填写并提交表单", async ({ page }) => {
  await page.goto("/login", { waitUntil: "load" });
  await page.getByLabel("用户名").waitFor({ state: "visible" });
  await page.waitForTimeout(800);
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin123");
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/auth/login") &&
        r.request().method() === "POST"
    ),
    page.getByRole("button", { name: "登录" }).click(),
  ]);
  await expect(page).toHaveURL(/\/basic\/category/, { timeout: 15_000 });
});

/**
 * API 登录后依次打开主导航页面并点击各页至少一个主按钮。
 */
test("主导航各页可见且主按钮可点", async ({ page }) => {
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

  await page.goto("/basic/unit");
  await expect(
    page.getByRole("heading", { name: "单位", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();

  await page.goto("/basic/commodity");
  await expect(
    page.getByRole("heading", { name: "商品", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();

  await page.goto("/basic/purchase-place");
  await expect(
    page.getByRole("heading", { name: "进货地", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();

  await page.goto("/order/list");
  await expect(
    page.getByRole("heading", { name: "订单", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "创建" }).click();
});

/**
 * 准备订单与明细后，在详情页触发导出 Excel 并等待浏览器下载。
 */
test("订单详情可触发导出 Excel 下载", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();

  const comRes = await page.request.get("/api/commodities");
  expect(comRes.ok()).toBeTruthy();
  const comJson = (await comRes.json()) as { items: { id: string }[] };
  const commodityId = comJson.items[0]?.id;
  expect(commodityId).toBeTruthy();

  const suffix = Date.now();
  const placeRes = await page.request.post("/api/purchase-places", {
    data: {
      place: `e2e-place-${suffix}`,
      marketName: `e2e-market-${suffix}`,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(placeRes.status()).toBe(201);
  const placeJson = (await placeRes.json()) as { item: { id: string } };
  const purchasePlaceId = placeJson.item.id;

  const ordRes = await page.request.post("/api/orders", {
    data: { name: `e2e-export-${suffix}`, purchasePlaceId },
    headers: { "Content-Type": "application/json" },
  });
  expect(ordRes.status()).toBe(201);
  const ordJson = (await ordRes.json()) as { item: { id: string } };
  const orderId = ordJson.item.id;

  const lineRes = await page.request.post("/api/order-lines", {
    data: { orderId, commodityId, count: 1, price: 12.34 },
    headers: { "Content-Type": "application/json" },
  });
  expect(lineRes.ok()).toBeTruthy();

  await page.goto(`/order/list/${orderId}`);
  await expect(page.getByRole("button", { name: "导出 Excel" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByRole("button", { name: "导出 Excel" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename().toLowerCase()).toMatch(/\.xlsx$/);
});

test("进货地被关联时页面删除提示错误码映射文案", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();

  const suffix = Date.now();
  const placeText = `e2e-删除拦截-${suffix}`;
  const marketText = `e2e-市场-${suffix}`;

  const placeRes = await page.request.post("/api/purchase-places", {
    data: { place: placeText, marketName: marketText },
    headers: { "Content-Type": "application/json" },
  });
  expect(placeRes.status()).toBe(201);
  const placeJson = (await placeRes.json()) as { item: { id: string } };

  const orderRes = await page.request.post("/api/orders", {
    data: { name: `e2e-order-${suffix}`, purchasePlaceId: placeJson.item.id },
    headers: { "Content-Type": "application/json" },
  });
  expect(orderRes.status()).toBe(201);

  await page.goto("/basic/purchase-place");
  const row = page
    .locator("tr")
    .filter({ hasText: placeText })
    .filter({ hasText: marketText })
    .first();
  await expect(row).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "删除" }).click();
  await expect(page.getByRole("alert")).toContainText("该进货地已被关联，无法删除");
});

test("工作台导航支持新层级、侧栏折叠与主题持久化", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();

  await page.goto("/workspace");
  await expect(
    page.getByRole("heading", { name: "工作台", exact: true })
  ).toBeVisible();

  const nav = page.getByRole("navigation", { name: "主导航" });
  await expect(nav.getByText("工作台", { exact: true })).toBeVisible();
  await expect(nav.getByText("物料管理", { exact: true })).toBeVisible();
  await expect(nav.getByText("订单管理", { exact: true })).toBeVisible();

  await page.goto("/basic/category");
  const breadcrumb = page.getByLabel("页面位置");
  await expect(breadcrumb).toContainText("工作台");
  await expect(breadcrumb).toContainText("物料管理");
  await expect(breadcrumb).toContainText("商品分类");

  const sidebar = page.getByTestId("dashboard-sidebar");
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await page.getByRole("button", { name: "收起侧栏" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await expect(
    page.getByRole("button", { name: "展开侧栏" })
  ).toBeVisible();
  await page.getByRole("button", { name: "展开侧栏" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");

  await page.getByRole("button", { name: "切换为深色主题" }).click();
  await expect(page.locator("body")).toHaveAttribute("arco-theme", "dark");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("recon-theme")))
    .toBe("dark");

  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("arco-theme", "dark");
  await page.getByRole("button", { name: "切换为浅色主题" }).click();
  await expect(page.locator("body")).toHaveAttribute("arco-theme", "light");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("recon-theme")))
    .toBe("light");
});
