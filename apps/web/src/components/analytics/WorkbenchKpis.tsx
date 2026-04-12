import type { AnalyticsKpis } from "@/lib/analytics/workbench";

type WorkbenchKpisProps = {
  kpis: AnalyticsKpis;
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

const kpiItems = [
  { key: "totalAmount", label: "总金额", format: formatCurrency },
  { key: "orderCount", label: "订单数", format: (value: number) => String(value) },
  { key: "lineCount", label: "明细数", format: (value: number) => String(value) },
  { key: "averageOrderAmount", label: "平均订单金额", format: formatCurrency },
] as const;

export function WorkbenchKpis({ kpis }: WorkbenchKpisProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="核心指标">
      {kpiItems.map((item) => (
        <div
          key={item.key}
          className="rounded border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            {item.label}
          </div>
          <div className="mt-2 text-2xl font-semibold">{item.format(kpis[item.key])}</div>
        </div>
      ))}
    </section>
  );
}
