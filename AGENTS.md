# Repository Guidelines

## 仓库定位与重构目标

本仓库承载 **recon** 项目（对账/账务 **v2**），用于在保留 v1 参考实现的前提下，完成一次完整的技术与架构升级。重构目标包括：

- **替换技术栈**：采用下文约定的现代全栈方案，与 v1 解耦演进。
- **改进架构设计**：在清晰的分层与边界下组织业务与基础设施代码。
- **优化 CI/CD 流程**：以容器化与可重复构建为核心，缩短反馈周期。

## 项目结构与模块组织

- **`v1/`**：v1 历史源码，仅作对照与迁移参考；新功能与长期维护代码不应写在此目录。
- **Mono-repo（单仓多包）**：v2 采用 **pnpm workspace** 管理多个子包。默认以一个全栈 Web 应用为核心，可按需补充共享类型、工具库或基础设施包。根目录保留工作区配置（如 `pnpm-workspace.yaml`）、锁文件 `pnpm-lock.yaml` 以及跨包脚本；各包在约定目录内自洽（常见做法如 `apps/*`、`packages/*`），共享代码通过 workspace 协议引用，避免复制粘贴。
- **根目录**：除 `v1/` 与子包目录外，可放置全仓级配置（ESLint/Prettier、Docker、CI、文档等）。不要把临时文件、一次性样例或无关配置散落在仓库根目录。

新增目录与包名应清晰、稳定，避免 `misc/`、`temp/` 等泛化名称。

推荐目录约定如下：

- **`apps/web`**：全栈 Web 主应用，承载页面路由、服务端接口、鉴权接入与业务编排。
- **`packages/shared`**：共享类型、常量、工具函数、领域模型约束。
- **`packages/config`**（可选）：全仓共享 ESLint、TypeScript、Prettier 或 Tailwind 配置。

## 技术栈约定（v2）

以下为当前已确定的技术选型，后续若有调整应在本文档与 `README.md` 中同步说明。

| 层级               | 技术                                     |
| ------------------ | ---------------------------------------- |
| 仓库与包管理       | pnpm workspace                           |
| 全栈应用           | Next.js（App Router）、React、TypeScript |
| UI 与客户端状态    | Tailwind CSS、React（组件内 state）、原生 `fetch` |
| 数据访问与基础设施 | Prisma、PostgreSQL、Redis                |
| 代码规范           | ESLint、Prettier                         |
| 本地编排与交付     | Docker、Docker Compose                   |

业务代码统一使用 **TypeScript** 编写。默认采用全栈架构：页面渲染、服务端数据获取、后端接口与业务编排尽量在同一应用内完成；仅在存在明确拆分收益时，才新增独立服务包。实现时应保持依赖与运行时版本可复现（`pnpm-lock.yaml`、镜像标签策略等），具体以项目内配置文件为准。

## 构建、测试与开发命令

全仓统一使用 **pnpm** 作为包管理与脚本入口（安装依赖、运行各子包脚本、全仓 lint 等）。工具链落地后，应在 `README.md` 中写明统一入口，例如：

- `pnpm install`：安装工作区依赖；
- `pnpm run <script>` / `pnpm --filter <包名> <命令>`：按包或根脚本执行开发、构建、测试；
- `pnpm --filter web dev`：启动全栈 Web 应用开发环境；
- `pnpm test` / `pnpm --filter web test`：Vitest（单元与 API 集成；配置见 `apps/web/vitest.config.ts`）；
- `pnpm test:e2e` / `pnpm --filter web test:e2e`：Playwright（配置见 `apps/web/playwright.config.ts`）；
- `docker compose up` 等：容器化本地或流水线环境；
- 以及 Prettier / ESLint 的格式化与检查命令。

在尚未写入文档前，贡献者可使用：

- `git status`：查看工作区改动。
- `git log --oneline -n 10`：查看近期提交历史。
- `rg --files`：快速列出仓库文件。

## 编码风格与命名规范

- **格式化与静态检查**：全仓使用 **Prettier** 与 **ESLint**；相关配置须纳入版本控制，并与编辑器/CI 行为一致。
- YAML、JSON、Markdown 使用 2 空格缩进。
- 文档文件名使用小写加连字符，例如 `architecture-notes.md`。

## 测试规范

新增可执行业务逻辑时，应在同一变更或紧密相关的提交中补充测试；建议统一放在 `tests/` 或各包约定目录，命名与被测模块对应。全栈应用中应同时考虑页面/组件、服务端逻辑、数据访问层的测试覆盖。测试框架与运行方式一旦确定，须在 `README.md` 中写明命令与环境要求。

## 提交与合并请求规范

提交信息保持简洁、明确、使用祈使语气（项目约定可使用简体中文），例如 `添加用户模块骨架`、`更新 docker compose 开发配置`。

Pull Request 应至少包含：

- 变更摘要；
- 验证步骤（含本地或容器内如何验证）；
- 相关 issue 链接（如有）；
- 仅在界面变更时附截图。

## OpenSpec 与 Agent 约定

- 在执行 **OpenSpec 变更验证**（项目技能 `openspec-verify-change`，或与 `.cursor/commands/opsx-verify.md` 等价的流程）并得出 **无 CRITICAL** 的结论（Final Assessment 为可归档或「全通过」），或用户**明确确认本次验证通过**之后，助手 **必须先读取** `.cursor/skills/openspec-sync-task-checkboxes/SKILL.md`，再按其中步骤对照 spec 与实现更新 `openspec/changes/<变更名>/tasks.md` 的 `- [x]` 或推迟/不适用说明，避免任务勾选与事实长期脱节。

## 文档维护要求

新增或变更目录结构、环境变量、开发/构建/部署命令时，应同步更新 `README.md`，使新贡献者无需通读源码即可上手。若技术栈、全栈架构边界或 v1 与 recon（v2）边界说明有变，应同时更新本文件。
