# 订单明细表单与 lineTotal（order-line-item-form-master-data）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务逐步执行。步骤使用 checkbox（`- [ ]`）语法便于跟踪。

**Goal:** 在 `apps/web` 中落地 OpenSpec 变更 `openspec/changes/order-line-item-form-master-data`：订单行持久化 `lineTotal`、主数据可搜索下拉与编排创建；分类/单位/商品名称 **`trim()` 后**在未删除数据上满足唯一约束（分类与单位按 **name**；商品按 **name + category_id + unit_id**），合计与标红基于 `lineTotal` 与舍入基准 `total_price` 的比较。  
**说明：** 种子里的「水果 / 斤 / 苹果」仅表示**真实感 mock 类型**，与是否建立唯一索引**无因果关系**；唯一索引是数据完整性规则，示例名称可随业务替换。

**Architecture:** Prisma + PostgreSQL 增加 `OrderCommodity.line_total`；迁移 `20260409120000_category_unit_name_unique_active` 提供 Category/Unit 的 `UNIQUE (name) WHERE deleted = false`；迁移 `20260409121000_commodity_name_category_unit_unique_active` 提供 Commodity 的 `UNIQUE (name, category_id, unit_id) WHERE deleted = false`（**name 仅以 trim 后值入库**）。服务端在 `lib/order-lines` 与新建 `lib/master-data` 中集中处理 `trim`、事务内 resolve-or-create 与聚合。订单详情页 `order/list/[id]/page.tsx` 扩展表单；`aggregateOrderLinesForUi` 输出 `line_total`、保留 `total_price` 为舍入基准，合计对 `line_total` 求和。

**Tech Stack:** Next.js App Router、Prisma、PostgreSQL、Vitest（`src/**/*.test.ts` + `globalSetup` 起 dev）、Zod、ExcelJS、React 客户端组件。

---

## 文件结构总览（创建 / 修改职责）

| 路径 | 职责 |
|------|------|
| `apps/web/prisma/schema.prisma` | `OrderCommodity.lineTotal` 字段映射 `line_total` |
| `apps/web/prisma/migrations/<new>_order_commodity_line_total/migration.sql` | `ALTER TABLE` 增加 `line_total`（策略见 Task 1） |
| `apps/web/prisma/migrations/20260409120000_category_unit_name_unique_active/migration.sql` | Category / Unit：`UNIQUE (name) WHERE deleted = false` |
| `apps/web/prisma/migrations/20260409121000_commodity_name_category_unit_unique_active/migration.sql` | Commodity：`UNIQUE (name, category_id, unit_id) WHERE deleted = false` |
| `apps/web/prisma/seed.ts` | 贴近真实业务的示例数据（水果/斤/苹果）；可重复执行（findFirst + create），与唯一索引无绑定关系 |
| `apps/web/src/lib/order-lines/aggregate.ts` | 读 `lineTotal`、合计、行上 `total_price` 基准 |
| `apps/web/src/lib/order-lines/create-line.ts` | 创建行时写入 `lineTotal` |
| `apps/web/src/lib/master-data/resolve-for-order-line.ts`（新建） | `resolveOrCreateCategory` / `Unit` / `Commodity`，`trim`，`$transaction` |
| `apps/web/src/app/api/categories/route.ts` | GET 支持 `?q=` 关键字过滤 |
| `apps/web/src/app/api/units/route.ts` | GET 支持 `?q=` |
| `apps/web/src/app/api/commodities/route.ts` | GET 支持 `?q=` |
| `apps/web/src/app/api/categories/route.ts` POST、`units/route.ts` POST | `name` 入库前 `trim` |
| `apps/web/src/app/api/commodities/route.ts` POST | `name` `trim` |
| `apps/web/src/app/api/order-lines/route.ts` | POST 扩展 body、编排路径 |
| `apps/web/src/app/api/order-lines/[id]/route.ts` | PATCH 支持 `lineTotal` |
| `apps/web/src/app/api/orders/[id]/lines/route.ts` | 无逻辑变或仅确认 include 含新字段 |
| `apps/web/src/components/order-detail/OrderDetailTable.tsx` | 金额列标红条件 |
| `apps/web/src/lib/order-detail/export-order-excel.ts` | Excel 金额红色条件 |
| `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx` | Combobox、行金额、提交体 |
| `apps/web/src/components/order-detail/MasterDataCombobox.tsx`（新建，可选） | 可复用三框 + 首项自由输入 |
| `apps/web/src/lib/order-lines/aggregate.test.ts`（新建） | 聚合与合计 |
| `apps/web/src/lib/master-data/resolve-for-order-line.test.ts`（新建） | resolve + trim（可用 mock prisma 或集成） |
| `apps/web/src/test/api/business-flow.test.ts` | 扩展 POST lines、GET lines 断言 |
| `apps/web/src/test/api/order-lines-master-data.test.ts`（新建，可选） | 编排创建 + trim 集成测 |

