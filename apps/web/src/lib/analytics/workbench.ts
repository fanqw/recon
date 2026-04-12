import { Prisma } from "@prisma/client";

export type AnalyticsGranularity = "day" | "week" | "month" | "year";

export type AnalyticsRange = {
  from: Date;
  to: Date;
  label: string;
};

export type AnalyticsFilters = {
  range: AnalyticsRange;
  granularity: AnalyticsGranularity;
};

export type AnalyticsKpis = {
  totalAmount: number;
  orderCount: number;
  lineCount: number;
  averageOrderAmount: number;
};

export type AnalyticsDimensionRow = {
  id: string;
  name: string;
  amount: number;
  lineCount: number;
  orderCount: number;
  share: number;
};

export type AnalyticsTrendBucket = {
  label: string;
  amount: number;
};

export type AnalyticsWorkbenchData = {
  filters: AnalyticsFilters;
  kpis: AnalyticsKpis;
  byCategory: AnalyticsDimensionRow[];
  byCommodity: AnalyticsDimensionRow[];
  byPurchasePlace: AnalyticsDimensionRow[];
  trend: AnalyticsTrendBucket[];
};

export type AnalyticsSourceOrderLine = {
  id: string;
  deleted: boolean;
  lineTotal: Prisma.Decimal;
  commodity: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
    };
  };
};

export type AnalyticsSourceOrder = {
  id: string;
  createdAt: Date;
  deleted: boolean;
  purchasePlace: {
    id: string;
    place: string;
    marketName: string;
  };
  orderCommodities: AnalyticsSourceOrderLine[];
};

export type AnalyticsInput = {
  from?: string | Date | null;
  to?: string | Date | null;
  granularity?: string | null;
};

export type BuildAnalyticsOptions = AnalyticsInput & {
  now?: Date;
};

type IncludedLine = {
  orderId: string;
  orderCreatedAt: Date;
  purchasePlace: AnalyticsSourceOrder["purchasePlace"];
  line: AnalyticsSourceOrderLine;
  amount: Prisma.Decimal;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_GRANULARITIES = new Set<AnalyticsGranularity>([
  "day",
  "week",
  "month",
  "year",
]);

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function dateOnly(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
  return new Date(startOfUtcDay(date).getTime() + DAY_MS - 1);
}

function monthAgo(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, date.getUTCDate()));
}

function parseDateInput(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function decimal(value: Prisma.Decimal | number): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toFixed(2));
}

function roundShare(amount: Prisma.Decimal, total: Prisma.Decimal): number {
  if (total.isZero()) return 0;
  return Number(amount.div(total).mul(100).toFixed(2));
}

function normalizeGranularity(value: string | null | undefined): AnalyticsGranularity {
  return VALID_GRANULARITIES.has(value as AnalyticsGranularity)
    ? (value as AnalyticsGranularity)
    : "day";
}

export function parseAnalyticsFilters(
  input: AnalyticsInput = {},
  now: Date = new Date(),
): AnalyticsFilters {
  const explicitFrom = parseDateInput(input.from);
  const explicitTo = parseDateInput(input.to);
  const from = startOfUtcDay(explicitFrom ?? monthAgo(now));
  const to = endOfUtcDay(explicitTo ?? now);

  return {
    range: {
      from,
      to,
      label: `${dateOnly(from)} 至 ${dateOnly(to)}`,
    },
    granularity: normalizeGranularity(input.granularity),
  };
}

function isWithinRange(date: Date, range: AnalyticsRange): boolean {
  const time = date.getTime();
  return time >= range.from.getTime() && time <= range.to.getTime();
}

function includedLines(
  orders: AnalyticsSourceOrder[],
  filters: AnalyticsFilters,
): IncludedLine[] {
  return orders.flatMap((order) => {
    if (order.deleted || !isWithinRange(order.createdAt, filters.range)) return [];

    return order.orderCommodities
      .filter((line) => !line.deleted)
      .map((line) => ({
        orderId: order.id,
        orderCreatedAt: order.createdAt,
        purchasePlace: order.purchasePlace,
        line,
        amount: decimal(line.lineTotal),
      }));
  });
}

