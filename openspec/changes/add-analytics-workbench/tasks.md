## 1. 统计数据契约

- [x] 1.1 新建 `apps/web/src/lib/analytics/workbench.ts`，定义核心指标、维度聚合、趋势时间桶、筛选条件和响应结构类型。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 1.2 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入默认时间范围测试，断言未传时间范围时使用最近一个月。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 1.3 在 `apps/web/src/lib/analytics/workbench.ts` 实现默认最近一个月时间范围解析，并返回当前生效范围。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 1.4 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入时间粒度校验测试，覆盖 `day`、`week`、`month`、`year` 和非法值回退。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]
- [x] 1.5 在 `apps/web/src/lib/analytics/workbench.ts` 实现时间粒度解析函数，提供稳定默认值。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]

## 2. 金额聚合逻辑

- [x] 2.1 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入核心指标聚合测试，断言总金额、订单数、明细数和平均订单金额均基于 `lineTotal`。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 2.2 在 `apps/web/src/lib/analytics/workbench.ts` 实现核心指标聚合函数，使用 Decimal 或等效精确数值处理后再输出展示数值。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 2.3 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入逻辑删除过滤测试，断言已删除订单和已删除订单明细不参与统计。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 2.4 在 `apps/web/src/lib/analytics/workbench.ts` 实现统计源数据过滤，只保留未删除订单下的未删除明细。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 2.5 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入分类金额聚合测试，断言按分类名称汇总 `lineTotal`。[ref: specs/analytics-workbench/spec.md#Requirement: 按业务维度聚合金额]
- [x] 2.6 在 `apps/web/src/lib/analytics/workbench.ts` 实现分类金额聚合，并按金额降序输出。[ref: specs/analytics-workbench/spec.md#Requirement: 按业务维度聚合金额]
- [x] 2.7 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入商品金额 Top 50 测试，断言超过 50 个商品时只返回金额最高 50 个，不足 50 个时返回全部。[ref: specs/analytics-workbench/spec.md#Requirement: 按业务维度聚合金额]
- [x] 2.8 在 `apps/web/src/lib/analytics/workbench.ts` 实现商品金额聚合和 Top 50 截断规则。[ref: specs/analytics-workbench/spec.md#Requirement: 按业务维度聚合金额]
- [x] 2.9 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入进货地金额聚合测试，断言展示名使用 `进货地 / 市场名称` 并汇总对应订单明细金额。[ref: specs/analytics-workbench/spec.md#Requirement: 按业务维度聚合金额]
- [x] 2.10 在 `apps/web/src/lib/analytics/workbench.ts` 实现进货地/市场名称组合聚合，并按金额降序输出。[ref: specs/analytics-workbench/spec.md#Requirement: 按业务维度聚合金额]

## 3. 时间趋势聚合

- [x] 3.1 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入按天趋势测试，断言同一天订单明细金额进入同一日桶。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]
- [x] 3.2 在 `apps/web/src/lib/analytics/workbench.ts` 实现按天趋势时间桶生成和金额汇总。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]
- [x] 3.3 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入按周趋势测试，断言周桶从周一开始。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]
- [x] 3.4 在 `apps/web/src/lib/analytics/workbench.ts` 实现周一作为起始日的周趋势时间桶生成和金额汇总。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]
- [x] 3.5 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入按月和按年趋势测试，断言跨月、跨年数据进入正确桶。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]
- [x] 3.6 在 `apps/web/src/lib/analytics/workbench.ts` 实现按月和按年趋势时间桶生成和金额汇总。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]
- [x] 3.7 在 `apps/web/src/lib/analytics/workbench.test.ts` 写入空数据趋势测试，断言无匹配数据时返回零值指标和空序列。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 3.8 在 `apps/web/src/lib/analytics/workbench.ts` 实现空数据响应结构，避免复用旧统计结果。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]

## 4. 受保护数据入口

- [x] 4.1 在 `apps/web/src/test/api/analytics-workbench.test.ts` 写入未登录访问 `/api/analytics/workbench` 返回 401 的测试。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 4.2 新建 `apps/web/src/app/api/analytics/workbench/route.ts`，写入鉴权失败返回 401 的最小处理。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 4.3 在 `apps/web/src/app/api/analytics/workbench/route.ts` 接入现有会话鉴权，确保未登录请求返回 401。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 4.4 在 `apps/web/src/test/api/analytics-workbench.test.ts` 写入已登录默认请求测试，断言响应包含最近一个月范围、核心指标、维度聚合和趋势数据字段。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 4.5 在 `apps/web/src/app/api/analytics/workbench/route.ts` 读取查询参数并返回服务端聚合响应。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 4.6 在 `apps/web/src/test/api/analytics-workbench.test.ts` 写入时间范围筛选测试，断言筛选同时影响指标、维度聚合和趋势统计。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 4.7 在 `apps/web/src/app/api/analytics/workbench/route.ts` 将时间范围筛选应用到订单创建时间查询条件。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 4.8 在 `apps/web/src/test/api/analytics-workbench.test.ts` 写入商品 Top 50、分类占比、进货地占比字段的 API 契约断言。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台图表类型覆盖对比、趋势与占比]

