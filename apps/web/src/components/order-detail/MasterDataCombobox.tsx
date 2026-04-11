"use client";

import { Select } from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildMasterDataComboboxOptions,
  type MasterDataListItem,
} from "@/lib/master-data/combobox-options";

export type { MasterDataListItem } from "@/lib/master-data/combobox-options";

export type MasterDataSelection =
  | { kind: "id"; id: string; label: string }
  | { kind: "free"; text: string }
  | null;

type Props = {
  label: string;
  apiPath: string;
  disabled?: boolean;
  value: MasterDataSelection;
  onChange: (v: MasterDataSelection) => void;
  onPickCommodity?: (row: MasterDataListItem) => void;
  placeholder?: string;
};

export function MasterDataCombobox({
  label,
  apiPath,
  disabled,
  value,
  onChange,
  onPickCommodity,
  placeholder = "输入关键字搜索或选择",
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MasterDataListItem[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const q = query.trim();
          const url = q.length > 0 ? `${apiPath}?q=${encodeURIComponent(q)}` : apiPath;
          const res = await fetch(url, { credentials: "include" });
          const data = (await res.json()) as { items?: MasterDataListItem[] };
          setItems(Array.isArray(data.items) ? data.items : []);
        } finally {
          setLoading(false);
        }
      })();
    }, 280);
    return () => clearTimeout(t);
  }, [apiPath, query]);

  const selectedValue =
    value?.kind === "id" ? `id:${value.id}` : value?.kind === "free" ? `free:${value.text}` : undefined;

  const options = useMemo(() => {
    return buildMasterDataComboboxOptions({ items, query });
  }, [items, query]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-[#4e5969]">{label}</label>
      <Select
        showSearch
        allowClear
        disabled={disabled}
        loading={loading}
        placeholder={placeholder}
        value={selectedValue}
        onSearch={setQuery}
        onChange={(v) => {
          const s = String(v ?? "");
          if (!s) {
            onChange(null);
            return;
          }
          if (s.startsWith("id:")) {
            const id = s.slice(3);
            const row = items.find((it) => it.id === id);
            if (row) {
              onChange({ kind: "id", id: row.id, label: row.name });
              onPickCommodity?.(row);
            }
            return;
          }
          if (s.startsWith("free:")) {
            onChange({ kind: "free", text: s.slice(5) });
          }
        }}
      >
        {options.map((opt) => (
          <Select.Option key={opt.value} value={opt.value}>
            {opt.label}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}
