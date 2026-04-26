"use client";

import {
  Button,
  Card,
  Input,
  Modal,
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
import {
  isDeleteBlockCode,
  messageForDeleteBlockCode,
} from "@/lib/delete-block-codes";
import { formatDateTime } from "@/lib/datetime";
import { validatePurchasePlaceFields } from "@/lib/forms/master-data-validation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PurchasePlace = {
  id: string;
  place: string;
  marketName: string;
  desc: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function PurchasePlacePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [items, setItems] = useState<PurchasePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(urlQuery);
  const [place, setPlace] = useState("");
  const [marketName, setMarketName] = useState("");
  const [desc, setDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"place" | "marketName", string>>
  >({});

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query.trim();
      const url = q
        ? `/api/purchase-places?q=${encodeURIComponent(q)}`
        : "/api/purchase-places";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: PurchasePlace[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function handleQueryChange(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    const q = value.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nextErrors = validatePurchasePlaceFields({ place, marketName });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
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
    setFieldErrors({});
    setModalOpen(false);
    await loadList();
  }

  function openCreate() {
    setEditingId(null);
    setPlace("");
    setMarketName("");
    setDesc("");
    setError(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(row: PurchasePlace) {
    setEditingId(row.id);
    setPlace(row.place);
    setMarketName(row.marketName);
    setDesc(row.desc ?? "");
    setError(null);
    setFieldErrors({});
    setModalOpen(true);
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
      if (isDeleteBlockCode(code)) setError(messageForDeleteBlockCode(code));
      else setError((data as { error?: string }).error ?? "删除失败");
      return;
    }
    await loadList();
  }

  const columns: TableColumnProps<PurchasePlace>[] = [
    { title: "进货地", dataIndex: "place", width: 180, fixed: "left" },
    { title: "市场名称", dataIndex: "marketName", width: 180 },
    { title: "备注", width: 240, render: (_, row) => row.desc ?? "—" },
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
      width: 88,
      cellStyle: { paddingLeft: 12, paddingRight: 12 },
      headerCellStyle: { paddingLeft: 12, paddingRight: 12 },
      render: (_, row) => (
        <Space size={12}>
          <Button size="mini" type="text" onClick={() => openEdit(row)}>编辑</Button>
          <Button size="mini" status="danger" type="text" onClick={() => void removeRow(row.id)}>删除</Button>
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
            placeholder="搜索进货地、市场名称或备注"
          />
        </div>
        <Button type="primary" onClick={openCreate}>新建</Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        data={items}
        size={COMPACT_TABLE_SIZE}
        pagination={createCompactTablePagination()}
        scroll={{ x: 1036 }}
        noDataElement={<ListTableEmptyState />}
      />

      <Modal title={editingId ? "编辑进货地" : "新建进货地"} visible={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <RequiredFieldLabel htmlFor="purchase-place-name" label="进货地" />
          <Input
            id="purchase-place-name"
            value={place}
            onChange={(value) => {
              setPlace(value);
              if (fieldErrors.place && value.trim()) {
                setFieldErrors((prev) => ({ ...prev, place: undefined }));
              }
            }}
            placeholder="请输入进货地"
            status={fieldErrors.place ? "error" : undefined}
          />
          <FieldErrorText message={fieldErrors.place} />
          <RequiredFieldLabel htmlFor="purchase-place-market-name" label="市场名称" />
          <Input
            id="purchase-place-market-name"
            value={marketName}
            onChange={(value) => {
              setMarketName(value);
              if (fieldErrors.marketName && value.trim()) {
                setFieldErrors((prev) => ({ ...prev, marketName: undefined }));
              }
            }}
            placeholder="请输入市场名称"
            status={fieldErrors.marketName ? "error" : undefined}
          />
          <FieldErrorText message={fieldErrors.marketName} />
          <label className="form-field-label" htmlFor="purchase-place-desc">备注（可选）</label>
          <Input.TextArea value={desc} onChange={setDesc} placeholder="请输入备注" rows={3} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button htmlType="submit" type="primary">{editingId ? "保存" : "新建"}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
