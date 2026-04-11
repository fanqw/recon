## ADDED Requirements

### Requirement: 进货地的维护
系统 SHALL 提供进货地（PurchasePlace）的列表展示与创建、读取、更新、删除能力，字段至少包含进货地、市场名称、备注，且删除语义与现有主数据一致（逻辑删除，默认列表过滤已删除记录）。

#### Scenario: 创建并列出进货地
- **WHEN** 已登录管理员创建一条包含进货地与市场名称的记录
- **THEN** 系统 SHALL 成功持久化该记录，且默认列表查询 SHALL 返回该记录及必要字段

#### Scenario: 逻辑删除进货地
- **WHEN** 已登录管理员对某未被未删除订单关联的进货地执行删除（逻辑删除）
- **THEN** 默认列表查询 SHALL 不再包含该记录

### Requirement: 进货地未删除组合唯一冲突的 HTTP 响应
进货地的 **POST** 与 **PATCH** 在写入时 SHALL 以 trim 后字符串参与判重；当违反“未删除记录上的（进货地，市场名称）组合唯一”约束时，系统 SHALL 返回 **409** 及可诊断错误正文。

#### Scenario: 创建重复进货地组合返回 409
- **WHEN** 已存在一条未删除进货地记录，其 trim 后进货地与市场名称与本次请求一致
- **THEN** 系统 SHALL 返回 409，且 SHALL NOT 新建记录

### Requirement: 主数据删除前的未删除关联保护
系统 SHALL 在删除分类、单位、商品、进货地前检查未删除关联记录；若存在未删除关联，系统 MUST 拒绝删除并返回可诊断错误。删除失败响应 MUST 包含稳定错误码枚举，前端 SHALL 基于错误码映射提示“已被关联，无法删除”（或等效文案），不得仅依赖中文消息字符串匹配。

#### Scenario: 分类或单位存在未删除商品关联时删除失败
- **WHEN** 管理员删除某分类或单位，且存在 `deleted=false` 的商品关联该记录
- **THEN** 系统 SHALL 拒绝删除并返回冲突错误

#### Scenario: 商品存在未删除订单明细关联时删除失败
- **WHEN** 管理员删除某商品，且存在 `deleted=false` 的订单明细关联该商品
- **THEN** 系统 SHALL 拒绝删除并返回冲突错误

#### Scenario: 进货地存在未删除订单关联时删除失败
- **WHEN** 管理员删除某进货地，且存在 `deleted=false` 的订单关联该进货地
- **THEN** 系统 SHALL 拒绝删除并返回冲突错误

#### Scenario: 删除失败响应包含错误码枚举
- **WHEN** 管理员删除被未删除记录关联的分类、单位、商品或进货地
- **THEN** 响应体 SHALL 包含稳定错误码（如 `CATEGORY_IN_USE`、`UNIT_IN_USE`、`COMMODITY_IN_USE`、`PURCHASE_PLACE_IN_USE`）以支持前端稳定映射
