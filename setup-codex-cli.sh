#!/bin/bash
# OpenSpec + Superpowers 融合工作流 - Codex CLI 版一键配置脚本
# 运行方式：在项目根目录执行 bash setup-codex-cli.sh

set -euo pipefail

WORKFLOW_BEGIN="<!-- BEGIN OPENSPEC_SUPERPOWERS_WORKFLOW -->"
WORKFLOW_END="<!-- END OPENSPEC_SUPERPOWERS_WORKFLOW -->"

info() {
    echo "ℹ️  $1"
}

success() {
    echo "✅ $1"
}

warn() {
    echo "⚠️  $1"
}

fail() {
    echo "❌ $1" >&2
    exit 1
}

version_ge() {
    local actual="$1"
    local required="$2"
    printf '%s\n%s\n' "$required" "$actual" | sort -V -C
}

upsert_managed_block() {
    local file="$1"
    local block="$2"
    local tmp_file
    local block_file

    mkdir -p "$(dirname "$file")"
    tmp_file="$(mktemp)"
    block_file="$(mktemp)"
    printf '%s\n' "$block" > "$block_file"

    if [ ! -f "$file" ]; then
        {
            echo "$WORKFLOW_BEGIN"
            cat "$block_file"
            echo "$WORKFLOW_END"
        } > "$file"
        rm -f "$tmp_file" "$block_file"
        return
    fi

    if grep -qF "$WORKFLOW_BEGIN" "$file" && grep -qF "$WORKFLOW_END" "$file"; then
        awk -v begin="$WORKFLOW_BEGIN" -v end="$WORKFLOW_END" -v block_file="$block_file" '
            $0 == begin {
                print begin
                while ((getline line < block_file) > 0) {
                    print line
                }
                close(block_file)
                print end
                in_block = 1
                next
            }
            $0 == end {
                in_block = 0
                next
            }
            !in_block { print }
        ' "$file" > "$tmp_file"
        mv "$tmp_file" "$file"
    else
        {
            cat "$file"
            printf '\n\n%s\n' "$WORKFLOW_BEGIN"
            cat "$block_file"
            echo "$WORKFLOW_END"
        } > "$tmp_file"
        mv "$tmp_file" "$file"
    fi

    rm -f "$block_file"
}

write_prompt() {
    local file="$1"
    local content="$2"

    mkdir -p "$(dirname "$file")"
    printf '%s\n' "$content" > "$file"
    echo "   写入 $file"
}

cat <<'BANNER'
🚀 开始配置 OpenSpec + Superpowers 融合工作流 (Codex CLI 版) ...
BANNER

# 1. 检查 Node.js 和 OpenSpec
if ! command -v node &> /dev/null; then
    fail "Node.js 未安装，请先安装 Node.js (>=20.19.0)"
fi

NODE_VERSION="$(node -v | sed 's/^v//')"
if ! version_ge "$NODE_VERSION" "20.19.0"; then
    fail "Node.js 版本过低：$NODE_VERSION。请升级到 >=20.19.0"
fi

info "安装/更新 OpenSpec CLI latest ..."
npm install -g @fission-ai/openspec@latest
success "OpenSpec CLI 已就绪：$(openspec --version | head -n 1 | tr -d '[:space:]')"

if ! openspec new change --help &> /dev/null; then
    fail "当前 OpenSpec CLI 不支持 'openspec new change'，请运行 npm install -g @fission-ai/openspec@latest"
fi

if ! openspec validate --help &> /dev/null; then
    fail "当前 OpenSpec CLI 不支持 'openspec validate'，请运行 npm install -g @fission-ai/openspec@latest"
fi

# 2. 初始化 OpenSpec（如果已初始化，保留存量）
if [ ! -d "openspec" ]; then
    info "初始化 OpenSpec ..."
    openspec init --tools codex
else
    success "openspec/ 目录已存在，保留存量规范"
fi

