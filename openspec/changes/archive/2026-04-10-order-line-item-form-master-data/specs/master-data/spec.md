# master-data（增量）

> **单一真源**：合入后的权威规范见 `openspec/specs/master-data/spec.md`（含 POST/PATCH 唯一冲突 **409** 等）。本文档保留为变更过程中的增量记录。

## ADDED Requirements

### Requirement: 主数据列表的关键字检索（下拉）

分类、单位、商品的列表类接口（或专用轻量检索接口）SHALL 支持按**名称关键字**缩小结果集（匹配规则实现固定并文档化，例如对名称做 trim 后的子串包含），且默认 SHALL 仅返回未逻辑删除的记录，以满足订单明细表单中三个下拉的异步搜索。

#### Scenario: 分类列表支持关键字

- **WHEN** 已登录管理员请求分类列表并传入名称关键字参数
- **THEN** 响应 SHALL 仅包含名称与该关键字规则匹配的未删除分类

#### Scenario: 单位列表支持关键字

- **WHEN** 已登录管理员请求单位列表并传入名称关键字参数
- **THEN** 响应 SHALL 仅包含名称与该关键字规则匹配的未删除单位

#### Scenario: 商品列表支持关键字

- **WHEN** 已登录管理员请求商品列表并传入名称关键字参数
- **THEN** 响应 SHALL 仅包含名称与该关键字规则匹配的未删除商品，且 SHALL 包含其关联分类与单位标识以供表单默认值回填

### Requirement: 主数据写入对 name 的非空校验（前后端）

分类、单位、商品的 **创建与更新**接口（如 **POST** / **PATCH**）SHALL 在服务端对 **name** 执行 **`trim()`**；**trim 后为空** SHALL 返回 **400** 及明确错误信息，**不得**持久化。若存在维护主数据的管理端表单，SHALL 在**提交前**对名称 **`trim()` 并校验非空**，**为空时**在页面上**可见提示**并**拦截提交**（与订单详情新建明细的名称校验交互一致）。

#### Scenario: POST 分类名 trim 后为空被拒绝

- **WHEN** 已登录管理员提交创建分类且 `name` 经 `trim()` 后为空
- **THEN** 系统 SHALL 返回 400（或等价错误响应）且 SHALL NOT 创建分类记录

#### Scenario: POST 单位名 trim 后为空被拒绝

- **WHEN** 已登录管理员提交创建单位且 `name` 经 `trim()` 后为空
- **THEN** 系统 SHALL 返回 400 且 SHALL NOT 创建单位记录

#### Scenario: POST 商品名 trim 后为空被拒绝

- **WHEN** 已登录管理员提交创建商品且 `name` 经 `trim()` 后为空
- **THEN** 系统 SHALL 返回 400 且 SHALL NOT 创建商品记录

### Requirement: 主数据名称 trim 后在未删除数据上的唯一性

**应用层** SHALL 在持久化分类、单位、商品的 **name** 之前执行 **`trim()`**，**trim 后非空校验通过后再**写入；数据库中仅存 **trim 后**的名称，以便唯一约束与业务比较一致。

数据库 SHALL 约束未删除行（`deleted = false`）上的名称唯一性如下：

- **Category**：`name` 在未删除分类中全局唯一（例如 `UNIQUE (name) WHERE deleted = false`）。
- **Unit**：`name` 在未删除单位中全局唯一（同上）。
- **Commodity**：**trim 后的 `name` 与 `category_id`、`unit_id` 三元组**在未删除商品中唯一（例如 `UNIQUE (name, category_id, unit_id) WHERE deleted = false`）。同一分类与单位下不得存在两条 trim 后名称相同的未删除商品；不同分类或不同单位下允许出现相同的 trim 后商品名。

#### Scenario: 无法插入第二条同名未删除分类

- **WHEN** 库中已存在未删除且名称为 N（已为 trim 后值）的分类，编排或管理接口尝试再创建未删除且 trim 后名称仍为 N 的分类
- **THEN** 数据库或应用层约束 SHALL 拒绝重复，且订单行编排路径 SHALL 复用已存在 id 而非再插入

#### Scenario: 无法插入第二条同名未删除单位

- **WHEN** 库中已存在未删除且名称为 U（已为 trim 后值）的单位，编排或管理接口尝试再创建未删除且 trim 后名称仍为 U 的单位
- **THEN** 数据库或应用层约束 SHALL 拒绝重复，且订单行编排路径 SHALL 复用已存在 id 而非再插入

#### Scenario: 无法插入第二条相同三元组的未删除商品

- **WHEN** 库中已存在未删除商品满足 trim 后名称为 Cn、`category_id` 为 Cid、`unit_id` 为 Uid，编排或管理接口尝试再创建满足相同三元组的未删除商品
- **THEN** 数据库或应用层约束 SHALL 拒绝重复，且订单行编排路径 SHALL 复用已存在商品 id 而非再插入

#### Scenario: 入库前 trim 使前后空白不构成另一条「不同名」记录

- **WHEN** 管理接口以带首尾空格的名称提交，与库中已存在记录的 trim 后名称相同且（对商品而言）分类与单位相同
- **THEN** 系统 SHALL 在写入前 trim，唯一约束 SHALL 生效（拒绝重复或走复用路径），不得因仅空白差异而插入第二条等价记录

### Requirement: 分类与单位按名称复用（服务端编排）

在订单行创建等受控服务端流程中，当需要解析**分类名称**或**单位名称**时：SHALL 使用 **trim 后**的名称在未删除记录中查找；若已存在则复用其 id；若不存在则创建仅含该名称（及模型允许的可选字段）的新记录。依赖上述**唯一约束**，不存在多条未删除同名记录。

#### Scenario: 已存在同名分类则复用

- **WHEN** 编排流程需要分类名称 N（已 trim）且库中已有未删除分类名称为 N
- **THEN** SHALL 使用该分类的 id，不得新建另一条名称为 N 的分类

#### Scenario: 已存在同名单位则复用

- **WHEN** 编排流程需要单位名称 U（已 trim）且库中已有未删除单位名称为 U
- **THEN** SHALL 使用该单位的 id，不得新建另一条名称为 U 的单位

### Requirement: 商品在自然键下的复用语义

在未删除商品集合中，系统 SHALL 将「**trim 后的名称** + 分类 id + 单位 id」作为定位同一商品的依据：在订单行创建编排中，若已存在满足该三元组相等的未删除商品，SHALL 复用其 id；否则 SHALL 创建新商品。该语义 SHALL 与数据库层 **部分唯一索引**（`name, category_id, unit_id` 且 `deleted = false`）一致。

#### Scenario: 相同名称与分类单位组合不重复创建

- **WHEN** 编排流程需要创建名称为 Cn（已 trim）、分类 id 为 Cid、单位 id 为 Uid 的商品，且已存在未删除商品满足相同三元组
- **THEN** SHALL 返回已存在商品的 id，且不得新增第二条满足相同三元组的商品记录
