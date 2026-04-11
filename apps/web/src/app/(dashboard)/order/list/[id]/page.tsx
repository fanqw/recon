"use client";

import {
  Button,
  Card,
  Input,
  Modal,
  Space,
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
    setLineTotalInput(String(row.line_total));
    setLineTotalTouched(true);
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

  async function handleDeleteOrder() {
    if (!confirm("确定删除整个订单及其明细？")) return;
    const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE", credentials: "include" });
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
          <Link href="/order/list" className="text-[#165dff] hover:underline">返回列表</Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Link href="/order/list" className="text-[#165dff] hover:underline">← 返回订单列表</Link>
          <Typography.Title heading={6}>订单：{order.name}</Typography.Title>
          <Typography.Text>进货地：{order.purchasePlace.place} / {order.purchasePlace.marketName}</Typography.Text>
          {order.desc ? <Typography.Text>备注：{order.desc}</Typography.Text> : null}
          <Space>
            <Button type="primary" onClick={startCreateLine}>新增明细</Button>
            <Button onClick={() => void handleExportExcel()} loading={exporting} disabled={lines.length === 0}>导出 Excel</Button>
            <Button status="danger" onClick={() => void handleDeleteOrder()}>删除订单</Button>
          </Space>
          {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
        </Space>
      </Card>

      <OrderDetailTable lines={lines} onEdit={startEditLine} onDelete={(id) => void removeLine(id)} />

      <Modal title={editingLineId ? "编辑明细" : "新增明细"} visible={lineModalOpen} onCancel={() => setLineModalOpen(false)} footer={null}>
        <form onSubmit={handleLineSubmit} className="flex flex-col gap-3">
          <MasterDataCombobox label="分类" apiPath="/api/categories" disabled={!!editingLineId} value={categorySel} onChange={setCategorySel} />
          <MasterDataCombobox label="单位" apiPath="/api/units" disabled={!!editingLineId} value={unitSel} onChange={setUnitSel} />
          <MasterDataCombobox label="商品" apiPath="/api/commodities" disabled={!!editingLineId} value={commoditySel} onChange={setCommoditySel} onPickCommodity={onPickCommodity} />

          <label className="text-sm text-[#4e5969]">数量</label>
          <Input type="number" value={lineCount} onChange={setLineCount} required />
          <label className="text-sm text-[#4e5969]">单价</label>
          <Input type="number" value={linePrice} onChange={setLinePrice} required />
          <label className="text-sm text-[#4e5969]">行金额（可改）</label>
          <Input type="number" value={lineTotalInput} onChange={(v) => { setLineTotalTouched(true); setLineTotalInput(v); }} />
          {!editingLineId && lineTotalInput !== "" && !Number.isNaN(lineTotalValNum(lineTotalInput)) && !Number.isNaN(countNum) && !Number.isNaN(priceNum) && lineTotalValNum(lineTotalInput) !== autoTotal ? (
            <Typography.Text style={{ color: "#ffb65c" }}>与计算值 {autoTotal} 不一致，保存后金额列将标红</Typography.Text>
          ) : null}
          <label className="text-sm text-[#4e5969]">备注（可选）</label>
          <Input value={lineDesc} onChange={setLineDesc} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setLineModalOpen(false)}>取消</Button>
            <Button htmlType="submit" type="primary">{editingLineId ? "保存明细" : "添加明细"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function lineTotalValNum(s: string): number {
  const t = s.trim();
  if (t === "") return NaN;
  return parseFloat(t);
}
