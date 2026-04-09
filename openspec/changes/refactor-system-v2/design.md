# Design：refactor-system-v2

## Context

- **现状**：v1 为 `ledger-backend`（Express + MongoDB/Mongoose + Redis + JWT Cookie）与 `ledger-frontend`（React + React Router + Ant Design）分离部署；领域实体包含用户、分类、单位、商品、订单、订单明细（含数量与单价等），主数据实体普遍支持逻辑删除（`deleted`）与时间戳。
- **目标**：在本 mono-repo 中新建 **recon** 全栈应用（v2），以 TypeScript 统一前后端；数据层改用 **PostgreSQL + Prisma**；**空库**启动，**直接替换** v1，**不**要求 HTTP/API 与 v1 兼容。
- **约束**：业务语义与页面任务与 v1 对齐（见 proposal 与各 `specs/*/spec.md`）；仓库约定见 `AGENTS.md` / `README.md`；需可容器化与可重复测试。

## Goals / Non-Goals

**Goals:**

- 落地 `pnpm workspace`、`apps/web`（Next.js App Router）及必要的共享包（如 `packages/shared`、`packages/config`）。
- 用 Prisma 建模并实现与 v1 对齐的核心关系：商品必须关联分类与单位；订单明细必须关联订单与商品；列表默认排除逻辑删除数据（与 v1 行为一致）。
- 单一 **管理员** 角色：已认证用户具备业务写权限；未认证访问受保护 API 与页面须被拒绝或重定向至登录。
- 提供可脚本化的 **API 测试** 与 **浏览器 E2E**（推荐 Playwright），覆盖登录与主流程，供本地与 CI 执行。
- 提供最小 **seed** 或测试夹具，使空库环境下可演示与可测主流程（管理员账号、可选样例主数据）。

**Non-Goals:**

- 从 v1 MongoDB **迁移**历史数据或双写。
- 复刻 v1 的 REST 路径、响应信封或 JWT 双令牌机制（除非设计明确选择相近方案且仍标记为 v2 内部契约）。
- 多租户、多角色 RBAC（除「未登录 / 已登录管理员」外）、移动端独立客户端。

## Decisions

| 决策 | 选择 | 理由 | 曾考虑方案 |
|------|------|------|------------|
| 全栈宿主 | Next.js App Router（`apps/web`） | 与仓库技术栈约定一致；服务端与 UI 同仓同类型系统 | 保留独立 SPA + BFF |
| 数据库 | PostgreSQL + Prisma Migrate | 与 README 一致；关系型约束利于订单与明细 | 继续 Mongo |
| 会话与鉴权 | 服务端可验证的会话（推荐：**httpOnly Cookie** + 服务端 session 存储或签名的 session token）；Redis 用于 session 或限流等 | 与 README 中 Redis 一致；避免将长期令牌暴露给 JS | 纯 localStorage JWT（放弃，XSS 面更大） |
| API 形态 | Next Route Handlers（`/app/api/...`）或经封装的服务层，**不**对外承诺 v1 兼容 | 直接替换、验收按页面与 spec | 兼容层代理 v1 API |
| 逻辑删除 | Prisma 模型保留 `deleted`/`deletedAt` 等字段，查询默认过滤 | 与 v1 模型一致，便于行为对齐 | 物理删除 |
| 自动化测试 | **Vitest**（或同类）测 API/服务层；**Playwright** 测页面点击与主流程 | 单仓易编排；E2E 满足「按钮可点、流程可走通」 | 仅 Cypress（可等价，但 Playwright 与 TS 集成常见） |
| 测试数据 | E2E 前通过 API 或 `prisma db seed` 准备依赖 | 空库下订单/商品链依赖主数据 | 手写 SQL 夹具 |

## Risks / Trade-offs

- **[Risk] 与 v1 细节行为存在隐性差异（分页、搜索、错误文案）** → **缓解**：实现阶段对照 v1 控制器与页面；spec 中锁定关键场景；E2E 覆盖主路径。
- **[Risk] E2E 在 CI 中不稳定（时序、端口）** → **缓解**：固定 `baseURL`、webServer 启动等待、重试策略；API 测试与 E2E 分层，核心不变量优先 API 断言。
- **[Risk] Prisma 与 Mongo 字段命名习惯不同（snake_case vs camelCase）** → **缓解**：在应用层统一 DTO；数据库列名用迁移明确，文档中说明映射。
- **[Trade-off] 不兼容旧 API** → 外部集成若存在需自行适配；本变更范围内无此类要求。

## Migration Plan

1. 开发环境：Docker Compose 启动 PostgreSQL（及 Redis）；`pnpm install`；`prisma migrate dev`；`prisma db seed`（若启用）。
2. 预发/生产：**空库**执行 `migrate deploy`；部署应用；配置环境变量与密钥；可选一次性创建管理员（seed 或运维脚本）。
3. **回滚**：保留 v1 部署工件直至 v2 冒烟通过；若 v2 失败，切回 v1（本设计不定义双活数据同步）。数据在空库策略下回滚到 v1 需单独评估（非本变更范围）。

## Open Questions

- 管理员账号的**首次创建**方式：仅 seed、仅环境变量引导、还是注册接口（v1 有 register）——需在实现 tasks 阶段与产品确认并写入接口注释与 README。
- v1 列表的 **分页与搜索** 参数是否 1:1 保留，还是采用简化默认值（影响任务粒度与 E2E 数据量）。
