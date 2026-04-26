import type { ReactNode } from "react";

type WorkbenchFiltersProps = {
  from: string;
  to: string;
  rangeLabel: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  children?: ReactNode;
};

export function WorkbenchFilters({
  from,
  to,
  rangeLabel,
  onFromChange,
  onToChange,
  children,
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
        {children}
      </div>
    </section>
  );
}
