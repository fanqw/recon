export function WorkbenchEmptyState() {
  return (
    <div
      className="rounded border border-dashed p-6 text-center"
      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
    >
      当前筛选范围内暂无可统计的订单明细。
    </div>
  );
}
