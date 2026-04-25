import { expect, test, type Page } from "@playwright/test";

async function loginByApi(page: Page) {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();
}

async function createPurchasePlace(
  page: Page,
  suffix: string,
  overrides: Partial<{ place: string; marketName: string; desc: string }> = {},
) {
  const placeRes = await page.request.post("/api/purchase-places", {
    data: {
      place: overrides.place ?? `e2e-place-${suffix}`,
      marketName: overrides.marketName ?? `e2e-market-${suffix}`,
      desc: overrides.desc,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(placeRes.status()).toBe(201);
  const placeJson = (await placeRes.json()) as { item: { id: string } };
  return placeJson.item.id;
}

async function createOrder(
  page: Page,
  suffix: string,
  purchasePlaceId: string,
  overrides: Partial<{ name: string; desc: string }> = {},
) {
  const orderRes = await page.request.post("/api/orders", {
    data: {
      name: overrides.name ?? `e2e-order-${suffix}`,
      purchasePlaceId,
      desc: overrides.desc,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(orderRes.status()).toBe(201);
  const orderJson = (await orderRes.json()) as { item: { id: string } };
  return orderJson.item.id;
}

async function createCategory(page: Page, name: string, desc: string) {
  const res = await page.request.post("/api/categories", {
    data: { name, desc },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

async function createUnit(page: Page, name: string, desc: string) {
  const res = await page.request.post("/api/units", {
    data: { name, desc },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

async function createCommodity(
  page: Page,
  data: { name: string; desc: string; categoryId: string; unitId: string },
) {
  const res = await page.request.post("/api/commodities", {
    data,
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

async function expectBreadcrumb(page: Page, texts: string[]) {
  const breadcrumb = page.getByLabel("页面位置");
  const items = breadcrumb.getByRole("listitem");
  await expect(items).toHaveCount(texts.length);
  for (const [index, text] of texts.entries()) {
    await expect(items.nth(index)).toHaveText(text);
  }
}

async function breadcrumbItemTexts(page: Page) {
  const breadcrumb = page.getByLabel("页面位置");
  return breadcrumb.locator('[role="listitem"]').evaluateAll((items) =>
    items
      .map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );
}

async function rowTexts(page: Page) {
  await page.locator("tbody tr").first().waitFor({ state: "visible" });
  return page.locator("tbody tr").evaluateAll((rows) =>
    rows.map((row) => row.textContent ?? ""),
  );
}

async function chooseSelectOptionBySearch(
  page: Page,
  testId: string,
  searchText: string,
  optionText: string,
) {
  const select = page.getByTestId(testId);
  await select.click();
  await select.locator("input").fill(searchText);
  const popup = page.locator(".arco-select-popup:not(.arco-select-popup-hidden)");
  await expect(popup.getByText(optionText, { exact: true })).toBeVisible();
  await popup.getByText(optionText, { exact: true }).click();
}

async function createSelectOptionByInput(
  page: Page,
  testId: string,
  optionText: string,
) {
  const select = page.getByTestId(testId);
  await select.click();
  await select.locator("input").fill(optionText);
  const popup = page.locator(".arco-select-popup:not(.arco-select-popup-hidden)");
  await expect(popup.getByText(optionText, { exact: true })).toBeVisible();
  await popup.getByText(optionText, { exact: true }).click();
}

async function chooseAsyncSelectOptionBySearch(
  page: Page,
  testId: string,
  searchText: string,
  optionText: string,
) {
  const select = page.getByTestId(testId);
  await select.click();
  await select.locator("input").fill("");
  await select.locator("input").pressSequentially(searchText);
  const popup = page.locator(".arco-select-popup:not(.arco-select-popup-hidden)");
  await expect(popup.getByText(optionText, { exact: true })).toBeVisible();
  await popup.getByText(optionText, { exact: true }).click();
}

async function withFirstGetResponseHidden(
  page: Page,
  urlPart: string,
  hiddenTexts: string[],
) {
  let hidden = false;
  await page.route(`**${urlPart}`, async (route) => {
    const request = route.request();
    if (request.method() !== "GET" || hidden) {
      await route.fallback();
      return;
    }

    hidden = true;
    const response = await route.fetch();
    const body = (await response.json()) as { items?: unknown[] };
    await route.fulfill({
      response,
      json: {
        ...body,
        items: (body.items ?? []).filter((item) => {
          const text = JSON.stringify(item);
          return hiddenTexts.every((hiddenText) => !text.includes(hiddenText));
        }),
      },
    });
  });
}

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

test("登录页展示采购台账语义化信息区", async ({ page }) => {
  await page.goto("/login", { waitUntil: "load" });

  await expect(page.getByRole("heading", { name: "采购台账" })).toBeVisible();
  await expect(page.getByText("按订单、进货地、商品明细串起每一笔采购记录")).toBeVisible();
  await expect(page.getByText("进货有来源")).toBeVisible();
  await expect(page.getByText("金额可复核")).toBeVisible();
  await expect(page.getByText("明细能追踪")).toBeVisible();
});

test("登录页桌面端保持双区布局且表单区域可见", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/login", { waitUntil: "load" });

  const heroBox = await page.locator(".login-hero").boundingBox();
  const formBox = await page.locator(".login-form-panel").boundingBox();

  expect(heroBox).not.toBeNull();
  expect(formBox).not.toBeNull();
  expect(heroBox!.width).toBeGreaterThan(300);
  expect(formBox!.width).toBeGreaterThan(320);
  expect(formBox!.x).toBeGreaterThan(heroBox!.x);
  expect(formBox!.y).toBeLessThan(60);
});

test("登录页表单区展示明确的管理入口文案", async ({ page }) => {
  await page.goto("/login", { waitUntil: "load" });

  await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
  await expect(page.getByText("登录后继续处理分类、订单和工作台数据")).toBeVisible();
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
});

test("登录页平板端用户名密码与登录按钮保持可见", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto("/login", { waitUntil: "load" });

  await expect(page.getByLabel("用户名")).toBeVisible();
  await expect(page.getByLabel("密码")).toBeVisible();
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
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
  await expect(page.getByPlaceholder("搜索名称或备注")).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();

  await page.goto("/basic/unit");
  await expect(page.getByPlaceholder("搜索名称或备注")).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();

  await page.goto("/basic/commodity");
  await expect(page.getByPlaceholder("搜索名称、分类、单位或备注")).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();

  await page.goto("/basic/purchase-place");
  await expect(page.getByPlaceholder("搜索进货地、市场名称或备注")).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();

  await page.goto("/order/list");
  await expect(page.getByPlaceholder("搜索订单、进货地、市场名称或备注")).toBeVisible();
  await page.getByRole("button", { name: "创建" }).click();
});

test("主数据与订单列表工具区位于卡片内且搜索与按钮同排", async ({ page }) => {
  await loginByApi(page);

  const cases = [
    {
      path: "/basic/category",
      placeholder: "搜索名称或备注",
      buttonName: "新建",
    },
    {
      path: "/basic/commodity",
      placeholder: "搜索名称、分类、单位或备注",
      buttonName: "新建",
    },
    {
      path: "/basic/purchase-place",
      placeholder: "搜索进货地、市场名称或备注",
      buttonName: "新建",
    },
    {
      path: "/order/list",
      placeholder: "搜索订单、进货地、市场名称或备注",
      buttonName: "创建",
    },
  ] as const;

  for (const item of cases) {
    await page.goto(item.path);
    const search = page.getByPlaceholder(item.placeholder);
    const button = page.getByRole("button", { name: item.buttonName });
    const card = page.locator(".arco-card").first();

    await expect(card).toBeVisible();
    await expect(search).toBeVisible();
    await expect(button).toBeVisible();

    const cardBox = await card.boundingBox();
    const searchBox = await search.boundingBox();
    const buttonBox = await button.boundingBox();

    expect(cardBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(searchBox!.y).toBeGreaterThanOrEqual(cardBox!.y);
    expect(buttonBox!.y).toBeGreaterThanOrEqual(cardBox!.y);
    expect(Math.abs(searchBox!.y - buttonBox!.y)).toBeLessThanOrEqual(12);
  }
});

test("新建商品弹窗分类与单位支持搜索和直接输入", async ({ page }) => {
  await loginByApi(page);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existingCategory = `e2e-search-cat-${suffix}`;
  const existingUnit = `e2e-search-unit-${suffix}`;
  await createCategory(page, existingCategory, `e2e-search-cat-desc-${suffix}`);
  await createUnit(page, existingUnit, `e2e-search-unit-desc-${suffix}`);

  await page.goto("/basic/commodity");
  await page.getByRole("button", { name: "新建" }).click();
  const modal = page.locator(".arco-modal");
  await modal.getByPlaceholder("请输入商品名称").fill(`e2e-search-commodity-${suffix}`);
  await chooseSelectOptionBySearch(
    page,
    "commodity-category-select",
    "search-cat",
    existingCategory,
  );
  await chooseSelectOptionBySearch(
    page,
    "commodity-unit-select",
    "search-unit",
    existingUnit,
  );
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/commodities") && res.request().method() === "POST"),
    modal.getByRole("button", { name: "新建" }).click(),
  ]);
  await expect(modal).toBeHidden();
  const searchedRow = page.locator("tr").filter({ hasText: `e2e-search-commodity-${suffix}` }).first();
  await expect(searchedRow).toContainText(existingCategory);
  await expect(searchedRow).toContainText(existingUnit);

  const directCategory = `e2e-direct-cat-${suffix}`;
  const directUnit = `e2e-direct-unit-${suffix}`;
  await page.getByRole("button", { name: "新建" }).click();
  const directModal = page.locator(".arco-modal");
  await directModal.getByPlaceholder("请输入商品名称").fill(`e2e-direct-commodity-${suffix}`);
  await createSelectOptionByInput(page, "commodity-category-select", directCategory);
  await createSelectOptionByInput(page, "commodity-unit-select", directUnit);
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/commodities") && res.request().method() === "POST"),
    directModal.getByRole("button", { name: "新建" }).click(),
  ]);
  const directRow = page.locator("tr").filter({ hasText: `e2e-direct-commodity-${suffix}` }).first();
  await expect(directRow).toContainText(directCategory);
  await expect(directRow).toContainText(directUnit);
});

test("新建订单弹窗进货地与市场名支持拆分搜索和直接输入", async ({ page }) => {
  await loginByApi(page);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existingPlace = `e2e-search-place-${suffix}`;
  const existingMarket = `e2e-search-market-${suffix}`;
  await createPurchasePlace(page, suffix, {
    place: existingPlace,
    marketName: existingMarket,
  });

  await page.goto("/order/list");
  await page.getByRole("button", { name: "创建" }).click();
  const modal = page.locator(".arco-modal");
  await modal.getByPlaceholder("请输入订单名称").fill(`e2e-search-order-${suffix}`);
  await chooseSelectOptionBySearch(
    page,
    "order-purchase-place-select",
    "search-place",
    existingPlace,
  );
  await chooseSelectOptionBySearch(
    page,
    "order-market-name-select",
    "search-market",
    existingMarket,
  );
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/orders") && res.request().method() === "POST"),
    modal.getByRole("button", { name: "创建" }).click(),
  ]);
  await expect(modal).toBeHidden();
  const searchedRow = page.locator("tr").filter({ hasText: `e2e-search-order-${suffix}` }).first();
  await expect(searchedRow).toContainText(existingPlace);
  await expect(searchedRow).toContainText(existingMarket);

  const directPlace = `e2e-direct-place-${suffix}`;
  const directMarket = `e2e-direct-market-${suffix}`;
  await page.getByRole("button", { name: "创建" }).click();
  const directModal = page.locator(".arco-modal");
  await directModal.getByPlaceholder("请输入订单名称").fill(`e2e-direct-order-${suffix}`);
  await createSelectOptionByInput(
    page,
    "order-purchase-place-select",
    directPlace,
  );
  await createSelectOptionByInput(
    page,
    "order-market-name-select",
    directMarket,
  );
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/orders") && res.request().method() === "POST"),
    directModal.getByRole("button", { name: "创建" }).click(),
  ]);
  const directRow = page.locator("tr").filter({ hasText: `e2e-direct-order-${suffix}` }).first();
  await expect(directRow).toContainText(directPlace);
  await expect(directRow).toContainText(directMarket);
});

test("新建订单弹窗拆分字段缺失时提示且不提交", async ({ page }) => {
  await loginByApi(page);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orderName = `e2e-invalid-place-order-${suffix}`;
  await page.goto("/order/list");
  await page.getByRole("button", { name: "创建" }).click();
  const modal = page.locator(".arco-modal");
  await modal.getByPlaceholder("请输入订单名称").fill(orderName);
  await createSelectOptionByInput(
    page,
    "order-purchase-place-select",
    `e2e-invalid-place-${suffix}`,
  );
  await modal.getByRole("button", { name: "创建" }).click();

  await expect(page.getByText("请输入市场名称")).toBeVisible();
  await expect(modal).toBeVisible();
  await expect(page.getByText(orderName)).toHaveCount(0);
});

test("新建商品弹窗主数据创建 409 后刷新并复用已有项", async ({ page }) => {
  await loginByApi(page);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const categoryName = `e2e-race-cat-${suffix}`;
  const unitName = `e2e-race-unit-${suffix}`;
  await withFirstGetResponseHidden(page, "/api/categories", [categoryName]);
  await withFirstGetResponseHidden(page, "/api/units", [unitName]);

  await page.goto("/basic/commodity");
  await page.getByRole("button", { name: "新建" }).click();
  await createCategory(page, categoryName, `e2e-race-cat-desc-${suffix}`);
  await createUnit(page, unitName, `e2e-race-unit-desc-${suffix}`);

  const commodityName = `e2e-race-commodity-${suffix}`;
  const modal = page.locator(".arco-modal");
  await modal.getByPlaceholder("请输入商品名称").fill(commodityName);
  await createSelectOptionByInput(page, "commodity-category-select", categoryName);
  await createSelectOptionByInput(page, "commodity-unit-select", unitName);
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/commodities") && res.request().method() === "POST"),
    modal.getByRole("button", { name: "新建" }).click(),
  ]);

  const row = page.locator("tr").filter({ hasText: commodityName }).first();
  await expect(row).toContainText(categoryName);
  await expect(row).toContainText(unitName);
});

test("新建订单弹窗进货地创建 409 后刷新并复用已有项", async ({ page }) => {
  await loginByApi(page);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const place = `e2e-race-place-${suffix}`;
  const market = `e2e-race-market-${suffix}`;
  await withFirstGetResponseHidden(page, "/api/purchase-places", [place, market]);

  await page.goto("/order/list");
  await page.getByRole("button", { name: "创建" }).click();
  await createPurchasePlace(page, suffix, { place, marketName: market });

  const orderName = `e2e-race-order-${suffix}`;
  const modal = page.locator(".arco-modal");
  await modal.getByPlaceholder("请输入订单名称").fill(orderName);
  await createSelectOptionByInput(page, "order-purchase-place-select", place);
  await createSelectOptionByInput(page, "order-market-name-select", market);
  const purchasePlaceCreateResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/api/purchase-places") &&
      res.request().method() === "POST",
  );
  const orderCreateResponse = page.waitForResponse(
    (res) => res.url().includes("/api/orders") && res.request().method() === "POST",
  );
  await Promise.all([
    modal.getByRole("button", { name: "创建" }).click(),
  ]);
  const purchasePlaceCreate = await purchasePlaceCreateResponse;
  expect(purchasePlaceCreate.status()).toBe(409);
  await orderCreateResponse;

  const row = page.locator("tr").filter({ hasText: orderName }).first();
  await expect(row).toContainText(place);
  await expect(row).toContainText(market);
});

test("侧栏收起态图标保留舒展点击区域且订单列表操作列不过宽", async ({ page }) => {
  await loginByApi(page);

  await page.goto("/order/list");
  const sidebar = page.getByTestId("dashboard-sidebar");
  await page.getByRole("button", { name: "收起侧栏" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");

  const collapsedFirstItem = page
    .getByRole("navigation", { name: "主导航" })
    .locator('[role="menuitem"]')
    .first();
  const firstItemBox = await collapsedFirstItem.boundingBox();
  expect(firstItemBox).not.toBeNull();
  expect(firstItemBox!.height).toBeGreaterThanOrEqual(28);

  const operationHeader = page.getByRole("columnheader", { name: "操作" });
  const operationBox = await operationHeader.boundingBox();
  expect(operationBox).not.toBeNull();
  expect(operationBox!.width).toBeLessThanOrEqual(112);
});

test("列表页首尾列固定且内容超宽时表格横向滚动", async ({ page }) => {
  await loginByApi(page);

  await page.setViewportSize({ width: 960, height: 720 });
  await page.goto("/order/list");

  const tableBody = page.locator(".arco-table-content-inner");
  const firstHeader = page.getByRole("columnheader", { name: "名称" });
  const lastHeader = page.getByRole("columnheader", { name: "操作" });
  const beforeFirst = await firstHeader.boundingBox();
  const beforeLast = await lastHeader.boundingBox();
  expect(beforeFirst).not.toBeNull();
  expect(beforeLast).not.toBeNull();

  await tableBody.evaluate((element) => {
    element.scrollLeft = 240;
  });

  const afterFirst = await firstHeader.boundingBox();
  const afterLast = await lastHeader.boundingBox();
  expect(afterFirst).not.toBeNull();
  expect(afterLast).not.toBeNull();
  expect(Math.abs(afterFirst!.x - beforeFirst!.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(afterLast!.x - beforeLast!.x)).toBeLessThanOrEqual(2);
});

test("系统内各表格操作列固定且横向滚动不漂移", async ({ page }) => {
  await loginByApi(page);
  await page.setViewportSize({ width: 960, height: 720 });

  const cases = [
    { path: "/basic/category", firstHeader: "名称" },
    { path: "/basic/unit", firstHeader: "名称" },
    { path: "/basic/commodity", firstHeader: "名称" },
    { path: "/basic/purchase-place", firstHeader: "进货地" },
    { path: "/order/list", firstHeader: "名称" },
  ] as const;

  for (const item of cases) {
    await page.goto(item.path);
    const scrollContainer = page.locator(".arco-table-content-inner").first();
    await expect(scrollContainer).toBeVisible();
    const metrics = await page.evaluate(async () => {
      const rect = (element: Element | null) => element?.getBoundingClientRect() ?? null;
      const pickRight = () =>
        Array.from(document.querySelectorAll("th.arco-table-col-fixed-right"))
          .map((element) => element.getBoundingClientRect())
          .filter((candidate) => candidate.width > 0 && candidate.height > 0)
          .sort((a, b) => b.x - a.x)[0] ?? null;

      const scroll = document.querySelector(".arco-table-content-inner") as HTMLElement | null;
      const before = {
        left: rect(document.querySelector("th.arco-table-col-fixed-left")),
        right: pickRight(),
        scrollLeft: scroll?.scrollLeft ?? 0,
      };

      if (scroll) {
        scroll.scrollLeft = 240;
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }

      const after = {
        left: rect(document.querySelector("th.arco-table-col-fixed-left")),
        right: pickRight(),
        scrollLeft: scroll?.scrollLeft ?? 0,
      };

      return { before, after };
    });
    expect(metrics.before.left, `${item.path} first header`).not.toBeNull();
    expect(metrics.before.right, `${item.path} action header`).not.toBeNull();
    expect(metrics.after.left, `${item.path} first header after scroll`).not.toBeNull();
    expect(metrics.after.right, `${item.path} action header after scroll`).not.toBeNull();
    expect(metrics.after.scrollLeft, `${item.path} scrollLeft`).toBeGreaterThan(0);
    expect(Math.abs(metrics.after.left!.x - metrics.before.left!.x), `${item.path} first header x drift`).toBeLessThanOrEqual(2);
    expect(metrics.after.right!.width, `${item.path} action header width`).toBeGreaterThan(0);
  }
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

test("订单删除入口迁移到列表并在删除后刷新移除", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();

  const suffix = Date.now();
  const placeRes = await page.request.post("/api/purchase-places", {
    data: {
      place: `e2e-delete-place-${suffix}`,
      marketName: `e2e-delete-market-${suffix}`,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(placeRes.status()).toBe(201);
  const placeJson = (await placeRes.json()) as { item: { id: string } };

  const orderName = `e2e-delete-order-${suffix}`;
  const orderRes = await page.request.post("/api/orders", {
    data: { name: orderName, purchasePlaceId: placeJson.item.id },
    headers: { "Content-Type": "application/json" },
  });
  expect(orderRes.status()).toBe(201);
  const orderJson = (await orderRes.json()) as { item: { id: string } };

  await page.goto(`/order/list/${orderJson.item.id}`);
  await expect(
    page.getByRole("button", { name: "删除订单" })
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "新增商品" })).toBeVisible();
  await expect(page.getByRole("button", { name: "导出 Excel" })).toBeVisible();

  await page.goto(`/order/list?q=${encodeURIComponent(orderName)}`);
  const row = page.locator("tr").filter({ hasText: orderName }).first();
  await expect(row).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "删除" }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByText(orderName)).toHaveCount(0);
});

test("订单列表删除失败时展示错误并保留列表项", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();

  const suffix = Date.now();
  const placeRes = await page.request.post("/api/purchase-places", {
    data: {
      place: `e2e-delete-fail-place-${suffix}`,
      marketName: `e2e-delete-fail-market-${suffix}`,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(placeRes.status()).toBe(201);
  const placeJson = (await placeRes.json()) as { item: { id: string } };

  const orderName = `e2e-delete-fail-order-${suffix}`;
  const orderRes = await page.request.post("/api/orders", {
    data: { name: orderName, purchasePlaceId: placeJson.item.id },
    headers: { "Content-Type": "application/json" },
  });
  expect(orderRes.status()).toBe(201);
  const orderJson = (await orderRes.json()) as { item: { id: string } };
  const orderId = orderJson.item.id;

  await page.route(`**/api/orders/${orderId}`, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "e2e 删除订单失败" }),
      });
      return;
    }
    await route.fallback();
  });

  await page.goto(`/order/list?q=${encodeURIComponent(orderName)}`);
  const row = page.locator("tr").filter({ hasText: orderName }).first();
  await expect(row).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("e2e 删除订单失败")).toBeVisible();
  await expect(row).toBeVisible();

  await page.unroute(`**/api/orders/${orderId}`);
  const cleanup = await page.request.delete(`/api/orders/${orderId}`);
  expect(cleanup.ok()).toBeTruthy();
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
  await expect(page.getByText("该进货地已被关联，无法删除")).toBeVisible();
});

test("工作台导航支持新层级、侧栏折叠与主题持久化", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();
  const sessionCookie = login.headers()["set-cookie"]?.match(/recon_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([
    {
      name: "recon_session",
      value: sessionCookie!,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/workspace");
  await expect(
    page.getByRole("heading", { name: "工作台", exact: true })
  ).toBeVisible();
  await expect(page.getByText("能力建设中")).toHaveCount(0);
  await expect(page.getByLabel("核心指标")).toBeVisible();
  await expect(page.getByLabel("工作台图表")).toBeVisible();
  await expect(page.getByRole("img", { name: "总金额趋势" })).toBeVisible();
  await expect(page.getByRole("img", { name: "分类金额与商品构成" })).toBeVisible();
  await expect(page.getByRole("img", { name: "商品金额 Top 10" })).toBeVisible();
  await expect(page.getByRole("img", { name: "分类金额占比" })).toBeVisible();
  await expect(page.getByRole("img", { name: "进货地金额占比" })).toBeVisible();
  await expect(page.getByText("时间粒度")).toHaveCount(0);

  const trendCard = page
    .getByRole("img", { name: "总金额趋势" })
    .locator("xpath=ancestor::div[contains(@class,'arco-card')][1]");
  const categoryStackCard = page
    .getByRole("img", { name: "分类金额与商品构成" })
    .locator("xpath=ancestor::div[contains(@class,'arco-card')][1]");
  const categoryPieCard = page
    .getByRole("img", { name: "分类金额占比" })
    .locator("xpath=ancestor::div[contains(@class,'arco-card')][1]");
  const commodityCard = page
    .getByRole("img", { name: "商品金额 Top 10" })
    .locator("xpath=ancestor::div[contains(@class,'arco-card')][1]");
  const purchasePlacePieCard = page
    .getByRole("img", { name: "进货地金额占比" })
    .locator("xpath=ancestor::div[contains(@class,'arco-card')][1]");
  const trendBox = await trendCard.boundingBox();
  const categoryStackBox = await categoryStackCard.boundingBox();
  const categoryPieBox = await categoryPieCard.boundingBox();
  const commodityBox = await commodityCard.boundingBox();
  const purchasePlacePieBox = await purchasePlacePieCard.boundingBox();
  expect(trendBox).not.toBeNull();
  expect(categoryStackBox).not.toBeNull();
  expect(categoryPieBox).not.toBeNull();
  expect(commodityBox).not.toBeNull();
  expect(purchasePlacePieBox).not.toBeNull();
  expect(trendBox!.width).toBeGreaterThan(categoryStackBox!.width * 1.8);
  expect(categoryStackBox!.y).toBeGreaterThan(trendBox!.y);
  expect(Math.abs(categoryStackBox!.y - categoryPieBox!.y)).toBeLessThanOrEqual(8);
  expect(commodityBox!.y).toBeGreaterThan(categoryStackBox!.y);
  expect(Math.abs(commodityBox!.y - purchasePlacePieBox!.y)).toBeLessThanOrEqual(8);

  const nav = page.getByRole("navigation", { name: "主导航" });
  await expect(nav.getByText("工作台", { exact: true })).toBeVisible();
  await expect(nav.getByText("物料管理", { exact: true })).toBeVisible();
  await expect(nav.getByText("订单管理", { exact: true })).toBeVisible();

  await page.goto("/basic/category");
  const breadcrumb = page.getByLabel("页面位置");
  await expect(breadcrumb).toContainText("物料管理");
  await expect(breadcrumb).toContainText("商品分类");

  const sidebar = page.getByTestId("dashboard-sidebar");
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await page.getByRole("button", { name: "收起侧栏" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await expect(
    page.getByRole("button", { name: "展开侧栏" })
  ).toBeVisible();
  await page.getByRole("button", { name: "展开侧栏" }).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
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

test("侧栏无对账系统标题且面包屑无重复工作台前缀", async ({ page }) => {
  await loginByApi(page);

  await page.goto("/basic/category");

  const sidebar = page.getByTestId("dashboard-sidebar");
  await expect(sidebar).not.toContainText("对账系统");

  const items = await breadcrumbItemTexts(page);
  await expect(items).toEqual([
    "物料管理",
    "商品分类",
  ]);
  await expect(items).toHaveLength(2);
  await expect(items.filter((text) => text === "工作台")).toHaveLength(0);
});

test("侧栏菜单紧贴 header 且收起按钮固定在右下角", async ({ page }) => {
  await loginByApi(page);

  await page.goto("/basic/category");

  const sidebar = page.getByTestId("dashboard-sidebar");
  const toggleButton = page.getByRole("button", { name: "收起侧栏" });
  const firstMenuItem = page
    .getByRole("navigation", { name: "主导航" })
    .getByText("工作台", { exact: true });

  const sidebarBox = await sidebar.boundingBox();
  const toggleBox = await toggleButton.boundingBox();
  const firstItemBox = await firstMenuItem.boundingBox();

  expect(sidebarBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(firstItemBox).not.toBeNull();
  expect(firstItemBox!.y - sidebarBox!.y).toBeLessThanOrEqual(12);
  expect(sidebarBox!.y + sidebarBox!.height - (toggleBox!.y + toggleBox!.height)).toBeLessThanOrEqual(16);
  expect(sidebarBox!.x + sidebarBox!.width - (toggleBox!.x + toggleBox!.width)).toBeLessThanOrEqual(16);

  await toggleButton.click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  const collapsedFirstItem = page
    .getByRole("navigation", { name: "主导航" })
    .locator('[role="menuitem"]')
    .first();
  const collapsedSidebarBox = await sidebar.boundingBox();
  const collapsedItemBox = await collapsedFirstItem.boundingBox();
  expect(collapsedSidebarBox).not.toBeNull();
  expect(collapsedItemBox).not.toBeNull();
  const sidebarCenterX = collapsedSidebarBox!.x + collapsedSidebarBox!.width / 2;
  const itemCenterX = collapsedItemBox!.x + collapsedItemBox!.width / 2;
  expect(Math.abs(itemCenterX - sidebarCenterX)).toBeGreaterThanOrEqual(6);
  expect(Math.abs(collapsedItemBox!.height - firstItemBox!.height)).toBeLessThanOrEqual(2);
  const collapsedIconBox = await collapsedFirstItem.locator("svg").first().boundingBox();
  expect(collapsedIconBox).not.toBeNull();
  expect(collapsedIconBox!.width).toBeGreaterThan(0);
  const expandedIconBox = await page
    .getByRole("navigation", { name: "主导航" })
    .locator('[role="menuitem"]')
    .first()
    .locator("svg")
    .first()
    .boundingBox();
  expect(expandedIconBox).not.toBeNull();
  const iconCenterX = collapsedIconBox!.x + collapsedIconBox!.width / 2;
  const expandedIconCenterX = expandedIconBox!.x + expandedIconBox!.width / 2;
  expect(Math.abs(iconCenterX - expandedIconCenterX)).toBeLessThanOrEqual(4);
});

test("工作区内容超出时仅主内容滚动，侧栏保持一屏高度", async ({ page }) => {
  await loginByApi(page);

  await page.goto("/workspace");

  const sidebar = page.getByTestId("dashboard-sidebar");
  const main = page.locator("main.dashboard-main");
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const sidebarBox = await sidebar.boundingBox();
  const mainBox = await main.boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(Math.abs(sidebarBox!.height - (viewport!.height - 56))).toBeLessThanOrEqual(2);
  expect(Math.abs(mainBox!.height - (viewport!.height - 56))).toBeLessThanOrEqual(2);

  const scrollBefore = await page.evaluate(() => ({
    windowScrollY: window.scrollY,
    mainScrollTop:
      document.querySelector("main.dashboard-main") instanceof HTMLElement
        ? document.querySelector("main.dashboard-main")!.scrollTop
        : -1,
  }));

  await page.locator("main.dashboard-main").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const scrollAfter = await page.evaluate(() => ({
    windowScrollY: window.scrollY,
    mainScrollTop:
      document.querySelector("main.dashboard-main") instanceof HTMLElement
        ? document.querySelector("main.dashboard-main")!.scrollTop
        : -1,
  }));

  expect(scrollBefore.windowScrollY).toBe(0);
  expect(scrollAfter.windowScrollY).toBe(0);
  expect(scrollAfter.mainScrollTop).toBeGreaterThan(scrollBefore.mainScrollTop);
});

test("导航子菜单点击与多路径面包屑保持一致", async ({ page }) => {
  await loginByApi(page);

  await page.goto("/workspace");
  const nav = page.getByRole("navigation", { name: "主导航" });

  await nav.getByText("物料管理", { exact: true }).click();
  await expect(nav.getByText("商品信息", { exact: true })).toBeVisible();
  await nav.getByText("商品信息", { exact: true }).click();
  await expect(page).toHaveURL(/\/basic\/commodity$/);
  await expectBreadcrumb(page, ["物料管理", "商品信息"]);

  await nav.getByText("商品单位", { exact: true }).click();
  await expect(page).toHaveURL(/\/basic\/unit$/);
  await expectBreadcrumb(page, ["物料管理", "商品单位"]);

  await nav.getByText("订单管理", { exact: true }).click();
  await nav.getByText("订单列表", { exact: true }).click();
  await expect(page).toHaveURL(/\/order\/list$/);
  await expectBreadcrumb(page, ["订单管理", "订单列表"]);

  await page.getByRole("button", { name: "收起侧栏" }).click();
  await expect(page.getByTestId("dashboard-sidebar")).toHaveAttribute(
    "data-collapsed",
    "true",
  );
  await page.getByRole("button", { name: "展开侧栏" }).click();
  await expect(page.getByTestId("dashboard-sidebar")).toHaveAttribute(
    "data-collapsed",
    "false",
  );

  await nav.getByText("物料管理", { exact: true }).click();
  await expect(nav.getByText("商品分类", { exact: true })).toBeVisible();
  await nav.getByText("商品分类", { exact: true }).click();
  await expect(page).toHaveURL(/\/basic\/category$/);
  await expectBreadcrumb(page, ["物料管理", "商品分类"]);
});

test("面包屑最后一级仅展示当前页文本而不带链接", async ({ page }) => {
  await loginByApi(page);

  await page.goto("/order/list");
  const items = page.getByLabel("页面位置").getByRole("listitem");
  await expect(items.last().getByRole("link")).toHaveCount(0);
});

test("订单详情面包屑按菜单层级展示而不重复列表层", async ({ page }) => {
  await loginByApi(page);

  const suffix = Date.now();
  const placeRes = await page.request.post("/api/purchase-places", {
    data: {
      place: `e2e-breadcrumb-place-${suffix}`,
      marketName: `e2e-breadcrumb-market-${suffix}`,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(placeRes.status()).toBe(201);
  const placeJson = (await placeRes.json()) as { item: { id: string } };

  const orderRes = await page.request.post("/api/orders", {
    data: {
      name: `e2e-breadcrumb-order-${suffix}`,
      purchasePlaceId: placeJson.item.id,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(orderRes.status()).toBe(201);
  const orderJson = (await orderRes.json()) as { item: { id: string } };

  await page.goto(`/order/list/${orderJson.item.id}`);
  await expectBreadcrumb(page, ["订单管理", "订单详情"]);
});

test("列表关键行为覆盖搜索、备注文案、时间列与默认倒序", async ({ page }) => {
  await loginByApi(page);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const olderCategoryName = `e2e-cat-old-${suffix}`;
  const newerCategoryName = `e2e-cat-new-${suffix}`;
  const unitName = `e2e-unit-${suffix}`;
  const commodityName = `e2e-commodity-${suffix}`;
  const placeMarket = `e2e-market-${suffix}`;
  const olderOrderName = `e2e-order-old-${suffix}`;
  const newerOrderName = `e2e-order-new-${suffix}`;

  const olderCategoryId = await createCategory(
    page,
    olderCategoryName,
    `e2e-cat-remark-old-${suffix}`,
  );
  await page.waitForTimeout(25);
  await createCategory(page, newerCategoryName, `e2e-cat-remark-new-${suffix}`);
  const unitId = await createUnit(page, unitName, `e2e-unit-remark-${suffix}`);
  await createCommodity(page, {
    name: commodityName,
    desc: `e2e-commodity-remark-${suffix}`,
    categoryId: olderCategoryId,
    unitId,
  });
  const purchasePlaceId = await createPurchasePlace(page, suffix, {
    place: `e2e-place-${suffix}`,
    marketName: placeMarket,
    desc: `e2e-place-remark-${suffix}`,
  });
  await createOrder(page, `${suffix}-old`, purchasePlaceId, {
    name: olderOrderName,
    desc: `e2e-order-remark-old-${suffix}`,
  });
  await page.waitForTimeout(25);
  await createOrder(page, `${suffix}-new`, purchasePlaceId, {
    name: newerOrderName,
    desc: `e2e-order-remark-new-${suffix}`,
  });

  await page.goto("/basic/category");
  await expect(page.locator("thead")).toContainText("备注");
  await expect(page.locator("thead")).toContainText("创建时间");
  await expect(page.locator("thead")).toContainText("更新时间");
  const categorySearch = page.getByPlaceholder("搜索名称或备注");
  await categorySearch.fill(olderCategoryName);
  await expect(page.getByText(olderCategoryName)).toBeVisible();
  await expect(page.getByText(newerCategoryName)).toHaveCount(0);
  await categorySearch.fill("");
  await expect(page.getByText(newerCategoryName)).toBeVisible();
  await expect(page.getByText(olderCategoryName)).toBeVisible();
  const categoryRows = await rowTexts(page);
  expect(categoryRows.findIndex((row) => row.includes(newerCategoryName))).toBeLessThan(
    categoryRows.findIndex((row) => row.includes(olderCategoryName)),
  );

  await page.goto("/basic/commodity");
  await expect(page.locator("thead")).toContainText("备注");
  await expect(page.locator("thead")).toContainText("创建时间");
  await expect(page.locator("thead")).toContainText("更新时间");
  await Promise.all([
    page.waitForURL(new RegExp(`/basic/commodity\\?q=${unitName}`)),
    page.getByPlaceholder("搜索名称、分类、单位或备注").fill(unitName),
  ]);
  await expect(page.getByText(commodityName)).toBeVisible();

  await page.goto("/basic/purchase-place");
  await expect(page.locator("thead")).toContainText("备注");
  await expect(page.locator("thead")).toContainText("创建时间");
  await expect(page.locator("thead")).toContainText("更新时间");
  await Promise.all([
    page.waitForURL(new RegExp(`/basic/purchase-place\\?q=${placeMarket}`)),
    page.getByPlaceholder("搜索进货地、市场名称或备注").fill(placeMarket),
  ]);
  await expect(page.getByText(placeMarket)).toBeVisible();

  await page.goto("/order/list");
  await expect(page.locator("thead")).toContainText("备注");
  await expect(page.locator("thead")).toContainText("创建时间");
  await expect(page.locator("thead")).toContainText("更新时间");
  await page.getByPlaceholder("搜索订单、进货地、市场名称或备注").fill(placeMarket);
  await expect(page.getByText(newerOrderName)).toBeVisible();
  await expect(page.getByText(olderOrderName)).toBeVisible();
  const orderRows = await rowTexts(page);
  expect(orderRows.findIndex((row) => row.includes(newerOrderName))).toBeLessThan(
    orderRows.findIndex((row) => row.includes(olderOrderName)),
  );
});

test("订单详情紧凑信息区首屏保留明细与主操作", async ({ page }) => {
  await loginByApi(page);
  await page.setViewportSize({ width: 1280, height: 720 });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const commodityRes = await page.request.get("/api/commodities");
  expect(commodityRes.ok()).toBeTruthy();
  const commodityJson = (await commodityRes.json()) as {
    items: { id: string; name: string }[];
  };
  const commodity = commodityJson.items[0];
  expect(commodity?.id).toBeTruthy();

  const purchasePlaceId = await createPurchasePlace(page, suffix, {
    place: `e2e-compact-place-${suffix}`,
    marketName: `e2e-compact-market-${suffix}`,
    desc: `e2e-compact-place-remark-${suffix}`,
  });
  const orderName = `e2e-compact-order-${suffix}`;
  const orderId = await createOrder(page, suffix, purchasePlaceId, {
    name: orderName,
    desc: `e2e-compact-order-remark-${suffix}`,
  });
  const lineRes = await page.request.post("/api/order-lines", {
    data: { orderId, commodityId: commodity.id, count: 3, price: 8.8 },
    headers: { "Content-Type": "application/json" },
  });
  expect(lineRes.ok()).toBeTruthy();

  await page.goto(`/order/list/${orderId}`);
  await expect(page.getByText(`订单名：${orderName}`)).toBeVisible();
  await expect(page.getByText("进货地：")).toBeVisible();
  await expect(page.getByText("备注：")).toBeVisible();
  await expect(page.getByRole("button", { name: "新增商品" })).toBeVisible();
  await expect(page.getByRole("button", { name: "导出 Excel" })).toBeVisible();
  await expect(page.locator("thead")).toContainText("分类");
  await expect(page.locator("tbody")).toContainText(commodity.name);

  const metrics = await page.evaluate(() => {
    const detailCard = document.querySelector(".arco-card")?.getBoundingClientRect();
    const detailTable = document.querySelector(".arco-table")?.getBoundingClientRect();
    return {
      detailCardHeight: detailCard?.height ?? 0,
      tableTop: detailTable?.top ?? 0,
      viewportHeight: window.innerHeight,
    };
  });

  expect(metrics.detailCardHeight).toBeGreaterThan(0);
  expect(metrics.detailCardHeight).toBeLessThanOrEqual(180);
  expect(metrics.tableTop).toBeGreaterThan(0);
  expect(metrics.tableTop).toBeLessThan(metrics.viewportHeight * 0.7);
});

test("订单详情表首尾列固定且横向滚动时操作列不出现空白断层", async ({ page }) => {
  await loginByApi(page);
  await page.setViewportSize({ width: 1024, height: 720 });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const commodityRes = await page.request.get("/api/commodities");
  expect(commodityRes.ok()).toBeTruthy();
  const commodityJson = (await commodityRes.json()) as {
    items: { id: string; name: string }[];
  };
  const commodity = commodityJson.items[0];
  expect(commodity?.id).toBeTruthy();

  const purchasePlaceId = await createPurchasePlace(page, suffix, {
    place: `e2e-detail-fixed-place-${suffix}`,
    marketName: `e2e-detail-fixed-market-${suffix}`,
  });
  const orderId = await createOrder(page, suffix, purchasePlaceId, {
    name: `e2e-detail-fixed-order-${suffix}`,
  });
  const lineRes = await page.request.post("/api/order-lines", {
    data: {
      orderId,
      commodityId: commodity.id,
      count: 3,
      price: 8.8,
      desc: `e2e-fixed-line-${suffix}`,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(lineRes.ok()).toBeTruthy();

  await page.goto(`/order/list/${orderId}`);
  await expect(page.locator(".arco-table thead")).toContainText("分类");

  const scrollContainer = page.locator(".arco-table-content-inner").first();
  const firstHeader = page.locator(".arco-table thead th").first();
  const lastHeader = page.locator(".arco-table thead th").last();
  const beforeFirst = await firstHeader.boundingBox();
  const beforeLast = await lastHeader.boundingBox();
  expect(beforeFirst).not.toBeNull();
  expect(beforeLast).not.toBeNull();

  await scrollContainer.evaluate((element) => {
    element.scrollLeft = 320;
  });

  const afterFirst = await firstHeader.boundingBox();
  const afterLast = await lastHeader.boundingBox();
  expect(afterFirst).not.toBeNull();
  expect(afterLast).not.toBeNull();
  expect(Math.abs(afterFirst!.x - beforeFirst!.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(afterLast!.x - beforeLast!.x)).toBeLessThanOrEqual(2);
});

test("订单详情新增商品弹窗商品优先并自动计算总金额", async ({ page }) => {
  await loginByApi(page);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const categoryId = await createCategory(
    page,
    `e2e-line-cat-${suffix}`,
    `e2e-line-cat-desc-${suffix}`,
  );
  const unitId = await createUnit(
    page,
    `e2e-line-unit-${suffix}`,
    `e2e-line-unit-desc-${suffix}`,
  );
  const commodityName = `e2e-line-commodity-${suffix}`;
  await createCommodity(page, {
    name: commodityName,
    desc: `e2e-line-commodity-desc-${suffix}`,
    categoryId,
    unitId,
  });
  const purchasePlaceId = await createPurchasePlace(page, suffix, {
    place: `e2e-line-place-${suffix}`,
    marketName: `e2e-line-market-${suffix}`,
  });
  const orderName = `e2e-line-order-${suffix}`;
  const orderId = await createOrder(page, suffix, purchasePlaceId, {
    name: orderName,
    desc: `e2e-line-order-remark-${suffix}`,
  });

  await page.goto(`/order/list/${orderId}`);
  await expect(page.getByText(`订单名：${orderName}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "返回" })).toBeVisible();
  await expect(page.getByRole("button", { name: "新增商品" })).toBeVisible();
  await expect(page.getByText("返回订单列表")).toHaveCount(0);
  await expect(page.getByText("新增明细")).toHaveCount(0);

  await page.getByRole("button", { name: "新增商品" }).click();
  const modal = page.locator(".arco-modal");
  await expect(modal.locator(".arco-modal-title")).toHaveText("新增商品");
  await expect(page.getByText("与计算值")).toHaveCount(0);

  const labels = await modal.locator("label").evaluateAll((nodes) =>
    nodes
      .map((node) => (node.textContent ?? "").replace(/\s+/g, "").trim())
      .map((text) => text.replace(/^\*/, ""))
      .filter(Boolean),
  );
  expect(labels.slice(0, 6)).toEqual([
    "商品",
    "分类",
    "单位",
    "数量",
    "单价",
    "总金额",
  ]);

  await chooseAsyncSelectOptionBySearch(
    page,
    "order-line-commodity-select",
    commodityName,
    commodityName,
  );
  await page.getByLabel("数量").fill("3");
  await page.getByLabel("单价").fill("1.236");
  await expect(page.getByLabel("总金额")).toHaveValue("3.71");

  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/order-lines") &&
        res.request().method() === "POST",
    ),
    modal.getByRole("button", { name: "添加商品" }).click(),
  ]);

  const row = page.locator("tr").filter({ hasText: commodityName }).first();
  await expect(row).toContainText("3");
  await expect(row).toContainText("3.71");
});

test("表单具备中文 placeholder 且备注为多行输入", async ({ page }) => {
  await loginByApi(page);
  await page.goto("/basic/category");
  await page.getByRole("button", { name: "新建" }).click();
  await expect(page.getByPlaceholder("请输入分类名称")).toBeVisible();
  await expect(page.locator("textarea[rows='3']")).toBeVisible();
});

test("空数据页面显示占位图与引导文案", async ({ page }) => {
  await loginByApi(page);
  await page.goto("/basic/category?q=__e2e_empty_list__");
  await expect(page.getByRole("img", { name: "空状态" })).toBeVisible();
  await expect(page.getByText("暂无数据，点击新建开始")).toBeVisible();
});

test("MatePad 11 视口下核心流程可用", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1600, height: 2560 } });
  const page = await context.newPage();
  await loginByApi(page);
  await page.goto("/basic/category");
  await expect(page.getByRole("button", { name: "新建" })).toBeVisible();
  await expect(page.getByRole("button", { name: "收起侧栏" })).toBeVisible();
  await context.close();
});
