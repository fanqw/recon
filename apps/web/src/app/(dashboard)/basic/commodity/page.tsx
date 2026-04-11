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
import {
  isDeleteBlockCode,
  messageForDeleteBlockCode,
} from "@/lib/delete-block-codes";
import { useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string };
type Unit = { id: string; name: string };
type Commodity = {
  id: string;
  name: string;
  desc: string | null;
  category: Category;
  unit: Unit;
};

export default function CommodityPage() {
  const [items, setItems] = useState<Commodity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMasters = useCallback(async () => {
    const [cRes, uRes] = await Promise.all([
      fetch("/api/categories", { credentials: "include" }),
      fetch("/api/units", { credentials: "include" }),
    ]);
    const cData = await cRes.json();
    const uData = await uRes.json();
    if (cRes.ok) setCategories((cData as { items: Category[] }).items ?? []);
    if (uRes.ok) setUnits((uData as { items: Unit[] }).items ?? []);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/commodities", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: Commodity[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMasters();
    void loadList();
  }, [loadList, loadMasters]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId || !unitId) {
      setError("请选择分类与单位");
      return;
    }
    if (editingId) {
      const res = await fetch(`/api/commodities/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, desc: desc || undefined, categoryId, unitId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "保存失败");
        return;
      }
    } else {
      const res = await fetch("/api/commodities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, desc: desc || undefined, categoryId, unitId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "创建失败");
        return;
      }
    }
    setName("");
    setDesc("");
    setCategoryId("");
    setUnitId("");
    setEditingId(null);
    setModalOpen(false);
    await loadList();
  }

  function openCreate() {
    setEditingId(null);
    setName("");
    setDesc("");
    setCategoryId("");
    setUnitId("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: Commodity) {
    setEditingId(row.id);
    setName(row.name);
    setDesc(row.desc ?? "");
    setCategoryId(row.category.id);
    setUnitId(row.unit.id);
    setError(null);
    setModalOpen(true);
  }

  async function removeRow(id: string) {
    if (!confirm("确定删除该商品？")) return;
    setError(null);
    const res = await fetch(`/api/commodities/${id}`, {
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

  const columns: TableColumnProps<Commodity>[] = [
    { title: "名称", dataIndex: "name" },
    { title: "分类", render: (_, row) => row.category.name },
    { title: "单位", render: (_, row) => row.unit.name },
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
      title={<Typography.Title heading={6}>商品</Typography.Title>}
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

      <Modal title={editingId ? "编辑商品" : "新建商品"} visible={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-[#4e5969]">名称</label>
          <Input value={name} onChange={setName} placeholder="名称" required />
          <label className="text-sm text-[#4e5969]">分类</label>
          <Select placeholder="选择分类" value={categoryId || undefined} onChange={(v) => setCategoryId(String(v))}>
            {categories.map((c) => (
              <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
            ))}
          </Select>
          <label className="text-sm text-[#4e5969]">单位</label>
          <Select placeholder="选择单位" value={unitId || undefined} onChange={(v) => setUnitId(String(v))}>
            {units.map((u) => (
              <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>
            ))}
          </Select>
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