---

### Task 1: Prisma 模型与 `line_total` 迁移

**Files:**

- Modify: `apps/web/prisma/schema.prisma`（`OrderCommodity` 模型）
- Create: `apps/web/prisma/migrations/20260409140000_order_commodity_line_total/migration.sql`（时间戳可按实际调整）
- Modify: 无新增 schema 声明（Commodity 部分唯一索引仅 SQL 迁移；与 Prisma 可不同步 @@unique）

**说明：** 若本地尚未应用主数据唯一迁移，需执行 `pnpm exec prisma migrate deploy`（含 `20260409120000_...` 与 `20260409121000_...`）。若库内已有重复 trim 后名称或重复商品三元组，迁移会失败，须先清理。`line_total` 列策略见原文档；开发环境推荐 **`prisma migrate reset`**。

- [ ] **Step 1.1：修改 schema**

在 `OrderCommodity` 中增加（字段名与 DB 列名自行统一，示例）：

```prisma
model OrderCommodity {
  id          String   @id @default(cuid())
  orderId     String   @map("order_id")
  commodityId String   @map("commodity_id")
  count       Int
  price       Decimal  @db.Decimal(12, 2)
  lineTotal   Decimal  @map("line_total") @db.Decimal(12, 2)
  desc        String?
  deleted     Boolean  @default(false)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  order     Order     @relation(fields: [orderId], references: [id])
  commodity Commodity @relation(fields: [commodityId], references: [id])
}
```

- [ ] **Step 1.2：编写 migration SQL**

新建目录 `apps/web/prisma/migrations/20260409140000_order_commodity_line_total/migration.sql`：

```sql
ALTER TABLE "OrderCommodity" ADD COLUMN "line_total" DECIMAL(12,2) NOT NULL DEFAULT 0;
```

（若团队决定 NULL 策略，改为 `NULL` 并去掉 `NOT NULL DEFAULT 0`，同时在聚合中处理 null。）

- [ ] **Step 1.3：生成客户端并重置开发库**

```bash
cd apps/web
pnpm exec prisma generate
pnpm exec prisma migrate reset --force
```

Expected: 迁移全部成功；seed 成功写入**真实感示例**（分类「水果」、单位「斤」、商品「苹果」）。**唯一索引**由迁移 SQL 单独保证，与选用何种示例名称无关；若 seed 重复执行，应靠「先查后插」避免重复插入同名行，而不是为了「配合」索引才选这三个词。

- [ ] **Step 1.4：提交**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/
git commit -m "feat: 订单明细增加 line_total 字段及迁移"
```

---

### Task 2（TDD）：聚合逻辑单元测试

**Files:**

- Create: `apps/web/src/lib/order-lines/aggregate.test.ts`

- [ ] **Step 2.1：编写失败测试（新 API 行为）**

```typescript
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  aggregateOrderLinesForUi,
  lineRoundedTotal,
  type OrderLineWithRelations,
} from "./aggregate";

