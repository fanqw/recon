"use client";

import {
  isDeleteBlockCode,
  messageForDeleteBlockCode,
} from "@/lib/delete-block-codes";
import { useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string };
type Unit = { id: string; name: string };
type Commodity = {
  id: string;
  name: string;
  desc: string | null;
  category: Category;
  unit: Unit;
};

/**
 * 商品管理页：关联分类与单位，对接 /api/commodities。
 */
export default function CommodityPage() {
  const [items, setItems] = useState<Commodity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMasters = useCallback(async () => {
    const [cRes, uRes] = await Promise.all([
      fetch("/api/categories", { credentials: "include" }),
      fetch("/api/units", { credentials: "include" }),
    ]);
    const cData = await cRes.json();
    const uData = await uRes.json();
    if (cRes.ok) {
      setCategories((cData as { items: Category[] }).items ?? []);
    }
    if (uRes.ok) {
      setUnits((uData as { items: Unit[] }).items ?? []);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/commodities", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: Commodity[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId || !unitId) {
      setError("请选择分类与单位");
      return;
    }
    if (editingId) {
      const res = await fetch(`/api/commodities/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          desc: desc || undefined,
          categoryId,
          unitId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "保存失败");
        return;
      }
    } else {
      const res = await fetch("/api/commodities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          desc: desc || undefined,
          categoryId,
          unitId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "创建失败");
        return;
      }
    }
    resetForm();
    await loadList();
  }

  function resetForm() {
    setName("");
    setDesc("");
    setCategoryId("");
    setUnitId("");
    setEditingId(null);
  }

  function startEdit(row: Commodity) {
    setEditingId(row.id);
    setName(row.name);
    setDesc(row.desc ?? "");
    setCategoryId(row.category.id);
    setUnitId(row.unit.id);
  }

  async function removeRow(id: string) {
    if (!confirm("确定删除该商品？")) return;
    setError(null);
    const res = await fetch(`/api/commodities/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const code = (data as { code?: unknown }).code;
      if (isDeleteBlockCode(code)) {
        setError(messageForDeleteBlockCode(code));
      } else {
        setError((data as { error?: string }).error ?? "删除失败");
      }
      return;
    }
    if (editingId === id) resetForm();
    await loadList();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">商品</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          {editingId ? "编辑商品" : "新建商品"}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名称"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          >
            <option value="">选择分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          >
            <option value="">选择单位</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
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
              onClick={resetForm}
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
              <th className="px-4 py-3 font-medium text-zinc-700">分类</th>
              <th className="px-4 py-3 font-medium text-zinc-700">单位</th>
              <th className="px-4 py-3 font-medium text-zinc-700">描述</th>
              <th className="px-4 py-3 font-medium text-zinc-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 text-zinc-900">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.category.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.unit.name}</td>
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
