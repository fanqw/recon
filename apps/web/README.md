This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 开发与数据库（recon）

- **Prisma Client 与 `pnpm dev` 并发（尤其 Windows）**：修改 `prisma/schema.prisma` 或执行迁移后，若开发服务正在运行，直接在同一目录执行 `pnpm exec prisma generate` 可能因文件被占用报错（如 `EPERM`）。请先**停止** `pnpm dev`，再执行 `pnpm exec prisma generate`，然后重新启动开发服务。
- **主数据名称校验范围**：分类/单位/商品的 `trim` 与非空规则以当前实现的 API 与订单详情页「新增明细」表单为准；若后续增加独立主数据管理页，应复用相同校验逻辑以保持行为一致。

## API 与测试（recon）

- **订单明细列表 JSON**：行内持久化金额字段为 **`line_total`**（snake_case），舍入基准为 **`total_price`**；详见仓库根目录 `openspec/specs/sales-orders/spec.md` 中「明细列表 JSON 键名与行金额语义」。
- **Vitest（`src/**/*.test.ts`）**：集成用例会访问真实 HTTP（`src/test/api/business-flow.test.ts` 等）。**自启 `next dev` 时**（未探测到可复用的 `localhost:3000`）：全局 setup 会注入默认 `DATABASE_URL`（与仓库根 `docker-compose.yml` 中 postgres 一致）、默认 `SESSION_SECRET`（仅测试子进程），并依次执行 **`prisma migrate deploy`** 与 **`prisma db seed`**；请先 **`docker compose up -d postgres`**（或自备可达的 Postgres）。环境变量模板见 **`.env.example`**。**复用已有 dev** 时可设 **`RECON_TEST_BASE_URL`**（如 `http://localhost:3000`），此时不会自动迁移/种子，须自行保证库与 admin 账号可用。登录 **500** 多为数据库不可达或未迁移。

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)

## Deploy on Vercel

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
