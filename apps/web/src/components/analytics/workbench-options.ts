import type { EChartsOption } from "echarts";
import type { AnalyticsDimensionRow, AnalyticsTrendBucket } from "@/lib/analytics/workbench";

const chartColors = ["#2563eb", "#16a34a", "#dc2626", "#0891b2", "#ca8a04", "#4f46e5"];

type PieTooltipParam = {
  name?: unknown;
  value?: unknown;
  percent?: unknown;
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function barOption(title: string, rows: AnalyticsDimensionRow[]): EChartsOption {
  return {
    color: chartColors,
    title: { text: title, left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    grid: { left: 48, right: 18, top: 48, bottom: rows.length > 8 ? 72 : 44 },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.name),
      axisLabel: { interval: 0, rotate: rows.length > 8 ? 35 : 0 },
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "金额",
        type: "bar",
        data: rows.map((row) => row.amount),
        label: {
          show: rows.length <= 12,
          position: "top",
          formatter: ({ value }) => formatCurrency(Number(value)),
        },
      },
    ],
  };
}

export function trendOption(rows: AnalyticsTrendBucket[]): EChartsOption {
  return {
    color: chartColors,
    title: { text: "总金额趋势", left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    grid: { left: 48, right: 18, top: 48, bottom: 44 },
    xAxis: { type: "category", data: rows.map((row) => row.label) },
    yAxis: { type: "value" },
    series: [
      {
        name: "金额",
        type: "line",
        smooth: true,
        data: rows.map((row) => row.amount),
        label: { show: rows.length <= 12, formatter: ({ value }) => formatCurrency(Number(value)) },
      },
    ],
  };
}

export function pieOption(title: string, rows: AnalyticsDimensionRow[]): EChartsOption {
  return {
    color: chartColors,
    title: { text: title, left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const item = (Array.isArray(params) ? params[0] : params) as PieTooltipParam;
        return `${String(item.name ?? "")}<br/>金额：${formatCurrency(
          Number(item.value ?? 0),
        )}<br/>占比：${String(item.percent ?? 0)}%`;
      },
    },
    legend: { bottom: 0, type: "scroll" },
    series: [
      {
        name: title,
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "48%"],
        data: rows.map((row) => ({ name: row.name, value: row.amount })),
        label: {
          formatter: ({ name, percent }) => `${name} ${percent}%`,
        },
      },
    ],
  };
}
