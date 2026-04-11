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
import { formatDateTime } from "@/lib/datetime";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  name: string;
  desc: string | null;
  purchasePlace: PurchasePlace;
  createdAt: string;
  updatedAt: string;
};

type PurchasePlace = {
  id: string;
  place: string;
  marketName: string;
};

export default function OrderListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [items, setItems] = useState<Order[]>([]);
  const [purchasePlaces, setPurchasePlaces] = useState<PurchasePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(urlQuery);
  const [name, setName] = useState("");
  const [purchasePlaceId, setPurchasePlaceId] = useState("");
  const [desc, setDesc] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query.trim();
      const url = q ? `/api/orders?q=${encodeURIComponent(q)}` : "/api/orders";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: Order[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, [query]);

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

  function handleQueryChange(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    const q = value.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

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
    setCreateOpen(false);
    await loadList();
  }

  async function removeRow(row: Order) {
    if (!confirm(`确定删除订单「${row.name}」及其明细？`)) return;
    setError(null);
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/orders/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "删除订单失败");
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
    setName("");
    setPurchasePlaceId("");
    setDesc("");
    setCreateOpen(true);
  }

  const columns: TableColumnProps<Order>[] = [
    { title: "名称", dataIndex: "name", width: 180 },
    {
      title: "进货地",
      width: 240,
      render: (_, row) => `${row.purchasePlace.place} / ${row.purchasePlace.marketName}`,
    },
    { title: "备注", width: 220, render: (_, row) => row.desc ?? "—" },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 170,
      render: (_, row) => formatDateTime(row.createdAt),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 170,
      render: (_, row) => formatDateTime(row.updatedAt),
    },
    {
      title: "操作",
      fixed: "right",
      width: 132,
      render: (_, row) => (
        <Space size={4}>
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
            删除订单
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Typography.Title heading={6}>订单</Typography.Title>}
      extra={<Button type="primary" onClick={openCreate}>创建</Button>}
    >
      {error ? <Typography.Text type="error">{error}</Typography.Text> : null}
      <div className={error ? "my-3 max-w-md" : "mb-3 max-w-md"}>
        <Input
          allowClear
          value={query}
          onChange={handleQueryChange}
          placeholder="搜索订单、进货地、市场名称或备注"
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        data={items}
        pagination={{ pageSize: 10, showTotal: true }}
        scroll={{ x: 1112 }}
        noDataElement="暂无订单"
      />

      <Modal title="新建订单" visible={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <label className="text-sm text-[#4e5969]">订单名称</label>
          <Input value={name} onChange={setName} placeholder="订单名称" required />
          <label className="text-sm text-[#4e5969]">进货地</label>
          <Select placeholder="选择进货地" value={purchasePlaceId || undefined} onChange={(v) => setPurchasePlaceId(String(v))}>
            {purchasePlaces.map((row) => (
              <Select.Option key={row.id} value={row.id}>{row.place} / {row.marketName}</Select.Option>
            ))}
          </Select>
          <label className="text-sm text-[#4e5969]">备注（可选）</label>
          <Input value={desc} onChange={setDesc} placeholder="备注（可选）" />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button htmlType="submit" type="primary">创建</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
