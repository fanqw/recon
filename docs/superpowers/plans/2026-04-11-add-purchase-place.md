# Add Purchase Place Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add purchase-place master data, require `purchasePlaceId` on orders, and enforce delete guards with stable error-code enums.

**Architecture:** Keep existing Next.js App Router + Prisma patterns: add a new `PurchasePlace` model/API/page parallel to category/unit, extend `Order` with a required FK, and enforce cross-entity delete guards inside route handlers. Error semantics are unified by code enum on backend and code-based mapping on frontend. API/E2E tests are expanded first (red), then minimal implementation (green), with small isolated commits.

**Tech Stack:** TypeScript, Next.js App Router, Prisma/PostgreSQL, Zod, Vitest, Playwright, pnpm workspace

---

## Scope Check

This spec touches one cohesive business slice (master data + orders + acceptance tests) rather than independent subsystems. A single implementation plan is appropriate.

## File Structure

- Create: `apps/web/src/lib/delete-block-codes.ts`
- Create: `apps/web/src/lib/delete-block-codes.test.ts`
- Create: `apps/web/src/app/api/purchase-places/route.ts`
- Create: `apps/web/src/app/api/purchase-places/[id]/route.ts`
- Create: `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`
- Create: `apps/web/src/test/api/purchase-places.test.ts`
- Create: `apps/web/src/test/api/delete-guards.test.ts`
- Modify: `apps/web/prisma/schema.prisma`
- Modify: `apps/web/prisma/seed.ts`
- Create: `apps/web/prisma/migrations/20260411123000_purchase_place_init/migration.sql`
- Modify: `apps/web/src/app/api/orders/route.ts`
- Modify: `apps/web/src/app/api/orders/[id]/route.ts`
- Modify: `apps/web/src/app/api/categories/[id]/route.ts`
- Modify: `apps/web/src/app/api/units/[id]/route.ts`
- Modify: `apps/web/src/app/api/commodities/[id]/route.ts`
- Modify: `apps/web/src/components/dashboard-nav.tsx`
- Modify: `apps/web/src/app/(dashboard)/order/list/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`
- Modify: `apps/web/src/test/api/business-flow.test.ts`
- Modify: `apps/web/e2e/acceptance.spec.ts`
- Modify: `README.md`

### Task 1: Shared Delete-Guard Error Code Contract

**Files:**
- Create: `apps/web/src/lib/delete-block-codes.ts`
- Test: `apps/web/src/lib/delete-block-codes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/delete-block-codes.test.ts
import { describe, expect, it } from "vitest";
import {
  DELETE_BLOCK_CODES,
  isDeleteBlockCode,
  messageForDeleteBlockCode,
} from "./delete-block-codes";

describe("delete-block-codes", () => {
  it("能识别合法错误码", () => {
    expect(isDeleteBlockCode("CATEGORY_IN_USE")).toBe(true);
    expect(isDeleteBlockCode("PURCHASE_PLACE_IN_USE")).toBe(true);
    expect(isDeleteBlockCode("X")).toBe(false);
  });

  it("每个错误码都有中文提示文案", () => {
    for (const code of DELETE_BLOCK_CODES) {
      const msg = messageForDeleteBlockCode(code);
      expect(msg.length).toBeGreaterThan(0);
      expect(msg).toContain("无法删除");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/lib/delete-block-codes.test.ts -t "delete-block-codes"`
Expected: FAIL with module-not-found for `./delete-block-codes`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/delete-block-codes.ts
export const DELETE_BLOCK_CODES = [
  "CATEGORY_IN_USE",
  "UNIT_IN_USE",
  "COMMODITY_IN_USE",
  "PURCHASE_PLACE_IN_USE",
] as const;

export type DeleteBlockCode = (typeof DELETE_BLOCK_CODES)[number];

