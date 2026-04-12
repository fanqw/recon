# Enhance Nav Search List Experience V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成导航修正、下拉可直接输入、订单详情弹窗规则、表单体验、空状态、登录页和移动端适配的一体化收尾。

**Architecture:** 先修正壳层（侧栏/面包屑/主题），再统一主数据与订单表单交互（搜索、placeholder、备注控件），随后完成订单详情弹窗规则与布局重排，最后补齐空状态、登录页和移动端验收。后端保持单一 `q` 检索参数，前端通过通用组合组件统一行为，E2E 覆盖关键路径。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Arco Design, Prisma, Vitest, Playwright.

---

## Scope Check

本规格虽跨 9 个方向，但共享同一应用壳层与同一交互标准，不建议拆分多个计划；单一计划可保证 UI 规范、E2E 和 README 一次收口。

## File Structure

- Modify: `apps/web/src/components/dashboard-nav.tsx`
  - 移除“对账系统”字样与分割线；保留分组菜单。
- Modify: `apps/web/src/components/dashboard-breadcrumb.tsx`
  - 修正面包屑，去掉重复“工作台”前缀。
- Modify: `apps/web/src/lib/workspace-nav.ts`
  - 校准路由到面包屑映射。

- Modify: `apps/web/src/components/order-detail/MasterDataCombobox.tsx`
  - 下拉搜索与“直接使用当前输入”文案展示为纯值。
- Modify: `apps/web/src/lib/master-data/combobox-options.ts`
  - 直接输入选项 label = 原输入值。
- Modify: `apps/web/src/lib/master-data/combobox-options.test.ts`
  - 覆盖新文案规则。

- Modify: `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`
  - 新建商品弹窗：分类/单位可搜索且可直接输入；placeholder；备注 Textarea。
- Modify: `apps/web/src/app/(dashboard)/order/list/page.tsx`
  - 新建订单弹窗：进货地可搜索且可直接输入；placeholder；备注 Textarea。

- Modify: `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`
  - “新增明细”改“新增商品”；商品字段首行；总金额规则；移除不一致提示；返回按钮并入操作区；详情重排。
- Modify: `apps/web/src/components/order-detail/OrderDetailTable.tsx`
  - 空状态占位图/引导。

- Modify: `apps/web/src/app/(dashboard)/basic/category/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/unit/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`
  - 全表单 placeholder 与备注 Textarea rows=3；空状态占位图。

- Modify: `apps/web/src/app/login/login-client.tsx`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/app/globals.css`
  - 登录页布局重构与响应式样式。

- Modify: `apps/web/e2e/acceptance.spec.ts`
- Modify: `apps/web/e2e/smoke.spec.ts`
  - 新增面包屑、下拉直接输入、订单弹窗规则、空状态、平板视口用例。

- Modify: `apps/web/README.md`
  - 补充新交互与移动端支持说明。

---

### Task 1: 导航视觉与面包屑修正

**Files:**
- Modify: `apps/web/src/components/dashboard-nav.tsx`
- Modify: `apps/web/src/components/dashboard-breadcrumb.tsx`
- Modify: `apps/web/src/lib/workspace-nav.ts`
- Test: `apps/web/e2e/acceptance.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
// apps/web/e2e/acceptance.spec.ts
test("侧栏无对账系统标题且面包屑无重复工作台前缀", async ({ page }) => {
  await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  await page.goto("/basic/category");
  await expect(page.getByText("对账系统")).toHaveCount(0);
  await expect(page.getByText("工作台 / 工作台")).toHaveCount(0);
});
```

- [ ] **Step 2: Run test and verify fail**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "侧栏无对账系统标题且面包屑无重复工作台前缀"`
Expected: FAIL。

- [ ] **Step 3: Minimal implementation**

```tsx
// dashboard-nav.tsx remove brand block/divider and only render grouped menu
return (
  <aside className={collapsed ? "w-16" : "w-56"}>
    <Menu /* ... */>{/* groups */}</Menu>
  </aside>
);
```

