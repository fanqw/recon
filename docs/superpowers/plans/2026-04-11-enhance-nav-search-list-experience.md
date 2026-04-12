# Enhance Nav Search List Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成导航壳层、列表搜索与规范统一、订单删除入口迁移、light/dark 主题切换、下拉可用性修复、语义化中文 seed 与验收覆盖。

**Architecture:** 采用“后端查询能力先行 + 前端表格与壳层统一接入 + 测试数据基线 + E2E 回归”四段式交付。后端接口统一支持 `q` 模糊搜索并按 `updatedAt desc` 返回；前端列表统一“备注/时间列/固定操作列”行为；dashboard 壳层共享导航配置实现侧栏分组、面包屑和收起状态。主题由 `ArcoProvider` 承载 light/dark 状态并持久化。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Arco Design, Prisma, PostgreSQL, Vitest, Playwright.

---

## Scope Check

该规格覆盖 4 个强关联子域（壳层导航、列表 API/页面、订单详情、测试基线），共享同一组路由与数据模型，且必须在同一次回归中验证。保持单一计划更高效，不拆分为多个独立计划。

## File Structure (Lock Before Coding)

- Modify: `apps/web/src/app/api/categories/route.ts`
  - 分类列表 `q` 搜索扩展到 `name/desc`，保持 `updatedAt desc`。
- Modify: `apps/web/src/app/api/units/route.ts`
  - 单位列表 `q` 搜索扩展到 `name/desc`，保持 `updatedAt desc`。
- Modify: `apps/web/src/app/api/commodities/route.ts`
  - 商品列表 `q` 搜索扩展到 `name/category.name/unit.name/desc`。
- Modify: `apps/web/src/app/api/purchase-places/route.ts`
  - 进货地列表 `q` 搜索扩展到 `place/marketName/desc`。
- Modify: `apps/web/src/app/api/orders/route.ts`
  - 订单列表新增 `q`，支持 `name/purchasePlace.place/purchasePlace.marketName/desc`。

- Modify: `apps/web/src/app/(dashboard)/basic/category/page.tsx`
  - 搜索输入联动 `q`；列文案改“备注”；新增时间列；操作列固定右侧并紧凑。
- Modify: `apps/web/src/app/(dashboard)/basic/unit/page.tsx`
  - 同上。
- Modify: `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`
  - 同上，保留分类与单位显示。
- Modify: `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`
  - 同上，保留进货地/市场名称列。
- Modify: `apps/web/src/app/(dashboard)/order/list/page.tsx`
  - 搜索 `q`、时间列、固定操作列，新增 danger 删除订单入口。
- Modify: `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`
  - 移除删除订单按钮，重构顶部详情区为紧凑布局。

- Modify: `apps/web/src/components/dashboard-nav.tsx`
  - v1 菜单分组结构 + 收起/展开渲染。
- Modify: `apps/web/src/components/dashboard-breadcrumb.tsx`
  - 基于新导航层级渲染面包屑。
- Modify: `apps/web/src/components/dashboard-header.tsx`
  - 加入侧栏切换按钮、light/dark 主题切换、用户信息/退出布局。
- Modify: `apps/web/src/components/arco-provider.tsx`
  - 管理主题状态与持久化，向 Arco ConfigProvider 传递主题。
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
  - 承载 `collapsed` 状态并传给 header/nav。
- Create: `apps/web/src/lib/workspace-nav.ts`
  - 侧栏菜单与面包屑统一配置源。
- Create: `apps/web/src/lib/datetime.ts`
  - 列表统一时间格式化函数。

- Modify: `apps/web/src/components/order-detail/MasterDataCombobox.tsx`
  - 补全下拉搜索与“使用当前输入”的稳定行为（精确匹配判断、输入回填、选项更新）。
- Create: `apps/web/src/lib/master-data/combobox-options.ts`
  - 抽取可测试的 options 构建函数。
