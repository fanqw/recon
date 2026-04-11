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
import { formatDateTime } from "@/lib/datetime";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Unit = {
  id: string;
  name: string;
  desc: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function UnitPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [items, setItems] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(urlQuery);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query.trim();
      const url = q ? `/api/units?q=${encodeURIComponent(q)}` : "/api/units";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: Unit[] }).items ?? []);
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
    { title: "名称", dataIndex: "name", width: 180 },
    { title: "备注", width: 240, render: (_, row) => row.desc ?? "—" },
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
      width: 96,
      render: (_, row) => (
        <Space size={4}>
          <Button size="mini" type="text" onClick={() => openEdit(row)}>编辑</Button>
          <Button size="mini" status="danger" type="text" onClick={() => void removeRow(row.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Typography.Title heading={6}>单位</Typography.Title>}
      extra={<Button type="primary" onClick={openCreate}>新建</Button>}
    >
      {error ? <Typography.Text type="error">{error}</Typography.Text> : null}
      <div className={error ? "my-3 max-w-md" : "mb-3 max-w-md"}>
        <Input
          allowClear
          value={query}
          onChange={handleQueryChange}
          placeholder="搜索名称或备注"
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        data={items}
        pagination={{ pageSize: 10, showTotal: true }}
        scroll={{ x: 856 }}
        noDataElement="暂无数据"
      />
      <Modal title={editingId ? "编辑单位" : "新建单位"} visible={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-[#4e5969]">名称</label>
          <Input value={name} onChange={setName} placeholder="名称" required />
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