function fakeRow(partial: {
  price: string;
  count: number;
  lineTotal: string;
  categoryId: string;
  categoryName: string;
}): OrderLineWithRelations {
  const category = {
    id: partial.categoryId,
    name: partial.categoryName,
    desc: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const unit = {
    id: "u1",
    name: "斤",
    desc: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const commodity = {
    id: "c1",
    name: "苹果",
    categoryId: partial.categoryId,
    unitId: unit.id,
    desc: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    category,
    unit,
  };
  return {
    id: "l1",
    orderId: "o1",
    commodityId: commodity.id,
    count: partial.count,
    price: new Prisma.Decimal(partial.price),
    lineTotal: new Prisma.Decimal(partial.lineTotal),
    desc: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    commodity,
  };
}

describe("aggregateOrderLinesForUi", () => {
  it("total_price 为舍入基准，line_total 持久化；合计用 line_total", () => {
    const rows = [
      fakeRow({
        price: "10.5",
        count: 3,
        lineTotal: "32",
        categoryId: "cat-a",
        categoryName: "水果",
      }),
    ];
    const out = aggregateOrderLinesForUi(rows);
    expect(out).toHaveLength(1);
    expect(out[0].total_price).toBe(lineRoundedTotal(rows[0].price, 3));
    expect(out[0].line_total).toBe(32);
    expect(out[0].total_order_price).toBe(32);
    expect(out[0].total_category_price).toBe(32);
  });
});
```

注意：测试中的 `line_total` 属性名需与实现后的 `OrderLineRowForUi` 一致（蛇形 `line_total`）。

- [ ] **Step 2.2：运行测试确认失败**

```bash
cd apps/web
pnpm exec vitest run src/lib/order-lines/aggregate.test.ts
```

Expected: FAIL（类型或属性不存在）。

- [ ] **Step 2.3：实现聚合（见 Task 3 可与本步合并）** — 完成 Task 3.1 后再跑通本测试。

- [ ] **Step 2.4：运行测试确认通过**

```bash
pnpm exec vitest run src/lib/order-lines/aggregate.test.ts
```

Expected: PASS。

- [ ] **Step 2.5：提交**

```bash
git add apps/web/src/lib/order-lines/aggregate.test.ts apps/web/src/lib/order-lines/aggregate.ts
git commit -m "test: 订单明细聚合 line_total 与合计口径"
```

---

### Task 3：实现 `aggregate.ts` 与 `create-line.ts`

**Files:**

- Modify: `apps/web/src/lib/order-lines/aggregate.ts`
- Modify: `apps/web/src/lib/order-lines/create-line.ts`

- [ ] **Step 3.1：扩展 `OrderLineRowForUi`**

增加字段：

```typescript
/** 持久化行金额（展示用，合计用其求和） */
line_total: number;
```

保留 `total_price` 为 **舍入基准** `lineRoundedTotal(price, count)`。`origin_total_price` 仍可保留为 `lineOriginTotal`。将 `total_order_price` / `total_category_price` 的 reduce 改为对 **`decimalToNumber(row.lineTotal)`**（或等价）求和，而不是对 `total_price`。

伪代码核心：

```typescript
const lineTotalNum = decimalToNumber(row.lineTotal);
const roundedBaseline = lineRoundedTotal(row.price, row.count);
// ...
total_order_price = sum(lineTotalNum);
categoryIdToSum: 用 lineTotalNum 累加
// return:
line_total: lineTotalNum,
total_price: roundedBaseline,
```

- [ ] **Step 3.2：更新 `create-line.ts`**

```typescript
export type CreateOrderLineInput = {
  orderId: string;
  commodityId: string;
  count: number;
  price: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  desc?: string;
};

export async function createOrderCommodityLine(input: CreateOrderLineInput) {
  const { orderId, commodityId, count, price, lineTotal, desc } = input;
  return prisma.orderCommodity.create({
    data: {
      orderId,
      commodityId,
      count,
      price,
      lineTotal,
      desc,
    },
    include: {
      commodity: { include: { category: true, unit: true } },
    },
  });
}
```

- [ ] **Step 3.3：运行 aggregate 测试**

```bash
pnpm exec vitest run src/lib/order-lines/aggregate.test.ts
```

Expected: PASS。

- [ ] **Step 3.4：提交**

```bash
git add apps/web/src/lib/order-lines/aggregate.ts apps/web/src/lib/order-lines/create-line.ts
git commit -m "feat: 聚合与创建订单行支持 lineTotal"
```

---

### Task 4：`resolveOrCreate*` 与 trim（含单测）

**Files:**

- Create: `apps/web/src/lib/master-data/resolve-for-order-line.ts`
- Create: `apps/web/src/lib/master-data/resolve-for-order-line.test.ts`（可用真实 `prisma` + `prisma migrate reset` 后的 DB，或项目已有测试 DB 配置）

- [ ] **Step 4.1：实现解析函数（示例签名）**

```typescript
import { prisma } from "@/lib/prisma";

/** 解析或创建分类（名称已 trim；空串由调用方拒绝） */
export async function resolveOrCreateCategory(trimmedName: string) {
  const existing = await prisma.category.findFirst({
    where: { name: trimmedName, deleted: false },
  });
  if (existing) return existing;
  return prisma.category.create({
    data: { name: trimmedName },
  });
}

/** 解析或创建单位 */
export async function resolveOrCreateUnit(trimmedName: string) {
  const existing = await prisma.unit.findFirst({
    where: { name: trimmedName, deleted: false },
  });
  if (existing) return existing;
  return prisma.unit.create({ data: { name: trimmedName } });
}

/** 解析或创建商品（三元组） */
export async function resolveOrCreateCommodity(input: {
  name: string;
  categoryId: string;
  unitId: string;
}) {
  const existing = await prisma.commodity.findFirst({
    where: {
      name: input.name,
      categoryId: input.categoryId,
      unitId: input.unitId,
      deleted: false,
    },
  });
  if (existing) return existing;
  return prisma.commodity.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      unitId: input.unitId,
    },
  });
}
```

导出 `export function trimName(s: string): string { return s.trim(); }`，在 POST 编排入口统一调用。

- [ ] **Step 4.2：集成测试示例（Vitest + testBaseUrl）**

在 `resolve-for-order-line.test.ts` 若不用 HTTP，可直接 `import { prisma } from "@/lib/prisma"` 并在 `beforeAll` 确保 DB 可用；或复用 `business-flow` 风格只测 API（见 Task 6）。

最小单测（内存/DB）：

```typescript
import { describe, expect, it } from "vitest";
import { trimName } from "./resolve-for-order-line";