# 3. 配置 OpenSpec：禁用 apply 命令（如果当前版本支持 profile 配置）
info "配置 OpenSpec（优先禁用 apply 工作流）..."
if openspec config profile --help &> /dev/null; then
    openspec config profile --workflows-only --no-apply <<< $'\n' 2>/dev/null || warn "请手动检查 openspec/config.yaml 是否禁用了 apply"
else
    warn "当前 OpenSpec CLI 未暴露 config profile 选项，请手动检查 openspec/config.yaml"
fi

# 4. 创建 Codex 配置目录（全局）
info "创建 Codex 全局配置目录 ~/.codex/ ..."
mkdir -p ~/.codex/prompts
mkdir -p ~/.codex/superpowers

# 5. 生成/更新 Codex 全局 instructions.md（幂等 managed block）
info "生成/更新 Codex 全局指令 ~/.codex/instructions.md ..."
GLOBAL_INSTRUCTIONS='## OpenSpec + Superpowers 融合工作流

### 核心原则
1. **单一事实源**：规范、任务和状态集中管理于 `openspec/`，`tasks.md` 是唯一任务清单。
2. **可追溯性**：每个变更必须通过 `proposal.md`、`design.md`、`specs/`、`tasks.md` 串联决策、规格、执行和验证证据。
3. **防漂移**：不得实现 `specs/` 未要求的功能；规格变化后先更新 `tasks.md`，再继续开发。
4. **Superpowers 纪律**：需求澄清、任务原子化、TDD、子代理执行、并行派发、调试、审查和完成前验证必须按对应 Superpowers 技能原则执行。
5. **OpenSpec 底层能力**：创建 change 使用 `openspec new change`，校验使用 `openspec validate`，归档使用 `openspec archive`。
6. **任务勾选**：只自动勾选最深层原子子任务；父任务在 `/workflow:validate` 后确认。
7. **中文文档**：OpenSpec change 工件和 workflow 生成的项目文档必须使用中文编写；仅保留 OpenSpec 解析所必需的英文关键字、命令、代码标识、文件路径和 API 名称。

### Codex workflow 命令
- `/workflow:plan` - 需求澄清并生成 OpenSpec change 工件。
- `/workflow:refine` - 将 `tasks.md` 拆解为可追溯原子子任务。
- `/workflow:develop` - 串行执行原子子任务。
- `/workflow:develop --parallel` - 并行执行无依赖原子子任务。
- `/workflow:validate` - 运行测试、实现一致性检查和 `openspec validate`。
- `/workflow:review` - 发起代码审查。
- `/workflow:review --feedback` - 处理审查反馈。
- `/workflow:debug` - 系统化调试。
- `/workflow:update-tasks` - 规格变化后同步任务清单。
- `/workflow:archive` - 验证后归档变更。

### 禁止事项
- 不要将 `/superpowers:*` 当作 shell 命令；它们是 Codex/Superpowers 技能纪律。'
upsert_managed_block ~/.codex/instructions.md "$GLOBAL_INSTRUCTIONS"

# 6. 生成自定义 /workflow:* 斜杠命令
info "生成自定义斜杠命令到 ~/.codex/prompts/ ..."

write_prompt ~/.codex/prompts/workflow-plan.md '---
description: 需求澄清并生成 OpenSpec change 工件
argument-hint: change-name or requirement description
---

使用 OpenSpec + Superpowers 融合工作流探索需求，并创建或完善一个 change。

**输入**：`/workflow:plan` 后可以是 kebab-case change 名，也可以是自然语言需求描述。

## 工作纪律
- 使用 Superpowers `brainstorming` 的需求澄清原则：先理解目标、范围、约束和成功标准。
- 内置 OpenSpec explore 行为：先探索项目上下文，再生成 OpenSpec 工件；不要新增 `/workflow:explore` 命令。
- Explore 阶段允许读取文件、搜索代码、查看现有 specs/change，禁止写实现代码。
- 需求已经明确时，不要机械追问；直接生成 OpenSpec 工件。
- OpenSpec 是单一事实源，所有输出必须落在 `openspec/changes/<change-name>/`。
- 生成的 proposal、design、specs、tasks 等项目文档必须使用中文；仅保留 OpenSpec 解析所必需的英文关键字、命令、代码标识、文件路径和 API 名称。

