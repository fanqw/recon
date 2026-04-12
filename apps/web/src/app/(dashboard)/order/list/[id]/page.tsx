"use client";

import {
  Button,
  Card,
  Input,
  Modal,
  Typography,
} from "@arco-design/web-react";
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
import { useParams } from "next/navigation";
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
  const rounded = Math.round((price * count + Number.EPSILON) * 100) / 100;
  return Number(rounded.toFixed(2));
}

function formatLineTotal(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

export default function OrderDetailPage() {
  const params = useParams();
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
  const [lineDesc, setLineDesc] = useState("");
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "订单不存在");
      setOrder(null);
      return;
    }
    setOrder((data as { item: OrderHead }).item);
    setError(null);
  }, [orderId]);

  const loadLines = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}/lines`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setLines([]);
      return;
    }
    setLines((data as { items: OrderDetailTableRow[] }).items ?? []);
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
    if (Number.isNaN(countNum) || Number.isNaN(priceNum)) {
      setLineTotalInput("");
      return;
    }
    setLineTotalInput(formatLineTotal(autoTotal));
  }, [countNum, priceNum, autoTotal]);

  function resetLineForm() {
    setCategorySel(null);
    setUnitSel(null);
    setCommoditySel(null);
    setLineCount("");
    setLinePrice("");
    setLineTotalInput("");
    setLineDesc("");
    setEditingLineId(null);
  }

  function validateNewLineMasterNames(): string | null {
    if (commoditySel?.kind === "id") return null;
    if (commoditySel?.kind === "free") {
      if (!trimOrEmpty(commoditySel.text)) return "商品名称不能为空";
    } else {
      return "请选择商品或输入名称并选择当前输入选项";
    }
    if (categorySel?.kind === "id") return null;
    if (categorySel?.kind === "free") {
      if (!trimOrEmpty(categorySel.text)) return "分类名称不能为空";
    } else {
      return "请选择分类或输入名称并选择当前输入选项";
    }
    if (unitSel?.kind === "id") return null;
    if (unitSel?.kind === "free") {
      if (!trimOrEmpty(unitSel.text)) return "单位名称不能为空";
    } else {
      return "请选择单位或输入名称并选择当前输入选项";
    }
    return null;
  }

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

    const lineTotalVal = defaultLineTotalNum(count, price);

    if (editingLineId) {
      const res = await fetch(`/api/order-lines/${editingLineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ count, price, lineTotal: lineTotalVal, desc: lineDesc || undefined }),
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

      const body: Record<string, unknown> = { orderId, count, price, lineTotal: lineTotalVal, desc: lineDesc || undefined };
      if (commoditySel?.kind === "id") {
        body.commodityId = commoditySel.id;
      } else if (commoditySel?.kind === "free") {
        body.commodityName = trimOrEmpty(commoditySel.text);
        if (categorySel?.kind === "id") body.categoryId = categorySel.id;
        else if (categorySel?.kind === "free") body.categoryName = trimOrEmpty(categorySel.text);
        if (unitSel?.kind === "id") body.unitId = unitSel.id;
        else if (unitSel?.kind === "free") body.unitName = trimOrEmpty(unitSel.text);
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
    setLineModalOpen(false);
    await loadLines();
  }

  function startCreateLine() {
    resetLineForm();
    setError(null);
    setLineModalOpen(true);
  }

  function startEditLine(row: OrderDetailTableRow) {
    setEditingLineId(row.id);
    setCommoditySel({ kind: "id", id: row.commodityId, label: row.commodity.name });
    setCategorySel({ kind: "id", id: row.category.id, label: row.category.name });
    setUnitSel({ kind: "id", id: row.unit.id, label: row.unit.name });
    setLineCount(String(row.count));
    setLinePrice(String(row.price));
    setLineTotalInput(formatLineTotal(defaultLineTotalNum(row.count, row.price)));
    setLineDesc(row.desc ?? "");
    setError(null);
    setLineModalOpen(true);
  }

  function onPickCommodity(row: MasterDataListItem) {
    if (row.category) setCategorySel({ kind: "id", id: row.category.id, label: row.category.name });
    if (row.unit) setUnitSel({ kind: "id", id: row.unit.id, label: row.unit.name });
  }

  async function removeLine(id: string) {
    if (!confirm("确定删除该明细？")) return;
    setError(null);
    const res = await fetch(`/api/order-lines/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "删除失败");
      return;
    }
    if (editingLineId === id) resetLineForm();
    await loadLines();
  }

  async function handleExportExcel() {
    if (!order) return;
    setExporting(true);
    setError(null);
    try {
      await downloadOrderDetailExcel({ orderId: order.id, orderName: order.name, orderDesc: order.desc, lines });
    } catch {
      setError("导出 Excel 失败");
    } finally {
      setExporting(false);
    }
  }

  if (loading && !order) return <Typography.Text>加载订单…</Typography.Text>;

  if (!order) {
    return (
      <Card >
        <Typography.Text type="danger">{error ?? "订单不存在"}</Typography.Text>
        <div className="mt-3">
          <Link href="/order/list">
            <Button>返回</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid min-w-0 flex-1 gap-x-4 gap-y-1 text-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 gap-1">
              <Typography.Text type="secondary" className="shrink-0">订单名：</Typography.Text>
              <Typography.Text className="min-w-0 truncate font-medium">{order.name}</Typography.Text>
            </div>
            <div className="flex min-w-0 gap-1">
              <Typography.Text type="secondary" className="shrink-0">进货地：</Typography.Text>
              <Typography.Text className="min-w-0 truncate">
                {order.purchasePlace.place} / {order.purchasePlace.marketName}
              </Typography.Text>
            </div>
            <div className="flex min-w-0 gap-1 md:col-span-2">
              <Typography.Text type="secondary" className="shrink-0">备注：</Typography.Text>
              <Typography.Text className="min-w-0 truncate">{order.desc || "—"}</Typography.Text>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/order/list">
              <Button>返回</Button>
            </Link>
            <Button type="primary" onClick={startCreateLine}>新增商品</Button>
            <Button onClick={() => void handleExportExcel()} loading={exporting} disabled={lines.length === 0}>导出 Excel</Button>
          </div>
        </div>
        {error ? <Typography.Text type="danger" className="mt-2 block">{error}</Typography.Text> : null}
      </Card>

      {lines.length === 0 ? (
        <div className="rounded-lg border border-[#e5e6eb] bg-white p-6 text-center">
          <Typography.Text>暂无商品，请点击「新增商品」添加。</Typography.Text>
        </div>
      ) : (
        <OrderDetailTable lines={lines} onEdit={startEditLine} onDelete={(id) => void removeLine(id)} />
      )}

      <Modal title={editingLineId ? "编辑商品" : "新增商品"} visible={lineModalOpen} onCancel={() => setLineModalOpen(false)} footer={null}>
        <form onSubmit={handleLineSubmit} className="flex flex-col gap-3">
          <MasterDataCombobox label="商品" apiPath="/api/commodities" disabled={!!editingLineId} value={commoditySel} onChange={setCommoditySel} onPickCommodity={onPickCommodity} testId="order-line-commodity-select" />
          <MasterDataCombobox label="分类" apiPath="/api/categories" disabled={!!editingLineId} value={categorySel} onChange={setCategorySel} testId="order-line-category-select" />
          <MasterDataCombobox label="单位" apiPath="/api/units" disabled={!!editingLineId} value={unitSel} onChange={setUnitSel} testId="order-line-unit-select" />

          <label className="text-sm text-[#4e5969]">数量</label>
          <Input type="number" value={lineCount} onChange={setLineCount} required />
          <label className="text-sm text-[#4e5969]">单价</label>
          <Input type="number" value={linePrice} onChange={setLinePrice} required />
          <label className="text-sm text-[#4e5969]">总金额</label>
          <Input type="number" value={lineTotalInput} readOnly />
          <label className="text-sm text-[#4e5969]">备注（可选）</label>
          <Input value={lineDesc} onChange={setLineDesc} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setLineModalOpen(false)}>取消</Button>
            <Button htmlType="submit" type="primary">{editingLineId ? "保存商品" : "添加商品"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
