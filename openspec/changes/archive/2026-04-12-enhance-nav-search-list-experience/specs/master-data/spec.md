## ADDED Requirements

### Requirement: 主数据列表支持关键字搜索
分类、单位、商品、进货地列表 SHALL 支持关键字搜索，并对各自定义字段执行不区分大小写的模糊匹配。

#### Scenario: 分类与单位按名称和备注搜索
- **WHEN** 用户在分类或单位列表输入关键字
- **THEN** 系统 SHALL 在名称与备注字段上执行模糊匹配并返回匹配记录

#### Scenario: 商品按名称分类单位备注搜索
- **WHEN** 用户在商品列表输入关键字
- **THEN** 系统 SHALL 在商品名称、分类名称、单位名称、备注字段上执行模糊匹配并返回匹配记录

#### Scenario: 进货地按名称市场名称备注搜索
- **WHEN** 用户在进货地列表输入关键字
- **THEN** 系统 SHALL 在进货地名称、市场名称、备注字段上执行模糊匹配并返回匹配记录

### Requirement: 主数据列表字段与默认排序统一
分类、单位、商品、进货地列表 SHALL 展示创建时间与更新时间字段，并 MUST 默认按更新时间倒序排列。

#### Scenario: 列表展示创建时间与更新时间
- **WHEN** 列表返回数据
- **THEN** 系统 SHALL 在列表中展示创建时间与更新时间列

### Requirement: 主数据列表文案与操作列规范
主数据列表中原“描述”字段文案 SHALL 统一为“备注”；“操作”列 SHALL 采用紧凑宽度并固定在表格右侧。

#### Scenario: 描述文案统一为备注
- **WHEN** 用户查看主数据列表表头与表单字段
- **THEN** 系统 SHALL 使用“备注”替代“描述”文案

### Requirement: 主数据下拉支持搜索与直接输入
系统中的主数据相关下拉控件 SHALL 支持关键字搜索；在无完全匹配时 SHALL 提供“直接使用当前输入”能力。

#### Scenario: 新建商品时分类与单位可搜索并可直接输入
- **WHEN** 用户在新建商品弹窗输入分类或单位关键字
- **THEN** 下拉 SHALL 支持搜索并允许直接使用当前输入

#### Scenario: 直接输入文案不带“使用”前缀
- **WHEN** 下拉出现直接输入选项
- **THEN** 展示文案 SHALL 为输入值本身（如 `苹果`），而非“使用「苹果」”

### Requirement: 主数据表单体验统一
主数据表单 SHALL 提供中文 placeholder；所有备注输入 SHALL 使用 `Textarea` 且 `rows=3`。

#### Scenario: 表单 placeholder 与备注控件统一
- **WHEN** 用户打开主数据新建/编辑弹窗
- **THEN** 输入项 SHALL 有中文 placeholder，备注字段 SHALL 为 `Textarea rows=3`

### Requirement: 主数据空状态可视化
主数据页面在无数据场景 SHALL 提供空状态占位图与引导文案。

#### Scenario: 无数据时展示空状态
- **WHEN** 列表无任何记录
- **THEN** 页面 SHALL 展示空状态占位图与新增引导文案
