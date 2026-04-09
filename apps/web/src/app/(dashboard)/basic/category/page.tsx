"use client";

import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  desc: string | null;
};

/**
 * 分类管理页：列表 CRUD，对接 /api/categories。
 */
export default function CategoryPage() {
  /** 表格数据 */
  const [items, setItems] = useState<Category[]>([]);
  /** 加载列表中 */
  const [loading, setLoading] = useState(true);
  /** 新建/编辑表单名称 */
  const [name, setName] = useState("");
  /** 新建/编辑表单描述 */
  const [desc, setDesc] = useState("");
  /** 正在编辑的分类 id，null 表示新建模式 */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 操作错误提示 */
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: Category[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  /** 提交新建或保存编辑 */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (editingId) {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, desc: desc || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "保存失败");
        return;
      }
    } else {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, desc: desc || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "创建失败");
        return;
      }
    }
    setName("");
    setDesc("");
    setEditingId(null);
    await loadList();
  }

  /** 进入编辑：把行数据填入表单 */
  function startEdit(row: Category) {
    setEditingId(row.id);
    setName(row.name);
    setDesc(row.desc ?? "");
  }

  /** 取消编辑，回到新建模式 */
  function cancelEdit() {
    setEditingId(null);
    setName("");
    setDesc("");
  }

  /** 逻辑删除一行 */
  async function removeRow(id: string) {
    if (!confirm("确定删除该分类？")) return;
    setError(null);
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "删除失败");
      return;
    }
    if (editingId === id) cancelEdit();
    await loadList();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">分类</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          {editingId ? "编辑分类" : "新建分类"}
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名称"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="描述（可选）"
            className="min-w-[200px] flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            {editingId ? "保存" : "新建"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded border border-zinc-300 px-4 py-2 text-sm"
            >
              取消
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-700">名称</th>
              <th className="px-4 py-3 font-medium text-zinc-700">描述</th>
              <th className="px-4 py-3 font-medium text-zinc-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 text-zinc-900">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.desc ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="mr-3 text-blue-600 hover:underline"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeRow(row.id)}
                      className="text-red-600 hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
