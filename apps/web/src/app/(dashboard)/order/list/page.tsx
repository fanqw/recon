"use client";

import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Table,
  Typography,
  type TableColumnProps,
} from "@arco-design/web-react";
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

export default function OrderListPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [purchasePlaces, setPurchasePlaces] = useState<PurchasePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [purchasePlaceId, setPurchasePlaceId] = useState("");
  const [desc, setDesc] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
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
    setCreateOpen(false);
    await loadList();
  }

  function openCreate() {
    setError(null);
    setName("");
    setPurchasePlaceId("");
    setDesc("");
    setCreateOpen(true);
  }

  const columns: TableColumnProps<Order>[] = [
    { title: "名称", dataIndex: "name" },
    { title: "进货地", render: (_, row) => `${row.purchasePlace.place} / ${row.purchasePlace.marketName}` },
    { title: "备注", render: (_, row) => row.desc ?? "—" },
    {
      title: "操作",
      render: (_, row) => (
        <Link href={`/order/list/${row.id}`} className="text-[#165dff] hover:underline">
          查看详情
        </Link>
      ),
    },
  ];

  return (
    <Card
      title={<Typography.Title heading={6}>订单</Typography.Title>}
      extra={<Button type="primary" onClick={openCreate}>创建</Button>}
      
    >
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
      <Table
        style={{ marginTop: error ? 12 : 0 }}
        rowKey="id"
        loading={loading}
        columns={columns}
        data={items}
        pagination={{ pageSize: 10, showTotal: true }}
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