## 5. ECharts 与工作台 UI

- [x] 5.1 在 `apps/web/package.json` 增加 ECharts 依赖，并更新锁文件。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台图表类型覆盖对比、趋势与占比]
- [x] 5.2 新建 `apps/web/src/components/analytics/WorkbenchChart.tsx`，封装仅客户端渲染的 ECharts 容器。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台图表类型覆盖对比、趋势与占比]
- [x] 5.3 新建 `apps/web/src/components/analytics/WorkbenchKpis.tsx`，渲染总金额、订单数、明细数和平均订单金额。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 5.4 新建 `apps/web/src/components/analytics/WorkbenchFilters.tsx`，渲染时间范围与 `day/week/month/year` 粒度控件，并显示默认最近一个月范围。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 5.5 新建 `apps/web/src/components/analytics/workbench-options.ts`，生成分类柱形图、商品 Top 50 柱形图和进货地柱形图的 ECharts option。[ref: specs/analytics-workbench/spec.md#Requirement: 按业务维度聚合金额]
- [x] 5.6 在 `apps/web/src/components/analytics/workbench-options.ts` 生成金额趋势折线图的 ECharts option。[ref: specs/analytics-workbench/spec.md#Requirement: 按时间粒度统计金额趋势]
- [x] 5.7 在 `apps/web/src/components/analytics/workbench-options.ts` 生成分类金额占比饼图和进货地金额占比饼图的 ECharts option。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台图表类型覆盖对比、趋势与占比]
- [x] 5.8 新建 `apps/web/src/components/analytics/WorkbenchEmptyState.tsx`，渲染无数据时的零值和说明文案。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 5.9 改造 `apps/web/src/app/(dashboard)/workspace/page.tsx`，加载工作台数据并替换原占位提示。[ref: specs/workspace-navigation/spec.md#Requirement: 工作区侧边栏分组导航]
- [x] 5.10 在 `apps/web/src/app/(dashboard)/workspace/page.tsx` 组合指标卡、筛选器、三张柱形图、一张折线图和两张饼图。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台图表类型覆盖对比、趋势与占比]
- [x] 5.11 在工作台图表区域补充可读标题、金额数值、`aria-label` 或等效辅助文本。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台图表类型覆盖对比、趋势与占比]

## 6. 导航、文档与验收

- [x] 6.1 检查 `apps/web/src/lib/workspace-nav.ts` 中“工作台”入口和面包屑，无需新增占位文案。[ref: specs/workspace-navigation/spec.md#Requirement: 工作区侧边栏分组导航]
- [x] 6.2 在 `apps/web/e2e/acceptance.spec.ts` 增加登录后访问 `/workspace` 的断言，确认不再显示“能力建设中”。[ref: specs/workspace-navigation/spec.md#Requirement: 工作区侧边栏分组导航]
- [x] 6.3 在 `apps/web/e2e/acceptance.spec.ts` 增加工作台可见性断言，覆盖指标区、趋势图、分类饼图和进货地饼图。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台图表类型覆盖对比、趋势与占比]
- [x] 6.4 更新 `README.md` 或 `apps/web/README.md`，记录 ECharts 依赖和工作台默认最近一个月、周一开始的统计口径。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 6.5 运行 `pnpm exec vitest run src/lib/analytics/workbench.test.ts --config vitest.unit.config.ts`，确认统计单元测试通过。[ref: specs/analytics-workbench/spec.md#Requirement: 数据工作台展示核心经营指标]
- [x] 6.6 运行 `pnpm exec vitest run src/test/api/analytics-workbench.test.ts --config vitest.unit.config.ts`，确认 API 集成测试通过。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
- [x] 6.7 运行 `pnpm exec playwright test acceptance.spec.ts -g "工作台导航支持新层级" --browser=webkit`，确认工作台验收路径通过。[ref: specs/workspace-navigation/spec.md#Requirement: 工作区侧边栏分组导航]
- [x] 6.8 运行 `pnpm --filter web lint`，确认新增 ECharts 与工作台代码符合 lint 规则。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台图表类型覆盖对比、趋势与占比]
- [x] 6.9 运行 `openspec validate add-analytics-workbench --type change --strict`，确认 change 工件仍可严格校验。[ref: specs/analytics-workbench/spec.md#Requirement: 工作台支持时间范围筛选与空状态]
