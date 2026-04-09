"use client";

import {
  OrderDetailTable,
  type OrderDetailTableRow,
} from "@/components/order-detail/OrderDetailTable";
import { downloadOrderDetailExcel } from "@/lib/order-detail/export-order-excel";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type OrderHead = {
  id: string;
  name: string;
  desc: string | null;
};

type CommodityOption = {
  id: string;
  name: string;
  unit: { name: string };
};

/**
 * 订单详情：头信息、明细表（合并/标红）、明细 CRUD、导出 Excel。
 */
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderHead | null>(null);
  const [lines, setLines] = useState<OrderDetailTableRow[]>([]);
  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 明细表单：商品 */
  const [commodityId, setCommodityId] = useState("");
  /** 明细表单：数量 */
  const [lineCount, setLineCount] = useState("");
  /** 明细表单：单价 */
  const [linePrice, setLinePrice] = useState("");
  /** 明细表单：备注 */
  const [lineDesc, setLineDesc] = useState("");
  /** 非空表示编辑已有明细 id */
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  /** 导出中状态 */
  const [exporting, setExporting] = useState(false);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "订单不存在");
      setOrder(null);
      return;
    }
    const item = (data as { item: OrderHead }).item;
    setOrder(item);
    setError(null);
  }, [orderId]);

  const loadLines = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}/lines`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setLines([]);
      return;
    }
    const raw = (data as { items: OrderDetailTableRow[] }).items ?? [];
    setLines(raw);
  }, [orderId]);

  const loadCommodities = useCallback(async () => {
    const res = await fetch("/api/commodities", { credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      setCommodities(
        (data as { items: CommodityOption[] }).items?.map((c) => ({
          id: c.id,
          name: c.name,
          unit: c.unit,
        })) ?? []
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadOrder();
    await loadLines();
    setLoading(false);
  }, [loadOrder, loadLines]);

  useEffect(() => {
    void loadCommodities();
  }, [loadCommodities]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function resetLineForm() {
    setCommodityId("");
    setLineCount("");
    setLinePrice("");
    setLineDesc("");
    setEditingLineId(null);
  }

  /** 提交新增或更新明细 */
  async function handleLineSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const count = parseInt(lineCount, 10);
    const price = parseFloat(linePrice);
    if (Number.isNaN(count) || count < 1) {
      setError("数量须为正整数");
      return;
    }
    if (Number.isNaN(price)) {
      setError("单价无效");
      return;
    }

    if (editingLineId) {
      const res = await fetch(`/api/order-lines/${editingLineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          count,
          price,
          desc: lineDesc || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "保存失败");
        return;
      }
    } else {
      if (!commodityId) {
        setError("请选择商品");
        return;
      }
      const res = await fetch("/api/order-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          commodityId,
          count,
          price,
          desc: lineDesc || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "添加失败");
        return;
      }
    }
    resetLineForm();
    await loadLines();
  }

  /** 进入编辑：仅可改数量、单价、备注（与 PATCH API 一致） */
  function startEditLine(row: OrderDetailTableRow) {
    setEditingLineId(row.id);
    setCommodityId(row.commodityId);
    setLineCount(String(row.count));
    setLinePrice(String(row.price));
    setLineDesc(row.desc ?? "");
  }

  async function removeLine(id: string) {
    if (!confirm("确定删除该明细？")) return;
    setError(null);
    const res = await fetch(`/api/order-lines/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "删除失败");
      return;
    }
    if (editingLineId === id) resetLineForm();
    await loadLines();
  }

  async function handleDeleteOrder() {
    if (!confirm("确定删除整个订单及其明细？")) return;
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setError("删除订单失败");
      return;
    }
    router.replace("/order/list");
    router.refresh();
  }

  async function handleExportExcel() {
    if (!order) return;
    setExporting(true);
    setError(null);
    try {
      await downloadOrderDetailExcel({
        orderId: order.id,
        orderName: order.name,
        orderDesc: order.desc,
        lines,
      });
    } catch {
      setError("导出 Excel 失败");
    } finally {
      setExporting(false);
    }
  }

  if (loading && !order) {
    return (
      <div className="text-zinc-500">加载订单…</div>
    );
  }

  if (!order) {
    return (
      <div>
        <p className="text-red-600">{error ?? "订单不存在"}</p>
        <Link href="/order/list" className="mt-4 inline-block text-blue-600">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/order/list"
            className="text-sm text-blue-600 hover:underline"
          >
            ← 返回订单列表
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            订单：{order.name}
          </h1>
          {order.desc ? (
            <p className="mt-1 text-sm text-zinc-600">备注：{order.desc}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExportExcel()}
            disabled={exporting || lines.length === 0}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {exporting ? "导出中…" : "导出 Excel"}
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteOrder()}
            className="rounded border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            删除订单
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          {editingLineId ? "编辑明细" : "新增明细"}
        </h2>
        <form
          onSubmit={handleLineSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        >
          <select
            value={commodityId}
            onChange={(e) => setCommodityId(e.target.value)}
            disabled={!!editingLineId}
            className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            required={!editingLineId}
          >
            <option value="">
              {editingLineId ? "（编辑中不可改商品）" : "选择商品"}
            </option>
            {commodities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}（{c.unit.name}）
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={lineCount}
            onChange={(e) => setLineCount(e.target.value)}
            placeholder="数量"
            className="w-28 rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            step="0.01"
            value={linePrice}
            onChange={(e) => setLinePrice(e.target.value)}
            placeholder="单价"
            className="w-32 rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={lineDesc}
            onChange={(e) => setLineDesc(e.target.value)}
            placeholder="备注（可选）"
            className="min-w-[160px] flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            {editingLineId ? "保存明细" : "添加明细"}
          </button>
          {editingLineId ? (
            <button
              type="button"
              onClick={resetLineForm}
              className="rounded border border-zinc-300 px-4 py-2 text-sm"
            >
              取消
            </button>
          ) : null}
        </form>
      </section>

      <OrderDetailTable
        lines={lines}
        onEdit={startEditLine}
        onDelete={(id) => void removeLine(id)}
      />
    </div>
  );
}