const MESSAGE_MAP: Record<DeleteBlockCode, string> = {
  CATEGORY_IN_USE: "该分类已被关联，无法删除",
  UNIT_IN_USE: "该单位已被关联，无法删除",
  COMMODITY_IN_USE: "该商品已被关联，无法删除",
  PURCHASE_PLACE_IN_USE: "该进货地已被关联，无法删除",
};

export function isDeleteBlockCode(v: unknown): v is DeleteBlockCode {
  return typeof v === "string" && (DELETE_BLOCK_CODES as readonly string[]).includes(v);
}

export function messageForDeleteBlockCode(code: DeleteBlockCode): string {
  return MESSAGE_MAP[code];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/lib/delete-block-codes.test.ts -t "delete-block-codes"`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/delete-block-codes.ts apps/web/src/lib/delete-block-codes.test.ts
git commit -m "新增删除冲突错误码枚举"
```

### Task 2: PurchasePlace Data Model + CRUD API

**Files:**
- Create: `apps/web/src/test/api/purchase-places.test.ts`
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/20260411123000_purchase_place_init/migration.sql`
- Create: `apps/web/src/app/api/purchase-places/route.ts`
- Create: `apps/web/src/app/api/purchase-places/[id]/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/test/api/purchase-places.test.ts
import { describe, expect, inject, it } from "vitest";
import { fetchWithCookie, loginAsAdmin, postJsonWithCookie } from "../http-client";

describe("purchase places api", () => {
  it("未认证访问返回 401", async () => {
    const baseUrl = inject("testBaseUrl");
    const res = await fetch(`${baseUrl}/api/purchase-places`);
    expect(res.status).toBe(401);
  });

  it("认证后可创建并查询进货地", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const create = await postJsonWithCookie(
      baseUrl,
      "/api/purchase-places",
      { place: `广州-${suf}`, marketName: `江南市场-${suf}`, desc: "凌晨进货" },
      cookie,
    );
    expect(create.status).toBe(201);

    const list = await fetchWithCookie(baseUrl, "/api/purchase-places", {}, cookie);
    expect(list.status).toBe(200);
    const body = (await list.json()) as { items: Array<{ place: string; marketName: string }> };
    expect(body.items.some((x) => x.place === `广州-${suf}` && x.marketName === `江南市场-${suf}`)).toBe(true);
  });

  it("进货地 + 市场名重复返回 409", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = { place: `佛山-${suf}`, marketName: `南海市场-${suf}` };

    expect((await postJsonWithCookie(baseUrl, "/api/purchase-places", payload, cookie)).status).toBe(201);
    expect((await postJsonWithCookie(baseUrl, "/api/purchase-places", payload, cookie)).status).toBe(409);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/test/api/purchase-places.test.ts`
Expected: FAIL with 404 on `/api/purchase-places`.

- [ ] **Step 3: Write minimal implementation**

```prisma
// apps/web/prisma/schema.prisma (append model; do not remove existing models)
model PurchasePlace {
  id         String   @id @default(cuid())
  place      String
  marketName String   @map("market_name")
  desc       String?
  deleted    Boolean  @default(false)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  orders Order[]
}
```

```sql
-- apps/web/prisma/migrations/20260411123000_purchase_place_init/migration.sql
CREATE TABLE "PurchasePlace" (
  "id" TEXT PRIMARY KEY,
  "place" TEXT NOT NULL,
  "market_name" TEXT NOT NULL,
  "desc" TEXT,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PurchasePlace_place_market_active_key"
ON "PurchasePlace" ("place", "market_name")
WHERE deleted = false;
```

```ts
// apps/web/src/app/api/purchase-places/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonResponseForPrismaUniqueViolation } from "@/lib/prisma-errors";

const createSchema = z.object({
  place: z.string().min(1),
  marketName: z.string().min(1),
  desc: z.string().optional(),
});

async function guard() {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  return null;
}

export async function GET(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const items = await prisma.purchasePlace.findMany({
    where: {
      deleted: false,
      ...(q
        ? {
            OR: [
              { place: { contains: q, mode: "insensitive" } },
              { marketName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "请求体无效" }, { status: 400 });

  const place = parsed.data.place.trim();
  const marketName = parsed.data.marketName.trim();
  if (!place || !marketName) {
    return NextResponse.json({ error: "进货地和市场名称不能为空" }, { status: 400 });
  }

  try {
    const item = await prisma.purchasePlace.create({
      data: { place, marketName, desc: parsed.data.desc },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const conflict = jsonResponseForPrismaUniqueViolation(e);
    if (conflict) return conflict;
    throw e;
  }
}
```

```ts
// apps/web/src/app/api/purchase-places/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonResponseForPrismaUniqueViolation } from "@/lib/prisma-errors";

const patchSchema = z.object({
  place: z.string().min(1).optional(),
  marketName: z.string().min(1).optional(),
  desc: z.string().optional(),
});

async function guard() {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const item = await prisma.purchasePlace.findFirst({ where: { id, deleted: false } });
  if (!item) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "请求体无效" }, { status: 400 });

  const existing = await prisma.purchasePlace.findFirst({ where: { id, deleted: false } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const data: { place?: string; marketName?: string; desc?: string | null } = {};
  if (parsed.data.place !== undefined) {
    const place = parsed.data.place.trim();
    if (!place) return NextResponse.json({ error: "进货地不能为空" }, { status: 400 });
    data.place = place;
  }
  if (parsed.data.marketName !== undefined) {
    const marketName = parsed.data.marketName.trim();
    if (!marketName) return NextResponse.json({ error: "市场名称不能为空" }, { status: 400 });
    data.marketName = marketName;
  }
  if (parsed.data.desc !== undefined) data.desc = parsed.data.desc;

  try {
    const item = await prisma.purchasePlace.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (e) {
    const conflict = jsonResponseForPrismaUniqueViolation(e);
    if (conflict) return conflict;
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.purchasePlace.findFirst({ where: { id, deleted: false } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.purchasePlace.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm --filter web test -- src/test/api/purchase-places.test.ts`

Expected: PASS (all `purchase places api` cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/20260411123000_purchase_place_and_order_fk/migration.sql apps/web/src/app/api/purchase-places/route.ts apps/web/src/app/api/purchase-places/[id]/route.ts apps/web/src/test/api/purchase-places.test.ts
git commit -m "新增进货地主数据与接口"
```

### Task 3: Order API Requires `purchasePlaceId`

**Files:**
- Modify: `apps/web/src/test/api/business-flow.test.ts`
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/20260411124500_order_purchase_place_required/migration.sql`
- Modify: `apps/web/src/app/api/orders/route.ts`
- Modify: `apps/web/src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/test/api/business-flow.test.ts (append new case)
it("POST /api/orders 缺失 purchasePlaceId 返回 400", async () => {
  const baseUrl = inject("testBaseUrl");
  const cookie = await loginAsAdmin(baseUrl);
  const res = await postJsonWithCookie(baseUrl, "/api/orders", { name: "缺少进货地" }, cookie);
  expect(res.status).toBe(400);
});

// also update existing order-create payloads in this file:
// { name: `api-ord-${suf}`, desc: "test", purchasePlaceId: place.item.id }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/test/api/business-flow.test.ts -t "缺失 purchasePlaceId"`
Expected: FAIL (current status is 201 or request still succeeds).

- [ ] **Step 3: Write minimal implementation**

```prisma
// apps/web/prisma/schema.prisma (modify Order model)
model Order {
  id              String   @id @default(cuid())
  name            String
  purchasePlaceId String   @map("purchase_place_id")
  desc            String?
  deleted         Boolean  @default(false)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  purchasePlace    PurchasePlace    @relation(fields: [purchasePlaceId], references: [id])
  orderCommodities OrderCommodity[]
}
```

```sql
-- apps/web/prisma/migrations/20260411124500_order_purchase_place_required/migration.sql
DELETE FROM "OrderCommodity";
DELETE FROM "Order";

ALTER TABLE "Order"
ADD COLUMN "purchase_place_id" TEXT NOT NULL;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_purchase_place_id_fkey"
FOREIGN KEY ("purchase_place_id") REFERENCES "PurchasePlace"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
```

```ts
// apps/web/src/app/api/orders/route.ts (core changes)
const createSchema = z.object({
  name: z.string().min(1),
  purchasePlaceId: z.string().min(1),
  desc: z.string().optional(),
});

export async function GET() {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const items = await prisma.order.findMany({
    where: { deleted: false },
    orderBy: { updatedAt: "desc" },
    include: { purchasePlace: true },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "请求体无效" }, { status: 400 });

  const place = await prisma.purchasePlace.findFirst({
    where: { id: parsed.data.purchasePlaceId, deleted: false },
  });
  if (!place) return NextResponse.json({ error: "进货地不存在或已删除" }, { status: 400 });

  const item = await prisma.order.create({
    data: {
      name: parsed.data.name,
      purchasePlaceId: parsed.data.purchasePlaceId,
      desc: parsed.data.desc,
    },
    include: { purchasePlace: true },
  });

  return NextResponse.json({ item }, { status: 201 });
}
```

```ts
// apps/web/src/app/api/orders/[id]/route.ts (core changes)
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  purchasePlaceId: z.string().min(1).optional(),
  desc: z.string().optional(),
});

// GET include purchasePlace
const item = await prisma.order.findFirst({
  where: { id, deleted: false },
  include: {
    purchasePlace: true,
    orderCommodities: {
      where: { deleted: false, commodity: { deleted: false } },
      include: { commodity: { include: { category: true, unit: true } } },
    },
  },
});

// PATCH validate purchasePlaceId when provided
if (parsed.data.purchasePlaceId !== undefined) {
  const place = await prisma.purchasePlace.findFirst({
    where: { id: parsed.data.purchasePlaceId, deleted: false },
  });
  if (!place) return NextResponse.json({ error: "进货地不存在或已删除" }, { status: 400 });
}

const item = await prisma.order.update({
  where: { id },
  data: {
    name: parsed.data.name ?? existing.name,
    purchasePlaceId: parsed.data.purchasePlaceId ?? existing.purchasePlaceId,
    desc: parsed.data.desc !== undefined ? parsed.data.desc : existing.desc,
  },
  include: { purchasePlace: true },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/test/api/business-flow.test.ts -t "purchasePlaceId"`
Expected: PASS for missing-id 400 and valid-id create path.

- [ ] **Step 5: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/src/app/api/orders/route.ts apps/web/src/app/api/orders/[id]/route.ts apps/web/src/test/api/business-flow.test.ts
git commit -m "订单接口新增进货地必填约束"
```

### Task 4: Backend Delete Guards + 409 Enum Codes

**Files:**
- Create: `apps/web/src/test/api/delete-guards.test.ts`
- Modify: `apps/web/src/app/api/categories/[id]/route.ts`
- Modify: `apps/web/src/app/api/units/[id]/route.ts`
- Modify: `apps/web/src/app/api/commodities/[id]/route.ts`
- Modify: `apps/web/src/app/api/purchase-places/[id]/route.ts`
- Reuse: `apps/web/src/lib/delete-block-codes.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/test/api/delete-guards.test.ts
import { describe, expect, inject, it } from "vitest";
import { deleteWithCookie, loginAsAdmin, postJsonWithCookie } from "../http-client";

describe("delete guards", () => {
  it("分类被商品引用时返回 409 + CATEGORY_IN_USE", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = Date.now().toString(36);

    const cat = (await (await postJsonWithCookie(baseUrl, "/api/categories", { name: `拦截分类-${suf}` }, cookie)).json()) as { item: { id: string } };
    const unit = (await (await postJsonWithCookie(baseUrl, "/api/units", { name: `拦截单位-${suf}` }, cookie)).json()) as { item: { id: string } };
    await postJsonWithCookie(baseUrl, "/api/commodities", { name: `拦截商品-${suf}`, categoryId: cat.item.id, unitId: unit.item.id }, cookie);

    const del = await deleteWithCookie(baseUrl, `/api/categories/${cat.item.id}`, cookie);
    expect(del.status).toBe(409);
    const body = (await del.json()) as { code: string };
    expect(body.code).toBe("CATEGORY_IN_USE");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/test/api/delete-guards.test.ts`
Expected: FAIL (currently status is 200 for delete).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/app/api/categories/[id]/route.ts (DELETE section)
import { messageForDeleteBlockCode } from "@/lib/delete-block-codes";

const inUse = await prisma.commodity.findFirst({ where: { categoryId: id, deleted: false } });
if (inUse) {
  return NextResponse.json(
    { code: "CATEGORY_IN_USE", error: messageForDeleteBlockCode("CATEGORY_IN_USE") },
    { status: 409 },
  );
}
```

```ts
// apps/web/src/app/api/units/[id]/route.ts (DELETE section)
const inUse = await prisma.commodity.findFirst({ where: { unitId: id, deleted: false } });
if (inUse) {
  return NextResponse.json(
    { code: "UNIT_IN_USE", error: messageForDeleteBlockCode("UNIT_IN_USE") },
    { status: 409 },
  );
}
```

```ts
// apps/web/src/app/api/commodities/[id]/route.ts (DELETE section)
const inUse = await prisma.orderCommodity.findFirst({
  where: { commodityId: id, deleted: false },
});
if (inUse) {
  return NextResponse.json(
    { code: "COMMODITY_IN_USE", error: messageForDeleteBlockCode("COMMODITY_IN_USE") },
    { status: 409 },
  );
}
```

```ts
// apps/web/src/app/api/purchase-places/[id]/route.ts (DELETE section)
const inUse = await prisma.order.findFirst({
  where: { purchasePlaceId: id, deleted: false },
});
if (inUse) {
  return NextResponse.json(
    { code: "PURCHASE_PLACE_IN_USE", error: messageForDeleteBlockCode("PURCHASE_PLACE_IN_USE") },
    { status: 409 },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/test/api/delete-guards.test.ts`
Expected: PASS (status 409 + code assertions pass).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/categories/[id]/route.ts apps/web/src/app/api/units/[id]/route.ts apps/web/src/app/api/commodities/[id]/route.ts apps/web/src/app/api/purchase-places/[id]/route.ts apps/web/src/test/api/delete-guards.test.ts
git commit -m "新增主数据删除关联拦截与错误码"
```

### Task 5: Frontend PurchasePlace Page + Order Form Integration

**Files:**
- Create: `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`
- Modify: `apps/web/src/components/dashboard-nav.tsx`
- Modify: `apps/web/src/app/(dashboard)/order/list/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`

- [ ] **Step 1: Write the failing E2E test**

```ts
// apps/web/e2e/acceptance.spec.ts (append)
test("登录后可访问进货地页并看到主按钮", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();

  await page.goto("/basic/purchase-place");
  await expect(page.getByRole("heading", { name: "进货地", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "可访问进货地页"`
Expected: FAIL (404 route or missing nav/page elements).

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/src/components/dashboard-nav.tsx (add link)
<Link href="/basic/purchase-place" className={linkCls}>
  进货地
</Link>
```

```tsx
// apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

type PurchasePlace = {
  id: string;
  place: string;
  marketName: string;
  desc: string | null;
};

export default function PurchasePlacePage() {
  const [items, setItems] = useState<PurchasePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState("");
  const [marketName, setMarketName] = useState("");
  const [desc, setDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase-places", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: PurchasePlace[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { place, marketName, desc: desc || undefined };
    const res = editingId
      ? await fetch(`/api/purchase-places/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        })
      : await fetch("/api/purchase-places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "保存失败");
      return;
    }

    setPlace("");
    setMarketName("");
    setDesc("");
    setEditingId(null);
    await loadList();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">进货地</h1>
      <form onSubmit={handleSubmit} className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">{editingId ? "编辑进货地" : "新建进货地"}</h2>
        <div className="flex flex-wrap gap-3">
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="进货地" className="rounded border border-zinc-300 px-3 py-2 text-sm" required />
          <input value={marketName} onChange={(e) => setMarketName(e.target.value)} placeholder="市场名称" className="rounded border border-zinc-300 px-3 py-2 text-sm" required />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="备注（可选）" className="min-w-[200px] flex-1 rounded border border-zinc-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800">{editingId ? "保存" : "新建"}</button>
        </div>
      </form>
      {error ? <p className="mb-4 text-sm text-red-600" role="alert">{error}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-700">进货地</th>
              <th className="px-4 py-3 font-medium text-zinc-700">市场名称</th>
              <th className="px-4 py-3 font-medium text-zinc-700">备注</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-500">加载中…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-500">暂无数据</td></tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 text-zinc-900">{row.place}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.marketName}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.desc ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

```tsx
// apps/web/src/app/(dashboard)/order/list/page.tsx (core deltas)
type PurchasePlace = { id: string; place: string; marketName: string };
type Order = {
  id: string;
  name: string;
  desc: string | null;
  purchasePlace: PurchasePlace;
};

const [purchasePlaces, setPurchasePlaces] = useState<PurchasePlace[]>([]);
const [purchasePlaceId, setPurchasePlaceId] = useState("");

useEffect(() => {
  void (async () => {
    const res = await fetch("/api/purchase-places", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { items: PurchasePlace[] };
    setPurchasePlaces(data.items ?? []);
  })();
}, []);

body: JSON.stringify({ name, purchasePlaceId, desc: desc || undefined }),

<select
  value={purchasePlaceId}
  onChange={(e) => setPurchasePlaceId(e.target.value)}
  className="rounded border border-zinc-300 px-3 py-2 text-sm"
  required
>
  <option value="">选择进货地</option>
  {purchasePlaces.map((p) => (
    <option key={p.id} value={p.id}>{p.place} / {p.marketName}</option>
  ))}
</select>
```

```tsx
// apps/web/src/app/(dashboard)/order/list/[id]/page.tsx (order head display)
type OrderHead = {
  id: string;
  name: string;
  desc: string | null;
  purchasePlace: { id: string; place: string; marketName: string };
};

<p className="mt-1 text-sm text-zinc-600">
  进货地：{order.purchasePlace.place} / {order.purchasePlace.marketName}
</p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "可访问进货地页"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard-nav.tsx apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx apps/web/src/app/(dashboard)/order/list/page.tsx apps/web/src/app/(dashboard)/order/list/[id]/page.tsx apps/web/e2e/acceptance.spec.ts
git commit -m "新增进货地页面并接入订单表单"
```

### Task 6: Frontend Error-Code Mapping + Acceptance Coverage + Docs

**Files:**
- Modify: `apps/web/src/app/(dashboard)/basic/category/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/unit/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`
- Modify: `apps/web/e2e/acceptance.spec.ts`
- Modify: `apps/web/prisma/seed.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/e2e/acceptance.spec.ts (append)
test("主数据删除受阻时展示错误提示", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
    headers: { "Content-Type": "application/json" },
  });
  expect(login.ok()).toBeTruthy();

  const suf = Date.now().toString(36);
  const cat = await page.request.post("/api/categories", {
    data: { name: `e2e-分类-${suf}` },
    headers: { "Content-Type": "application/json" },
  });
  const unit = await page.request.post("/api/units", {
    data: { name: `e2e-单位-${suf}` },
    headers: { "Content-Type": "application/json" },
  });
  const catJson = (await cat.json()) as { item: { id: string } };
  const unitJson = (await unit.json()) as { item: { id: string } };

  await page.request.post("/api/commodities", {
    data: {
      name: `e2e-商品-${suf}`,
      categoryId: catJson.item.id,
      unitId: unitJson.item.id,
    },
    headers: { "Content-Type": "application/json" },
  });

  await page.goto("/basic/category");
  page.once("dialog", (d) => d.accept());
  const row = page.locator("tr", { hasText: `e2e-分类-${suf}` }).first();
  await row.getByRole("button", { name: "删除" }).click();
  await expect(page.getByRole("alert")).toContainText("无法删除");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "删除受阻时展示错误提示"`
Expected: FAIL (当前删除成功或提示不稳定)。

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/src/app/(dashboard)/basic/category/page.tsx (error parsing in removeRow)
import { isDeleteBlockCode, messageForDeleteBlockCode } from "@/lib/delete-block-codes";

const data = await res.json().catch(() => ({}));
const code = (data as { code?: unknown }).code;
if (isDeleteBlockCode(code)) {
  setError(messageForDeleteBlockCode(code));
} else {
  setError((data as { error?: string }).error ?? "删除失败");
}
```

```tsx
// same pattern in:
// apps/web/src/app/(dashboard)/basic/unit/page.tsx
// apps/web/src/app/(dashboard)/basic/commodity/page.tsx
// apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx
```

```ts
// apps/web/prisma/seed.ts (semantic Chinese mock)
let place = await prisma.purchasePlace.findFirst({
  where: { place: "广州", marketName: "江南果菜批发市场", deleted: false },
});
if (!place) {
  place = await prisma.purchasePlace.create({
    data: { place: "广州", marketName: "江南果菜批发市场", desc: "凌晨档口" },
  });
}

const existingOrder = await prisma.order.findFirst({
  where: { name: "示例订单-广州", deleted: false },
});
if (!existingOrder) {
  await prisma.order.create({
    data: {
      name: "示例订单-广州",
      purchasePlaceId: place.id,
      desc: "种子数据：含进货地",
    },
  });
}
```

```md
<!-- README.md additions (relevant sections) -->
- 重构业务能力包括：登录、分类、单位、商品、进货地、订单、订单明细。
- 订单创建需选择进货地（必填）。
- 主数据删除在存在未删除关联时会返回 409 与错误码枚举。
```

- [ ] **Step 4: Run test to verify it passes**

Run:
- `pnpm db:seed`
- `pnpm --filter web test:e2e -- e2e/acceptance.spec.ts -g "删除受阻时展示错误提示"`
- `pnpm test`
- `pnpm test:e2e`

Expected:
- E2E targeted case PASS.
- Full Vitest PASS.
- Full Playwright PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/basic/category/page.tsx apps/web/src/app/(dashboard)/basic/unit/page.tsx apps/web/src/app/(dashboard)/basic/commodity/page.tsx apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx apps/web/e2e/acceptance.spec.ts apps/web/prisma/seed.ts README.md
git commit -m "前端按错误码提示删除失败并更新文档"
```

## Self-Review

1. **Spec coverage:**
- `master-data` 的进货地 CRUD 与组合唯一：Task 2
- `master-data` 的删除拦截 + 错误码：Task 1 + Task 4 + Task 6
- `sales-orders` 的订单必填 `purchasePlaceId`：Task 3 + Task 5
- `automated-acceptance` 的 API/E2E 扩展：Task 2/3/4/5/6
- 覆盖无缺口。

2. **Placeholder scan:**
- 已检查，未使用 `TODO/TBD/implement later/similar to` 等占位描述。

3. **Type consistency:**
- `DeleteBlockCode` 枚举在后端响应与前端解析统一。
- `purchasePlaceId` 在 Prisma、API schema、页面表单字段命名统一。
