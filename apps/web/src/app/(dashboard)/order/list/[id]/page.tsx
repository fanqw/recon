"use client";

import {
  Button,
  Card,
  Input,
  Modal,
  Typography,
} from "@arco-design/web-react";
import { FieldErrorText } from "@/components/form/FieldErrorText";
import { RequiredFieldLabel } from "@/components/form/RequiredFieldLabel";
import { ListTableEmptyState } from "@/components/table/ListTableEmptyState";
import { validateOrderLineFields } from "@/lib/forms/master-data-validation";
import {
  calculateEditableLineTotal,
  hasManualLineTotalOverride,
} from "@/lib/order-lines/line-total";
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
  const [lineTotalManuallyEdited, setLineTotalManuallyEdited] = useState(false);
  const [lineFieldErrors, setLineFieldErrors] = useState<
    Partial<Record<"commodity" | "category" | "unit" | "count" | "price" | "lineTotal", string>>
  >({});

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
  const autoTotal = calculateEditableLineTotal(countNum, priceNum);

  useEffect(() => {
    if (lineTotalManuallyEdited) {
      return;
    }
    if (Number.isNaN(countNum) || Number.isNaN(priceNum)) {
      setLineTotalInput("");
      return;
    }
    setLineTotalInput(formatLineTotal(autoTotal));
  }, [countNum, priceNum, autoTotal, lineTotalManuallyEdited]);

  function resetLineForm() {
    setCategorySel(null);
    setUnitSel(null);
    setCommoditySel(null);
    setLineCount("");
    setLinePrice("");
    setLineTotalInput("");
    setLineDesc("");
    setEditingLineId(null);
    setLineTotalManuallyEdited(false);
    setLineFieldErrors({});
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
    const nextFieldErrors = validateOrderLineFields({
      commoditySelected: !!commoditySel,
      categorySelected: !!categorySel,
      unitSelected: !!unitSel,
      lineCount,
      linePrice,
      lineTotal: lineTotalInput,
    });
    setLineFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    const count = parseInt(lineCount, 10);
    const price = parseFloat(linePrice);
    const lineTotalVal = parseFloat(lineTotalInput);

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
    setLineTotalInput(formatLineTotal(row.line_total));
    setLineDesc(row.desc ?? "");
    setLineTotalManuallyEdited(
      hasManualLineTotalOverride(row.count, row.price, row.line_total),
    );
    setError(null);
    setLineFieldErrors({});
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
        <Typography.Text type="error">{error ?? "订单不存在"}</Typography.Text>
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
      <Card>
        <div className="grid min-w-0 gap-x-4 gap-y-2 text-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
        {error ? <Typography.Text type="error" className="mt-2 block">{error}</Typography.Text> : null}
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Link href="/order/list">
            <Button>返回</Button>
          </Link>
          <Button type="primary" onClick={startCreateLine}>新增商品</Button>
          <Button onClick={() => void handleExportExcel()} loading={exporting} disabled={lines.length === 0}>导出 Excel</Button>
        </div>
      </Card>

      {lines.length === 0 ? (
        <Card>
          <ListTableEmptyState message="暂无商品，请点击「新增商品」添加。" />
        </Card>
      ) : (
        <Card>
          <OrderDetailTable lines={lines} onEdit={startEditLine} onDelete={(id) => void removeLine(id)} />
        </Card>
      )}

      <Modal title={editingLineId ? "编辑商品" : "新增商品"} visible={lineModalOpen} onCancel={() => setLineModalOpen(false)} footer={null}>
        <form onSubmit={handleLineSubmit} className="flex flex-col gap-3">
          <MasterDataCombobox
            label="商品"
            apiPath="/api/commodities"
            disabled={!!editingLineId}
            value={commoditySel}
            onChange={(value) => {
              setCommoditySel(value);
              if (lineFieldErrors.commodity && value) {
                setLineFieldErrors((prev) => ({ ...prev, commodity: undefined }));
              }
            }}
            onPickCommodity={onPickCommodity}
            testId="order-line-commodity-select"
          />
          <FieldErrorText message={lineFieldErrors.commodity} />
          <MasterDataCombobox
            label="分类"
            apiPath="/api/categories"
            disabled={!!editingLineId}
            value={categorySel}
            onChange={(value) => {
              setCategorySel(value);
              if (lineFieldErrors.category && value) {
                setLineFieldErrors((prev) => ({ ...prev, category: undefined }));
              }
            }}
            testId="order-line-category-select"
          />
          <FieldErrorText message={lineFieldErrors.category} />
          <MasterDataCombobox
            label="单位"
            apiPath="/api/units"
            disabled={!!editingLineId}
            value={unitSel}
            onChange={(value) => {
              setUnitSel(value);
              if (lineFieldErrors.unit && value) {
                setLineFieldErrors((prev) => ({ ...prev, unit: undefined }));
              }
            }}
            testId="order-line-unit-select"
          />
          <FieldErrorText message={lineFieldErrors.unit} />

          <RequiredFieldLabel htmlFor="order-line-count" label="数量" />
          <Input
            id="order-line-count"
            type="number"
            value={lineCount}
            onChange={(value) => {
              setLineCount(value);
              if (lineFieldErrors.count && value.trim()) {
                setLineFieldErrors((prev) => ({ ...prev, count: undefined }));
              }
            }}
            status={lineFieldErrors.count ? "error" : undefined}
          />
          <FieldErrorText message={lineFieldErrors.count} />
          <RequiredFieldLabel htmlFor="order-line-price" label="单价" />
          <Input
            id="order-line-price"
            type="number"
            value={linePrice}
            onChange={(value) => {
              setLinePrice(value);
              if (lineFieldErrors.price && value.trim()) {
                setLineFieldErrors((prev) => ({ ...prev, price: undefined }));
              }
            }}
            status={lineFieldErrors.price ? "error" : undefined}
          />
          <FieldErrorText message={lineFieldErrors.price} />
          <RequiredFieldLabel htmlFor="order-line-total" label="总金额" />
          <Input
            id="order-line-total"
            type="number"
            value={lineTotalInput}
            onChange={(value) => {
              setLineTotalInput(value);
              setLineTotalManuallyEdited(true);
              if (lineFieldErrors.lineTotal && value.trim()) {
                setLineFieldErrors((prev) => ({ ...prev, lineTotal: undefined }));
              }
            }}
            status={lineFieldErrors.lineTotal ? "error" : undefined}
          />
          <FieldErrorText message={lineFieldErrors.lineTotal} />
          <label htmlFor="order-line-desc" className="form-field-label">备注（可选）</label>
          <Input.TextArea
            id="order-line-desc"
            value={lineDesc}
            onChange={setLineDesc}
            placeholder="请输入备注"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setLineModalOpen(false)}>取消</Button>
            <Button htmlType="submit" type="primary">{editingLineId ? "保存商品" : "添加商品"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
