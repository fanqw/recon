import type { EChartsOption } from "echarts";
import type {
  AnalyticsCategoryStack,
  AnalyticsDimensionRow,
  AnalyticsTrendSeries,
} from "@/lib/analytics/workbench";

const chartColors = [
  "#2563EB",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#64748B",
  "#EC4899",
];

type PieTooltipParam = {
  name?: unknown;
  value?: unknown;
  percent?: unknown;
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function horizontalBarOption(title: string, rows: AnalyticsDimensionRow[]): EChartsOption {
  const reversed = [...rows].reverse();
  return {
    color: chartColors,
    title: { text: title, left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    grid: { left: 108, right: 28, top: 48, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: reversed.map((row) => row.name),
      axisLabel: { interval: 0 },
    },
    series: [
      {
        type: "bar",
        data: reversed.map((row) => row.amount),
        barWidth: 18,
        label: {
          show: true,
          position: "right",
          formatter: ({ value }) => formatCurrency(Number(value)),
        },
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
        },
      },
    ],
  };
}

export function stackedBarOption(title: string, stack: AnalyticsCategoryStack): EChartsOption {
  return {
    color: chartColors,
    title: { text: title, left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    legend: { bottom: 0, type: "scroll" },
    grid: { left: 56, right: 18, top: 48, bottom: 64 },
    xAxis: {
      type: "category",
      data: stack.categories,
      axisLabel: { interval: 0 },
    },
    yAxis: { type: "value" },
    series: stack.series.map((seriesItem) => ({
      name: seriesItem.name,
      type: "bar",
      stack: "category",
      emphasis: { focus: "series" },
      data: seriesItem.values,
    })),
  };
}

export function stackedTrendOption(trend: AnalyticsTrendSeries): EChartsOption {
  return {
    color: chartColors,
    title: { text: "总金额趋势", left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    legend: { bottom: 0, type: "scroll" },
    grid: { left: 48, right: 18, top: 48, bottom: 64 },
    xAxis: { type: "category", data: trend.labels },
    yAxis: { type: "value" },
    series: trend.series.map((seriesItem) => ({
      name: seriesItem.name,
      type: "bar",
      stack: "total-amount",
      emphasis: { focus: "series" },
      barMaxWidth: 22,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: seriesItem.values,
    })),
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
