"use client";

import type { EChartsOption } from "echarts";
import { useEffect, useRef } from "react";

type WorkbenchChartProps = {
  label: string;
  option: EChartsOption;
  empty?: boolean;
};

export function WorkbenchChart({ label, option, empty = false }: WorkbenchChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || empty) return;

    let disposed = false;
    let chart: import("echarts").ECharts | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void import("echarts").then((echarts) => {
      if (!ref.current || disposed) return;
      chart = echarts.init(ref.current);
      chart.setOption(option);
      resizeObserver = new ResizeObserver(() => chart?.resize());
      resizeObserver.observe(ref.current);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.dispose();
    };
  }, [empty, option]);

  if (empty) {
    return (
      <div
        aria-label={label}
        className="flex h-[320px] items-center justify-center rounded border border-dashed text-sm"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        暂无可展示的数据
      </div>
    );
  }

  return <div ref={ref} aria-label={label} role="img" className="h-[320px] w-full" />;
}
