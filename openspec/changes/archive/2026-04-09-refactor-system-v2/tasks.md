# Tasks：refactor-system-v2

交付项目名：**recon**（根 `package.json` 的 `name`、Docker/DB 默认名、workspace 包作用域等与文档一致）。

## 1. 工作区与应用骨架

- [x] 1.1 初始化 pnpm workspace（`pnpm-workspace.yaml`、根 `package.json` 脚本占位）
- [x] 1.2 创建 `apps/web`（Next.js App Router + TypeScript + Tailwind 按 README 约定）
- [x] 1.3 创建 `packages/shared`、`packages/config`（或最小占位）并建立 workspace 引用
- [x] 1.4 添加 Docker Compose 与 `.env.example`（PostgreSQL、Redis、`DATABASE_URL`、`REDIS_URL`、会话密钥等）

## 2. 数据模型与种子数据

- [x] 2.1 在 `apps/web` 引入 Prisma，定义 User、Category、Unit、Commodity、Order、OrderCommodity（含逻辑删除与时间戳，关系与 v1 语义对齐）
- [x] 2.2 编写初始迁移并在文档中写明 `db:migrate` / `db:generate` 命令
- [x] 2.3 实现 `prisma db seed`：至少一名可登录管理员；可选最小样例主数据便于演示

## 3. 管理员认证

- [x] 3.1 实现密码哈希与校验（与 v1 算法不必一致，须安全默认）
- [x] 3.2 实现登录、登出及 httpOnly Cookie（或设计文档选定方案）会话
- [x] 3.3 实现受保护 API 的中间件或封装，未认证返回 401/403
- [x] 3.4 实现登录页与 App Router 下的受保护布局/重定向

## 4. 主数据（分类、单位、商品）

- [x] 4.1 实现分类 CRUD API（含逻辑删除）与列表默认过滤
- [x] 4.2 实现单位 CRUD API（同上）
- [x] 4.3 实现商品 CRUD API，校验分类与单位存在性
- [x] 4.4 实现分类、单位、商品页面（列表与表单/操作），与 v1 页面任务对齐

## 5. 订单与订单明细

- [x] 5.1 实现订单 CRUD API（含逻辑删除）
- [x] 5.2 实现订单明细 CRUD API，校验订单与商品存在性，字段含数量与单价
- [x] 5.3 实现订单列表页与订单详情页（含明细展示与维护入口），与 v1 路由任务对齐

## 6. 自动化验收与文档

- [x] 6.1 配置 API 层测试（Vitest 或等价），覆盖未认证拒绝与认证后主流程最小断言
- [x] 6.2 配置 Playwright（或等价 E2E），覆盖登录、导航至各主页面并对主要按钮/表单做可点击与提交断言
- [x] 6.3 在根或 `apps/web` 的 `package.json` 中增加 `test` / `test:e2e` 等脚本，并在 `README.md` 写明环境准备与运行顺序
- [x] 6.4 将本变更涉及的目录、命令、环境变量与 `AGENTS.md` / `README.md` 同步一致
