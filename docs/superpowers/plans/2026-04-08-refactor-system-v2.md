# recon Implementation Plan（变更 refactor-system-v2）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在本仓库落地 **recon** 全栈应用（v2，Next.js App Router + Prisma + PostgreSQL），实现与 v1 对齐的管理员登录、主数据与订单/明细能力，并配套 Vitest API 测试与 Playwright E2E。

**Architecture:** 单一 `apps/web` 承载 UI 与 `app/api` Route Handlers；领域逻辑放入 `apps/web/src/lib`（或 `apps/web/lib`，与创建应用时选项一致后固定一种）；数据经 Prisma 访问 PostgreSQL；会话使用 **iron-session**（httpOnly 加密 Cookie，不依赖 Redis 亦可跑通开发与测试，Redis 仍由 Compose 提供以备后续 session 外置）。逻辑删除统一 `deleted Boolean @default(false)`，列表默认 `where: { deleted: false }`。

**与 v1 的关系（唯一准绳）：** 业务语义、接口字段、订单明细金额与表格展示/合并/标红 **以 v1 源码为准**（本计划已引用路径；有歧义时 **反查 v1**）。技术栈差异（Mongo→Postgres、Express→Next）仅换实现。**例外**以 Task 14 文首「相对 v1 的明确修订」为准：**不设明细条数上限**；**导出为 Excel**（版式须与当前表格一致），不再要求与 v1 的 `html2canvas` 或 50 条提示一致。

**Tech Stack:** pnpm workspace、Next.js 15（App Router）、TypeScript、Tailwind CSS、Prisma、PostgreSQL、Vitest、@vitest/coverage-v8（可选）、Playwright、bcrypt 或 @node-rs/argon2（下文用 `bcryptjs` + `bcrypt` 的纯 JS 方案或原生 `bcrypt` —— 计划采用 **`bcryptjs`** 避免 Windows 原生模块编译问题）。

**编码约定（注释语言）：** 业务与工具代码中，**关键函数、关键变量、非显而易见的分支**须加 **中文注释**（说明意图、不变量或与 v1 的对齐点）； exported 的 Route Handler、公共 lib 函数在文件内或紧挨签名处用中文说明用途。避免无意义注释；英文仅用于类型名、API 路径等与生态一致的标识。

---

## 文件结构总览（创建前锁定路径）

| 路径 | 职责 |
|------|------|
| `pnpm-workspace.yaml` | 声明 `apps/*`、`packages/*` |
| `package.json`（根） | `name: "recon"`；全仓脚本：`dev`/`build`/`lint`/`test` 聚合 |
| `docker-compose.yml`（根） | `postgres`、`redis` 服务与端口 |
| `.env.example`（根） | `DATABASE_URL`、`REDIS_URL`、`SESSION_SECRET`、测试库 URL 说明 |
| `apps/web/package.json` | Next、Prisma、Vitest、Playwright 脚本 |
| `apps/web/next.config.ts` | Next 配置 |
| `apps/web/tsconfig.json` | `paths`: `@/*` → `./src/*`（若采用 `src` 目录） |
| `apps/web/prisma/schema.prisma` | User、Category、Unit、Commodity、Order、OrderCommodity |
| `apps/web/prisma/seed.ts` | 管理员与可选样例数据 |
| `apps/web/src/lib/prisma.ts` | Prisma 单例 |
| `apps/web/src/lib/password.ts` | 哈希与校验（含中文注释的导出函数） |
| `apps/web/src/lib/session.ts` | iron-session 选项与 `SessionData` 类型 |
| `apps/web/src/lib/auth.ts` | `getCurrentUser`、`requireUser`（供 Route Handlers 使用） |
| `apps/web/src/middleware.ts` | 保护 `/basic`、`/order` 等前缀，未登录重定向 `/login` |
| `apps/web/src/app/api/auth/login/route.ts` | 登录 POST |
| `apps/web/src/app/api/auth/logout/route.ts` | 登出 POST |
| `apps/web/src/app/api/auth/me/route.ts` | 当前用户 GET（供前端布局） |
| `apps/web/src/app/api/categories/route.ts` | 列表 GET、创建 POST |
| `apps/web/src/app/api/categories/[id]/route.ts` | 单条 GET、更新 PATCH、删除 DELETE（逻辑删） |
| `apps/web/src/app/api/units/route.ts` | 同上（单位） |
| `apps/web/src/app/api/units/[id]/route.ts` | 同上 |
| `apps/web/src/app/api/commodities/route.ts` | 同上 + 校验 categoryId/unitId |
| `apps/web/src/app/api/commodities/[id]/route.ts` | 同上 |
| `apps/web/src/app/api/orders/route.ts` | 订单列表/创建 |
| `apps/web/src/app/api/orders/[id]/route.ts` | 订单详情/更新/删除 |
| `apps/web/src/app/api/orders/[id]/lines/route.ts` | 订单明细列表 POST、GET |
| `apps/web/src/app/api/order-lines/[id]/route.ts` | 明细 PATCH/DELETE（逻辑删） |
| `apps/web/src/app/login/page.tsx` | 登录表单 |
| `apps/web/src/app/(dashboard)/layout.tsx` | 已登录布局 + 导航 |
| `apps/web/src/app/(dashboard)/basic/category/page.tsx` | 分类页 |
| `apps/web/src/app/(dashboard)/basic/unit/page.tsx` | 单位页 |
| `apps/web/src/app/(dashboard)/basic/commodity/page.tsx` | 商品页 |
| `apps/web/src/app/(dashboard)/order/list/page.tsx` | 订单列表 |
| `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx` | 订单详情 + 明细 |
| `apps/web/vitest.config.ts` | Vitest + node 环境 |
| `apps/web/e2e/*.spec.ts` | Playwright 用例 |
| `apps/web/playwright.config.ts` | `webServer: pnpm dev` |
| `packages/shared/package.json` | 导出空对象或后续 DTO |
| `packages/config/package.json` | 占位（eslint/tsconfig 可后续补） |