```tsx
// dashboard-breadcrumb.tsx ensure root only once
const crumbs = buildBreadcrumb(pathname); // starts from "工作台" exactly once
```

- [ ] **Step 4: Re-run test**

Run: same as step 2
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard-nav.tsx apps/web/src/components/dashboard-breadcrumb.tsx apps/web/src/lib/workspace-nav.ts apps/web/e2e/acceptance.spec.ts
git commit -m "fix: simplify sidebar visuals and correct breadcrumb prefix"
```

---

### Task 2: 下拉搜索与“直接使用输入”文案

**Files:**
- Modify: `apps/web/src/lib/master-data/combobox-options.ts`
- Modify: `apps/web/src/lib/master-data/combobox-options.test.ts`
- Modify: `apps/web/src/components/order-detail/MasterDataCombobox.tsx`

- [ ] **Step 1: Write failing unit test**

```ts
it("直接输入选项文案为纯输入值", () => {
  const options = buildComboboxOptions("苹果", [{ id: "1", name: "香蕉" }]);
  expect(options[0]).toEqual({ value: "free:苹果", label: "苹果" });
});
```

- [ ] **Step 2: Run and verify fail**

Run: `pnpm --filter web test -- src/lib/master-data/combobox-options.test.ts`
Expected: FAIL（当前 label 可能为“使用「苹果」”）。

- [ ] **Step 3: Minimal implementation**

```ts
// combobox-options.ts
return hasExact ? base : [{ value: `free:${q}`, label: q }, ...base];
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm --filter web test -- src/lib/master-data/combobox-options.test.ts src/lib/master-data/resolve-for-order-line.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/master-data/combobox-options.ts apps/web/src/lib/master-data/combobox-options.test.ts apps/web/src/components/order-detail/MasterDataCombobox.tsx
git commit -m "fix: use plain free-input label in combobox options"
```

---

### Task 3: 新建商品/订单弹窗下拉能力补齐

**Files:**
- Modify: `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/order/list/page.tsx`
- Test: `apps/web/e2e/acceptance.spec.ts`

- [ ] **Step 1: Write failing e2e tests**

```ts
test("新建商品的分类单位支持搜索与直接输入", async ({ page }) => {
  await page.goto("/basic/commodity");
  await page.getByRole("button", { name: "新建" }).click();
  await page.getByPlaceholder("请选择或输入分类").fill("水果");
  await expect(page.getByText("水果")).toBeVisible();
});
```

- [ ] **Step 2: Run and verify fail**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "新建商品的分类单位支持搜索与直接输入"`
Expected: FAIL。

- [ ] **Step 3: Minimal implementation**

```tsx
<Select showSearch allowCreate placeholder="请选择或输入分类" /* ... */ />
<Select showSearch allowCreate placeholder="请选择或输入单位" /* ... */ />
<Select showSearch allowCreate placeholder="请选择或输入进货地" /* ... */ />
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "新建商品的分类单位支持搜索与直接输入|新建订单"`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/basic/commodity/page.tsx apps/web/src/app/(dashboard)/order/list/page.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "feat: enable searchable creatable selects in commodity and order forms"
```

---

### Task 4: 订单详情新增商品弹窗规则与布局

**Files:**
- Modify: `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`
- Modify: `apps/web/src/components/order-detail/MasterDataCombobox.tsx`
- Test: `apps/web/e2e/acceptance.spec.ts`

- [ ] **Step 1: Write failing e2e test**

```ts
test("订单详情新增商品弹窗应用总金额规则与字段顺序", async ({ page }) => {
  await page.goto("/order/list");
  await page.getByRole("link", { name: "查看详情" }).first().click();
  await page.getByRole("button", { name: "新增商品" }).click();
  await expect(page.getByText("商品")).toBeVisible();
  await page.getByLabel("数量").fill("3");
  await page.getByLabel("单价").fill("1.236");
  await expect(page.getByLabel("总金额")).toHaveValue("3.71");
  await expect(page.getByText("与计算值")).toHaveCount(0);
});
```

- [ ] **Step 2: Run and verify fail**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "订单详情新增商品弹窗应用总金额规则与字段顺序"`
Expected: FAIL。

