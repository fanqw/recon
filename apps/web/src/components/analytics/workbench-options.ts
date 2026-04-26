import type { EChartsOption } from "echarts";
import type {
  AnalyticsCategoryStack,
  AnalyticsDimensionRow,
  AnalyticsTrendSeries,
} from "@/lib/analytics/workbench";
import type {
  CommodityAmountBucket,
  CommodityPriceBucket,
  CommodityQuantityBucket,
} from "@/lib/analytics/commodity";

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

export function commodityPriceOption(
  title: string,
  buckets: CommodityPriceBucket[],
): EChartsOption {
  const labels = buckets.map((b) => b.label);
  return {
    color: chartColors,
    title: { text: title, left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const arr = Array.isArray(params) ? params : [params];
        const label = String((arr[0] as unknown as Record<string, unknown>)?.axisValue ?? "");
        return [
          label,
          ...arr.map(
            (p) =>
              `${String(p.seriesName ?? "")}: ¥${Number(p.value ?? 0).toFixed(2)}`,
          ),
        ].join("<br/>");
      },
    },
    legend: { bottom: 0, data: ["最高价", "平均价", "最低价"] },
    grid: { left: 48, right: 18, top: 48, bottom: 56 },
    xAxis: { type: "category", data: labels, boundaryGap: false },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => `¥${v}` } },
    series: [
      {
        name: "最高价",
        type: "line",
        data: buckets.map((b) => b.max),
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.06 },
      },
      {
        name: "平均价",
        type: "line",
        data: buckets.map((b) => b.avg),
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2, type: "dashed" },
      },
      {
        name: "最低价",
        type: "line",
        data: buckets.map((b) => b.min),
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.06 },
      },
    ],
  };
}

export function commodityQuantityOption(
  title: string,
  buckets: CommodityQuantityBucket[],
  unitName: string,
): EChartsOption {
  return {
    color: chartColors,
    title: { text: title, left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => `${Number(v).toFixed(2)} ${unitName}`,
    },
    grid: { left: 56, right: 18, top: 48, bottom: 36 },
    xAxis: { type: "category", data: buckets.map((b) => b.label) },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => `${v} ${unitName}` },
    },
    series: [
      {
        type: "bar",
        data: buckets.map((b) => b.quantity),
        barMaxWidth: 28,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        label: {
          show: buckets.length <= 14,
          position: "top",
          formatter: ({ value }) => `${Number(value).toFixed(2)}`,
        },
      },
    ],
  };
}

export function commodityAmountOption(
  title: string,
  buckets: CommodityAmountBucket[],
): EChartsOption {
  return {
    color: chartColors,
    title: { text: title, left: 8, top: 4, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => formatCurrency(Number(v)),
    },
    grid: { left: 56, right: 18, top: 48, bottom: 36 },
    xAxis: { type: "category", data: buckets.map((b) => b.label) },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: buckets.map((b) => b.amount),
        barMaxWidth: 28,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        label: {
          show: buckets.length <= 14,
          position: "top",
          formatter: ({ value }) => formatCurrency(Number(value)),
        },
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
