"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 选中已有主数据 id，或使用自定义名称（trim 后提交）。 */
export type MasterDataSelection =
  | { kind: "id"; id: string; label: string }
  | { kind: "free"; text: string }
  | null;

export type MasterDataListItem = {
  id: string;
  name: string;
  category?: { id: string; name: string };
  unit?: { id: string; name: string };
};

type Props = {
  /** 表单项标签 */
  label: string;
  /** 如 `/api/categories` */
  apiPath: string;
  disabled?: boolean;
  value: MasterDataSelection;
  onChange: (v: MasterDataSelection) => void;
  /** 仅商品下拉：选中列表项时带出分类与单位 */
  onPickCommodity?: (row: MasterDataListItem) => void;
  placeholder?: string;
};

/**
 * 可搜索主数据下拉：防抖请求 `?q=`，无完全匹配时在首项提供「使用当前输入」。
 */
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
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MasterDataListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const displayText =
    value?.kind === "id"
      ? value.label
      : value?.kind === "free"
        ? value.text
        : "";

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const q = query.trim();
          const url =
            q.length > 0
              ? `${apiPath}?q=${encodeURIComponent(q)}`
              : apiPath;
          const res = await fetch(url, { credentials: "include" });
          const data = (await res.json()) as {
            items?: MasterDataListItem[];
          };
          setItems(Array.isArray(data.items) ? data.items : []);
        } finally {
          setLoading(false);
        }
      })();
    }, 280);
    return () => clearTimeout(t);
  }, [apiPath, open, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const trimmedQuery = query.trim();
  const showFreeOption =
    trimmedQuery.length > 0 &&
    !items.some((i) => i.name === trimmedQuery);

  const pickItem = useCallback(
    (row: MasterDataListItem) => {
      onChange({ kind: "id", id: row.id, label: row.name });
      setQuery(row.name);
      setOpen(false);
      onPickCommodity?.(row);
    },
    [onChange, onPickCommodity],
  );

  const pickFree = useCallback(() => {
    onChange({ kind: "free", text: trimmedQuery });
    setQuery(trimmedQuery);
    setOpen(false);
  }, [onChange, trimmedQuery]);

  return (
    <div ref={wrapRef} className="relative min-w-[200px] flex-1">
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <input
        type="text"
        disabled={disabled}
        value={open ? query : displayText}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setQuery(displayText);
          setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
        autoComplete="off"
      />
      {open && !disabled ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border border-zinc-200 bg-white py-1 text-sm shadow-md">
          {loading ? (
            <li className="px-3 py-2 text-zinc-400">加载中…</li>
          ) : null}
          {showFreeOption ? (
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-blue-700 hover:bg-blue-50"
                onClick={() => pickFree()}
              >
                使用「{trimmedQuery}」
              </button>
            </li>
          ) : null}
          {items.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-50"
                onClick={() => pickItem(row)}
              >
                {row.name}
              </button>
            </li>
          ))}
          {!loading && items.length === 0 && !showFreeOption ? (
            <li className="px-3 py-2 text-zinc-400">无匹配项，可输入后选首项</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
