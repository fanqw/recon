---
name: openspec-sync-task-checkboxes
description: After OpenSpec change verification, updates openspec/changes/<change>/tasks.md by marking completed items as [x] against spec and codebase evidence, or annotating deferred/not-applicable items. Use when the user completes /openspec-verify-change, asks to sync task checkboxes, mark tasks done, or align tasks.md with implementation.
license: MIT
compatibility: Works with spec-driven OpenSpec changes that use tasks.md checklists.
metadata:
  author: ledger-v2
  version: "1.0"
---

# OpenSpec：验证后同步 tasks.md 勾选

在 **`/openspec-verify-change` 产出验证结论之后**（或用户明确要求「对照 spec 勾选任务」时），将 `openspec/changes/<name>/tasks.md` 中**已落实**的条目改为 `- [x]`；未落实但有意推迟或不适用的，**保持 `- [ ]` 并在同一行或紧邻处注明原因**（避免 OpenSpec 长期显示「全未完成」或误标完成）。

## 何时使用

- 用户刚跑完验证，并引用「将已完成项改为 `- [x]`」类建议。
- 用户说：同步任务勾选、勾选 tasks、更新 tasks.md、对照 spec 标记完成。
- **本仓库**：`openspec-verify-change` / `/opsx-verify` 在 **无 CRITICAL** 或用户明确确认验证通过后，**必须**先读取本技能再改 `tasks.md`（见根目录 `AGENTS.md`「OpenSpec 与 Agent 约定」）。

## 输入

- **变更名**：若对话已明确（如 `refactor-system-v2`）可直接使用；否则执行 `openspec list --json`，**有多个变更时用 AskQuestion 让用户选**，勿猜测。

## 执行步骤

### 1. 定位制品

```bash
openspec status --change "<name>" --json
openspec instructions apply --change "<name>" --json
```

确认 `tasks.md` 路径（通常在 `openspec/changes/<name>/tasks.md`），并加载对应 `specs/**/*.md`、`design.md`（判断「是否算完成」时对照业务语义）。

### 2. 逐条判定规则（须有据再勾选）

对 `tasks.md` 中**每一条** `- [ ]`：

| 判定 | 操作 |
|------|------|
| 实现与 spec/设计一致，且验收方式满足任务描述（含测试/文档若任务要求） | 改为 `- [x]` |
| 未做或仅部分做 | **保持** `- [ ]` |
| 明确不做 / 由其他变更承接 | 保持 `- [ ]`，在同一行末尾追加 `（不适用：<一句原因>）` 或 `（推迟：<一句原因>）` |

**禁止**：仅凭「推测」或「计划里写过」就打 `[x]`。至少满足一类证据：

- 代码路径存在且行为符合任务与 delta spec（可 `rg`/读文件）。
- 任务要求测试的：对应 `*.test.ts` / `e2e/*.spec.ts` 或文档中的可重复命令已存在。
- 任务要求文档的：`README.md` / `AGENTS.md` 等已包含约定内容。

### 3. 编辑 `tasks.md`

- 仅改勾选与必要附注，**不重写任务编号或大幅改措辞**（保持与 OpenSpec / 计划文档可追溯）。
- 同一批次尽量一次性改完，避免半勾选状态长期停留。
- 若整节均已完成，确保该节所有子项均为 `[x]`，避免漏一条导致验证报告仍报 CRITICAL。

### 4. 自检

- 通读更新后的 `tasks.md`，确认无 `- [x]` 与证据矛盾（例如任务写「E2E」但仓库无对应 spec 路径用例）。
- 可选：`openspec list --json` 或团队惯用命令，确认工具侧进度与勾选意图一致（若 CLI 仍显示 0 complete，以**文件勾选为准**并知会用户可能需 archive/刷新流程）。

### 5. 提交（若用户期望入库）

- 提交信息使用**简体中文**，例如：`docs(openspec): 勾选 refactor-system-v2 已完成任务`。
- 不要顺带修改无关 spec/proposal，除非用户要求。

## 与 `openspec-verify-change` 的配合

- **顺序**：先验证 → 再根据验证报告与本技能**勾选**；不要将「未在验证中讨论过的任务」擅自标完成。
- 若验证报告列出 **CRITICAL「任务未勾选」**，本技能即是对该条建议的**落地动作**。

## 反例

- 为「清零 CRITICAL」而**全部**改为 `[x]`：禁止。
- 未读 `tasks.md` 原文就覆盖文件：禁止。
- 在 `tasks.md` 中删除任务行以隐藏未做项：禁止（应保留并标注推迟/不适用）。

## 摘要清单

- [ ] 已解析变更名（多变更时已由用户选择）
- [ ] 已读 `tasks.md` 与相关 spec 片段
- [ ] 每条 `[x]` 均有代码/测试/文档之一支撑
- [ ] 推迟/不适用已用文字标明，未误标 `[x]`
- [ ] 提交信息为简体中文（若提交）
