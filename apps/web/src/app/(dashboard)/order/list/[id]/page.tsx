"use client";

import {
  MasterDataCombobox,
  type MasterDataListItem,
  type MasterDataSelection,
} from "@/components/order-detail/MasterDataCombobox";
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
  purchasePlace: {
    id: string;
    place: string;
    marketName: string;
  };
};

function trimOrEmpty(s: string): string {
  return s.trim();
}

function defaultLineTotalNum(count: number, price: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(price)) return 0;
  return Math.round(price * count);
}

/**
 * 订单详情：头信息、明细表（合并/标红）、明细 CRUD、导出 Excel。
 */
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderHead | null>(null);
  const [lines, setLines] = useState<OrderDetailTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categorySel, setCategorySel] = useState<MasterDataSelection>(null);
  const [unitSel, setUnitSel] = useState<MasterDataSelection>(null);
  const [commoditySel, setCommoditySel] = useState<MasterDataSelection>(null);

  const [lineCount, setLineCount] = useState("");
  const [linePrice, setLinePrice] = useState("");
  const [lineTotalInput, setLineTotalInput] = useState("");
  const [lineTotalTouched, setLineTotalTouched] = useState(false);
  const [lineDesc, setLineDesc] = useState("");
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
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

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadOrder();
    await loadLines();
    setLoading(false);
  }, [loadOrder, loadLines]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const countNum = parseInt(lineCount, 10);
  const priceNum = parseFloat(linePrice);
  const autoTotal = defaultLineTotalNum(countNum, priceNum);

  useEffect(() => {
    if (editingLineId) return;
    if (lineTotalTouched) return;
    if (Number.isNaN(countNum) || Number.isNaN(priceNum)) {
      setLineTotalInput("");
      return;
    }
    setLineTotalInput(String(autoTotal));
  }, [editingLineId, lineTotalTouched, countNum, priceNum, autoTotal]);

  function resetLineForm() {
    setCategorySel(null);
    setUnitSel(null);
    setCommoditySel(null);
    setLineCount("");
    setLinePrice("");
    setLineTotalInput("");
    setLineTotalTouched(false);
    setLineDesc("");
    setEditingLineId(null);
  }

  function validateNewLineMasterNames(): string | null {
    if (commoditySel?.kind === "id") return null;
    if (commoditySel?.kind === "free") {
      if (!trimOrEmpty(commoditySel.text)) return "商品名称不能为空";
    } else {
      return "请选择商品或输入名称并选择「使用当前输入」";
    }
    if (categorySel?.kind === "id") return null;
    if (categorySel?.kind === "free") {
      if (!trimOrEmpty(categorySel.text)) return "分类名称不能为空";
    } else {
      return "请选择分类或输入名称并选择「使用当前输入」";
    }
    if (unitSel?.kind === "id") return null;
    if (unitSel?.kind === "free") {
      if (!trimOrEmpty(unitSel.text)) return "单位名称不能为空";
    } else {
      return "请选择单位或输入名称并选择「使用当前输入」";
    }
    return null;
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

    const ltRaw = trimOrEmpty(lineTotalInput);
    let lineTotalVal: number;
    if (ltRaw === "") {
      lineTotalVal = defaultLineTotalNum(count, price);
    } else {
      lineTotalVal = parseFloat(ltRaw);
      if (Number.isNaN(lineTotalVal)) {
        setError("行金额无效");
        return;
      }
    }

    if (editingLineId) {
      const res = await fetch(`/api/order-lines/${editingLineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          count,
          price,
          lineTotal: lineTotalVal,
          desc: lineDesc || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "保存失败");
        return;
      }
    } else {
      const nameErr = validateNewLineMasterNames();
      if (nameErr) {
        setError(nameErr);
        return;
      }

      const body: Record<string, unknown> = {
        orderId,
        count,
        price,
        lineTotal: lineTotalVal,
        desc: lineDesc || undefined,
      };

      if (commoditySel?.kind === "id") {
        body.commodityId = commoditySel.id;
      } else if (commoditySel?.kind === "free") {
        body.commodityName = trimOrEmpty(commoditySel.text);
        if (categorySel?.kind === "id") body.categoryId = categorySel.id;
        else if (categorySel?.kind === "free") {
          body.categoryName = trimOrEmpty(categorySel.text);
        }
        if (unitSel?.kind === "id") body.unitId = unitSel.id;
        else if (unitSel?.kind === "free") {
          body.unitName = trimOrEmpty(unitSel.text);
        }
      }

      const res = await fetch("/api/order-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
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

  /** 进入编辑 */
  function startEditLine(row: OrderDetailTableRow) {
    setEditingLineId(row.id);
    setCommoditySel({
      kind: "id",
      id: row.commodityId,
      label: row.commodity.name,
    });
    setCategorySel({
      kind: "id",
      id: row.category.id,
      label: row.category.name,
    });
    setUnitSel({ kind: "id", id: row.unit.id, label: row.unit.name });
    setLineCount(String(row.count));
    setLinePrice(String(row.price));
    setLineTotalInput(String(row.line_total));
    setLineTotalTouched(true);
    setLineDesc(row.desc ?? "");
  }

  function onPickCommodity(row: MasterDataListItem) {
    if (row.category) {
      setCategorySel({
        kind: "id",
        id: row.category.id,
        label: row.category.name,
      });
    }
    if (row.unit) {
      setUnitSel({ kind: "id", id: row.unit.id, label: row.unit.name });
    }
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
    return <div className="text-zinc-500">加载订单…</div>;
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
          <p className="mt-1 text-sm text-zinc-600">
            进货地：{order.purchasePlace.place} / {order.purchasePlace.marketName}
          </p>
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
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <MasterDataCombobox
              label="分类"
              apiPath="/api/categories"
              disabled={!!editingLineId}
              value={categorySel}
              onChange={setCategorySel}
            />
            <MasterDataCombobox
              label="单位"
              apiPath="/api/units"
              disabled={!!editingLineId}
              value={unitSel}
              onChange={setUnitSel}
            />
            <MasterDataCombobox
              label="商品"
              apiPath="/api/commodities"
              disabled={!!editingLineId}
              value={commoditySel}
              onChange={setCommoditySel}
              onPickCommodity={onPickCommodity}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">数量</label>
              <input
                type="number"
                min={1}
                value={lineCount}
                onChange={(e) => setLineCount(e.target.value)}
                placeholder="数量"
                className="w-28 rounded border border-zinc-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">单价</label>
              <input
                type="number"
                step="0.01"
                value={linePrice}
                onChange={(e) => setLinePrice(e.target.value)}
                placeholder="单价"
                className="w-32 rounded border border-zinc-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                行金额（默认单价×数量四舍五入，可改）
              </label>
              <input
                type="number"
                step="0.01"
                value={lineTotalInput}
                onChange={(e) => {
                  setLineTotalTouched(true);
                  setLineTotalInput(e.target.value);
                }}
                className="w-36 rounded border border-zinc-300 px-3 py-2 text-sm"
              />
              {!editingLineId &&
              lineTotalInput !== "" &&
              !Number.isNaN(lineTotalValNum(lineTotalInput)) &&
              !Number.isNaN(countNum) &&
              !Number.isNaN(priceNum) &&
              lineTotalValNum(lineTotalInput) !== autoTotal ? (
                <p className="mt-1 text-xs text-amber-600">
                  与计算值 {autoTotal} 不一致，保存后金额列将标红
                </p>
              ) : null}
            </div>
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
          </div>
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

function lineTotalValNum(s: string): number {
  const t = s.trim();
  if (t === "") return NaN;
  return parseFloat(t);
}