describe("trimName", () => {
  it("去除首尾空白", () => {
    expect(trimName("  水果  ")).toBe("水果");
  });
});
```

- [ ] **Step 4.3：提交**

```bash
git add apps/web/src/lib/master-data/
git commit -m "feat: 订单行主数据 resolve-or-create 与 trim"
```

---

### Task 5：主数据 GET `q` 与 POST trim

**Files:**

- Modify: `apps/web/src/app/api/categories/route.ts`
- Modify: `apps/web/src/app/api/units/route.ts`
- Modify: `apps/web/src/app/api/commodities/route.ts`

- [ ] **Step 5.1：GET 增加查询参数 `q`**

示例（分类）：

```typescript
/**
 * GET /api/categories：列出未删除分类；支持 ?q= 按名称包含过滤（不区分大小写可选，需文档固定）。
 */
export async function GET(req: Request) {
  // ... requireUser ...
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const rows = await prisma.category.findMany({
    where: {
      deleted: false,
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items: rows });
}
```

对 `units`、`commodities` 同样处理；`commodities` 保持 `include: { category: true, unit: true }`。

- [ ] **Step 5.2：POST 创建前 `trim` name + 后端二次非空**

```typescript
const name = parsed.data.name.trim();
if (!name) {
  return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
}
const row = await prisma.category.create({ data: { ...parsed.data, name } });
```

（单位、商品 POST 同样：`trim` 后为空 → **400** + 明确文案，与 OpenSpec「后端二次拦截」一致。）

- [ ] **Step 5.3：手动验证**

启动 dev，`GET /api/categories?q=果` 带 Cookie，应只返回名称含「果」的分类。

- [ ] **Step 5.4：提交**

```bash
git add apps/web/src/app/api/categories/route.ts apps/web/src/app/api/units/route.ts apps/web/src/app/api/commodities/route.ts
git commit -m "feat: 主数据列表支持 q 查询且创建时 trim 与非空校验"
```

---

### Task 6：扩展 `POST /api/order-lines` 与 `PATCH`

**Files:**

- Modify: `apps/web/src/app/api/order-lines/route.ts`
- Modify: `apps/web/src/app/api/order-lines/[id]/route.ts`

- [ ] **Step 6.1：POST Zod schema（示意）**

两种模式：

- **A**：`commodityId` + `orderId` + `count` + `price` + 可选 `lineTotal`（缺省则服务端 `new Prisma.Decimal(lineRoundedTotal(...))` 注意用同一算法函数）
- **B**：`orderId` + `count` + `price` + `categoryId?` `categoryName?` `unitId?` `unitName?` `commodityName`（名称均 trim；id 优先）

在 `route.ts` 内：

```typescript
await prisma.$transaction(async (tx) => {
  // 使用 tx 调用 resolve 或把 resolve 函数改为接受 tx
  // ...
});
```

若 Prisma 事务需传递 `tx`，将 Task 4 的函数改为 `resolveOrCreateCategory(tx, name)`。

**模式 B** 在事务前：对每个参与解析的名称字段 **`trim()`**；若某字段在「按 id 未解析成功、须用名称」时 **trim 后为空**，**直接 `return NextResponse.json({ error: "…" }, { status: 400 })`**，不进入事务（后端二次拦截，防绕过前端）。

计算默认 `lineTotal`：

```typescript
import { lineRoundedTotal } from "@/lib/order-lines/aggregate";

const baseline = lineRoundedTotal(price, count);
const lineTotalDecimal =
  body.lineTotal !== undefined
    ? new Prisma.Decimal(String(body.lineTotal))
    : new Prisma.Decimal(baseline);
```

- [ ] **Step 6.2：PATCH 增加 `lineTotal`**

```typescript
const patchSchema = z.object({
  count: z.number().int().positive().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  lineTotal: z.union([z.number(), z.string()]).optional(),
  desc: z.string().optional(),
});
```

更新时写入 `lineTotal`；若未传则保持原值。

- [ ] **Step 6.3：扩展集成测试 `business-flow.test.ts`**

在 POST order-lines 的 body 中增加 `lineTotal: 32`（与 `10.5 * 3` 四舍五入一致），GET lines 断言 `line_total === 32` 且 `total_price` 为 32。

再增加一条：POST `lineTotal: 31.5`（与基准不等），GET 断言 `line_total` 为 31.5，`total_price` 仍为 32。

再增加一条：模式 B 下 `commodityName: "   "`（或缺名称路径），**期望 400**，body 含可诊断错误。

```bash
cd apps/web
pnpm exec vitest run src/test/api/business-flow.test.ts
```

Expected: PASS。

- [ ] **Step 6.4：提交**

```bash
git add apps/web/src/app/api/order-lines/route.ts apps/web/src/app/api/order-lines/[id]/route.ts apps/web/src/test/api/business-flow.test.ts
git commit -m "feat: 订单行 API 支持 lineTotal 与主数据编排"
```

---

### Task 7：前端订单详情表单（Combobox + 行金额）

**Files:**

- Create: `apps/web/src/components/order-detail/MasterDataCombobox.tsx`（推荐）
- Modify: `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`

- [ ] **Step 7.1：`MasterDataCombobox` 行为**

- `apiPath`: `/api/categories` | `/api/units` | `/api/commodities`
- `value`: `{ id?: string; freeText?: string }` 或拆成受控 `selectedId` + `inputValue`
- `onChange`: 选中项变化
- `useEffect` + debounce（300ms）：`fetch(\`${apiPath}?q=${encodeURIComponent(input)}\`)`
- 选项列表：**若**当前 `input` trim 后非空且与所有返回项的 `name` 无**完全相等**，在列表**顶部**插入一项 `{ key: '__free__', label: \`使用「${input}」\`, value: input.trim() }`
- 选商品时：父组件根据 `commodity` 的 `category`、`unit` 设置分类、单位的 id 与显示名

- [ ] **Step 7.2：页面 state 扩展**

- `categoryId` / `categoryFreeName`、`unitId` / `unitFreeName`、`commodityId` / `commodityFreeName`（按实现简化）
- `lineTotal` 字符串 state；当 `lineCount`、`linePrice` 变化且用户未标记「手动改过行金额」时，重算 `Math.round(parseFloat(price)*parseInt(count,10))` 与后端一致
- 提交 POST body：优先发 id；若无 id 则发 `categoryName`/`unitName`/`commodityName`（均为 trim 后）

- [ ] **Step 7.2b：前端拦截 trim 后为空（第一层）**

在 `handleLineSubmit` 内，对将用于名称路径的字段逐一 **`trim()`**；若分类/单位/商品在**当前模式下需要名称**且 trim 后为空，则 **`setError('分类名称不能为空')`**（或单位、商品对应文案）、**`return`**，**不调用 `fetch`**。须与 Step 6 后端错误语义对齐，便于用户理解。

- [ ] **Step 7.3：编辑模式**

编辑时商品不可改（已有）；可增加行金额字段 `lineTotal`，PATCH 带 `lineTotal`。

- [ ] **Step 7.4：浏览器冒烟**

登录 → 订单详情 → 新增：选水果/斤/苹果或自由输入 → 提交 → 表格刷新。

- [ ] **Step 7.5：提交**

```bash
git add apps/web/src/components/order-detail/MasterDataCombobox.tsx apps/web/src/app/\(dashboard\)/order/list/\[id\]/page.tsx
git commit -m "feat: 订单详情主数据可搜索下拉、行金额与名称前后端校验"
```

---

### Task 8：表格标红、Excel、逻辑删除测试回归

**Files:**

- Modify: `apps/web/src/components/order-detail/OrderDetailTable.tsx`
- Modify: `apps/web/src/lib/order-detail/export-order-excel.ts`（`ExcelOrderLine` 类型增加 `line_total`）

- [ ] **Step 8.1：标红条件**

```tsx
const baseline = row.total_price;
const display = row.line_total;
const highlight = display !== baseline;
```

金额列展示 **`display`**（`line_total`），`className` 用 `highlight`。

- [ ] **Step 8.2：Excel**

```typescript
amountCell.value = row.line_total;
if (row.line_total !== row.total_price) {
  amountCell.font = { color: { argb: "FFFF0000" } };
}
```

- [ ] **Step 8.3：全量 Vitest**

```bash
cd apps/web
pnpm exec vitest run
```

Expected: 全部 PASS（若 `logical-delete.test.ts` 创建订单行需带 `lineTotal`，同步修改）。

- [ ] **Step 8.4：提交**

```bash
git add apps/web/src/components/order-detail/OrderDetailTable.tsx apps/web/src/lib/order-detail/export-order-excel.ts apps/web/src/test/api/logical-delete.test.ts
git commit -m "fix: 金额标红与导出依据 line_total 与 total_price 比较"
```

---

## Self-review（对照 openspec/tasks.md）

**1. Spec coverage**

| openspec 任务 | 本计划 Task |
|---------------|-------------|
| 1.1 lineTotal 迁移 | Task 1 |
| 1.2 分类/单位/商品 trim 后唯一 | 迁移 `20260409120000` + `20260409121000` + Task 1 验证 reset |
| 2.1 GET `q` + POST trim | Task 5 |
| 2.2 resolve + 单测 | Task 4 |
| 3.1–3.3 order-lines API | Task 3 + 6 |
| 4.x 前端表单 | Task 7 |
| 5.x 表格与导出 | Task 8 |
| 6.1 seed（真实感 mock） | 已完成；Task 1 reset 后确认示例数据呈现正确 |
| 6.2 集成测试 | Task 6 + 8 |

**2. Placeholder 扫描：** 已避免 TBD；数值比较若用浮点，实现中优先对金额用 `Decimal` 或固定小数位比较并在 `aggregate` 中单点封装。

**3. 类型一致：** `OrderLineRowForUi`、`ExcelOrderLine`、`OrderDetailTableRow` 均需含 `line_total` 与 `total_price`（基准），与 API JSON 字段名统一为蛇形 `line_total` 以匹配现有 `total_price` 风格。

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-09-order-line-item-form-master-data.md`. Two execution options:**

**1. Subagent-Driven（推荐）** — 每任务派生子代理，任务间评审，迭代快  

**2. Inline Execution** — 本会话按 executing-plans 批量执行并设检查点  

**Which approach?**
