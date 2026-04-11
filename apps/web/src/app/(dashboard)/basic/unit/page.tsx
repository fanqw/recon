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

type Unit = {
  id: string;
  name: string;
  desc: string | null;
};

export default function UnitPage() {
  const [items, setItems] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/units", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: Unit[] }).items ?? []);
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
    if (editingId) {
      const res = await fetch(`/api/units/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, desc: desc || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "保存失败");
        return;
      }
    } else {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, desc: desc || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "创建失败");
        return;
      }
    }
    setName("");
    setDesc("");
    setEditingId(null);
    setModalOpen(false);
    await loadList();
  }

  function openCreate() {
    setEditingId(null);
    setName("");
    setDesc("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: Unit) {
    setEditingId(row.id);
    setName(row.name);
    setDesc(row.desc ?? "");
    setError(null);
    setModalOpen(true);
  }

  async function removeRow(id: string) {
    if (!confirm("确定删除该单位？")) return;
    setError(null);
    const res = await fetch(`/api/units/${id}`, {
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

  const columns: TableColumnProps<Unit>[] = [
    { title: "名称", dataIndex: "name" },
    { title: "描述", render: (_, row) => row.desc ?? "—" },
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
      title={<Typography.Title heading={6}>单位</Typography.Title>}
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
      <Modal title={editingId ? "编辑单位" : "新建单位"} visible={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-[#4e5969]">名称</label>
          <Input value={name} onChange={setName} placeholder="名称" required />
          <label className="text-sm text-[#4e5969]">描述（可选）</label>
          <Input value={desc} onChange={setDesc} placeholder="描述（可选）" />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button htmlType="submit" type="primary">{editingId ? "保存" : "新建"}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