## 步骤
1. **Explore 项目上下文**
   - 运行 `openspec list --json` 查看现有 changes/specs。
   - 如果用户提到现有 change，先读取其 `proposal.md`、`design.md`、`specs/`、`tasks.md`。
   - 搜索相关代码、配置、测试和已有规范，形成目标、现状、约束、风险、候选方案和推荐方案。
   - 如果目标、范围或成功标准不清楚，先询问用户；不要跳过关键产品决策。

2. **确定 change 名**
   - 如果输入已是 kebab-case，直接使用。
   - 如果输入是需求描述，派生 kebab-case 名称。
   - 如果名称或目标不明确，先询问用户；不要猜测高风险范围。

3. **创建 OpenSpec change**
   ```bash
   openspec new change "<change-name>"
   ```
   如果 change 已存在，读取现有工件并询问是继续完善还是换名。

4. **读取 artifact 状态**
   ```bash
   openspec status --change "<change-name>" --json
   ```
   解析 ready artifacts、依赖关系和实现前置要求。

5. **按 OpenSpec instructions 生成工件**
   对每个 ready artifact 执行：
   ```bash
   openspec instructions <artifact-id> --change "<change-name>" --json
   ```
   使用返回的 template、instruction、context、dependency 文件和 Explore 结论生成目标工件。context/rules 是写作约束，不要原样复制进文件。

6. **循环直到实现前置工件完成**
   每生成一个 artifact 后重新运行：
   ```bash
   openspec status --change "<change-name>" --json
   ```
   直到 proposal/design/specs/tasks 等实现前置工件完成，或遇到需要用户决策的缺口。

## 输出
- change 名和目录。
- 已创建或更新的工件列表。
- 当前 artifact 状态。
- 下一步：`/workflow:refine <change-name>`。'

write_prompt ~/.codex/prompts/workflow-refine.md '---
description: 将 OpenSpec tasks.md 拆解为可追溯原子子任务
argument-hint: change-name
---

细化 `openspec/changes/<change-name>/tasks.md`。

## 工作纪律
- 使用 Superpowers `writing-plans` 的任务粒度原则，但输出直接写回 OpenSpec `tasks.md`。
- `tasks.md` 是唯一任务清单，不创建额外计划文件。
- 原子子任务应为 2-5 分钟可完成，并位于最深层缩进。
- 每个原子子任务必须带规格引用，例如 `[ref: specs/<capability>/spec.md#Requirement]`。

## 步骤
1. 如果未提供 change 名，运行 `openspec list --json` 并让用户选择；不要自动猜测。
2. 读取 `proposal.md`、`design.md`、`specs/` 和 `tasks.md`。
3. 将粗粒度任务拆解为原子子任务，保留父任务作为分组。
4. 确认每个规格需求至少有一个原子任务覆盖。
5. 直接更新 `openspec/changes/<change-name>/tasks.md`。

## 输出
- 拆解摘要。
- 新增、修改、保留的任务数量。
- 下一步：`/workflow:develop <change-name>` 或 `/workflow:develop --parallel <change-name>`。'

write_prompt ~/.codex/prompts/workflow-develop.md '---
description: 串行或并行执行 OpenSpec 原子子任务
argument-hint: [--parallel] change-name
---

执行 `openspec/changes/<change-name>/tasks.md` 中最深层未完成原子子任务。

## 工作纪律
- 默认串行；用户传入 `--parallel` 时才并行。
- 串行模式使用 Superpowers `subagent-driven-development` 原则。
- 并行模式使用 Superpowers `dispatching-parallel-agents` 原则。
- 每个实现任务必须遵循 Superpowers `test-driven-development`：先写失败测试，再写实现，再验证通过。
- 不要实现 `specs/` 未要求的功能。