以下任务按依赖顺序排列；**每一步尽量可在 2–5 分钟内完成或验证**。

---

### Task 1: 根工作区与 Docker

**Files:**

- Create: `pnpm-workspace.yaml`
- Create: `package.json`（根）
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`（根目录完整规则，**含忽略整个 `v1/`**，历史参考代码不进入版本库）

- [ ] **Step 1: 写入 `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: 写入根 `package.json`**

```json
{
  "name": "recon",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter web build",
    "lint": "pnpm --filter web lint",
    "test": "pnpm --filter web test",
    "test:e2e": "pnpm --filter web test:e2e",
    "db:generate": "pnpm --filter web prisma generate",
    "db:migrate": "pnpm --filter web prisma migrate dev",
    "db:seed": "pnpm --filter web prisma db seed"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 3: 写入 `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: recon
      POSTGRES_PASSWORD: recon
      POSTGRES_DB: recon
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
volumes:
  pg_data: {}
```

- [ ] **Step 4: 写入 `.env.example`**

```env
DATABASE_URL="postgresql://recon:recon@localhost:5432/recon"
REDIS_URL="redis://localhost:6379"
SESSION_SECRET="replace-with-at-least-32-chars-random-string"
# 测试用（可选）：DATABASE_URL 指向独立库 recon_test
```

- [ ] **Step 5: 写入根目录 `.gitignore`**

**必须**包含对 **`v1/`** 的忽略（v1 仅本地对照，不提交）。示例全文如下（可按需追加 OS 杂项）：

```gitignore
# 依赖与构建
node_modules/
.next/
out/
dist/
build/
.turbo/

# 环境变量与密钥
.env
.env.*
!.env.example
apps/web/.env
apps/web/.env.*

# 测试与报告
coverage/
playwright-report/
test-results/
*.log

# v1 历史参考实现 — 不纳入 v2 版本库
v1/