- [ ] **Step 3: Minimal implementation**

```ts
function round2(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
const autoTotal = Number.isFinite(countNum) && Number.isFinite(priceNum) ? round2(countNum * priceNum) : "";
```

```tsx
<Button onClick={() => router.push("/order/list")}>返回</Button>
<Button type="primary" onClick={startCreateLine}>新增商品</Button>
<label>商品</label>
<MasterDataCombobox /* first row */ />
<label>总金额</label>
<Input value={lineTotalInput} onChange={setLineTotalInput} />
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "订单详情新增商品弹窗应用总金额规则与字段顺序|删除订单入口"`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/order/list/[id]/page.tsx apps/web/src/components/order-detail/MasterDataCombobox.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "feat: refine order detail modal with total amount rule and compact header actions"
```

---

### Task 5: 全表单 placeholder 与备注 Textarea 统一

**Files:**
- Modify: `apps/web/src/app/(dashboard)/basic/category/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/unit/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/order/list/page.tsx`

- [ ] **Step 1: Write failing e2e assertion**

```ts
test("表单具备中文 placeholder 且备注为多行输入", async ({ page }) => {
  await page.goto("/basic/category");
  await page.getByRole("button", { name: "新建" }).click();
  await expect(page.getByPlaceholder("请输入分类名称")).toBeVisible();
  await expect(page.locator("textarea[rows='3']")).toBeVisible();
});
```

- [ ] **Step 2: Run and verify fail**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "表单具备中文 placeholder 且备注为多行输入"`
Expected: FAIL。

- [ ] **Step 3: Minimal implementation**

```tsx
<Input placeholder="请输入分类名称" />
<Textarea placeholder="请输入备注" rows={3} value={desc} onChange={setDesc} />
```

- [ ] **Step 4: Re-run targeted test**

Run: same as step 2
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/basic/category/page.tsx apps/web/src/app/(dashboard)/basic/unit/page.tsx apps/web/src/app/(dashboard)/basic/commodity/page.tsx apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx apps/web/src/app/(dashboard)/order/list/page.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "feat: unify form placeholders and remark textarea"
```

---

### Task 6: 空状态占位图与引导文案

**Files:**
- Modify: `apps/web/src/components/order-detail/OrderDetailTable.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/category/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/unit/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`

- [ ] **Step 1: Write failing e2e test**

```ts
test("空数据页面显示占位图与引导文案", async ({ page }) => {
  await page.goto("/basic/category");
  await expect(page.getByText("暂无数据，点击新建开始")) .toBeVisible();
});
```

- [ ] **Step 2: Run and verify fail**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "空数据页面显示占位图与引导文案"`
Expected: FAIL。

- [ ] **Step 3: Minimal implementation**

```tsx
<Table
  noDataElement={<div className="py-8 text-center"><img src="/empty-box.svg" alt="空状态" className="mx-auto mb-3 h-20 w-20" /><div>暂无数据，点击新建开始</div></div>}
/>
```

- [ ] **Step 4: Re-run test**

Run: same as step 2
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/order-detail/OrderDetailTable.tsx apps/web/src/app/(dashboard)/basic/category/page.tsx apps/web/src/app/(dashboard)/basic/unit/page.tsx apps/web/src/app/(dashboard)/basic/commodity/page.tsx apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "feat: add empty-state illustrations and guidance copy"
```

---

### Task 7: 登录页重构（台账元素）

**Files:**
- Modify: `apps/web/src/app/login/login-client.tsx`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/app/globals.css`
- Test: `apps/web/e2e/smoke.spec.ts`

- [ ] **Step 1: Write failing e2e smoke test**

```ts
test("登录页展示台账视觉区块并可提交", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("采购台账")).toBeVisible();
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin123");
  await page.getByRole("button", { name: "登录" }).click();
});
```

- [ ] **Step 2: Run and verify fail**

