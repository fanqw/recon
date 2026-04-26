# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

所有回复必须使用中文。

## 项目概述

**recon** 是账务对账系统 v2，基于 Next.js App Router 的全栈应用，重构自 v1（`v1/` 目录仅供参考，不再维护）。采用 pnpm workspace 单仓多包管理。

## 常用命令

所有命令在 `apps/web/` 下执行，或通过根目录 pnpm workspace 调用：

```bash
# 启动本地依赖（PostgreSQL + Redis）
docker compose up -d

# 安装依赖
pnpm install

# 开发服务
pnpm dev                          # 等价于 pnpm --filter web dev

# 数据库
pnpm db:generate                  # 生成 Prisma client
pnpm db:migrate                   # 执行数据库迁移（开发模式）
pnpm db:seed                      # 重置并填充种子数据

# 代码检查
pnpm lint

# 测试
pnpm test                         # Vitest 单元 + API 集成测试
pnpm test:e2e                     # Playwright E2E 测试

# 生产构建
pnpm build

# 从 v1 MongoDB 导入数据
pnpm --filter web db:import:mongo -- --dump-dir=<path> [--replace]
```

**Vitest 测试说明**：测试默认复用已运行的 `localhost:3000` dev 服务；全局 setup 会自动迁移数据库并执行 seed。每次 `pnpm test` 前确保 dev 服务已启动。

## 架构概览

### 目录结构

```
apps/web/src/
├── app/
│   ├── (dashboard)/          # 鉴权后路由分组
│   │   ├── workspace/        # 数据工作台（ECharts 统计）
│   │   ├── basic/            # 主数据管理：分类/单位/商品/进货地
│   │   └── order/            # 订单管理
│   ├── api/                  # REST API 路由（Next.js Route Handlers）
│   │   ├── auth/             # 登录/登出/当前用户
│   │   ├── categories/ units/ commodities/ purchase-places/  # 主数据 CRUD
│   │   ├── orders/ order-lines/  # 订单 CRUD
│   │   └── analytics/        # 工作台统计端点
│   ├── login/                # 登录页
│   └── middleware.ts         # 会话校验中间件（iron-session）
├── components/               # React 组件（Arco Design + Tailwind）
├── lib/                      # 业务逻辑、Zod schema、Prisma 单例、工具函数
│   ├── prisma.ts             # Prisma client 单例
│   ├── session.ts            # iron-session 配置
│   ├── auth.ts               # 当前用户 / 权限校验
│   ├── forms/                # Zod 校验 schema
│   ├── master-data/          # 主数据下拉选项解析
│   ├── analytics/            # 工作台统计逻辑
│   └── mongo-import/         # v1 MongoDB 数据导入
└── test/                     # Vitest 全局 setup + API 集成测试
```

### 数据流

1. **认证**：`middleware.ts` 校验 iron-session → 未认证重定向 `/login` → POST `/api/auth/login` → 建立会话
2. **主数据**：各资源 CRUD 端点；软删除（`deleted: Boolean`）；已关联记录不可删除，返回 HTTP 409 + 统一错误码（如 `CATEGORY_IN_USE`）
3. **订单**：`Order` → `OrderCommodity`（明细）；`lineTotal = count × price`（Decimal 舍入）；`purchasePlaceId` 必填且须指向未删除进货地；`PurchasePlace` 有订单时无法删除（`onDelete: Restrict`）
4. **工作台**：基于未删除订单 + 未删除明细的 `lineTotal` 汇总，支持分类/商品/进货地/日周月多维度，ECharts 展示

### 关键业务约束

- 接口响应文案统一使用**中文**
- 工作台默认展示近 **30 天**数据；周统计从周一开始
- 删除有关联数据的记录返回 HTTP 409，不做级联删除（订单明细除外）
- 订单删除时递归删除明细

## 技术栈

| 层级 | 技术 |
|------|------|
| 全栈应用 | Next.js 16（App Router）+ React 19 + TypeScript 5 |
| 数据库 | PostgreSQL 16 + Prisma 6 |
| 缓存/会话 | Redis 7 + iron-session 8 |
| UI | Arco Design 2 + Tailwind CSS 4 |
| 图表 | ECharts 6 |
| 校验 | Zod 3 |
| 测试 | Vitest 3 + Playwright 1 |

## Next.js 版本注意事项

**当前版本含破坏性变更**，API、约定和文件结构可能与训练数据不符。修改任何 Next.js 相关代码前，先阅读 `apps/web/node_modules/next/dist/docs/` 中的相关指南，关注 deprecation 提示。

## OpenSpec 工作流

项目使用 OpenSpec 规范驱动开发，规范目录为 `openspec/`：

- 当前变更工件：`openspec/changes/<change-name>/`
- 任务清单：`openspec/changes/<change-name>/tasks.md`
- 归档目录：`openspec/changes/archive/`

Workflow 命令：`/workflow:plan` → `/workflow:refine` → `/workflow:develop` → `/workflow:validate` → `/workflow:archive`

验证通过后，需按 `.cursor/skills/openspec-sync-task-checkboxes/SKILL.md` 更新 `tasks.md` 的勾选状态。

## 提交规范

提交信息使用简体中文、祈使语气，例如：`添加用户模块骨架`、`修复订单删除逻辑`。