- Create: `apps/web/src/lib/master-data/combobox-options.test.ts`
  - 覆盖“使用当前输入”触发条件。

- Modify: `apps/web/prisma/seed.ts`
  - 清库后回填中文语义化样本（分类、单位、商品、进货地、订单明细）。

- Modify: `apps/web/src/test/api/categories.test.ts`
- Modify: `apps/web/src/test/api/purchase-places.test.ts`
- Modify: `apps/web/src/test/api/business-flow.test.ts`
- Create: `apps/web/src/test/api/orders.search.test.ts`
  - API 搜索与排序回归。
- Modify: `apps/web/e2e/acceptance.spec.ts`
  - 覆盖侧栏分组/收起、主题切换、删除入口迁移、详情紧凑区。
- Modify: `apps/web/README.md`
  - 补充导航、主题、seed 基线说明。

---

### Task 1: 列表搜索 API（分类/单位/商品/进货地/订单）

**Files:**
- Modify: `apps/web/src/app/api/categories/route.ts`
- Modify: `apps/web/src/app/api/units/route.ts`
- Modify: `apps/web/src/app/api/commodities/route.ts`
- Modify: `apps/web/src/app/api/purchase-places/route.ts`
- Modify: `apps/web/src/app/api/orders/route.ts`
- Test: `apps/web/src/test/api/categories.test.ts`
- Test: `apps/web/src/test/api/purchase-places.test.ts`
- Create: `apps/web/src/test/api/orders.search.test.ts`

- [ ] **Step 1: Write failing API tests (search fields + updatedAt desc)**