function uniqueCount(values: Iterable<string>): number {
  return new Set(values).size;
}

function buildKpis(lines: IncludedLine[]): AnalyticsKpis {
  const total = lines.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
  const orderCount = uniqueCount(lines.map((item) => item.orderId));
  const lineCount = lines.length;
  const averageOrderAmount = orderCount > 0 ? total.div(orderCount) : new Prisma.Decimal(0);

  return {
    totalAmount: toNumber(total),
    orderCount,
    lineCount,
    averageOrderAmount: toNumber(averageOrderAmount),
  };
}

function dimensionRows(
  lines: IncludedLine[],
  getDimension: (item: IncludedLine) => { id: string; name: string },
  limit?: number,
): AnalyticsDimensionRow[] {
  const total = lines.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
  const groups = new Map<
    string,
    { id: string; name: string; amount: Prisma.Decimal; lineIds: Set<string>; orderIds: Set<string> }
  >();

  for (const item of lines) {
    const dimension = getDimension(item);
    const group = groups.get(dimension.id) ?? {
      ...dimension,
      amount: new Prisma.Decimal(0),
      lineIds: new Set<string>(),
      orderIds: new Set<string>(),
    };
    group.amount = group.amount.add(item.amount);
    group.lineIds.add(item.line.id);
    group.orderIds.add(item.orderId);
    groups.set(dimension.id, group);
  }

  const rows = [...groups.values()]
    .map((group) => ({
      id: group.id,
      name: group.name,
      amount: toNumber(group.amount),
      lineCount: group.lineIds.size,
      orderCount: group.orderIds.size,
      share: roundShare(group.amount, total),
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "zh-CN"));

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function trendLabel(date: Date, granularity: AnalyticsGranularity): string {
  const day = startOfUtcDay(date);
  if (granularity === "day") return dateOnly(day);
  if (granularity === "month") {
    return `${day.getUTCFullYear()}-${pad2(day.getUTCMonth() + 1)}`;
  }
  if (granularity === "year") return String(day.getUTCFullYear());

  const dayOfWeek = day.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return dateOnly(new Date(day.getTime() - daysSinceMonday * DAY_MS));
}

function trendRows(
  lines: IncludedLine[],
  granularity: AnalyticsGranularity,
): AnalyticsTrendBucket[] {
  const groups = new Map<string, Prisma.Decimal>();
  for (const item of lines) {
    const label = trendLabel(item.orderCreatedAt, granularity);
    groups.set(label, (groups.get(label) ?? new Prisma.Decimal(0)).add(item.amount));
  }

  return [...groups.entries()]
    .map(([label, amount]) => ({ label, amount: toNumber(amount) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildAnalyticsWorkbench(
  orders: AnalyticsSourceOrder[],
  options: BuildAnalyticsOptions = {},
): AnalyticsWorkbenchData {
  const filters = parseAnalyticsFilters(options, options.now);
  const lines = includedLines(orders, filters);

  return {
    filters,
    kpis: buildKpis(lines),
    byCategory: dimensionRows(lines, (item) => ({
      id: item.line.commodity.category.id,
      name: item.line.commodity.category.name,
    })),
    byCommodity: dimensionRows(
      lines,
      (item) => ({
        id: item.line.commodity.id,
        name: item.line.commodity.name,
      }),
      50,
    ),
    byPurchasePlace: dimensionRows(lines, (item) => ({
      id: `${item.purchasePlace.place}\u0000${item.purchasePlace.marketName}`,
      name: `${item.purchasePlace.place} / ${item.purchasePlace.marketName}`,
    })),
    trend: trendRows(lines, filters.granularity),
  };
}
