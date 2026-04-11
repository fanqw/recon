"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  name: string;
  desc: string | null;
  purchasePlace: PurchasePlace;
};

type PurchasePlace = {
  id: string;
  place: string;
  marketName: string;
};

/**
 * 订单列表：创建订单并跳转详情。
 */
export default function OrderListPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [purchasePlaces, setPurchasePlaces] = useState<PurchasePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [purchasePlaceId, setPurchasePlaceId] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: Order[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPurchasePlaces = useCallback(async () => {
    const res = await fetch("/api/purchase-places", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "加载进货地失败");
      return;
    }
    setPurchasePlaces((data as { items: PurchasePlace[] }).items ?? []);
  }, []);

  useEffect(() => {
    void loadList();
    void loadPurchasePlaces();
  }, [loadList, loadPurchasePlaces]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!purchasePlaceId) {
      setError("请选择进货地");
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, purchasePlaceId, desc: desc || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "创建失败");
      return;
    }
    setName("");
    setPurchasePlaceId("");
    setDesc("");
    await loadList();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">订单</h1>

      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-medium text-zinc-700">新建订单</h2>
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="订单名称"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <select
            value={purchasePlaceId}
            onChange={(e) => setPurchasePlaceId(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          >
            <option value="" disabled>
              {purchasePlaces.length === 0 ? "暂无进货地" : "选择进货地"}
            </option>
            {purchasePlaces.map((row) => (
              <option key={row.id} value={row.id}>
                {row.place} / {row.marketName}
              </option>
            ))}
          </select>
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
            创建
          </button>
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
              <th className="px-4 py-3 font-medium text-zinc-700">进货地</th>
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
                  暂无订单
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 text-zinc-900">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {row.purchasePlace.place} / {row.purchasePlace.marketName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{row.desc ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/order/list/${row.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      查看详情
                    </Link>
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
