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
