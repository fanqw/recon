## ADDED Requirements

### Requirement: 自动化测试覆盖导航与面包屑
自动化验收 SHALL 覆盖侧栏结构、侧栏视觉精简、面包屑路径正确性与收起展开行为。

#### Scenario: 面包屑无多余前缀
- **WHEN** E2E 访问主数据与订单页面
- **THEN** 面包屑 SHALL 不出现重复“工作台”前缀

#### Scenario: 侧栏视觉符合精简要求
- **WHEN** E2E 打开任意工作区页面
- **THEN** 侧栏 SHALL 不显示“对账系统”字样与冗余分隔线

### Requirement: 自动化测试覆盖表单与下拉交互
自动化验收 SHALL 覆盖表单 placeholder、备注 Textarea、下拉搜索与直接输入能力。

#### Scenario: 新建商品分类与单位下拉可搜索并可直接输入
- **WHEN** E2E 打开新建商品弹窗并输入关键字
- **THEN** 分类/单位下拉 SHALL 可搜索并可直接使用当前输入

#### Scenario: 新建订单进货地下拉可搜索并可直接输入
- **WHEN** E2E 打开新建订单弹窗并输入关键字
- **THEN** 进货地下拉 SHALL 可搜索并可直接使用当前输入

### Requirement: 自动化测试覆盖订单详情交互细节
自动化验收 SHALL 覆盖订单详情新增商品弹窗字段顺序、总金额计算规则与提示文案调整。

#### Scenario: 新增商品弹窗首行为商品字段
- **WHEN** E2E 打开新增商品弹窗
- **THEN** 商品字段 SHALL 位于首行且文案为“新增商品”

#### Scenario: 总金额规则与提示文案
- **WHEN** E2E 输入数量与单价并观察总金额区域
- **THEN** 总金额 SHALL 按规则计算，且页面 SHALL 不出现“不一致标红”提示

### Requirement: 自动化测试覆盖空状态、登录页与移动端
自动化验收 SHALL 覆盖关键空状态占位图、登录页新版布局，以及移动端/平板关键流程可用性。

#### Scenario: 空状态占位图可见
- **WHEN** E2E 访问空数据页面
- **THEN** 页面 SHALL 展示空状态占位图与引导文案

#### Scenario: MatePad 11 视口关键流程可用
- **WHEN** E2E 以平板视口访问导航、列表、弹窗与订单详情
- **THEN** 核心交互 SHALL 可点击且无关键遮挡
