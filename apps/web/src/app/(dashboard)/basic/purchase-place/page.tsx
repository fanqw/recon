"use client";

import {
  isDeleteBlockCode,
  messageForDeleteBlockCode,
} from "@/lib/delete-block-codes";
import { useCallback, useEffect, useState } from "react";

type PurchasePlace = {
  id: string;
  place: string;
  marketName: string;
  desc: string | null;
};

export default function PurchasePlacePage() {
  const [items, setItems] = useState<PurchasePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState("");
  const [marketName, setMarketName] = useState("");
  const [desc, setDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase-places", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: PurchasePlace[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { place, marketName, desc: desc || undefined };
    const res = editingId
      ? await fetch(`/api/purchase-places/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      : await fetch("/api/purchase-places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "保存失败");
      return;
    }

    setPlace("");
    setMarketName("");
    setDesc("");
    setEditingId(null);
    await loadList();
  }

  function startEdit(row: PurchasePlace) {
    setEditingId(row.id);
    setPlace(row.place);
    setMarketName(row.marketName);
    setDesc(row.desc ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setPlace("");
    setMarketName("");
    setDesc("");
  }

  async function removeRow(id: string) {
    if (!confirm("确定删除该进货地？")) return;
    setError(null);
    const res = await fetch(`/api/purchase-places/${id}`, {
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
    if (editingId === id) cancelEdit();
    await loadList();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">进货地</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          {editingId ? "编辑进货地" : "新建进货地"}
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="进货地"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={marketName}
            onChange={(e) => setMarketName(e.target.value)}
            placeholder="市场名称"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="备注（可选）"
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
              <th className="px-4 py-3 font-medium text-zinc-700">进货地</th>
              <th className="px-4 py-3 font-medium text-zinc-700">市场名称</th>
              <th className="px-4 py-3 font-medium text-zinc-700">备注</th>
              <th className="px-4 py-3 font-medium text-zinc-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 text-zinc-900">{row.place}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.marketName}</td>
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