```ts
// apps/web/src/test/api/orders.search.test.ts
import { describe, expect, inject, it } from "vitest";
import { fetchWithCookie, loginAsAdmin, postJsonWithCookie } from "../http-client";

describe("GET /api/orders?q", () => {
  it("按名称/进货地/市场名称/备注模糊搜索", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suffix = Date.now().toString(36);

    const placeRes = await postJsonWithCookie(
      baseUrl,
      "/api/purchase-places",
      { place: `武汉-${suffix}`, marketName: `中心港市场-${suffix}`, desc: "凌晨档" },
      cookie,
    );
    const place = (await placeRes.json()) as { item: { id: string } };

    await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `测试订单-${suffix}`, purchasePlaceId: place.item.id, desc: "备注-苹果" },
      cookie,
    );

    const byPlace = await fetchWithCookie(baseUrl, `/api/orders?q=${encodeURIComponent("武汉")}`, {}, cookie);
    const placeBody = (await byPlace.json()) as { items: Array<{ name: string }> };
    expect(placeBody.items.some((x) => x.name.includes(`测试订单-${suffix}`))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:
```bash
pnpm --filter web test -- src/test/api/orders.search.test.ts src/test/api/categories.test.ts src/test/api/purchase-places.test.ts
```

Expected: FAIL，提示现有接口未覆盖 `desc` 或订单 `q` 过滤字段。

- [ ] **Step 3: Implement minimal API search changes**

```ts
// apps/web/src/app/api/categories/route.ts (GET where)
where: {
  deleted: false,
  ...(q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { desc: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {}),
},
orderBy: { updatedAt: "desc" },
```

```ts
// apps/web/src/app/api/orders/route.ts (GET)
export async function GET(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const items = await prisma.order.findMany({
    where: {
      deleted: false,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { desc: { contains: q, mode: "insensitive" as const } },
              { purchasePlace: { place: { contains: q, mode: "insensitive" as const } } },
              { purchasePlace: { marketName: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { purchasePlace: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ items });
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:
```bash
pnpm --filter web test -- src/test/api/orders.search.test.ts src/test/api/categories.test.ts src/test/api/purchase-places.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/categories/route.ts apps/web/src/app/api/units/route.ts apps/web/src/app/api/commodities/route.ts apps/web/src/app/api/purchase-places/route.ts apps/web/src/app/api/orders/route.ts apps/web/src/test/api/categories.test.ts apps/web/src/test/api/purchase-places.test.ts apps/web/src/test/api/orders.search.test.ts
git commit -m "feat: unify list search fields and order query support"
```

---

### Task 2: 列表页面统一规范（搜索输入、备注、时间列、固定操作列）

**Files:**
- Create: `apps/web/src/lib/datetime.ts`
- Modify: `apps/web/src/app/(dashboard)/basic/category/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/unit/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/order/list/page.tsx`

- [ ] **Step 1: Write failing UI acceptance checks in E2E (column labels + search input)**

```ts
// apps/web/e2e/acceptance.spec.ts (append)
test("列表展示备注/创建时间/更新时间并支持搜索", async ({ page }) => {
  await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });

  await page.goto("/basic/category");
  await expect(page.getByRole("columnheader", { name: "备注" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "创建时间" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "更新时间" })).toBeVisible();
  await page.getByPlaceholder("搜索名称或备注").fill("水果");
});
```

- [ ] **Step 2: Run E2E target test and verify failure**

Run:
```bash
pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "列表展示备注/创建时间/更新时间并支持搜索"
```

Expected: FAIL，缺失列名或搜索框。

- [ ] **Step 3: Implement list UI normalization**

```ts
// apps/web/src/lib/datetime.ts
export function formatDateTime(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
```

```tsx
// example: apps/web/src/app/(dashboard)/basic/category/page.tsx (columns)
const columns: TableColumnProps<Category>[] = [
  { title: "名称", dataIndex: "name" },
  { title: "备注", render: (_, row) => row.desc ?? "—" },
  { title: "创建时间", render: (_, row) => formatDateTime(row.createdAt) },
  { title: "更新时间", render: (_, row) => formatDateTime(row.updatedAt) },
  {
    title: "操作",
    width: 140,
    fixed: "right",
    render: (_, row) => (
      <Space size={4}>
        <Button type="text" size="mini" onClick={() => openEdit(row)}>编辑</Button>
        <Button status="danger" type="text" size="mini" onClick={() => void removeRow(row.id)}>删除</Button>
      </Space>
    ),
  },
];
```

```tsx
// example search input in each list page
<Input.Search
  allowClear
  placeholder="搜索名称或备注"
  value={keyword}
  onChange={setKeyword}
  onSearch={() => void loadList()}
/>
```

- [ ] **Step 4: Run targeted E2E and lint**

Run:
```bash
pnpm --filter web lint
pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "列表展示备注/创建时间/更新时间并支持搜索"
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/datetime.ts apps/web/src/app/(dashboard)/basic/category/page.tsx apps/web/src/app/(dashboard)/basic/unit/page.tsx apps/web/src/app/(dashboard)/basic/commodity/page.tsx apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx apps/web/src/app/(dashboard)/order/list/page.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "feat: normalize list columns search and fixed action column"
```

---

### Task 3: 订单删除入口迁移 + 订单详情紧凑布局

**Files:**
- Modify: `apps/web/src/app/(dashboard)/order/list/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`
- Test: `apps/web/e2e/acceptance.spec.ts`

- [ ] **Step 1: Write failing E2E for delete entrance migration**

```ts
// apps/web/e2e/acceptance.spec.ts (append)
test("删除订单入口仅出现在订单列表，详情页不展示", async ({ page }) => {
  await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });

  await page.goto("/order/list");
  await expect(page.getByRole("button", { name: "删除订单" }).first()).toBeVisible();

  const detailLink = page.getByRole("link", { name: "查看详情" }).first();
  await detailLink.click();
  await expect(page.getByRole("button", { name: "删除订单" })).toHaveCount(0);
});
```

- [ ] **Step 2: Run targeted E2E and verify failure**

Run:
```bash
pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "删除订单入口仅出现在订单列表"
```

Expected: FAIL，当前详情页仍有删除按钮。

- [ ] **Step 3: Implement UI migration + compact detail header**

```tsx
// apps/web/src/app/(dashboard)/order/list/page.tsx (action column)
{
  title: "操作",
  width: 180,
  fixed: "right",
  render: (_, row) => (
    <Space size={4}>
      <Link href={`/order/list/${row.id}`} className="text-[#165dff] hover:underline">查看详情</Link>
      <Button size="mini" status="danger" type="text" onClick={() => void removeOrder(row.id)}>
        删除订单
      </Button>
    </Space>
  ),
}
```

```tsx
// apps/web/src/app/(dashboard)/order/list/[id]/page.tsx (compact top area)
<Card>
  <div className="flex items-start justify-between gap-4">
    <div className="space-y-1">
      <Link href="/order/list" className="text-[#165dff] hover:underline">← 返回订单列表</Link>
      <Typography.Title heading={6} style={{ margin: 0 }}>订单：{order.name}</Typography.Title>
      <Typography.Text>进货地：{order.purchasePlace.place} / {order.purchasePlace.marketName}</Typography.Text>
      {order.desc ? <Typography.Text>备注：{order.desc}</Typography.Text> : null}
    </div>
    <Space size={8}>
      <Button type="primary" onClick={startCreateLine}>新增明细</Button>
      <Button onClick={() => void handleExportExcel()} loading={exporting} disabled={lines.length === 0}>导出 Excel</Button>
    </Space>
  </div>
</Card>
```

- [ ] **Step 4: Re-run E2E and manual quick check**

Run:
```bash
pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "删除订单入口仅出现在订单列表"
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/order/list/page.tsx apps/web/src/app/(dashboard)/order/list/[id]/page.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "feat: move order delete action to list and compact detail header"
```

---

### Task 4: v1 侧栏结构 + 面包屑 + 工作台占位页

**Files:**
- Create: `apps/web/src/lib/workspace-nav.ts`
- Create: `apps/web/src/app/(dashboard)/workspace/page.tsx`
- Modify: `apps/web/src/components/dashboard-nav.tsx`
- Modify: `apps/web/src/components/dashboard-breadcrumb.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Test: `apps/web/e2e/acceptance.spec.ts`

- [ ] **Step 1: Write failing E2E for grouped menu + breadcrumb**

```ts
// apps/web/e2e/acceptance.spec.ts (append)
test("侧栏显示 v1 分组且面包屑层级正确", async ({ page }) => {
  await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });

  await page.goto("/basic/category");
  await expect(page.getByText("物料管理")).toBeVisible();
  await expect(page.getByText("订单管理")).toBeVisible();
  await expect(page.getByRole("link", { name: "工作台" })).toBeVisible();
  await expect(page.getByText("商品分类")).toBeVisible();
});
```

- [ ] **Step 2: Run targeted E2E and verify failure**

Run:
```bash
pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "侧栏显示 v1 分组且面包屑层级正确"
```

Expected: FAIL（当前侧栏与面包屑映射不是 v1 分组）。

- [ ] **Step 3: Implement shared nav config + placeholder page**

```ts
// apps/web/src/lib/workspace-nav.ts
export type WorkspaceNavItem = { key: string; label: string; group: "工作台" | "物料管理" | "订单管理" };

export const workspaceNavItems: WorkspaceNavItem[] = [
  { key: "/workspace", label: "工作台", group: "工作台" },
  { key: "/basic/category", label: "商品分类", group: "物料管理" },
  { key: "/basic/unit", label: "商品单位", group: "物料管理" },
  { key: "/basic/commodity", label: "商品信息", group: "物料管理" },
  { key: "/basic/purchase-place", label: "进货地", group: "物料管理" },
  { key: "/order/list", label: "订单列表", group: "订单管理" },
];
```

```tsx
// apps/web/src/app/(dashboard)/workspace/page.tsx
import { Card, Typography } from "@arco-design/web-react";

export default function WorkspacePage() {
  return (
    <Card>
      <Typography.Title heading={6}>工作台</Typography.Title>
      <Typography.Text>页面占位，后续补充工作台指标。</Typography.Text>
    </Card>
  );
}
```

- [ ] **Step 4: Re-run E2E**

Run:
```bash
pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "侧栏显示 v1 分组且面包屑层级正确"
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/workspace-nav.ts apps/web/src/app/(dashboard)/workspace/page.tsx apps/web/src/components/dashboard-nav.tsx apps/web/src/components/dashboard-breadcrumb.tsx apps/web/src/app/(dashboard)/layout.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "feat: align sidebar and breadcrumb with v1 structure"
```

---

### Task 5: 侧栏收起/展开 + Header light/dark 主题切换

**Files:**
- Modify: `apps/web/src/components/arco-provider.tsx`
- Modify: `apps/web/src/components/dashboard-header.tsx`
- Modify: `apps/web/src/components/dashboard-nav.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Modify: `apps/web/src/app/globals.css`
- Test: `apps/web/e2e/acceptance.spec.ts`

- [ ] **Step 1: Write failing E2E for collapse + theme toggle persistence**

```ts
// apps/web/e2e/acceptance.spec.ts (append)
test("侧栏可收起展开，主题可 light/dark 切换并持久化", async ({ page }) => {
  await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });

  await page.goto("/basic/category");
  await page.getByRole("button", { name: "收起菜单" }).click();
  await expect(page.locator("aside")).toHaveClass(/w-16/);
  await page.getByRole("button", { name: "切换到深色" }).click();
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
});
```

- [ ] **Step 2: Run E2E and verify failure**

Run:
```bash
pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "侧栏可收起展开，主题可 light/dark 切换并持久化"
```

Expected: FAIL（缺按钮/缺 data-theme 持久化）。

- [ ] **Step 3: Implement state + provider + UI controls**

```tsx
// apps/web/src/components/arco-provider.tsx
"use client";

import { ConfigProvider } from "@arco-design/web-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

const ThemeContext = createContext<{ theme: ThemeMode; toggleTheme: () => void } | null>(null);

export function ArcoProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("recon-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    window.localStorage.setItem("recon-theme", theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme((p) => (p === "light" ? "dark" : "light")),
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used within ArcoProvider");
  return ctx;
}
```

```css
/* apps/web/src/app/globals.css */
body[data-theme="light"] {
  --background: #f2f3f5;
  --foreground: #1d2129;
}

body[data-theme="dark"] {
  --background: #14171f;
  --foreground: #ffffff;
}
```

- [ ] **Step 4: Re-run E2E + lint**

Run:
```bash
pnpm --filter web lint
pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "侧栏可收起展开，主题可 light/dark 切换并持久化"
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/arco-provider.tsx apps/web/src/components/dashboard-header.tsx apps/web/src/components/dashboard-nav.tsx apps/web/src/app/(dashboard)/layout.tsx apps/web/src/app/globals.css apps/web/e2e/acceptance.spec.ts
git commit -m "feat: add sidebar collapse and light dark theme toggle"
```

---

### Task 6: 下拉搜索与“使用当前输入”稳定性修复

**Files:**
- Create: `apps/web/src/lib/master-data/combobox-options.ts`
- Create: `apps/web/src/lib/master-data/combobox-options.test.ts`
- Modify: `apps/web/src/components/order-detail/MasterDataCombobox.tsx`

- [ ] **Step 1: Write failing unit tests for option builder**

```ts
// apps/web/src/lib/master-data/combobox-options.test.ts
import { describe, expect, it } from "vitest";
import { buildComboboxOptions } from "./combobox-options";

describe("buildComboboxOptions", () => {
  it("无精确匹配时在首项插入使用当前输入", () => {
    const options = buildComboboxOptions("苹果", [{ id: "1", name: "红富士" }]);
    expect(options[0]?.value).toBe("free:苹果");
  });

  it("有精确匹配时不插入使用当前输入", () => {
    const options = buildComboboxOptions("苹果", [{ id: "1", name: "苹果" }]);
    expect(options.some((o) => o.value === "free:苹果")).toBe(false);
  });
});
```

- [ ] **Step 2: Run unit tests and verify failure**

Run:
```bash
pnpm --filter web test -- src/lib/master-data/combobox-options.test.ts
```

Expected: FAIL（文件/函数不存在）。

- [ ] **Step 3: Implement pure builder and consume it in component**

```ts
// apps/web/src/lib/master-data/combobox-options.ts
export type ComboboxItem = { id: string; name: string };
export type ComboboxOption = { value: string; label: string };

export function buildComboboxOptions(query: string, items: ComboboxItem[]): ComboboxOption[] {
  const q = query.trim();
  const base = items.map((row) => ({ value: `id:${row.id}`, label: row.name }));
  if (!q) return base;
  const hasExact = items.some((row) => row.name.trim() === q);
  return hasExact ? base : [{ value: `free:${q}`, label: `使用「${q}」` }, ...base];
}
```

```tsx
// apps/web/src/components/order-detail/MasterDataCombobox.tsx
import { buildComboboxOptions } from "@/lib/master-data/combobox-options";

const options = useMemo(
  () => buildComboboxOptions(query, items).map((opt) => ({ ...opt })),
  [query, items],
);
```

- [ ] **Step 4: Run unit tests and one API flow test**

Run:
```bash
pnpm --filter web test -- src/lib/master-data/combobox-options.test.ts src/lib/master-data/resolve-for-order-line.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/master-data/combobox-options.ts apps/web/src/lib/master-data/combobox-options.test.ts apps/web/src/components/order-detail/MasterDataCombobox.tsx
git commit -m "fix: restore combobox free-input option behavior"
```

---

### Task 7: 语义化中文 seed 数据重建

**Files:**
- Modify: `apps/web/prisma/seed.ts`
- Test: `apps/web/src/test/api/business-flow.test.ts`

- [ ] **Step 1: Add failing assertions for semantic fixtures in API tests**

```ts
// apps/web/src/test/api/business-flow.test.ts (append)
it("seed 后主数据包含中文语义化样本", async () => {
  const baseUrl = inject("testBaseUrl");
  const cookie = await loginAsAdmin(baseUrl);

  const categoriesRes = await fetchWithCookie(baseUrl, "/api/categories", {}, cookie);
  const categories = (await categoriesRes.json()) as { items: Array<{ name: string }> };
  expect(categories.items.some((x) => x.name === "水果")).toBe(true);

  const unitsRes = await fetchWithCookie(baseUrl, "/api/units", {}, cookie);
  const units = (await unitsRes.json()) as { items: Array<{ name: string }> };
  expect(units.items.some((x) => x.name === "斤")).toBe(true);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:
```bash
pnpm --filter web test -- src/test/api/business-flow.test.ts -t "seed 后主数据包含中文语义化样本"
```

Expected: FAIL（当前 seed 仅“蔬菜/公斤/西红柿”等单样本）。

- [ ] **Step 3: Implement semantic seed data**

```ts
// apps/web/prisma/seed.ts (core data)
const categories = await Promise.all([
  prisma.category.create({ data: { name: "水果", desc: "水果类" } }),
  prisma.category.create({ data: { name: "蔬菜", desc: "蔬菜类" } }),
  prisma.category.create({ data: { name: "副食", desc: "副食类" } }),
  prisma.category.create({ data: { name: "肉类", desc: "肉类" } }),
]);

const units = await Promise.all([
  prisma.unit.create({ data: { name: "斤", desc: "重量单位" } }),
  prisma.unit.create({ data: { name: "件", desc: "计件单位" } }),
  prisma.unit.create({ data: { name: "箱", desc: "箱装单位" } }),
]);
```

```ts
// purchases + commodities sample
const wuhan = await prisma.purchasePlace.create({
  data: { place: "武汉", marketName: "中心港市场", desc: "凌晨进货" },
});
const luoyang = await prisma.purchasePlace.create({
  data: { place: "洛阳", marketName: "宏进市场", desc: "白天采购" },
});

await prisma.commodity.create({ data: { name: "苹果", categoryId: categories[0].id, unitId: units[2].id, desc: "红富士" } });
await prisma.commodity.create({ data: { name: "生菜", categoryId: categories[1].id, unitId: units[0].id, desc: "叶菜" } });
await prisma.commodity.create({ data: { name: "米", categoryId: categories[2].id, unitId: units[2].id, desc: "大米" } });
await prisma.commodity.create({ data: { name: "面", categoryId: categories[2].id, unitId: units[2].id, desc: "面粉" } });
await prisma.commodity.create({ data: { name: "猪肉", categoryId: categories[3].id, unitId: units[0].id, desc: "鲜肉" } });
```

- [ ] **Step 4: Reseed and run tests**

Run:
```bash
pnpm --filter web prisma db seed
pnpm --filter web test -- src/test/api/business-flow.test.ts -t "seed 后主数据包含中文语义化样本"
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/prisma/seed.ts apps/web/src/test/api/business-flow.test.ts
git commit -m "chore: reset seed to semantic chinese fixtures"
```

---

### Task 8: 完整回归与文档更新

**Files:**
- Modify: `apps/web/e2e/acceptance.spec.ts`
- Modify: `apps/web/README.md`

- [ ] **Step 1: Finalize E2E scenarios for this change set**

```ts
// apps/web/e2e/acceptance.spec.ts add case title list
// - 侧栏分组 + 面包屑
// - 侧栏收起展开
// - 主题 light/dark 切换并持久化
// - 列表搜索与列规范
// - 删除订单入口迁移
// - 订单详情紧凑区可见与主操作可用
```

- [ ] **Step 2: Run full verification commands**

Run:
```bash
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

Expected: 全部 PASS。

- [ ] **Step 3: Update README usage notes**

```md
<!-- apps/web/README.md append -->
## 导航与主题
- 侧栏采用 v1 分组结构，支持收起/展开。
- Header 支持 light/dark 主题切换，刷新后保持。

## 列表行为统一
- 列表默认按更新时间倒序。
- 列表统一显示创建时间/更新时间。
- “描述”统一命名为“备注”。

## 测试数据
- `pnpm --filter web prisma db seed` 会清空业务数据并写入中文语义化样本。
```

- [ ] **Step 4: Re-run docs-related sanity check**

Run:
```bash
pnpm --filter web build
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/acceptance.spec.ts apps/web/README.md
git commit -m "test: add acceptance coverage and docs for nav theme list conventions"
```

---

## Self-Review

### 1. Spec coverage check

- 菜单结构 + 工作台占位 + 面包屑：Task 4。
- 搜索能力（分类/单位/商品/进货地/订单）：Task 1 + Task 2。
- 列表时间字段 + 更新时间倒序：Task 1（API）+ Task 2（UI）。
- 描述改备注：Task 2。
- 操作列紧凑固定右侧：Task 2 + Task 3。
- 删除入口迁移：Task 3。
- 下拉搜索与使用当前输入恢复：Task 6。
- light/dark 主题切换：Task 5。
- 侧栏收起展开：Task 5。
- 中文语义化 seed：Task 7。
- 订单详情紧凑化：Task 3。
- API/E2E/README 验证：Task 8。

结论：无缺口。

### 2. Placeholder scan

- 未使用 TBD/TODO/implement later。
- 每个任务包含明确命令与预期结果。
- 每个代码步骤包含实际代码片段。

### 3. Type/signature consistency

- 统一使用 `q` 作为列表检索参数。
- 主题类型统一为 `"light" | "dark"`。
- 下拉选项值统一为 `id:<id>` 与 `free:<text>`。

结论：命名与接口一致。