## 串行步骤
1. 如果未提供 change 名，运行 `openspec list --json` 并让用户选择。
2. 读取 proposal/design/specs/tasks。
3. 深度优先选择最深层第一个 `- [ ]` 原子子任务。
4. 明确该任务的写入范围、验证命令和规格引用。
5. 按 TDD 完成该任务。
6. 任务对应验证通过后，将该原子子任务改为 `- [x]`。
7. 继续下一个原子任务，直到完成或遇到阻塞。

## 并行步骤
1. 分析未完成原子任务之间的依赖和写入范围。
2. 只并行派发无共享写入范围、无顺序依赖的任务。
3. 每个任务包必须声明：任务名、写入边界、依赖、预期产物、验证方式、规格引用。
4. 汇总每个并行任务结果，只有对应验证通过才勾选原子子任务。

## 输出
- 完成的原子任务列表。
- 修改文件摘要。
- 执行过的测试/验证证据。
- 未完成任务或阻塞项。'

write_prompt ~/.codex/prompts/workflow-validate.md '---
description: 验证实现、测试证据和 OpenSpec 工件
argument-hint: change-name
---

验证实现是否符合 OpenSpec 工件，并调用 OpenSpec 底层校验能力。

## 工作纪律
- 使用 Superpowers `verification-before-completion` 原则：没有新鲜测试证据，不得声明完成。
- 继续调用 OpenSpec 底层校验：`openspec validate "<change-name>" --type change --strict`。

## 步骤
1. 如果未提供 change 名，运行 `openspec list --json` 并让用户选择。
2. 读取 `proposal.md`、`design.md`、`specs/`、`tasks.md`。
3. 检查最深层原子子任务完成状态；未完成项列为阻塞。
4. 根据项目实际配置选择测试命令，例如 `npm test`、`pytest`、`go test ./...`；无法确定时先说明缺口。
5. 运行新鲜测试并记录结果。
6. 执行：
   ```bash
   openspec validate "<change-name>" --type change --strict
   ```
7. 对照 specs 和实现做一致性检查：需求覆盖、场景覆盖、设计一致性、任务状态。
8. 只有测试和 OpenSpec validate 均通过后，才可建议勾选父任务。

## 输出
- 测试证据。
- `openspec validate` 结果。
- 实现一致性报告。
- 是否可进入 `/workflow:review` 或 `/workflow:archive`。'

write_prompt ~/.codex/prompts/workflow-review.md '---
description: 发起代码审查或处理审查反馈
argument-hint: [--feedback] change-name
---

默认发起代码审查；传入 `--feedback` 时处理审查反馈。

## 默认：发起审查
- 使用 Superpowers `requesting-code-review` 原则。
- 输入必须包含 OpenSpec proposal/design/specs/tasks、关键 diff、测试证据。
- 重点审查：需求覆盖、规格漂移、测试缺口、代码风险、任务状态真实性。

## `--feedback`：处理反馈
- 使用 Superpowers `receiving-code-review` 原则。
- 先理解和验证反馈，不做表演式同意。
- 按 Critical / Important / Minor 分类。
- Critical 和 Important 在继续前修复并重新运行 `/workflow:validate`。
- Minor 可延后，但必须记录理由。

## 输出
- 发起审查时：审查请求摘要和证据链接/文件。
- 处理反馈时：反馈分类、修复摘要、重新验证证据。'

write_prompt ~/.codex/prompts/workflow-debug.md '---
description: 系统化调试并回写规格影响
argument-hint: change-name or issue description
---

使用系统化调试流程处理 bug 或异常行为。

## 工作纪律
- 使用 Superpowers `systematic-debugging` 原则。
- 先收集证据和定位根因，再修复。
- 不要在没有根因证据时猜测式改代码。
- 如果 bug 暴露规格缺口，先更新 `specs/`，再运行 `/workflow:update-tasks`。

