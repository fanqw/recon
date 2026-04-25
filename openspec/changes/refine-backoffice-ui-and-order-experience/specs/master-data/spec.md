## MODIFIED Requirements

### Requirement: 主数据表单体验统一

主数据表单 SHALL 提供中文 placeholder；所有备注输入 SHALL 使用 `Textarea` 且 `rows=3`。分类、单位、商品、进货地等表单中的必填字段 MUST 接入统一必填项表达与中文校验反馈，不得仅依赖原生浏览器 `required` 交互。

#### Scenario: 表单 placeholder 与备注控件统一
- **WHEN** 用户打开主数据新建/编辑弹窗
- **THEN** 输入项 SHALL 有中文 placeholder，备注字段 SHALL 为 `Textarea rows=3`

#### Scenario: 必填字段缺失时展示统一反馈
- **WHEN** 用户提交缺失必填字段的主数据表单
- **THEN** 页面 SHALL 以统一样式展示必填标识与中文错误提示，并允许用户在当前弹窗内直接修正

## ADDED Requirements

### Requirement: 主数据列表工具区布局统一

商品分类、商品单位、商品信息、进货地列表页 SHALL 使用统一的工具区结构：页面不再在卡片标题区域重复展示列表标题；“新建”按钮 MUST 放置在卡片内部，并与搜索框处于同一行，整体采用 `space-between` 或等效的左右分布方式。

#### Scenario: 主数据列表页工具区同排展示
- **WHEN** 用户访问商品分类、商品单位、商品信息或进货地列表页
- **THEN** 搜索框与“新建”按钮 SHALL 在卡片内部同排展示，且页面不再额外使用卡片标题重复页面名称
