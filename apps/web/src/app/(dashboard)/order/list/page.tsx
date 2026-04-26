"use client";

import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  type TableColumnProps,
} from "@arco-design/web-react";
import { FieldErrorText } from "@/components/form/FieldErrorText";
import { RequiredFieldLabel } from "@/components/form/RequiredFieldLabel";
import { ListTableEmptyState } from "@/components/table/ListTableEmptyState";
import {
  COMPACT_TABLE_SIZE,
  createCompactTablePagination,
} from "@/components/table/tableDefaults";
import { formatDateTime } from "@/lib/datetime";
import { isDeleteBlockCode, messageForDeleteBlockCode } from "@/lib/delete-block-codes";
import { validateOrderFields } from "@/lib/forms/master-data-validation";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  name: string;
  desc: string | null;
  purchasePlace: PurchasePlace | null;
  createdAt: string;
  updatedAt: string;
};

type PurchasePlace = {
  id: string;
  place: string;
  marketName: string;
};

function optionMatches(inputValue: string, option: React.ReactElement) {
  const props = option.props as { children?: React.ReactNode };
  return String(props.children ?? "")
    .toLowerCase()
    .includes(inputValue.toLowerCase());
}

function normalizeComparableText(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function findPurchasePlace(rows: PurchasePlace[], place: string, marketName: string) {
  const normalizedPlace = normalizeComparableText(place);
  const normalizedMarketName = normalizeComparableText(marketName);

  return rows.find(
    (row) =>
      normalizeComparableText(row.place) === normalizedPlace &&
      normalizeComparableText(row.marketName) === normalizedMarketName,
  );
}

function uniqueTextOptions(rows: string[]) {
  return Array.from(new Set(rows.map((row) => row.trim()).filter(Boolean))).map((row) => ({
    label: row,
    value: row,
  }));
}

export default function OrderListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [purchasePlaces, setPurchasePlaces] = useState<PurchasePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(urlQuery);
  const [name, setName] = useState("");
  const [purchasePlace, setPurchasePlace] = useState("");
  const [marketName, setMarketName] = useState("");
  const [desc, setDesc] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"name" | "purchasePlace" | "marketName", string>>
  >({});

  const purchasePlaceSelectOptions = useMemo(
    () => uniqueTextOptions(purchasePlaces.map((row) => row.place)),
    [purchasePlaces],
  );

  const marketNameSelectOptions = useMemo(
    () => uniqueTextOptions(purchasePlaces.map((row) => row.marketName)),
    [purchasePlaces],
  );

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const loadList = useCallback(async (page = currentPage, size = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const q = query.trim();
      const params = new URLSearchParams({ page: String(page), pageSize: String(size) });
      if (q) params.set("q", encodeURIComponent(q));
      const res = await fetch(`/api/orders?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      const resp = data as { items: Order[]; total: number };
      setItems(resp.items ?? []);
      setTotal(resp.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [query, currentPage, pageSize]);

  const loadPurchasePlaces = useCallback(async () => {
    const res = await fetch("/api/purchase-places", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "加载进货地失败");
      return;
    }
    const rows = (data as { items: PurchasePlace[] }).items ?? [];
    setPurchasePlaces(rows);
    return rows;
  }, []);

  useEffect(() => {
    void loadList();
    void loadPurchasePlaces();
  }, [loadList, loadPurchasePlaces]);

  function handleQueryChange(value: string) {
    setCurrentPage(1);
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    const q = value.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  async function ensurePurchasePlaceId(placeValue: string, marketNameValue: string) {
    const place = placeValue.trim();
    const nextMarketName = marketNameValue.trim();
    const existing = findPurchasePlace(purchasePlaces, place, nextMarketName);
    if (existing) return existing.id;
    const res = await fetch("/api/purchase-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ place, marketName: nextMarketName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 409) {
        const latest = await loadPurchasePlaces();
        const matched = latest ? findPurchasePlace(latest, place, nextMarketName) : undefined;
        if (matched) return matched.id;
      }
      setError((data as { error?: string }).error ?? "创建进货地失败");
      return null;
    }
    const item = (data as { item: PurchasePlace }).item;
    setPurchasePlaces((prev) => [item, ...prev]);
    return item.id;
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const nextErrors = validateOrderFields({ name, purchasePlace, marketName });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    let resolvedPurchasePlaceId: string | undefined;
    if (purchasePlace.trim() || marketName.trim()) {
      const pid = await ensurePurchasePlaceId(purchasePlace, marketName);
      if (!pid) return;
      resolvedPurchasePlaceId = pid;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        ...(resolvedPurchasePlaceId ? { purchasePlaceId: resolvedPurchasePlaceId } : {}),
        desc: desc || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "创建失败");
      return;
    }
    setName("");
    setPurchasePlace("");
    setMarketName("");
    setDesc("");
    setFieldErrors({});
    setCreateOpen(false);
    await loadList();
  }

  async function removeRow(row: Order) {
    if (!confirm(`确定删除订单「${row.name}」？\n订单下存在明细时将无法删除，请先在订单详情页删除所有明细。`)) return;
    setError(null);
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/orders/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = (data as { code?: unknown }).code;
        if (isDeleteBlockCode(code)) setError(messageForDeleteBlockCode(code));
        else setError((data as { error?: string }).error ?? "删除订单失败");
        return;
      }
      await loadList();
    } catch {
      setError("删除订单失败");
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate() {
    setError(null);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    setName(`${y}年${m}月${d}日`);
    setPurchasePlace("");
    setMarketName("");
    setDesc("");
    setFieldErrors({});
    setCreateOpen(true);
  }

  const columns: TableColumnProps<Order>[] = [
    {
      title: "名称",
      dataIndex: "name",
      width: 180,
      fixed: "left",
      render: (_, row) => (
        <Link href={`/order/list/${row.id}`} className="text-[#165dff] hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      title: "进货地",
      width: 240,
      render: (_, row) =>
        row.purchasePlace
          ? `${row.purchasePlace.place} / ${row.purchasePlace.marketName}`
          : "—",
    },
    { title: "备注", width: 220, render: (_, row) => row.desc ?? "—" },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 156,
      render: (_, row) => formatDateTime(row.updatedAt),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 156,
      render: (_, row) => formatDateTime(row.createdAt),
    },
    {
      title: "操作",
      fixed: "right",
      width: 96,
      cellStyle: { paddingLeft: 12, paddingRight: 12 },
      headerCellStyle: { paddingLeft: 12, paddingRight: 12 },
      render: (_, row) => (
        <Space size={12}>
          <Link href={`/order/list/${row.id}`} className="text-xs text-[#165dff] hover:underline">
            详情
          </Link>
          <Button
            size="mini"
            status="danger"
            type="text"
            loading={deletingId === row.id}
            onClick={() => void removeRow(row)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      {error ? <Typography.Text type="error">{error}</Typography.Text> : null}
      <div className={error ? "my-3 flex items-center justify-between gap-3" : "mb-3 flex items-center justify-between gap-3"}>
        <div className="max-w-md flex-1">
          <Input
            allowClear
            value={query}
            onChange={handleQueryChange}
            placeholder="搜索订单、进货地、市场名称或备注"
          />
        </div>
        <Button type="primary" onClick={openCreate}>创建</Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        data={items}
        size={COMPACT_TABLE_SIZE}
        pagination={{
          ...createCompactTablePagination(),
          total,
          current: currentPage,
          pageSize,
          onChange(page, size) {
            setCurrentPage(page);
            setPageSize(size);
            void loadList(page, size);
          },
        }}
        scroll={{ x: 1056 }}
        noDataElement={<ListTableEmptyState />}
      />

      <Modal title="新建订单" visible={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <RequiredFieldLabel htmlFor="order-name" label="订单名称" />
          <Input
            id="order-name"
            value={name}
            onChange={(value) => {
              setName(value);
              if (fieldErrors.name && value.trim()) {
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            placeholder="请输入订单名称"
            status={fieldErrors.name ? "error" : undefined}
          />
          <FieldErrorText message={fieldErrors.name} />
          <label className="form-field-label" htmlFor="order-purchase-place">进货地（可选）</label>
          <Select
            id="order-purchase-place"
            allowCreate
            data-testid="order-purchase-place-select"
            filterOption={optionMatches}
            options={purchasePlaceSelectOptions}
            placeholder="请选择或输入进货地"
            showSearch
            value={purchasePlace || undefined}
            status={fieldErrors.purchasePlace ? "error" : undefined}
            onChange={(v) => {
              setPurchasePlace(String(v));
              if (fieldErrors.purchasePlace && String(v).trim()) {
                setFieldErrors((prev) => ({ ...prev, purchasePlace: undefined }));
              }
            }}
          />
          <FieldErrorText message={fieldErrors.purchasePlace} />
          <label className="form-field-label" htmlFor="order-market-name">市场名（可选）</label>
          <Select
            id="order-market-name"
            allowCreate
            data-testid="order-market-name-select"
            filterOption={optionMatches}
            options={marketNameSelectOptions}
            placeholder="请选择或输入市场名称"
            showSearch
            value={marketName || undefined}
            status={fieldErrors.marketName ? "error" : undefined}
            onChange={(v) => {
              setMarketName(String(v));
              if (fieldErrors.marketName && String(v).trim()) {
                setFieldErrors((prev) => ({ ...prev, marketName: undefined }));
              }
            }}
          />
          <FieldErrorText message={fieldErrors.marketName} />
          <label className="form-field-label" htmlFor="order-desc">备注（可选）</label>
          <Input.TextArea value={desc} onChange={setDesc} placeholder="请输入备注" rows={3} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button htmlType="submit" type="primary">创建</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
