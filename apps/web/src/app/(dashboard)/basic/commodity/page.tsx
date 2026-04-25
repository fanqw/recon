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
  isDeleteBlockCode,
  messageForDeleteBlockCode,
} from "@/lib/delete-block-codes";
import { formatDateTime } from "@/lib/datetime";
import { validateCommodityFields } from "@/lib/forms/master-data-validation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string };
type Unit = { id: string; name: string };
type Commodity = {
  id: string;
  name: string;
  desc: string | null;
  category: Category;
  unit: Unit;
  createdAt: string;
  updatedAt: string;
};

function optionMatches(inputValue: string, option: React.ReactElement) {
  const props = option.props as { children?: React.ReactNode };
  return String(props.children ?? "")
    .toLowerCase()
    .includes(inputValue.toLowerCase());
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function findCategory(rows: Category[], value: string) {
  const input = value.trim();
  return rows.find((row) => row.id === input || sameText(row.name, input));
}

function findUnit(rows: Unit[], value: string) {
  const input = value.trim();
  return rows.find((row) => row.id === input || sameText(row.name, input));
}

export default function CommodityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [items, setItems] = useState<Commodity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(urlQuery);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"name" | "categoryId" | "unitId", string>>
  >({});

  /** `options` 数据驱动，避免 Select.Option 子节点在 React 19 下触发 element.ref 弃用警告 */
  const categorySelectOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id })),
    [categories],
  );
  const unitSelectOptions = useMemo(
    () => units.map((u) => ({ label: u.name, value: u.id })),
    [units],
  );

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) return null;
    const rows = (data as { items: Category[] }).items ?? [];
    setCategories(rows);
    return rows;
  }, []);

  const loadUnits = useCallback(async () => {
    const res = await fetch("/api/units", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) return null;
    const rows = (data as { items: Unit[] }).items ?? [];
    setUnits(rows);
    return rows;
  }, []);

  const loadMasters = useCallback(async () => {
    const [cRes, uRes] = await Promise.all([
      loadCategories(),
      loadUnits(),
    ]);
    return { categories: cRes, units: uRes };
  }, [loadCategories, loadUnits]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query.trim();
      const url = q ? `/api/commodities?q=${encodeURIComponent(q)}` : "/api/commodities";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "加载失败");
        return;
      }
      setItems((data as { items: Commodity[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadMasters();
    void loadList();
  }, [loadList, loadMasters]);

  function handleQueryChange(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    const q = value.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  async function ensureCategoryId(value: string) {
    const input = value.trim();
    const existing = findCategory(categories, input);
    if (existing) return existing.id;

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: input }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 409) {
        const latest = await loadCategories();
        const matched = latest ? findCategory(latest, input) : undefined;
        if (matched) return matched.id;
      }
      setError((data as { error?: string }).error ?? "创建分类失败");
      return null;
    }
    const item = (data as { item: Category }).item;
    setCategories((prev) => [item, ...prev]);
    return item.id;
  }

  async function ensureUnitId(value: string) {
    const input = value.trim();
    const existing = findUnit(units, input);
    if (existing) return existing.id;

    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: input }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 409) {
        const latest = await loadUnits();
        const matched = latest ? findUnit(latest, input) : undefined;
        if (matched) return matched.id;
      }
      setError((data as { error?: string }).error ?? "创建单位失败");
      return null;
    }
    const item = (data as { item: Unit }).item;
    setUnits((prev) => [item, ...prev]);
    return item.id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nextErrors = validateCommodityFields({ name, categoryId, unitId });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const resolvedCategoryId = await ensureCategoryId(categoryId);
    const resolvedUnitId = await ensureUnitId(unitId);
    if (!resolvedCategoryId || !resolvedUnitId) return;

    if (editingId) {
      const res = await fetch(`/api/commodities/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          desc: desc || undefined,
          categoryId: resolvedCategoryId,
          unitId: resolvedUnitId,
        }),
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
        body: JSON.stringify({
          name,
          desc: desc || undefined,
          categoryId: resolvedCategoryId,
          unitId: resolvedUnitId,
        }),
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
    setFieldErrors({});
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
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(row: Commodity) {
    setEditingId(row.id);
    setName(row.name);
    setDesc(row.desc ?? "");
    setCategoryId(row.category.id);
    setUnitId(row.unit.id);
    setError(null);
    setFieldErrors({});
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
    { title: "名称", dataIndex: "name", width: 180, fixed: "left" },
    { title: "分类", width: 140, render: (_, row) => row.category.name },
    { title: "单位", width: 120, render: (_, row) => row.unit.name },
    { title: "备注", width: 220, render: (_, row) => row.desc ?? "—" },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 156,
      render: (_, row) => formatDateTime(row.createdAt),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 156,
      render: (_, row) => formatDateTime(row.updatedAt),
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
            placeholder="搜索名称、分类、单位或备注"
          />
        </div>
        <Button type="primary" onClick={openCreate}>新建</Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        data={items}
        pagination={{ pageSize: 10, showTotal: true }}
        scroll={{ x: 1096 }}
        noDataElement={<ListTableEmptyState />}
      />

      <Modal title={editingId ? "编辑商品" : "新建商品"} visible={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <RequiredFieldLabel htmlFor="commodity-name" label="名称" />
          <Input
            id="commodity-name"
            value={name}
            onChange={(value) => {
              setName(value);
              if (fieldErrors.name && value.trim()) {
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            placeholder="请输入商品名称"
            status={fieldErrors.name ? "error" : undefined}
          />
          <FieldErrorText message={fieldErrors.name} />
          <RequiredFieldLabel htmlFor="commodity-category" label="分类" />
          <Select
            id="commodity-category"
            allowCreate
            data-testid="commodity-category-select"
            filterOption={optionMatches}
            options={categorySelectOptions}
            placeholder="请选择或输入分类"
            showSearch
            value={categoryId || undefined}
            status={fieldErrors.categoryId ? "error" : undefined}
            onChange={(v) => {
              setCategoryId(String(v));
              if (fieldErrors.categoryId && String(v).trim()) {
                setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
              }
            }}
          />
          <FieldErrorText message={fieldErrors.categoryId} />
          <RequiredFieldLabel htmlFor="commodity-unit" label="单位" />
          <Select
            id="commodity-unit"
            allowCreate
            data-testid="commodity-unit-select"
            filterOption={optionMatches}
            options={unitSelectOptions}
            placeholder="请选择或输入单位"
            showSearch
            value={unitId || undefined}
            status={fieldErrors.unitId ? "error" : undefined}
            onChange={(v) => {
              setUnitId(String(v));
              if (fieldErrors.unitId && String(v).trim()) {
                setFieldErrors((prev) => ({ ...prev, unitId: undefined }));
              }
            }}
          />
          <FieldErrorText message={fieldErrors.unitId} />
          <label className="form-field-label" htmlFor="commodity-desc">备注（可选）</label>
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
