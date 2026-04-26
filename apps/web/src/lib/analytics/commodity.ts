import { Prisma } from "@prisma/client";
import type { AnalyticsGranularity, AnalyticsRange } from "./workbench";
import { parseAnalyticsFilters } from "./workbench";

// ─── 公开类型 ───────────────────────────────────────────────────────────────

export type CommodityAnalyticsInput = {
  commodityId: string;
  from?: string | Date | null;
  to?: string | Date | null;
  granularity?: string | null;
  now?: Date;
};

export type CommodityInfo = {
  id: string;
  name: string;
  unit: { id: string; name: string };
  category: { id: string; name: string };
};

export type CommodityPriceBucket = {
  label: string;
  min: number;
  max: number;
  avg: number;
};

export type CommodityQuantityBucket = {
  label: string;
  quantity: number;
};

export type CommodityAmountBucket = {
  label: string;
  amount: number;
};

export type CommodityAnalyticsData = {
  commodity: CommodityInfo;
  filters: { range: { from: Date; to: Date; label: string }; granularity: AnalyticsGranularity };
  summary: {
    totalQuantity: number;
    totalAmount: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    lineCount: number;
    orderCount: number;
  };
  priceTrend: CommodityPriceBucket[];
  quantityTrend: CommodityQuantityBucket[];
  amountTrend: CommodityAmountBucket[];
};

// ─── 内部工具 ───────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateOnly(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function trendLabel(date: Date, granularity: AnalyticsGranularity): string {
  const day = startOfUtcDay(date);
  if (granularity === "day") return dateOnly(day);
  if (granularity === "month") {
    return `${day.getUTCFullYear()}-${pad2(day.getUTCMonth() + 1)}`;
  }
  if (granularity === "year") return String(day.getUTCFullYear());
  // week: 归到周一
  const dayOfWeek = day.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return dateOnly(new Date(day.getTime() - daysSinceMonday * DAY_MS));
}

function toNum(d: Prisma.Decimal | number): number {
  return Number(d instanceof Prisma.Decimal ? d.toFixed(4) : d);
}

// ─── 主函数 ─────────────────────────────────────────────────────────────────

type RawLine = {
  orderId: string;
  orderCreatedAt: Date;
  price: Prisma.Decimal;
  count: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

export function buildCommodityAnalytics(
  commodity: CommodityInfo,
  rawLines: RawLine[],
  input: CommodityAnalyticsInput,
): CommodityAnalyticsData {
  const filters = parseAnalyticsFilters(input, input.now);
  const { granularity, range } = filters;

  // 过滤时间范围内的明细
  const lines = rawLines.filter((l) => {
    const t = l.orderCreatedAt.getTime();
    return t >= range.from.getTime() && t <= range.to.getTime();
  });

  // 按时间 bucket 分组
  type Bucket = {
    prices: number[];
    quantity: number;
    amount: number;
    orderIds: Set<string>;
  };
  const buckets = new Map<string, Bucket>();

  for (const l of lines) {
    const label = trendLabel(l.orderCreatedAt, granularity);
    const existing = buckets.get(label) ?? {
      prices: [],
      quantity: 0,
      amount: 0,
      orderIds: new Set<string>(),
    };
    existing.prices.push(toNum(l.price));
    existing.quantity += toNum(l.count);
    existing.amount += toNum(l.lineTotal);
    existing.orderIds.add(l.orderId);
    buckets.set(label, existing);
  }

  const sortedLabels = [...buckets.keys()].sort();

  const priceTrend: CommodityPriceBucket[] = sortedLabels.map((label) => {
    const b = buckets.get(label)!;
    const min = Math.min(...b.prices);
    const max = Math.max(...b.prices);
    const avg = b.prices.reduce((s, p) => s + p, 0) / b.prices.length;
    return { label, min, max, avg: Number(avg.toFixed(4)) };
  });

  const quantityTrend: CommodityQuantityBucket[] = sortedLabels.map((label) => ({
    label,
    quantity: Number(buckets.get(label)!.quantity.toFixed(3)),
  }));

  const amountTrend: CommodityAmountBucket[] = sortedLabels.map((label) => ({
    label,
    amount: Number(buckets.get(label)!.amount.toFixed(2)),
  }));

  // 汇总
  const allPrices = lines.map((l) => toNum(l.price));
  const totalQuantity = lines.reduce((s, l) => s + toNum(l.count), 0);
  const totalAmount = lines.reduce((s, l) => s + toNum(l.lineTotal), 0);
  const allOrderIds = new Set(lines.map((l) => l.orderId));

  return {
    commodity,
    filters,
    summary: {
      totalQuantity: Number(totalQuantity.toFixed(3)),
      totalAmount: Number(totalAmount.toFixed(2)),
      avgPrice: allPrices.length
        ? Number((allPrices.reduce((s, p) => s + p, 0) / allPrices.length).toFixed(4))
        : 0,
      minPrice: allPrices.length ? Math.min(...allPrices) : 0,
      maxPrice: allPrices.length ? Math.max(...allPrices) : 0,
      lineCount: lines.length,
      orderCount: allOrderIds.size,
    },
    priceTrend,
    quantityTrend,
    amountTrend,
  };
}

export function isWithinRange(date: Date, range: AnalyticsRange): boolean {
  const t = date.getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}