Run: `pnpm --filter web test:e2e -- e2e/smoke.spec.ts -g "登录页展示台账视觉区块并可提交"`
Expected: FAIL。

- [ ] **Step 3: Minimal implementation**

```tsx
// login/page.tsx
<div className="login-shell">
  <section className="login-hero"><h2>采购台账</h2><p>进销存与对账一体化</p></section>
  <section><LoginClient /></section>
</div>
```

- [ ] **Step 4: Re-run smoke**

Run: same as step 2
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/login/login-client.tsx apps/web/src/app/login/page.tsx apps/web/src/app/globals.css apps/web/e2e/smoke.spec.ts
git commit -m "feat: redesign login page with ledger-themed layout"
```

---

### Task 8: 移动端与 MatePad 11 适配

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Modify: `apps/web/src/components/dashboard-header.tsx`
- Modify: `apps/web/src/components/dashboard-nav.tsx`
- Test: `apps/web/e2e/acceptance.spec.ts`

- [ ] **Step 1: Write failing viewport e2e test**

```ts
test("MatePad 11 视口下核心流程可用", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1600, height: 2560 } });
  const page = await context.newPage();
  await page.goto("/basic/category");
  await expect(page.getByRole("button", { name: "新建" })).toBeVisible();
  await expect(page.getByRole("button", { name: "收起菜单" })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify fail**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "MatePad 11 视口下核心流程可用"`
Expected: FAIL（若遮挡/布局不正确）。

- [ ] **Step 3: Minimal responsive implementation**

```css
@media (max-width: 1024px) {
  .dashboard-main { padding: 12px; }
  .arco-table { font-size: 13px; }
  .arco-modal { max-height: 90vh; }
}
```

- [ ] **Step 4: Re-run viewport test**

Run: same as step 2
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/(dashboard)/layout.tsx apps/web/src/components/dashboard-header.tsx apps/web/src/components/dashboard-nav.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "feat: improve tablet and mobile usability including matepad viewport"
```

---

### Task 9: 全量验证与文档同步

**Files:**
- Modify: `apps/web/README.md`
- Test: `apps/web/e2e/acceptance.spec.ts`
- Test: `apps/web/e2e/smoke.spec.ts`

- [ ] **Step 1: Add README sections**

```md
## 交互规范补充
- 侧栏移除品牌标题，面包屑仅保留单一“工作台”根。
- 下拉可搜索且可直接使用当前输入（展示为纯输入值）。
- 备注统一为多行输入框（rows=3）。

## 移动端支持
- 已适配手机与平板，重点验证华为 MatePad 11。
```

- [ ] **Step 2: Run full checks**

Run:
- `pnpm --filter web lint`
- `pnpm --filter web test`
- `pnpm --filter web test:e2e`
- `pnpm --filter web build`

Expected: lint/test/e2e PASS；build 若失败，需定位并修复到 PASS。

- [ ] **Step 3: Commit**

```bash
git add apps/web/README.md apps/web/e2e/acceptance.spec.ts apps/web/e2e/smoke.spec.ts
git commit -m "docs: align readme and acceptance coverage for ui interaction standards"
```

---

## Self-Review

### 1. Spec coverage
- 侧栏标题/线条移除、面包屑修正：Task 1。
- 下拉搜索与直接输入（商品分类/单位、订单进货地）：Task 2 + Task 3。
- 订单详情弹窗规则、文案、布局：Task 4。
- 全表单 placeholder + 备注 Textarea：Task 5。
- 空状态占位图：Task 6。
- 登录页重构：Task 7。
- MatePad 11 适配：Task 8。
- 验证与文档：Task 9。

无遗漏。

### 2. Placeholder scan
- 未使用 TBD/TODO/implement later。
- 每个任务均包含具体代码、命令、预期结果。

### 3. Type consistency
- 直接输入 option 值统一 `free:<text>`。
- 主题仍限定 `light | dark`，与现有实现一致。
- “新增商品/总金额/返回”文案在任务中一致。