# IDE
.idea/
.vscode/*
!.vscode/extensions.json

# Prisma
apps/web/prisma/*.db
apps/web/prisma/*.db-journal

# 系统文件
.DS_Store
Thumbs.db
```

- [ ] **Step 6: 安装与验证 Compose**

Run:

```powershell
docker compose -f docker-compose.yml up -d
docker compose ps
```

Expected: `postgres`、`redis` 状态为 `running`。

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml package.json docker-compose.yml .env.example .gitignore
git commit -m "chore: 初始化 workspace 与本地依赖服务"
```

---

### Task 2: 共享包占位

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/config/package.json`

- [ ] **Step 1: `packages/shared/package.json`**

```json
{
  "name": "@recon/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

- [ ] **Step 2: `packages/shared/src/index.ts`**

```typescript
/** 共享类型与常量出口；随实现逐步填充 */
export const RECON_APP_NAME = "recon";
```

- [ ] **Step 3: `packages/config/package.json`**

```json
{
  "name": "@recon/config",
  "version": "0.0.0",
  "private": true
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared packages/config
git commit -m "chore: 添加 shared 与 config 占位包"
```

---

### Task 3: 创建 Next 应用 `apps/web`

**Files:**

- Create: `apps/web/*`（由 CLI 生成后需再改）

- [ ] **Step 1: 执行创建命令**

Run（在仓库根目录，已 `pnpm` 可用时）:

```powershell
pnpm dlx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```

Expected: `apps/web` 目录出现且 `pnpm --filter web dev` 可启动（下一步再改 `package.json` 合并依赖）。

- [ ] **Step 2: 在 `apps/web/package.json` 追加依赖与脚本**

在 `dependencies` 中加入：

```json
"@prisma/client": "^6.0.0",
"bcryptjs": "^2.4.3",
"iron-session": "^8.0.0",
"zod": "^3.23.0"
```

在 `devDependencies` 中加入：

```json
"prisma": "^6.0.0",
"@types/bcryptjs": "^2.4.6",
"tsx": "^4.19.0",
"vitest": "^3.0.0",
"@playwright/test": "^1.49.0"
```

在 `scripts` 中加入：

```json
"prisma": "prisma",
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

并增加 Prisma seed 配置（在 `package.json` 顶层）：

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

（若未安装 `tsx`，改用 `ts-node` 或 `node --import tsx`。）

- [ ] **Step 3: 安装**

Run:

```powershell
pnpm install
```

Expected: 无错误；lockfile 更新。

- [ ] **Step 4: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): 初始化 Next.js 应用与基础依赖"
```

---

### Task 4: Prisma 模型与迁移

**Files:**

- Create: `apps/web/prisma/schema.prisma`
- Create: 迁移目录（由 CLI 生成）

- [ ] **Step 1: 写入 `apps/web/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
}

model Category {
  id          String      @id @default(cuid())
  name        String
  desc        String?
  deleted     Boolean     @default(false)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  commodities Commodity[]
}

model Unit {
  id          String      @id @default(cuid())
  name        String
  desc        String?
  deleted     Boolean     @default(false)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  commodities Commodity[]
}

model Commodity {
  id         String   @id @default(cuid())
  name       String
  categoryId String   @map("category_id")
  unitId     String   @map("unit_id")
  desc       String?
  deleted    Boolean  @default(false)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  category Category @relation(fields: [categoryId], references: [id])
  unit     Unit     @relation(fields: [unitId], references: [id])

  orderLines OrderCommodity[]
}

model Order {
  id        String   @id @default(cuid())
  name      String
  desc      String?
  deleted   Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  orderCommodities OrderCommodity[]
}

model OrderCommodity {
  id          String   @id @default(cuid())
  orderId     String   @map("order_id")
  commodityId String   @map("commodity_id")
  count       Int
  price       Decimal  @db.Decimal(12, 2)
  desc        String?
  deleted     Boolean  @default(false)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  order     Order     @relation(fields: [orderId], references: [id])
  commodity Commodity @relation(fields: [commodityId], references: [id])
}
```

- [ ] **Step 2: 复制环境变量并迁移**

Run:

```powershell
Copy-Item .env.example apps/web/.env
pnpm --filter web prisma migrate dev --name init
pnpm --filter web prisma generate
```

Expected: `apps/web/prisma/migrations/*/migration.sql` 生成且无错误。

- [ ] **Step 3: Commit**

```bash
git add apps/web/prisma
git commit -m "feat(web): 添加 Prisma 模型与初始迁移"
```

---

### Task 5: 种子数据

**Files:**

- Create: `apps/web/prisma/seed.ts`

- [ ] **Step 1: 写入 `apps/web/prisma/seed.ts`**

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash },
  });

  const cat = await prisma.category.create({
    data: { name: "示例分类", desc: "seed" },
  });
  const unit = await prisma.unit.create({
    data: { name: "件", desc: "seed" },
  });
  await prisma.commodity.create({
    data: {
      name: "示例商品",
      categoryId: cat.id,
      unitId: unit.id,
      desc: "seed",
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: 运行 seed**

Run:

```powershell
pnpm db:seed
```

Expected: 控制台无报错；数据库中存在 `admin` 用户与样例主数据。

- [ ] **Step 3: Commit**

```bash
git add apps/web/prisma/seed.ts apps/web/package.json
git commit -m "chore(web): 添加 Prisma seed 与默认管理员"
```

---

### Task 6: Prisma 单例与密码工具（TDD）

**Files:**

- Create: `apps/web/src/lib/prisma.ts`
- Create: `apps/web/src/lib/password.ts`
- Create: `apps/web/src/lib/password.test.ts`

- [ ] **Step 1: 先写失败测试 `apps/web/src/lib/password.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("verifyPassword 对 hashPassword 结果返回 true", async () => {
    const hash = await hashPassword("secret");
    expect(await verifyPassword("secret", hash)).toBe(true);
  });

  it("错误密码返回 false", async () => {
    const hash = await hashPassword("secret");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

Run:

```powershell
pnpm --filter web exec vitest run src/lib/password.test.ts
```

Expected: FAIL（模块 `./password` 不存在或函数未导出）。

- [ ] **Step 2: 实现 `apps/web/src/lib/password.ts`**

```typescript
import bcrypt from "bcryptjs";

const ROUNDS = 10;

/**
 * 对明文密码进行哈希，供创建用户或修改密码时写入 `passwordHash`。
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/**
 * 校验明文密码是否与已存储的 bcrypt 哈希一致。
 */
export async function verifyPassword(
  plain: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}
```

- [ ] **Step 3: 实现 `apps/web/src/lib/prisma.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * 应用内复用的 Prisma 客户端单例，避免开发模式热重载重复建连。
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: 再跑测试**

Run:

```powershell
pnpm --filter web exec vitest run src/lib/password.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/prisma.ts apps/web/src/lib/password.ts apps/web/src/lib/password.test.ts
git commit -m "feat(web): 添加 Prisma 单例与密码哈希工具"
```

---

### Task 7: iron-session 与认证辅助

**Files:**

- Create: `apps/web/src/lib/session.ts`
- Create: `apps/web/src/lib/auth.ts`

- [ ] **Step 1: 写入 `apps/web/src/lib/session.ts`**

```typescript
import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: string;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "recon_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

/**
 * 读取当前请求的 iron-session（服务端组件 / Route Handler 内使用）。
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
```

- [ ] **Step 2: 写入 `apps/web/src/lib/auth.ts`**

```typescript
import { prisma } from "./prisma";
import { getSession } from "./session";

/**
 * 返回当前登录用户；未登录返回 null。
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return prisma.user.findFirst({
    where: { id: session.userId },
    select: { id: true, username: true, createdAt: true },
  });
}

/**
 * 要求已登录；否则抛出带 status 的错误供 Route Handler 映射为 401。
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/session.ts apps/web/src/lib/auth.ts
git commit -m "feat(web): 添加 iron-session 与当前用户解析"
```

---

### Task 8: 认证 API 与中间件

**Files:**

- Create: `apps/web/src/app/api/auth/login/route.ts`
- Create: `apps/web/src/app/api/auth/logout/route.ts`
- Create: `apps/web/src/app/api/auth/me/route.ts`
- Create: `apps/web/src/middleware.ts`

- [ ] **Step 1: `login/route.ts`（所有导出路由函数附中文注释）**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/session";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login：校验用户名密码并写入会话 Cookie。
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return NextResponse.json({ user: { id: user.id, username: user.username } });
}
```

- [ ] **Step 2: `logout/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * POST /api/auth/logout：销毁当前会话。
 */
export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: `me/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/auth/me：返回当前登录用户，未登录返回 401。
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
```

- [ ] **Step 4: `middleware.ts`**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  const path = req.nextUrl.pathname;
  const protectedPrefix = ["/basic", "/order"];
  const isProtected = protectedPrefix.some((p) => path.startsWith(p));
  if (isProtected && !session.userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/basic/:path*", "/order/:path*"],
};
```

- [ ] **Step 5: 手动验证**

Run（另开终端 `pnpm dev` 后）:

```powershell
curl -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

Expected: HTTP 200，`Set-Cookie` 含 `recon_session`。

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/auth apps/web/src/middleware.ts
git commit -m "feat(web): 实现登录、登出与受保护路径中间件"
```

---

### Task 9: 分类 REST API（完整文件）

**Files:**

- Create: `apps/web/src/app/api/categories/route.ts`
- Create: `apps/web/src/app/api/categories/[id]/route.ts`

- [ ] **Step 1: `categories/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  desc: z.string().optional(),
});

/**
 * GET /api/categories：列出未删除分类。
 */
export async function GET() {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  const rows = await prisma.category.findMany({
    where: { deleted: false },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items: rows });
}

/**
 * POST /api/categories：创建分类。
 */
export async function POST(req: Request) {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const row = await prisma.category.create({ data: parsed.data });
  return NextResponse.json({ item: row }, { status: 201 });
}
```

- [ ] **Step 2: `categories/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
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

/**
 * GET /api/categories/[id]：获取单条分类（未删除）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const row = await prisma.category.findFirst({
    where: { id, deleted: false },
  });
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item: row });
}

/**
 * PATCH /api/categories/[id]：更新分类。
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const existing = await prisma.category.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  const row = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ item: row });
}

/**
 * DELETE /api/categories/[id]：逻辑删除分类。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.category.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.category.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/categories
git commit -m "feat(web): 实现分类 CRUD API"
```

---

### Task 10: 单位 REST API（独立完整拷贝，模型为 Unit）

**Files:**

- Create: `apps/web/src/app/api/units/route.ts`
- Create: `apps/web/src/app/api/units/[id]/route.ts`

- [ ] **Step 1: 将 Task 9 中 `category`/`Category`/`categories` 全部替换为 `unit`/`Unit`/`units`（含注释中的中文「分类」改为「单位」），写入对应路径。**

具体规则：`prisma.unit`、`/api/units`、`列出未删除单位`、`创建单位` 等。

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/units
git commit -m "feat(web): 实现单位 CRUD API"
```

---

### Task 11: 商品 REST API

**Files:**

- Create: `apps/web/src/app/api/commodities/route.ts`
- Create: `apps/web/src/app/api/commodities/[id]/route.ts`

- [ ] **Step 1: `commodities/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  unitId: z.string().min(1),
  desc: z.string().optional(),
});

async function ensureAuth() {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  return null;
}

/**
 * GET /api/commodities：列出未删除商品（含分类与单位 id）。
 */
export async function GET() {
  const unauthorized = await ensureAuth();
  if (unauthorized) return unauthorized;
  const rows = await prisma.commodity.findMany({
    where: { deleted: false },
    orderBy: { updatedAt: "desc" },
    include: { category: true, unit: true },
  });
  return NextResponse.json({ items: rows });
}

/**
 * POST /api/commodities：创建商品，校验分类与单位存在且未删除。
 */
export async function POST(req: Request) {
  const unauthorized = await ensureAuth();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const { categoryId, unitId, name, desc } = parsed.data;
  const [cat, unit] = await Promise.all([
    prisma.category.findFirst({ where: { id: categoryId, deleted: false } }),
    prisma.unit.findFirst({ where: { id: unitId, deleted: false } }),
  ]);
  if (!cat || !unit) {
    return NextResponse.json(
      { error: "分类或单位不存在或已删除" },
      { status: 400 }
    );
  }
  const row = await prisma.commodity.create({
    data: { name, desc, categoryId, unitId },
    include: { category: true, unit: true },
  });
  return NextResponse.json({ item: row }, { status: 201 });
}
```

- [ ] **Step 2: `commodities/[id]/route.ts`（完整实现）**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  desc: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
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

/**
 * GET /api/commodities/[id]：获取单条商品（未删除）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const row = await prisma.commodity.findFirst({
    where: { id, deleted: false },
    include: { category: true, unit: true },
  });
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item: row });
}

/**
 * PATCH /api/commodities/[id]：更新商品；若改外键则校验分类与单位存在。
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const existing = await prisma.commodity.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const { categoryId, unitId, name, desc } = parsed.data;
  const nextCategoryId = categoryId ?? existing.categoryId;
  const nextUnitId = unitId ?? existing.unitId;
  const [cat, unit] = await Promise.all([
    prisma.category.findFirst({ where: { id: nextCategoryId, deleted: false } }),
    prisma.unit.findFirst({ where: { id: nextUnitId, deleted: false } }),
  ]);
  if (!cat || !unit) {
    return NextResponse.json(
      { error: "分类或单位不存在或已删除" },
      { status: 400 }
    );
  }

  const row = await prisma.commodity.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      desc: desc !== undefined ? desc : existing.desc,
      categoryId: nextCategoryId,
      unitId: nextUnitId,
    },
    include: { category: true, unit: true },
  });
  return NextResponse.json({ item: row });
}

/**
 * DELETE /api/commodities/[id]：逻辑删除商品。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.commodity.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.commodity.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/commodities
git commit -m "feat(web): 实现商品 CRUD API"
```

---

### Task 12: 订单与订单明细 API

**Files:**

- Create: `apps/web/src/app/api/orders/route.ts`
- Create: `apps/web/src/app/api/orders/[id]/route.ts`
- Create: `apps/web/src/app/api/orders/[id]/lines/route.ts`
- Create: `apps/web/src/app/api/order-lines/[id]/route.ts`

- [ ] **Step 1: `orders/route.ts`**

实现：

- `GET`：未删除订单列表 `orderBy: { updatedAt: 'desc' }`
- `POST`：`z.object({ name: z.string().min(1), desc: z.string().optional() })`，`requireUser`，201 返回 `{ item }`

- [ ] **Step 2: `orders/[id]/route.ts`**

实现 `GET`（含 `orderCommodities` 且 `where: { deleted: false }`，commodity `include`）、`PATCH`（name/desc）、`DELETE`（逻辑删订单；**可选**同时将子明细 `deleted: true`，若采用需在代码注释说明行为）。

- [ ] **Step 3: `orders/[id]/lines/route.ts`**

- `GET`：返回该订单下未删除明细列表，**每条记录须包含 Task 14 Step 6 所需字段**；**聚合字段与数值含义以 v1** `v1/ledger-backend/controllers/order_commodity.controller.js` **`findAll` 管道为准**（含 `origin_total_price`、`total_price`、`total_category_price`、`total_order_price` 及嵌套的 `commodity` / `category` / `unit`）。实现可放在 Prisma 查询 + `apps/web/src/lib/order-lines/aggregate.ts` 等模块，**关键步骤中文注释**并注明对应 v1 段。
- `POST`：`commodityId`、`count`（int 正数）、`price`（字符串或 number，用 `z.coerce` + `Decimal` 写入）、`desc` 可选；校验订单与商品存在且未删除

- [ ] **Step 4: `order-lines/[id]/route.ts`**

- `PATCH`：更新 count/price/desc
- `DELETE`：逻辑删除

每个导出函数上方 **中文注释** 说明接口含义（遵守仓库「接口中文注释」约定）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/orders apps/web/src/app/api/order-lines
git commit -m "feat(web): 实现订单与订单明细 API"
```

---

### Task 13: 登录页与 Dashboard 布局

**Files:**

- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/app/(dashboard)/basic/category/page.tsx`（先做一页完整，其它页按同模式复制改文案与 fetch URL）

- [ ] **Step 1: `login/page.tsx` 最小可用**

客户端组件：`useState` 用户名密码，`fetch('/api/auth/login', { method:'POST', ...})`，成功 `window.location.href = '/basic/category'`（或 `searchParams.from`）。

- [ ] **Step 2: `(dashboard)/layout.tsx`**

服务端或客户端：`fetch('/api/auth/me')` 失败则 `redirect('/login')`；展示简单 `nav` 链接到 `/basic/category`、`/basic/unit`、`/basic/commodity`、`/order/list`，以及调用 `/api/auth/logout` 的按钮。

- [ ] **Step 3: `basic/category/page.tsx`**

展示表格 +「新建」表单（name/desc），调用 `/api/categories`；每行提供删除（调用 DELETE）与编辑（可简化为 prompt 或内联表单）。**须含完整 TSX 代码**，不得只有文字说明。

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/login apps/web/src/app/\(dashboard\)
git commit -m "feat(web): 添加登录页与分类管理页骨架"
```

---

### Task 14: 其余业务页面

**相对 v1 的明确修订（以本 Task 为准，覆盖「以 v1 为准」中的表格/金额计算部分之例外）：**

1. **不做条数上限**：不实现 v1 中「超过 50 条」类提示，**不对订单明细条数设限**、不展示任何超额警告。
2. **导出为 Excel 而非图片**：v1 为 `html2canvas` 导出图；v2 改为 **导出 `.xlsx`**，且 **版式与页面列表展示一致**（见 Step 7）。

**Files:**

- Create: `apps/web/src/app/(dashboard)/basic/unit/page.tsx`
- Create: `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`
- Create: `apps/web/src/app/(dashboard)/order/list/page.tsx`
- Create: `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`
- Create（按需拆分）: `apps/web/src/components/order-detail/OrderDetailTable.tsx`（或同目录多个小组件，避免单文件过大）
- Create（按需）: `apps/web/src/lib/order-detail/line-aggregates.ts`（行金额、分类合计、订单合计的纯函数，**中文注释**说明与 v1 对齐）
- Create（推荐）: `apps/web/src/lib/order-detail/export-order-excel.ts`（生成与表格一致的 Excel，**中文注释**说明合并区与标红规则）

- [ ] **Step 1: `unit/page.tsx`**

复制 Task 13 分类页，将 API 前缀改为 `/api/units`，文案改为单位。

- [ ] **Step 2: `commodity/page.tsx`**

表单字段：`name`、`categoryId`（select 来自 GET `/api/categories`）、`unitId`（select 来自 GET `/api/units`）、`desc`；表格展示关联名称（从接口返回的 `include` 取）。

- [ ] **Step 3: `order/list/page.tsx`**

列表 + 创建订单；链接到 `/order/list/[id]`。

- [ ] **Step 4: 订单详情页 — 基础数据与 CRUD 骨架**

路径：`order/list/[id]/page.tsx`。拉取订单头与明细列表；提供「新增/编辑/删除」明细的表单与接口调用（可先使用**无 rowSpan 的简单表格**验证读写闭环）。**依赖**：Task 12 的明细列表 API 在后续 Step 6 前可先返回扁平字段，再升级为聚合字段。

- [ ] **Step 5: 订单详情页 — 表格结构对齐 v1（合并单元格）**

对照 `v1/ledger-frontend/src/pages/order/order-detail/index.tsx` 中 `columns`：**分类**、**分类金额**列按「分类名变化」做 `rowSpan`；**总金额**列仅在首行显示并 `rowSpan = 列表长度**。列顺序与 v1 一致：分类 → 名称 → 数量 → 单位 → 单价 → 金额 → 备注 → 分类金额 → 总金额 → 操作。排序规则对齐 v1 聚合结果（按 `category.name` 排序后再渲染）。将表格抽成独立组件时，**关键 props 与 rowSpan 计算变量用中文注释**。

- [ ] **Step 6: 订单详情页 — 金额取整与标红（以 v1 为准）**

**以后端 v1 聚合结果为真源**：`v1/ledger-backend/controllers/order_commodity.controller.js` 中 `findAll` 对 `total_price`、`origin_total_price` 的定义与计算顺序；前端展示与标红条件 **以 v1 页面为准**：`v1/ledger-frontend/src/pages/order/order-detail/index.tsx` 中金额列 `totalPrice !== record?.origin_total_price` 时 **红色**，否则默认色。v2 应用层用 Prisma/SQL 复现同一数值，**不得**改用其它取整方式或标红规则。

**API 要求**：Task 12 中 `GET /api/orders/[id]/lines`（或等价列表接口）的响应 **必须** 对每一行携带 `total_price` 与 `origin_total_price`（及 `total_category_price`、`total_order_price` 若前端需要），否则前端无法标红与合并列。若 Task 12 已实现但未含字段，在本 Step 中 **回填后端聚合** 再联调。

- [ ] **Step 7: 订单详情页 — 导出 Excel（版式与列表一致）**

在 `apps/web` 安装依赖：推荐 **`exceljs`**（支持合并单元格、单元格字体颜色、列宽），执行 `pnpm add exceljs`。

实现 `export-order-excel.ts`（或由页面调用的同名模块），在客户端或服务端生成工作簿并触发下载（若用服务端 Route Handler 导出，须为下载接口写 **中文注释**）。**必须与当前页面表格使用同一套数据源与列顺序**（不含「操作」列），并满足：

| 要求 | 说明 |
|------|------|
| **标题区** | 表头上方有 **标题**（如订单名称或「订单明细」+ 订单名），可与页面 Card/页眉信息一致；可选一行备注/订单描述。 |
| **列与表头** | 与 Step 5 表格一致：分类 → 名称 → 数量 → 单位 → 单价 → 金额 → 备注 → 分类金额 → 总金额（无操作列）。 |
| **金额标红** | 当 **`total_price !== origin_total_price`** 时，该格 **字体色为红**（与页面金额列逻辑一致）。 |
| **合并单元格** | **分类**、**分类金额** 按分类分组与页面 `rowSpan` 规则一致；**总金额** 仅在首行数据行显示并纵向合并覆盖全部明细行（与页面一致）。 |
| **任意条数** | 不假设行数上限；合并与样式算法须对任意 N 行可运行。 |

页面上提供「导出 Excel」按钮，文件名建议含订单 id 或名称。**关键步骤中文注释**；可抽复用函数：根据行数据计算每列 `rowSpan` 映射，避免与 UI 逻辑漂移（优先与 `OrderDetailTable` 共用同一聚合数据结构）。

- [ ] **Step 8: 订单详情页 — 其它交互（按需）**

若仍需「打印」「复制」等与 v1 对齐的能力，在此 Step **逐项列子任务**；若无，标记 **跳过**。

- [ ] **Step 9: 根页面重定向**

修改 `apps/web/src/app/page.tsx` 为 `redirect('/basic/category')` 或 `redirect('/login')`（择一并在 **中文注释** 说明策略）。

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app apps/web/src/components apps/web/src/lib
git commit -m "feat(web): 完成单位、商品与订单详情（含表格与 Excel 导出）"
```

---

### Task 15: Vitest 集成与 API 测试

**Files:**

- Create: `apps/web/vitest.config.ts`（含 `globalSetup` / `globalTeardown`，见 Step 2 完整示例）
- Create: `apps/web/src/test/global-setup.ts`
- Create: `apps/web/src/test/global-teardown.ts`
- Create: `apps/web/src/test/http-client.ts`（可选但推荐：Cookie 复用）
- Create: `apps/web/src/test/setup.ts`（如需要）
- Create: `apps/web/src/test/api/auth.test.ts`
- Create: `apps/web/src/test/api/categories.test.ts`

- [ ] **Step 1: 初建 `vitest.config.ts`**

先写入仅含 `environment`、`include`、`resolve.alias` 的配置；**在 Step 2 完成后**合并为下列**完整**配置（勿遗漏 `alias`）：

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    globalTeardown: ["./src/test/global-teardown.ts"],
    testTimeout: 60000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: API 测试策略 — 固定采用方案 A**

使用 **Vitest `globalSetup` + `globalTeardown`**：在随机端口 **`spawn`** 子进程运行 `pnpm exec next dev -p <port>`（`cwd` 为 `apps/web`），将 `http://127.0.0.1:<port>` 写入 `process.env.TEST_BASE_URL`（或写入临时文件供 teardown 读）；所有集成测试用 **原生 `fetch(TEST_BASE_URL + '/api/...')`**。teardown 中 **kill** 子进程树并清理环境变量。

**实现要点（须完整落地，不得仅描述）：**

1. 创建 `apps/web/src/test/global-setup.ts`：导出 `async function setup()`，内部 `import { spawn } from 'node:child_process'`、`import { fileURLToPath } from 'node:url'` 等；选端口可用 `get-port` 包或 `0` 让 OS 分配（若 Next 不支持随机端口则固定 `3100`+冲突重试）；**轮询** `fetch(TEST_BASE_URL)` 直至返回 200 或超时（如 60s）。
2. 创建 `apps/web/src/test/global-teardown.ts`：保存 `globalThis.__RECON_TEST_SERVER__` 上的 `ChildProcess`，`kill('SIGTERM')`，必要时 `SIGKILL`。
3. 将 `vitest.config.ts` 更新为 **Step 1 块中的完整版本**（`globalSetup` / `globalTeardown` / `testTimeout` 与 `alias` 同时存在）。

4. **Cookie 与会话**：`login` 成功后集成测试须在后续 `fetch` 传入 `headers: { Cookie: setCookieHeader }`（从 `login` 响应头解析），或封装 `apps/web/src/test/http-client.ts`（**中文注释**各函数职责）。

**本计划要求实现的用例文件：**

- `auth.test.ts`：`POST /api/auth/login` 错误密码 **401**；正确密码 **200** 且 `Set-Cookie` 存在。
- `categories.test.ts`：未带 Cookie 的 `GET /api/categories` **401**；带登录 Cookie 的 `GET /api/categories` **200** 且 `items` 为数组。

Run（在仓库根）:

```powershell
pnpm --filter web test
```

Expected: 全局启动仅一次，用例 PASS，进程退出后无残留 `node` 监听测试端口。

- [ ] **Step 3: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/src/test
git commit -m "test(web): 添加 Vitest 与 API 集成测试（方案A）"
```

---

### Task 16: Playwright E2E

**Files:**

- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/smoke.spec.ts`

- [ ] **Step 1: `playwright.config.ts`**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3000" },
  webServer: {
    command: "pnpm dev",
    cwd: __dirname,
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: `e2e/smoke.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("登录后可访问分类页并点击新建", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin123");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL("**/basic/category**");
  await expect(page.getByRole("heading", { name: "分类" })).toBeVisible();
  await page.getByRole("button", { name: "新建" }).click();
});
```

（若页面未使用 `getByLabel`，改为 `getByPlaceholder` 或 `locator('input[name=username]')` —— **实现页面时必须为登录表单设置 `aria-label` 或 `name` 属性以匹配本用例**。）

- [ ] **Step 3: 运行**

Run:

```powershell
pnpm --filter web test:e2e
```

Expected: 1 passed（或随扩展用例增加）。

- [ ] **Step 4: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e
git commit -m "test(web): 添加 Playwright 冒烟用例"
```

---

### Task 17: 文档同步

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`（若命令/目录变化）

- [ ] **Step 1: 更新 `README.md`**

增加小节：**环境准备**（Docker Compose、`cp .env.example apps/web/.env`）、**数据库**（`pnpm db:migrate`、`pnpm db:seed`）、**开发**（`pnpm dev`）、**测试**（`pnpm test`、`pnpm test:e2e`）、**默认账号**（`admin` / `admin123` 来自 seed —— 生产须修改）。

- [ ] **Step 2: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: 同步 v2 开发与测试说明"
```

---

## Self-Review（计划自检）

**1. Spec coverage**

| 规格能力 | 对应任务 |
|----------|----------|
| admin-authentication（登录/未授权/登出） | Task 7–8、13、15–16 |
| master-data（分类/单位/商品与约束） | Task 4、9–11、13–14 |
| sales-orders（订单与明细） | Task 4、12、14（表格/金额以 v1 为准；**条数不限**、**Excel 导出** 见 Task 14 修订说明） |
| automated-acceptance（API+E2E+文档） | Task 15–17（API 测试固定方案 A） |

**2. Placeholder 扫描**

- Task 11 Step 2 已包含 `commodities/[id]/route.ts` 全文。
- Task 12 订单相关四个路由文件步骤为纲要级；**执行时**须按纲要写出可编译的完整 `route.ts`；`GET .../lines` **必须**实现 Step 3 所列聚合字段，以支撑 Task 14 金额标红与合并列。
- Task 14 Step 7：Excel 合并与标红须与页面表格一致；Step 8 其它交互无则跳过。

**3. Type consistency**

- Prisma 模型 `OrderCommodity.price` 为 `Decimal`；API 层使用 `Prisma.Decimal` 或 `String` 传输时需与前端表单 `parseFloat` 一致，**全仓统一一种序列化方式**（建议在 API 返回 `price` 的字符串形式）。**金额展示与聚合仍以 v1 行为为准**，类型仅服务于精确计算与传输。

---

## 执行交接

**计划文件：** `docs/superpowers/plans/2026-04-08-refactor-system-v2.md`

**已选定执行方式：Subagent-Driven（子代理驱动）**

- **节奏**：按 Task 1 → 17 **顺序**执行；每个 Task 由**独立上下文的实现方**完成实现与自测后，再经 **规格对照审查**（OpenSpec `refactor-system-v2` 下相关 `spec.md`）与 **代码质量审查**，通过后勾选该 Task，**再进入下一 Task**。
- **禁止**：并行派发多个「实现类」子代理改同一仓库（避免冲突）；在审查未通过前进入下一 Task。
- **备选**：若需改为单会话连续实现，改用 **Inline Execution**（`executing-plans`），须重新约定检查点。

**协调者（主会话）职责**：从本计划复制当前 Task 的全文与依赖文件路径给实现方；收集审查结论并决定是否返工。
