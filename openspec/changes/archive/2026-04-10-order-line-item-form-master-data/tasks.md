## 1. 数据模型与迁移

- [x] 1.1 在 Prisma `OrderCommodity` 上仅增加 `lineTotal`（命名以 schema 为准），编写 migration；**不**做历史行数据回填（与「旧数据不考虑」一致，新列策略在实现中明确：如仅新写入必填或开发库重建）
- [x] 1.2 为 `Category`、`Unit` 添加 **部分唯一索引** `UNIQUE (name) WHERE deleted = false`；为 `Commodity` 添加 **`UNIQUE (name, category_id, unit_id) WHERE deleted = false`**（迁移 SQL；应用层写入 name 前须 **trim()**，库中仅存 trim 后值）

## 2. 主数据 API

- [x] 2.1 为分类/单位/商品列表接口增加名称关键字查询参数（或专用轻量检索路由），仅返回未删除记录；**POST/PATCH** 对 **name** **`trim()` 后非空**二次校验（空则 400）；接口补充中文注释
- [x] 2.2 实现 `resolveOrCreateCategory` / `resolveOrCreateUnit` / `resolveOrCreateCommodity`（事务内、依赖 name 唯一），单测覆盖复用与新建及 trim

## 3. 订单明细 API 与聚合

- [x] 3.1 扩展 `POST /api/order-lines`：支持 `commodityId` 与「名称+分类+单位」组合；名称路径 **`trim()` 后非空**服务端校验；`lineTotal` 默认等于舍入基准，手动值原样持久化；接口补充中文注释
- [x] 3.2 更新 `createOrderCommodityLine` 与 `aggregateOrderLinesForUi`：每行返回 `lineTotal` 与舍入基准 `total_price`；**`total_category_price` / `total_order_price` 对 `lineTotal` 求和**；标红由客户端或文档约定用二者比较
- [x] 3.3 更新订单行修改接口：可更新 `lineTotal`，仍按与舍入基准比较判定标红

## 4. 前端：新建明细表单

- [x] 4.1 实现可搜索 Combobox（商品/分类/单位），防抖请求列表；无完全匹配时在列表首项注入「使用当前输入」；提交前名称 **`trim()` 且非空**，**为空则在页面提示并拦截提交**
- [x] 4.2 选择商品后回填默认分类与单位；三字段均可改选
- [x] 4.3 行金额：默认等于舍入基准；手动修改后提交原样；展示标红预览用 `lineTotal !== total_price`（舍入基准）

## 5. 前端：表格与导出

- [x] 5.1 订单详情明细表「金额」列标红：**`lineTotal` ≠ 舍入基准 `total_price`**
- [x] 5.2 Excel 导出金额列红色规则与上述一致

## 6. 种子与测试

- [x] 6.1 将 `prisma/seed.ts` 等 mock/种子调整为**贴近真实业务场景**的示例（如分类「水果」、单位「斤」、商品「苹果」），便于演示与手工测试；seed 应可重复执行（如 findFirst + create），**与唯一索引无绑定**——唯一性由迁移与业务规则保证，示例名称可替换为其他真实感数据
- [x] 6.2 补充聚合与标红判定单元测试及 order-lines API 集成测试（含 trim、**trim 后空串 400**、唯一冲突、主数据编排）