## 步骤
1. 收集错误日志、复现步骤、触发条件和影响范围。
2. 查找相似模式和相关代码路径。
3. 提出至少两个可验证假设。
4. 用最小实验验证假设，确定根因。
5. 按 TDD 修复，先添加失败测试或复现用例。
6. 运行相关测试和 `/workflow:validate` 所需检查。
7. 如规格变化，更新 delta specs 并运行 `/workflow:update-tasks`。

## 输出
- 根因证据。
- 修复摘要。
- 测试证据。
- 是否需要规格或任务同步。'

write_prompt ~/.codex/prompts/workflow-update-tasks.md '---
description: 规格变更后同步 OpenSpec tasks.md
argument-hint: change-name
---

根据修改后的 delta specs 更新 `openspec/changes/<change-name>/tasks.md`。

## 工作纪律
- `tasks.md` 是唯一任务清单。
- 新增任务必须保持原子粒度。
- 已完成任务默认保留勾选状态，除非规格变化使其不再满足要求。

## 步骤
1. 如果未提供 change 名，运行 `openspec list --json` 并让用户选择。
2. 读取修改后的 `openspec/changes/<change-name>/specs/`。
3. 读取当前 `tasks.md`。
4. 对比 ADDED/MODIFIED/REMOVED/RENAMED Requirements。
5. 分析现有任务覆盖情况。
6. 新增缺失原子任务为 `- [ ]`，并添加 `[ref: ...]`。
7. 对过期任务标注需要修订，避免静默删除已完成历史。
8. 写回 `tasks.md` 并输出摘要。

## 输出
- 新增任务。
- 修订任务。
- 可能过期的任务。
- 下一步建议。'

write_prompt ~/.codex/prompts/workflow-archive.md '---
description: 验证后归档 OpenSpec change
argument-hint: change-name
---

归档已完成的 OpenSpec change。

## 工作纪律
- 归档前必须完成 `/workflow:validate` 等价检查。
- 使用 OpenSpec 底层归档能力：`openspec archive "<change-name>"`。

## 步骤
1. 如果未提供 change 名，运行 `openspec list --json` 并让用户选择。
2. 执行 `/workflow:validate` 等价检查：测试证据、实现一致性、`openspec validate "<change-name>" --type change --strict`。
3. 验证通过后执行：
   ```bash
   openspec archive "<change-name>"
   ```
4. 输出归档位置和最终状态。

## 输出
- 验证摘要。
- 归档结果。
- 后续清理建议。'

# 7. 安装 Superpowers 技能库（全局，如果已存在则更新）
info "安装/更新 Superpowers 技能库到 ~/.codex/superpowers/ ..."
if [ ! -d ~/.codex/superpowers/.git ]; then
    git clone https://github.com/obra/superpowers.git ~/.codex/superpowers/
    chmod +x ~/.codex/superpowers/.codex/superpowers-codex 2>/dev/null || true
    success "Superpowers 技能库已安装"
else
    success "Superpowers 技能库已存在，执行 git pull 更新..."
    (cd ~/.codex/superpowers && git pull)
fi

# 8. 生成/更新项目级 AGENTS.md（幂等 managed block）
info "生成/更新项目级配置 AGENTS.md ..."
PROJECT_AGENTS="AGENTS.md"
PROJECT_INSTRUCTIONS='## OpenSpec + Superpowers 融合工作流

### 项目特定规则
- OpenSpec 是单一事实源：`openspec/`。
- 当前变更目录：`openspec/changes/<change-name>/`。
- 增量规范目录：`openspec/changes/<change-name>/specs/`。
- 唯一任务清单：`openspec/changes/<change-name>/tasks.md`。
- 归档目录：`openspec/changes/archive/`。
- OpenSpec change 工件和 workflow 生成的项目文档必须使用中文编写；仅保留 OpenSpec 解析所必需的英文关键字、命令、代码标识、文件路径和 API 名称。

