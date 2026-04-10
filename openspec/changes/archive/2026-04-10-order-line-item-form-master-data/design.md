## Context

**以下为变更前基线**（描述的是引入本变更之前 v2 的状态，供与下文 Goals/Decisions 对照；**合入后的权威叙述**见仓库根目录 `openspec/specs/sales-orders/spec.md`。）

v2 当前 `OrderCommodity` 仅存 `price`（单价）、`count`，行展示金额由 `aggregateOrderLinesForUi` 用单价×数量推导 `total_price`（四舍五入到整数）与 `origin_total_price`（不四舍五入）；标红依赖二者不等。新建明细 API 仅接受已有 `commodityId`。本变更引入持久化 **`lineTotal`**（行展示/合计用金额），标红改为 **`lineTotal` 与由单价×数量按现有规则算出的 `total_price`（舍入基准）是否一致**；不增加独立的 `amountAdjusted` 字段。

## Goals / Non-Goals

**Goals:**

- 三个可搜索下拉（商品、分类、单位），选商品后带出默认分类与单位。
- 无完全匹配时首项提供「使用当前输入」类选项；提交时服务端顺序：分类 → 单位 → 商品 → 订单行，且复用已存在主数据。
- 持久化 **`lineTotal`**：默认值与 `total_price`（`lineRoundedTotal(price, count)`）一致；用户手动修改时**按提交值原样持久化、不做舍入**。
- 列表/导出标红：**`lineTotal` ≠ `total_price`（舍入基准）** 时标红。
- **分类合计、订单总合计**均对各行 **`lineTotal` 求和**。
- 主数据 **name**：**前端**在提交前 **`trim()`**，**trim 后为空**须在**页面上提示**并**拦截提交**；**后端**对同一字段 **`trim()` 后再次校验非空**，为空则 **400** 且不落库。**未删除**数据上：分类、单位的 **name** 各自全局唯一；商品的 **(trim 后 name, category_id, unit_id)** 三元组唯一（部分唯一索引 `WHERE deleted = false`）。

**Non-Goals:**

- 不为历史订单行做 `lineTotal` 回填或兼容迁移（**旧数据不考虑**，按新环境或后续手工处理）。
- 不要求与 v1 Mongo 字段语义逐字一致（响应可仍带 `origin_total_price` 等作参考，但标红不依赖其与 `total_price` 的比较）。

## Decisions

1. **数据模型（订单行）**  
   - 仅增加持久化 **`lineTotal`**（`Decimal`，精度与单价字段协调，允许小数以承载手动录入）。  
   - **不增加 `amountAdjusted`**。展示层/API 层用 **`total_price` = `lineRoundedTotal(price, count)`**（与现有聚合函数一致）作为舍入基准；**`lineTotal === total_price`（数值相等判定规则在实现中固定，如 Decimal 比较）则视为未标红，否则标红**。

2. **默认与手动行金额**  
   - 新建/未改场景：服务端将 `lineTotal` 设为与 `total_price` 相同（同一舍入规则）。  
   - 用户手动修改：客户端提交的值经 `trim`（若经字符串）、服务端校验后**原样写入 `lineTotal`**，**不再对该字段做舍入**。

3. **聚合与列表 API**  
   - `total_category_price`、`total_order_price` **对各行 `lineTotal` 求和**（不再用舍入后的 `total_price` 列参与合计，除非与 `lineTotal` 在默认情况下相同）。  
   - 每行响应同时给出 **`lineTotal`**（或映射名）与 **`total_price`（舍入基准）**，供前端判断标红：`lineTotal !== total_price`。

4. **主数据解析顺序与事务**  
   - 单事务：`resolveOrCreateCategory` → `resolveOrCreateUnit` → `resolveOrCreateCommodity` → `createOrderLine`。  
   - 所有来自请求的名称类字符串在持久化前 **`trim()`**；**trim 后为空**须在后端拒绝（400）；前端须先行拦截并提示。  
   - **分类/单位**：依赖 DB **部分唯一索引** `UNIQUE (name) WHERE deleted = false`。  
   - **商品**：依赖 **`UNIQUE (name, category_id, unit_id) WHERE deleted = false`**；查找 `findFirst` 用 trim 后的 `name` 与 `categoryId`、`unitId` 匹配即可复用。

5. **请求体形状**  
   - 支持 `commodityId` 直连与名称组合模式；**id 优先于名称**；名称路径在入库前 `trim()`。

6. **前端 Combobox**  
   - 异步搜索、首项自由输入；选商品后回填分类与单位；提交前对名称类字段 **`trim()` 与非空校验**，空则提示并禁止提交。

7. **校验分层**  
   - **第一层**：订单明细页、主数据维护页在浏览器侧校验。  
   - **第二层**：对应 Route Handler / 编排函数统一 **`trim()` + 非空**，防止绕过前端。

8. **导出 Excel**  
   - 金额列红色条件：**`lineTotal` 与舍入基准 `total_price` 不一致**（与表格同一判定）。

## Risks / Trade-offs

- **[Risk] 手动 `lineTotal` 带小数 vs 整数展示** → UI 与导出格式统一为固定小数位或按金额惯例展示。  
- **[Risk] 唯一索引与已有脏数据** → 本变更约定**不考虑旧订单行**；若环境内已有重复分类名、单位名或相同三元组商品，迁移前需人工清理。  
- **[Trade-off] 长事务** → 低并发可接受。

## Migration Plan

1. 新增 `OrderCommodity.line_total` 列（**不做**历史行回填，或仅新环境建表自带默认——与「旧数据不考虑」一致时，新列可 `NOT NULL` 并仅对新写入填值，旧行由运维丢弃库或接受约束外数据策略在实现时二选一）。  
2. 对 `Category`、`Unit` 添加 **部分唯一索引**：`UNIQUE (name) WHERE deleted = false`；对 `Commodity` 添加 **`UNIQUE (name, category_id, unit_id) WHERE deleted = false`**（name 以 trim 后值入库）。  
3. 部署应用代码；种子数据采用**真实感业务示例**（如分类「水果」、单位「斤」、商品「苹果」）以便演示——**与唯一索引无绑定**，名称可按场景替换。

## Open Questions

（无；名称唯一范围已定为未删除行。）
