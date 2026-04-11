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
import {
  isDeleteBlockCode,
  messageForDeleteBlockCode,
} from "@/lib/delete-block-codes";
import { useCallback, useEffect, useState } from "react";

type PurchasePlace = {
  id: string;
  place: string;
  marketName: string;
  desc: string | null;
};

export default function PurchasePlacePage() {
  const [items, setItems] = useState<PurchasePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState("");
  const [marketName, setMarketName] = useState("");
  const [desc, setDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase-places", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: PurchasePlace[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    setModalOpen(false);
    await loadList();
  }

  function openCreate() {
    setEditingId(null);
    setPlace("");
    setMarketName("");
    setDesc("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: PurchasePlace) {
    setEditingId(row.id);
    setPlace(row.place);
    setMarketName(row.marketName);
    setDesc(row.desc ?? "");
    setError(null);
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
    { title: "进货地", dataIndex: "place" },
    { title: "市场名称", dataIndex: "marketName" },
    { title: "备注", render: (_, row) => row.desc ?? "—" },
    {
      title: "操作",
      render: (_, row) => (
        <Space>
          <Button type="text" onClick={() => openEdit(row)}>编辑</Button>
          <Button status="danger" type="text" onClick={() => void removeRow(row.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Typography.Title heading={6}>进货地</Typography.Title>}
      extra={<Button type="primary" onClick={openCreate}>新建</Button>}
      
    >
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
      <Table
        style={{ marginTop: error ? 12 : 0 }}
        rowKey="id"
        loading={loading}
        columns={columns}
        data={items}
        pagination={{ pageSize: 10, showTotal: true }}
        noDataElement="暂无数据"
      />

      <Modal title={editingId ? "编辑进货地" : "新建进货地"} visible={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-[#4e5969]">进货地</label>
          <Input value={place} onChange={setPlace} placeholder="进货地" required />
          <label className="text-sm text-[#4e5969]">市场名称</label>
          <Input value={marketName} onChange={setMarketName} placeholder="市场名称" required />
          <label className="text-sm text-[#4e5969]">备注（可选）</label>
          <Input value={desc} onChange={setDesc} placeholder="备注（可选）" />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button htmlType="submit" type="primary">{editingId ? "保存" : "新建"}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
