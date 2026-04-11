## MODIFIED Requirements

### Requirement: 订单的维护
系统 SHALL 提供订单（Order）的列表与详情展示，以及创建、读取、更新、删除能力。订单 MUST 包含名称（必填）与进货地关联（`purchasePlaceId`，必填），并可包含可选描述；删除语义与现有实现一致（逻辑删除与默认列表过滤）。

#### Scenario: 创建并列出订单
- **WHEN** 已登录管理员创建一条带名称且提供有效 `purchasePlaceId` 的订单
- **THEN** 订单列表 SHALL 包含该订单，且返回的订单数据 SHALL 包含对应进货地关联信息（至少含进货地标识）

#### Scenario: 缺失进货地关联时创建失败
- **WHEN** 已登录管理员创建订单但未提供 `purchasePlaceId`，或提供不存在/已删除的进货地标识
- **THEN** 系统 SHALL 拒绝该请求并返回可诊断错误（如 400），且不得创建订单

#### Scenario: 查看订单详情
- **WHEN** 已登录管理员请求某存在订单的详情
- **THEN** 系统 SHALL 返回该订单的标识、名称、进货地关联信息及与 v1 对齐的必要字段
