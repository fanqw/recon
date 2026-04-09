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

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)

## Deploy on Vercel

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
