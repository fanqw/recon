## ADDED Requirements

### Requirement: 工作区侧边栏分组导航
系统 SHALL 提供分组式侧边栏导航，信息结构与 v1 对齐，包含：工作台（占位页）、物料管理（商品分类、商品单位、商品信息、进货地）、订单管理（订单列表）。

#### Scenario: 侧边栏按分组显示菜单
- **WHEN** 用户进入已登录工作区任一页面
- **THEN** 系统 SHALL 显示“工作台”“物料管理”“订单管理”分组及其约定子菜单

### Requirement: 侧边栏视觉精简与收起展开
系统 SHALL 支持侧边栏收起/展开；并移除侧边栏顶部“对账系统”字样与无效分隔线。

#### Scenario: 侧栏视觉符合精简要求
- **WHEN** 用户进入工作区
- **THEN** 侧边栏 SHALL 不展示“对账系统”标题与对应分隔线

#### Scenario: 侧栏可收起与展开
- **WHEN** 用户触发收起/展开操作
- **THEN** 侧栏 SHALL 在两种状态间切换并保持可导航

### Requirement: 面包屑与导航层级一致
系统 SHALL 根据当前路由显示与菜单分组一致的面包屑路径，且 MUST 不出现多余“工作台”前缀。

#### Scenario: 访问物料管理页面时面包屑正确
- **WHEN** 用户访问商品分类、商品单位、商品信息或进货地页面
- **THEN** 面包屑 SHALL 显示“工作台 / 物料管理 / 对应页面名”且不重复前缀

#### Scenario: 访问订单列表时面包屑正确
- **WHEN** 用户访问订单列表页面
- **THEN** 面包屑 SHALL 显示“工作台 / 订单管理 / 订单列表”

### Requirement: Header 提供 light/dark 主题切换
系统 SHALL 在 header 提供主题一键切换能力，且仅包含 `light` 与 `dark` 两种主题；切换后刷新页面 MUST 保持上次选择。

#### Scenario: 主题切换后刷新保持
- **WHEN** 用户切换主题并刷新
- **THEN** 系统 SHALL 恢复上次主题状态

### Requirement: 工作区壳层支持移动端可用性
系统 SHALL 在移动端与平板端（含华为 MatePad 11）保持导航与核心页面入口可用。

#### Scenario: MatePad 11 横竖屏导航可用
- **WHEN** 用户在 MatePad 11 横屏或竖屏访问工作区
- **THEN** 侧栏/头部/主内容 SHALL 不遮挡核心操作入口
