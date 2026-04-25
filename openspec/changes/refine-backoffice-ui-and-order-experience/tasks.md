## 1. 共享表单体验基线

- [x] 1.1 盘点现有表单与必填字段
  - [x] 1.1.1 检查 `apps/web/src/app/login/login-client.tsx` 中用户名、密码字段当前的 `label`、`required` 和错误提示写法，记录需要统一的标签与反馈位置。[ref: specs/form-experience/spec.md#Requirement: 系统表单统一必填字段表达]
  - [x] 1.1.2 检查 `apps/web/src/app/(dashboard)/basic/category/page.tsx`、`apps/web/src/app/(dashboard)/basic/unit/page.tsx`、`apps/web/src/app/(dashboard)/basic/commodity/page.tsx`、`apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx` 中弹窗表单的必填字段和 `Textarea` 用法，确认要复用的字段结构。[ref: specs/master-data/spec.md#Requirement: 主数据表单体验统一]
  - [x] 1.1.3 检查 `apps/web/src/app/(dashboard)/order/list/page.tsx` 与 `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx` 中订单与订单明细表单的必填字段、错误提示状态和提交拦截方式，整理共用约束。[ref: specs/form-experience/spec.md#Requirement: 必填校验反馈在字段上下文内可理解]
- [x] 1.2 抽取共享必填标签与错误提示
  - [x] 1.2.1 新建 `apps/web/src/components/form/RequiredFieldLabel.tsx`，封装“标签文本 + 必填标识”的统一渲染组件。[ref: specs/form-experience/spec.md#Requirement: 系统表单统一必填字段表达]
  - [x] 1.2.2 新建 `apps/web/src/components/form/FieldErrorText.tsx`，封装字段级中文错误文案输出，避免继续依赖浏览器原生气泡提示。[ref: specs/form-experience/spec.md#Requirement: 必填校验反馈在字段上下文内可理解]
  - [x] 1.2.3 在 `apps/web/src/app/globals.css` 中补充共享必填标识与字段错误样式类，保证登录页、弹窗和页面内表单表现一致。[ref: specs/form-experience/spec.md#Requirement: 系统表单统一必填字段表达]
- [x] 1.3 接入登录页表单
  - [x] 1.3.1 修改 `apps/web/src/app/login/login-client.tsx`，用 `RequiredFieldLabel` 替换当前纯文本 `label`，给用户名、密码字段加统一必填标识。[ref: specs/form-experience/spec.md#Requirement: 系统表单统一必填字段表达]
  - [x] 1.3.2 在 `apps/web/src/app/login/login-client.tsx` 中新增本地字段校验状态，提交空用户名或空密码时显示 `FieldErrorText` 中文提示并阻止请求发送。[ref: specs/form-experience/spec.md#Requirement: 必填校验反馈在字段上下文内可理解]
  - [x] 1.3.3 运行 `pnpm exec vitest run src/test/api/auth.test.ts --config vitest.unit.config.ts`，确认登录校验调整未破坏现有登录接口行为。[ref: specs/admin-authentication/spec.md#Requirement: 登录页视觉与布局重构]
- [x] 1.4 接入主数据弹窗表单
  - [x] 1.4.1 修改 `apps/web/src/app/(dashboard)/basic/category/page.tsx` 与 `apps/web/src/app/(dashboard)/basic/unit/page.tsx`，将名称字段与备注字段标签切换到共享组件，并把缺失名称的提示改为字段内中文反馈。[ref: specs/master-data/spec.md#Requirement: 主数据表单体验统一]
  - [x] 1.4.2 修改 `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`，将商品名称、分类、单位字段接入统一必填标签和字段级错误反馈。[ref: specs/master-data/spec.md#Requirement: 主数据表单体验统一]
  - [x] 1.4.3 修改 `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`，将进货地、市场名称字段接入统一必填标签和字段级错误反馈。[ref: specs/master-data/spec.md#Requirement: 主数据表单体验统一]
- [x] 1.5 接入订单相关表单
  - [x] 1.5.1 修改 `apps/web/src/app/(dashboard)/order/list/page.tsx`，将订单名称、进货地字段接入共享必填标签和字段级错误反馈。[ref: specs/form-experience/spec.md#Requirement: 必填校验反馈在字段上下文内可理解]
  - [x] 1.5.2 修改 `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`，将商品、分类、单位、数量、单价、总金额字段接入共享必填标签和字段级错误反馈。[ref: specs/form-experience/spec.md#Requirement: 系统表单统一必填字段表达]
  - [x] 1.5.3 运行 `pnpm --filter web lint`，确认共享表单组件接入后无类型和样式引用错误。[ref: specs/form-experience/spec.md#Requirement: 系统表单统一必填字段表达]

## 2. 登录页与工作区壳层优化

- [x] 2.1 重构登录页视觉布局
  - [x] 2.1.1 检查 `apps/web/src/app/login/page.tsx` 和 `apps/web/src/app/globals.css` 中现有 `login-shell`、`login-hero`、`login-form-panel` 结构，明确需要调整的布局块和类名。[ref: specs/admin-authentication/spec.md#Requirement: 登录页视觉与布局重构]
  - [x] 2.1.2 修改 `apps/web/src/app/login/page.tsx`，重排视觉区与表单区内容结构，补充更明确的采购/台账语义文案层次。[ref: specs/admin-authentication/spec.md#Requirement: 登录页视觉与布局重构]
  - [x] 2.1.3 修改 `apps/web/src/app/globals.css` 中登录页相关样式，让桌面与平板端保持“双区布局但表单优先可见”。[ref: specs/admin-authentication/spec.md#Requirement: 登录页移动端可用性]
- [x] 2.2 调整登录表单区层级
  - [x] 2.2.1 修改 `apps/web/src/app/login/login-client.tsx` 的卡片、标题、按钮与错误区顺序，让表单区成为视觉主焦点。[ref: specs/admin-authentication/spec.md#Requirement: 登录页视觉与布局重构]
  - [x] 2.2.2 在 `apps/web/src/app/globals.css` 中微调登录表单卡片宽度、间距和移动端断点样式，避免表单被视觉区挤压。[ref: specs/admin-authentication/spec.md#Requirement: 登录页移动端可用性]
  - [x] 2.2.3 运行 `pnpm exec playwright test acceptance.spec.ts -g "登录"` 或等效登录用例，确认登录页可交互元素仍可见且可操作。[ref: specs/admin-authentication/spec.md#Requirement: 登录页移动端可用性]
- [x] 2.3 修正侧边栏收起区留白
  - [x] 2.3.1 修改 `apps/web/src/components/dashboard-nav.tsx` 中侧边栏顶部按钮容器的高度、内边距和菜单起始间距，移除收起按钮旁的空白占位。[ref: specs/workspace-navigation/spec.md#Requirement: 侧边栏视觉精简与收起展开]
  - [x] 2.3.2 检查并修改 `apps/web/src/app/globals.css` 或对应壳层样式，保证收起/展开切换时顶部区域和菜单区连续衔接。[ref: specs/workspace-navigation/spec.md#Requirement: 侧边栏视觉精简与收起展开]
  - [x] 2.3.3 运行 `pnpm exec playwright test acceptance.spec.ts -g "工作台导航支持新层级" --browser=webkit`，确认侧栏收起展开后仍可导航。[ref: specs/workspace-navigation/spec.md#Requirement: 侧边栏视觉精简与收起展开]
- [x] 2.4 校正面包屑层级
  - [x] 2.4.1 修改 `apps/web/src/lib/workspace-nav.ts` 的 `getWorkspaceBreadcrumbs` 与 `normalizeWorkspaceBreadcrumbs`，确保物料页、订单列表页、订单详情页的层级映射符合菜单结构。[ref: specs/workspace-navigation/spec.md#Requirement: 面包屑与导航层级一致]
  - [x] 2.4.2 检查 `apps/web/src/components/dashboard-breadcrumb.tsx` 是否需要补充样式或链接行为调整，保证最后一级仅作为当前页展示。[ref: specs/workspace-navigation/spec.md#Requirement: 面包屑与导航层级一致]
  - [x] 2.4.3 运行 `pnpm exec playwright test acceptance.spec.ts -g "工作台导航支持新层级" --browser=webkit`，确认导航和面包屑层级断言仍通过。[ref: specs/workspace-navigation/spec.md#Requirement: 面包屑与导航层级一致]

## 3. 主数据与订单列表页面布局统一

- [x] 3.1 改造商品分类列表页
  - [x] 3.1.1 修改 `apps/web/src/app/(dashboard)/basic/category/page.tsx`，移除 `Card` 标题与 `extra`，新增卡片内部工具条容器。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
  - [x] 3.1.2 在 `apps/web/src/app/(dashboard)/basic/category/page.tsx` 中将搜索框与“新建”按钮放入同一行，并使用 `justify-between` 或等效布局类对齐。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
- [x] 3.2 改造商品单位列表页
  - [x] 3.2.1 修改 `apps/web/src/app/(dashboard)/basic/unit/page.tsx`，移除 `Card` 标题与 `extra`，新增卡片内部工具条容器。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
  - [x] 3.2.2 在 `apps/web/src/app/(dashboard)/basic/unit/page.tsx` 中将搜索框与“新建”按钮放入同一行，并使用 `justify-between` 或等效布局类对齐。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
- [x] 3.3 改造商品信息列表页
  - [x] 3.3.1 修改 `apps/web/src/app/(dashboard)/basic/commodity/page.tsx`，移除 `Card` 标题与 `extra`，新增卡片内部工具条容器。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
  - [x] 3.3.2 在 `apps/web/src/app/(dashboard)/basic/commodity/page.tsx` 中将搜索框与“新建”按钮放入同一行，并检查选择器宽度避免工具条换行失衡。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
- [x] 3.4 改造进货地列表页
  - [x] 3.4.1 修改 `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx`，移除 `Card` 标题与 `extra`，新增卡片内部工具条容器。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
  - [x] 3.4.2 在 `apps/web/src/app/(dashboard)/basic/purchase-place/page.tsx` 中将搜索框与“新建”按钮放入同一行，并保持错误提示出现时工具条仍稳定。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
- [x] 3.5 改造订单列表页工具区与表格容器
  - [x] 3.5.1 修改 `apps/web/src/app/(dashboard)/order/list/page.tsx`，移除页面层重复标题，将搜索框与“新建”按钮放入表格上方同排工具条。[ref: specs/sales-orders/spec.md#Requirement: 订单页列表与详情表格采用稳定容器承载]
  - [x] 3.5.2 在 `apps/web/src/app/(dashboard)/order/list/page.tsx` 中新增承载表格的 `Card` 或等效容器，保证列表表格不直接贴页展示。[ref: specs/sales-orders/spec.md#Requirement: 订单页列表与详情表格采用稳定容器承载]
  - [x] 3.5.3 运行 `pnpm --filter web lint`，确认五个列表页工具条与容器调整后 JSX 结构、样式类和表格 props 无错误。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]

## 4. 订单详情金额规则与页面结构调整

- [x] 4.1 先写失败测试，锁定总金额联动规则
  - [x] 4.1.1 在 `apps/web/src/lib/order-lines/aggregate.test.ts` 或新增更贴近订单详情逻辑的测试文件中补一个“数量与单价变化时默认总金额保留两位小数”的失败用例。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
  - [x] 4.1.2 运行对应测试命令，例如 `pnpm exec vitest run src/lib/order-lines/aggregate.test.ts --config vitest.unit.config.ts`，确认新增断言先失败。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
- [x] 4.2 实现总金额自动计算与手动覆盖
  - [x] 4.2.1 修改 `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`，把 `lineTotalInput` 改为“值 + 是否手动覆盖”的双状态，区分自动联动与手动模式。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
  - [x] 4.2.2 修改 `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx` 中数量、单价和总金额输入的 `onChange` 逻辑，让总金额在未手动覆盖时按 `数量 * 单价` 四舍五入保留最多两位小数。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
  - [x] 4.2.3 修改 `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx` 的新增与编辑提交体，发送用户当前输入的 `lineTotal`，而不是再次强制回算。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
  - [x] 4.2.4 重新运行 `pnpm exec vitest run src/lib/order-lines/aggregate.test.ts --config vitest.unit.config.ts` 或新增测试文件命令，确认总金额规则测试转为通过。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
- [x] 4.3 补充接口与页面回归验证
  - [x] 4.3.1 在 `apps/web/src/test/api/business-flow.test.ts` 或新增 `apps/web/src/test/api/order-lines-line-total.test.ts` 中加入“手动提交 lineTotal 被原样持久化”的 API 断言。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
  - [x] 4.3.2 运行 `pnpm exec vitest run src/test/api/business-flow.test.ts --config vitest.unit.config.ts` 或新增测试文件命令，确认创建/更新订单明细的 lineTotal 契约通过。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
- [x] 4.4 重排订单详情信息区与操作区
  - [x] 4.4.1 修改 `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx`，将返回、导出、新增商品等按钮从信息区移到明细表格上方的独立操作区。[ref: specs/sales-orders/spec.md#Requirement: 订单详情信息区应紧凑化]
  - [x] 4.4.2 在 `apps/web/src/app/(dashboard)/order/list/[id]/page.tsx` 中重排订单名、进货地、备注的展示块，减少顶部垂直占用。[ref: specs/sales-orders/spec.md#Requirement: 订单详情信息区应紧凑化]
  - [x] 4.4.3 用 `Card` 或等效容器包裹 `apps/web/src/components/order-detail/OrderDetailTable.tsx` 的承载区域，保持操作区和表格视觉连续。[ref: specs/sales-orders/spec.md#Requirement: 订单页列表与详情表格采用稳定容器承载]
  - [x] 4.4.4 运行 `pnpm exec playwright test acceptance.spec.ts -g "订单"` 或等效订单详情用例，确认按钮位置调整后主要路径仍可操作。[ref: specs/sales-orders/spec.md#Requirement: 订单详情信息区应紧凑化]

## 5. 真实场景种子数据重建

- [x] 5.1 重写业务样本
  - [x] 5.1.1 检查 `apps/web/prisma/seed.ts` 当前主数据、进货地、订单与明细样本，列出需要替换的自动化测试导向文案和金额分布。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
  - [x] 5.1.2 修改 `apps/web/prisma/seed.ts`，重建更真实的中文分类、单位、商品、进货地数据，确保名称和备注更贴近采购场景。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
  - [x] 5.1.3 修改 `apps/web/prisma/seed.ts`，重建更真实的订单与订单明细样本，覆盖列表页、详情页和工作台可直接联调的连续数据链路。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
- [x] 5.2 验证 seed 重建结果
  - [x] 5.2.1 运行项目约定的 seed 命令（如 `pnpm --filter web db:seed` 或仓库现有等效命令），确认业务数据被清空并重建。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
  - [x] 5.2.2 通过 `pnpm exec vitest run src/test/api/auth.test.ts --config vitest.unit.config.ts` 或手工检查管理员账号流程，确认 seed 后管理员登录仍可用。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
  - [x] 5.2.3 通过工作台、主数据列表、订单列表、订单详情相关测试或手工联调命令，确认新 seed 覆盖主要业务链路。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
- [x] 5.3 清理测试对旧样本的依赖
  - [x] 5.3.1 检查 `apps/web/src/test/**/*.test.ts` 与 `apps/web/e2e/*.spec.ts` 中是否存在旧 seed 文案硬编码，列出需要同步的断言文件。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
  - [x] 5.3.2 修改受影响的测试文件，将断言收敛到新样本名称或更稳定的结构字段上。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
  - [x] 5.3.3 运行受影响测试命令，确认 seed 文案变更不会造成无关失败。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]

## 6. 验证与规格收口

- [x] 6.1 补充前端验收覆盖
  - [x] 6.1.1 修改 `apps/web/e2e/acceptance.spec.ts`，增加登录页重设计后关键可见元素与提交路径的断言。[ref: specs/admin-authentication/spec.md#Requirement: 登录页视觉与布局重构]
  - [x] 6.1.2 修改 `apps/web/e2e/acceptance.spec.ts`，增加侧边栏收起区、面包屑层级、主数据/订单列表工具区布局的验收断言。[ref: specs/workspace-navigation/spec.md#Requirement: 面包屑与导航层级一致]
  - [x] 6.1.3 运行 `pnpm exec playwright test acceptance.spec.ts --browser=webkit` 或当前可用的等效验收命令，确认前端主流程通过。[ref: specs/master-data/spec.md#Requirement: 主数据列表工具区布局统一]
- [x] 6.2 补充总金额相关测试
  - [x] 6.2.1 在订单详情相关单元测试或 API 测试文件中补充“默认联动”和“手动覆盖后保留用户输入”两类断言。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
  - [x] 6.2.2 运行对应 `vitest` 命令，确认总金额逻辑、创建更新请求与标红依据未回归。[ref: specs/sales-orders/spec.md#Requirement: 新建订单明细表单的行金额展示与编辑]
- [x] 6.3 运行最终验证命令
  - [x] 6.3.1 运行 `pnpm --filter web lint`，确认本次页面、组件和种子脚本改动通过静态检查。[ref: specs/form-experience/spec.md#Requirement: 系统表单统一必填字段表达]
  - [x] 6.3.2 运行受影响的 `vitest` 和 `playwright` 命令，确认登录、导航、订单、seed 相关路径通过。[ref: specs/test-fixtures/spec.md#Requirement: 提供可重复的中文语义化测试种子数据]
  - [x] 6.3.3 运行 `openspec validate refine-backoffice-ui-and-order-experience --type change --strict`，确认 change 工件严格校验通过。[ref: specs/workspace-navigation/spec.md#Requirement: 面包屑与导航层级一致]
