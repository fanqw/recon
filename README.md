# recon

**recon** 是基于 `v1` 参考实现重构的新一代账务/对账系统（v2）代码库。当前仓库以 `v1/` 作为历史实现对照；v2 在保留既有业务范围的前提下，升级为更易维护、可测试、可容器化交付的现代全栈架构。

## 重构目标

- 以全栈 Web 应用替代 `v1` 的前后端分离实现。
- 在单仓多包结构下统一管理应用、共享代码与工程配置。
- 统一 TypeScript、代码规范、容器化开发与交付流程。
- 逐步迁移 `v1` 现有业务能力，包括登录、分类、单位、商品、进货地、订单、订单明细。

## 仓库结构

当前目录约定如下：

- `v1/`：历史源码，仅用于对照、迁移和需求核对，不再承载长期维护代码。
- `apps/web`：**recon** 全栈 Web 主应用（v2），承载页面路由、服务端接口、鉴权接入与业务编排。
- `packages/shared`：共享类型、常量、工具函数、领域模型约束。
- `packages/config`：共享 ESLint、TypeScript、Prettier、Tailwind 等工程配置。

仓库采用 `pnpm workspace` 组织。除 `v1/`、应用目录和共享包目录外，根目录只保留工作区级配置、Docker 配置、CI 配置和文档。

## 技术栈

| 层级               | 技术                                     |
| ------------------ | ---------------------------------------- |
| 仓库与包管理       | pnpm workspace                           |
| 全栈应用           | Next.js（App Router）、React、TypeScript |
| UI 与客户端状态    | Tailwind CSS、React（组件内 state）、原生 `fetch` |
| 数据访问与基础设施 | Prisma、PostgreSQL、Redis                |
| 代码规范           | ESLint、Prettier                         |
| 本地编排与交付     | Docker、Docker Compose                   |

默认采用单一全栈应用承载页面、服务端逻辑与数据访问编排。仅在出现明确拆分收益时，才新增独立服务或额外包。

## Environment

**recon（v2）** 默认依赖以下基础设施：

- PostgreSQL：主业务数据存储。
- Redis：缓存、会话、限流或异步辅助能力。
- Docker Compose：本地开发和 CI/CD 中统一拉起依赖环境。
- 本地环境变量：源模板位于仓库根目录 `.env.example`，请复制到 `apps/web/.env`，并按实际环境补齐 `DATABASE_URL`、`REDIS_URL` 和 `SESSION_SECRET`。

后续新增环境变量、镜像标签、服务端口、数据卷或初始化脚本时，必须同步更新本文档。

## 环境准备与常用命令

1. **依赖服务**：在仓库根目录使用 Docker Compose 启动 PostgreSQL / Redis（具体文件以仓库内 `compose` 配置为准）。
2. **应用环境变量**：将仓库根目录 `.env.example` 复制为 `apps/web/.env`，按本地环境填写 `DATABASE_URL`、`SESSION_SECRET`（长度须符合 iron-session 要求，通常不少于 32 字符）等。
3. **数据库**：在仓库根目录依次执行 `pnpm db:migrate`（或等效的 Prisma migrate）、`pnpm db:seed` 写入管理员与语义化中文 mock 数据（会先清空历史业务数据，再写入主数据与订单样例）。
4. **开发**：`pnpm dev` 启动全栈应用（默认由 `apps/web` 提供 Next.js 开发服务器）。
5. **测试**：
   - `pnpm test`：运行 Vitest（含 `src/**/*.test.ts`；API 集成测试会在无可用开发服务时尝试在本机随机端口启动 `next dev`，需可读 `apps/web/.env` 中的 `DATABASE_URL`）。
   - `pnpm test:e2e`：运行 Playwright；首次需在本机执行 `pnpm --filter web exec playwright install chromium`（或 `playwright install`）下载浏览器。
6. **默认账号**：种子数据中的管理员为 **admin** / **admin123**；生产环境务必修改密码或停用该账号。

**Vitest / Playwright 与已运行的 `pnpm dev`：** 默认探测 `http://localhost:3000`（与 Next 开发服务器提示一致）。Vitest 会复用已就绪的开发服务作为 API 测试基址，避免同目录启动第二个 `next dev`（Next 会拒绝多实例）。可通过环境变量 `RECON_TEST_BASE_URL` 指定其他基址。

## 当前业务约束

- 订单创建与更新时 `purchasePlaceId` 必填，且必须指向未删除进货地。
- 进货地在未删除记录范围内满足组合唯一：`进货地(place) + 市场名称(market_name)`。
- 已关联记录不可删除：分类/单位/商品/进货地在被有效业务数据引用时，删除接口返回 `409`。
- 删除拦截使用统一错误码：`CATEGORY_IN_USE`、`UNIT_IN_USE`、`COMMODITY_IN_USE`、`PURCHASE_PLACE_IN_USE`。

## Validation

新增业务逻辑时，应在同一变更或紧密相关的提交中补充测试。测试应覆盖：

- 页面或组件关键交互。
- 服务端业务逻辑与接口行为。
- 数据访问层的核心查询或约束。

测试目录可以放在各包约定位置或统一的 `tests/` 下，但命名应与被测模块保持清晰对应。当前推荐的验证顺序是 `db:generate`、`db:migrate`、`prisma:seed`、`lint`、`test`、`build`，再做浏览器级冒烟。

## v1 与 recon（v2）边界

- `v1` 仅作参考，不继续承载新功能。
- **recon**（v2）的实现、文档、配置、测试和部署方案都应写在新的工作区结构中。
- 从 `v1` 迁移业务时，应优先复用业务语义和数据关系，不直接复制旧实现中的工程结构和历史问题。

## 文档维护

当以下内容发生变化时，必须同步更新 `README.md` 与 `AGENTS.md`：

- 目录结构
- 技术栈
- 环境变量
- 开发、构建、测试、部署命令
- `v1` 与 **recon（v2）** 的边界说明