### Codex workflow 命令
- `/workflow:plan` - 需求澄清并生成 OpenSpec change 工件。
- `/workflow:refine` - 细化 `tasks.md` 为原子子任务。
- `/workflow:develop` - 串行执行原子子任务。
- `/workflow:develop --parallel` - 并行执行无依赖原子子任务。
- `/workflow:validate` - 测试、实现一致性检查和 `openspec validate`。
- `/workflow:review` - 发起代码审查。
- `/workflow:review --feedback` - 处理审查反馈。
- `/workflow:debug` - 系统化调试。
- `/workflow:update-tasks` - 规格变化后同步任务。
- `/workflow:archive` - 验证后归档。

### 底层 OpenSpec CLI
- `openspec new change <change-name>` - 创建 change。
- `openspec status --change <change-name>` - 查看 artifact 状态。
- `openspec instructions <artifact-id> --change <change-name>` - 获取 artifact 写作指令。
- `openspec validate <change-name> --type change --strict` - 校验 change。
- `openspec archive <change-name>` - 归档 change。

### Superpowers 使用方式
Superpowers 是 Codex workflow 的流程纪律，不是 shell 命令。需要使用对应技能原则：`brainstorming`、`writing-plans`、`test-driven-development`、`subagent-driven-development`、`dispatching-parallel-agents`、`systematic-debugging`、`requesting-code-review`、`receiving-code-review`、`verification-before-completion`。'
upsert_managed_block "$PROJECT_AGENTS" "$PROJECT_INSTRUCTIONS"

# 9. 生成辅助脚本（使用 openspec 原生能力）
info "生成辅助脚本 scripts/new-change.sh ..."
mkdir -p scripts
cat > scripts/new-change.sh <<'EOF_NEW_CHANGE'
#!/bin/bash
# 使用 openspec 原生命令创建新变更
# 用法: bash scripts/new-change.sh [change-name]

set -euo pipefail

if [ -n "${1:-}" ]; then
    CHANGE_NAME="$1"
else
    read -r -p "请输入变更名称 (e.g., refactor-auth): " CHANGE_NAME
fi

if [ -z "$CHANGE_NAME" ]; then
    echo "❌ 变更名称不能为空"
    exit 1
fi

if ! [[ "$CHANGE_NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
    echo "❌ 变更名称必须是 kebab-case slug，仅允许小写字母、数字和连字符，例如 refactor-auth"
    exit 1
fi

if ! command -v openspec &> /dev/null; then
    echo "❌ openspec 命令未找到，请先安装 OpenSpec CLI"
    exit 1
fi

if [ -d "openspec/changes/$CHANGE_NAME" ]; then
    echo "❌ 变更已存在: openspec/changes/$CHANGE_NAME"
    echo "   请继续现有 change，或使用新的 kebab-case 名称。"
    exit 1
fi

openspec new change "$CHANGE_NAME"
echo "✅ 变更目录已创建: openspec/changes/$CHANGE_NAME"
echo "下一步：运行 /workflow:plan $CHANGE_NAME 生成或完善工件"
EOF_NEW_CHANGE
chmod +x scripts/new-change.sh

# 10. 完成
echo ""
success "配置完成！"
echo ""
echo "📖 使用说明："
echo "1. 在终端中运行: codex"
echo "2. 在 Codex 中输入斜杠命令，如: /workflow:plan 我想重构用户认证模块"
echo "3. 快速创建新变更: bash scripts/new-change.sh [change-name]"
echo ""
echo "📁 配置文件位置："
echo "   - 全局指令: ~/.codex/instructions.md"
echo "   - 自定义命令: ~/.codex/prompts/workflow-*.md"
echo "   - 项目配置: AGENTS.md（managed block 幂等更新）"
echo "   - Superpowers 技能: ~/.codex/superpowers/"
echo ""
echo "🚀 开始第一个工作流："
echo "   codex"
echo "   /workflow:plan 帮我重构用户认证模块"
