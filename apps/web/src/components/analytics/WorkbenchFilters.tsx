"use client";

import type { AnalyticsGranularity } from "@/lib/analytics/workbench";

type WorkbenchFiltersProps = {
  from: string;
  to: string;
  granularity: AnalyticsGranularity;
  rangeLabel: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onGranularityChange: (value: AnalyticsGranularity) => void;
};

const granularities: Array<{ value: AnalyticsGranularity; label: string }> = [
  { value: "day", label: "按天" },
  { value: "week", label: "按周" },
  { value: "month", label: "按月" },
  { value: "year", label: "按年" },
];

export function WorkbenchFilters({
  from,
  to,
  granularity,
  rangeLabel,
  onFromChange,
  onToChange,
  onGranularityChange,
}: WorkbenchFiltersProps) {
  return (
    <section
      aria-label="工作台筛选"
      className="flex flex-col gap-3 rounded border p-4 md:flex-row md:items-end md:justify-between"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div>
        <h1 className="m-0 text-xl font-semibold">工作台</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          当前范围：{rangeLabel}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          开始日期
          <input
            type="date"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
            className="rounded border px-3 py-2"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          结束日期
          <input
            type="date"
            value={to}
            onChange={(event) => onToChange(event.target.value)}
            className="rounded border px-3 py-2"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          时间粒度
          <select
            value={granularity}
            onChange={(event) => onGranularityChange(event.target.value as AnalyticsGranularity)}
            className="rounded border px-3 py-2"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            {granularities.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
