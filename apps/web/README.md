# recon web

`apps/web` 是 recon v2 的 Next.js 全栈 Web 应用，使用 App Router、React、TypeScript、Arco Design、Prisma 与 PostgreSQL。

## Getting Started

在仓库根目录安装依赖后，可在 `apps/web` 内运行开发服务：

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

默认管理员账号由 seed 写入：

- 用户名：`admin`
- 密码：`admin123`

## 导航结构与主题

登录后进入工作区壳层，左侧侧边栏采用与 v1 对齐的分组结构：

- **工作台**：`/workspace`，展示基于订单与订单明细的数据统计。
- **物料管理**：商品分类 `/basic/category`、商品单位 `/basic/unit`、商品信息 `/basic/commodity`、进货地 `/basic/purchase-place`。
- **订单管理**：订单列表 `/order/list`，订单详情为 `/order/list/[id]`。

页面顶部会根据当前路由展示面包屑，层级与侧边栏保持一致，例如：

- 商品分类：`工作台 / 物料管理 / 商品分类`
- 商品信息：`工作台 / 物料管理 / 商品信息`
- 订单列表：`工作台 / 订单管理 / 订单列表`
- 订单详情：`工作台 / 订单管理 / 订单列表 / 订单详情`

侧边栏支持收起与展开；收起后保留图标导航与当前激活态，适合高密度列表操作。

Header 提供全局主题切换按钮，仅支持 `light` 与 `dark` 两种主题：

- 当前为浅色时，按钮切换到深色主题；当前为深色时，按钮切换回浅色主题。
- 主题状态写入浏览器 `localStorage` 的 `recon-theme`，刷新页面后保持上次选择。
- 应用通过 `body[arco-theme="light" | "dark"]` 驱动 Arco 与壳层样式。

## 交互规范补充

- 侧栏不展示独立品牌标题块，面包屑仅保留单一「工作台」根层级。
- 工作台默认展示最近一个月数据；金额口径为未删除订单下未删除订单明细的 `line_total` 汇总；周统计从周一开始。
- 工作台图表使用 ECharts，包括总金额趋势、分类/商品/进货地柱形图，以及分类金额占比和进货地金额占比饼图。
- 主数据类下拉支持搜索，并可直接使用当前输入；选项展示为**纯输入文本**（不再使用「使用「…」」包裹样式）。
- 各业务表单的中文 `placeholder` 与场景一致；**备注**字段统一为 `Textarea`，`rows=3`。
- 关键列表无数据时展示占位插图（`/empty-box.svg`）与引导文案；订单详情无明细时同样提供插图与操作引导。

## 移动端支持

- 已为主要断点收紧表格字号、限制弹窗高度，并在 Header 等壳层使用可换行布局，避免挤压主题与账户操作。
- 登录页采用左右（窄屏上下）分栏，突出「采购台账」台账语义。
- 平板与手机端请在真实设备上回归；验收可参考 Playwright 中 **MatePad 11** 视口用例（约 `1600×2560`）。

## 开发与数据库（recon）

- **Prisma Client 与 `pnpm dev` 并发（尤其 Windows）**：修改 `prisma/schema.prisma` 或执行迁移后，若开发服务正在运行，直接在同一目录执行 `pnpm exec prisma generate` 可能因文件被占用报错（如 `EPERM`）。请先**停止** `pnpm dev`，再执行 `pnpm exec prisma generate`，然后重新启动开发服务。
- **主数据名称校验范围**：分类/单位/商品的 `trim` 与非空规则以当前实现的 API 与订单详情页「新增明细」表单为准；若后续增加独立主数据管理页，应复用相同校验逻辑以保持行为一致。

### Seed 重置行为

执行以下命令会重置 Web 应用的业务数据：

```bash
pnpm exec prisma db seed
```

seed 行为：

- 保留并重置管理员账号 `admin / admin123`。
- 删除业务数据后重建基线数据，清理范围包括订单明细、订单、商品、分类、单位与进货地。
- 不用于保留本地临时调试数据；如需保留，请在执行 seed 前自行备份。

### MongoDB 导出数据导入

生产 MongoDB `mongodump` 导出的 `.bson.gz` 文件可通过以下命令导入当前 Prisma/PostgreSQL 数据库：

```bash
pnpm --filter web db:import:mongo -- --dump-dir=/path/to/repository
```

默认行为为追加/幂等导入：保留现有用户，不清空业务表，保留 Mongo `_id` 作为 v2 字符串主键，并跳过已导入过的重复主键。若需要替换当前业务数据但仍保留现有用户，可显式增加 `--replace`：

```bash
pnpm --filter web db:import:mongo -- --replace --dump-dir=/path/to/repository
```

导入脚本会尝试从 v1 订单备注中拆解进货地，例如 `幸福城 25.2.27 洛阳` 会拆为 `进货地=洛阳`、`市场名称=幸福城`；无法拆解时挂到 `历史导入 / 生产 MongoDB 导入`。执行前请确认 `apps/web/.env` 指向正确目标库。生产退款类明细中的负单价/负金额会按原始业务含义保留。

当前中文语义化样本包括：

- 分类：`水果`、`蔬菜`、`副食`、`肉类`（与 OpenSpec 种子约定一致）。
- 单位：`斤`、`件`、`箱`。
- 商品：`苹果`、`生菜`、`米`、`面`、`猪肉`，并关联对应分类与单位。
- 进货地：`武汉 / 中心港市场`、`洛阳 / 宏进市场`。
- 联调订单：`武汉中心港到货单`、`洛阳宏进备货单`，包含可进入详情页查看的订单明细。

## API 与测试（recon）

- **订单明细列表 JSON**：行内持久化金额字段为 **`line_total`**（snake_case），舍入基准为 **`total_price`**；详见仓库根目录 `openspec/specs/sales-orders/spec.md` 中「明细列表 JSON 键名与行金额语义」。
- **Vitest（`src/**/*.test.ts`）**：集成用例会访问真实 HTTP（`src/test/api/business-flow.test.ts` 等）。**自启 `next dev` 时**（未探测到可复用的 `localhost:3000`）：全局 setup 会注入默认 `DATABASE_URL`（与仓库根 `docker-compose.yml` 中 postgres 一致）、默认 `SESSION_SECRET`（仅测试子进程），并依次执行 **`prisma migrate deploy`** 与 **`prisma db seed`**；请先 **`docker compose up -d postgres`**（或自备可达的 Postgres）。环境变量模板见 **`.env.example`**。**复用已有 dev** 时可设 **`RECON_TEST_BASE_URL`**（如 `http://localhost:3000`），此时不会自动迁移/种子，须自行保证库与 admin 账号可用。登录 **500** 多为数据库不可达或未迁移。

常用验证命令：

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)

## Deploy on Vercel

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
