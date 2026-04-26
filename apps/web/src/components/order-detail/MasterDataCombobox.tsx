"use client";

import { Select } from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildMasterDataComboboxOptions,
  type MasterDataListItem,
} from "@/lib/master-data/combobox-options";
import { RequiredFieldLabel } from "@/components/form/RequiredFieldLabel";

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
  required?: boolean;
  testId?: string;
};

export function MasterDataCombobox({
  label,
  apiPath,
  disabled,
  value,
  onChange,
  onPickCommodity,
  placeholder = "输入关键字搜索或选择",
  required = false,
  testId,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MasterDataListItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const q = query.trim();
          const url = q.length > 0 ? `${apiPath}?q=${encodeURIComponent(q)}` : apiPath;
          const res = await fetch(url, {
            credentials: "include",
            signal: controller.signal,
          });
          if (!res.ok) {
            setItems([]);
            return;
          }
          const data = (await res.json()) as { items?: MasterDataListItem[] };
          setItems(Array.isArray(data.items) ? data.items : []);
        } catch (e) {
          if ((e as Error).name !== "AbortError") setItems([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 150);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [apiPath, query]);

  const selectedValue =
    value?.kind === "id" ? `id:${value.id}` : value?.kind === "free" ? `free:${value.text}` : undefined;

  function handleSearchInput(nextQuery: string) {
    setQuery(nextQuery);
  }

  const options = useMemo(() => {
    return buildMasterDataComboboxOptions({
      items,
      query,
      currentInputLabel: (value) => value,
    });
  }, [items, query]);

  /** 使用 `options` 数据驱动，避免 Arco 对 `Select.Option` 子节点 `cloneElement` 触发 React 19 的 element.ref 弃用警告 */
  const selectOptions = useMemo(
    () => options.map((opt) => ({ label: opt.label, value: opt.value })),
    [options],
  );

  return (
    <div className="flex flex-col gap-1">
      {required ? (
        <RequiredFieldLabel label={label} />
      ) : (
        <label className="text-sm text-[#4e5969]">{label}</label>
      )}
      <Select
        showSearch
        allowClear
        disabled={disabled}
        filterOption={false}
        loading={loading}
        options={selectOptions}
        placeholder={placeholder}
        data-testid={testId}
        value={selectedValue}
        onSearch={handleSearchInput}
        onInputValueChange={handleSearchInput}
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
      />
    </div>
  );
}
