import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildAnalyticsWorkbench,
  parseAnalyticsFilters,
  type AnalyticsSourceOrder,
} from "./workbench";

function dec(value: number) {
  return new Prisma.Decimal(value);
}

function order(
  id: string,
  createdAt: string,
  lines: Array<{
    id: string;
    amount: number;
    commodityId?: string;
    commodityName?: string;
    categoryId?: string;
    categoryName?: string;
    deleted?: boolean;
  }>,
  options: { deleted?: boolean; place?: string; marketName?: string } = {},
): AnalyticsSourceOrder {
  return {
    id,
    createdAt: new Date(createdAt),
    deleted: options.deleted ?? false,
    purchasePlace: {
      id: `place-${id}`,
      place: options.place ?? "武汉",
      marketName: options.marketName ?? "中心港市场",
    },
    orderCommodities: lines.map((line) => ({
      id: line.id,
      deleted: line.deleted ?? false,
      lineTotal: dec(line.amount),
      commodity: {
        id: line.commodityId ?? `commodity-${line.id}`,
        name: line.commodityName ?? `商品-${line.id}`,
        category: {
          id: line.categoryId ?? `category-${line.id}`,
          name: line.categoryName ?? `分类-${line.id}`,
        },
      },
    })),
  };
}

describe("analytics workbench filters", () => {
  it("未传时间范围时默认使用最近一个月", () => {
    const filters = parseAnalyticsFilters({}, new Date("2026-04-12T08:30:00.000Z"));

    expect(filters.range.from.toISOString()).toBe("2026-03-12T00:00:00.000Z");
    expect(filters.range.to.toISOString()).toBe("2026-04-12T23:59:59.999Z");
    expect(filters.range.label).toBe("2026-03-12 至 2026-04-12");
  });

  it("只接受 day/week/month/year 粒度，非法值回退到 day", () => {
    const now = new Date("2026-04-12T08:30:00.000Z");

    expect(parseAnalyticsFilters({ granularity: "week" }, now).granularity).toBe("week");
    expect(parseAnalyticsFilters({ granularity: "month" }, now).granularity).toBe("month");
    expect(parseAnalyticsFilters({ granularity: "year" }, now).granularity).toBe("year");
    expect(parseAnalyticsFilters({ granularity: "bad" }, now).granularity).toBe("day");
  });
});

describe("analytics workbench aggregation", () => {
  it("基于 lineTotal 聚合核心指标", () => {
    const result = buildAnalyticsWorkbench(
      [
        order("o1", "2026-04-10T10:00:00.000Z", [
          { id: "l1", amount: 12.5 },
          { id: "l2", amount: 7.5 },
        ]),
        order("o2", "2026-04-11T10:00:00.000Z", [{ id: "l3", amount: 30 }]),
      ],
      { now: new Date("2026-04-12T08:30:00.000Z") },
    );

    expect(result.kpis).toEqual({
      totalAmount: 50,
      orderCount: 2,
      lineCount: 3,
      averageOrderAmount: 25,
    });
  });

  it("过滤已删除订单和已删除订单明细", () => {
    const result = buildAnalyticsWorkbench(
      [
        order("kept", "2026-04-10T10:00:00.000Z", [
          { id: "kept-line", amount: 10 },
          { id: "deleted-line", amount: 99, deleted: true },
        ]),
        order("deleted", "2026-04-10T10:00:00.000Z", [{ id: "hidden", amount: 88 }], {
          deleted: true,
        }),
      ],
      { now: new Date("2026-04-12T08:30:00.000Z") },
    );

    expect(result.kpis.totalAmount).toBe(10);
    expect(result.kpis.orderCount).toBe(1);
    expect(result.kpis.lineCount).toBe(1);
  });

  it("按分类名称汇总金额", () => {
    const result = buildAnalyticsWorkbench(
      [
        order("o1", "2026-04-10T10:00:00.000Z", [
          { id: "apple", amount: 10, categoryId: "fruit", categoryName: "水果" },
          { id: "pear", amount: 15, categoryId: "fruit", categoryName: "水果" },
          { id: "rice", amount: 30, categoryId: "food", categoryName: "副食" },
        ]),
      ],
      { now: new Date("2026-04-12T08:30:00.000Z") },
    );

    expect(result.byCategory.map((row) => [row.name, row.amount])).toEqual([
      ["副食", 30],
      ["水果", 25],
    ]);
  });

  it("商品金额排行只返回 Top 50，不足 50 时返回全部", () => {
    const lines = Array.from({ length: 55 }, (_, index) => ({
      id: `line-${index}`,
      amount: index + 1,
      commodityId: `commodity-${index}`,
      commodityName: `商品-${index}`,
    }));

    const top = buildAnalyticsWorkbench(
      [order("o1", "2026-04-10T10:00:00.000Z", lines)],
      { now: new Date("2026-04-12T08:30:00.000Z") },
    ).byCommodity;

    expect(top).toHaveLength(50);
    expect(top[0]).toMatchObject({ name: "商品-54", amount: 55 });
    expect(top.at(-1)).toMatchObject({ name: "商品-5", amount: 6 });

    const short = buildAnalyticsWorkbench(
      [order("o2", "2026-04-10T10:00:00.000Z", lines.slice(0, 3))],
      { now: new Date("2026-04-12T08:30:00.000Z") },
    ).byCommodity;

    expect(short).toHaveLength(3);
  });

  it("按进货地和市场名称组合汇总金额", () => {
    const result = buildAnalyticsWorkbench(
      [
        order("wuhan-1", "2026-04-10T10:00:00.000Z", [{ id: "a", amount: 10 }], {
          place: "武汉",
          marketName: "中心港市场",
        }),
        order("wuhan-2", "2026-04-10T10:00:00.000Z", [{ id: "b", amount: 20 }], {
          place: "武汉",
          marketName: "中心港市场",
        }),
        order("luoyang", "2026-04-10T10:00:00.000Z", [{ id: "c", amount: 40 }], {
          place: "洛阳",
          marketName: "宏进市场",
        }),
      ],
      { now: new Date("2026-04-12T08:30:00.000Z") },
    );

    expect(result.byPurchasePlace.map((row) => [row.name, row.amount])).toEqual([
      ["洛阳 / 宏进市场", 40],
      ["武汉 / 中心港市场", 30],
    ]);
  });

  it("按天、周、月、年生成趋势桶，周从周一开始", () => {
    const rows = [
      order("sun", "2026-04-05T10:00:00.000Z", [{ id: "sun-line", amount: 10 }]),
      order("mon", "2026-04-06T10:00:00.000Z", [{ id: "mon-line", amount: 20 }]),
      order("apr", "2026-04-12T10:00:00.000Z", [{ id: "apr-line", amount: 30 }]),
    ];
    const now = new Date("2026-04-12T08:30:00.000Z");

    expect(
      buildAnalyticsWorkbench(rows, { now, granularity: "day" }).trend.map((row) => [
        row.label,
        row.amount,
      ]),
    ).toEqual([
      ["2026-04-05", 10],
      ["2026-04-06", 20],
      ["2026-04-12", 30],
    ]);
    expect(
      buildAnalyticsWorkbench(rows, { now, granularity: "week" }).trend.map((row) => [
        row.label,
        row.amount,
      ]),
    ).toEqual([
      ["2026-03-30", 10],
      ["2026-04-06", 50],
    ]);
    expect(buildAnalyticsWorkbench(rows, { now, granularity: "month" }).trend).toEqual([
      { label: "2026-04", amount: 60 },
    ]);
    expect(buildAnalyticsWorkbench(rows, { now, granularity: "year" }).trend).toEqual([
      { label: "2026", amount: 60 },
    ]);
  });

  it("无匹配数据时返回零值指标和空序列", () => {
    const result = buildAnalyticsWorkbench([], {
      now: new Date("2026-04-12T08:30:00.000Z"),
    });

    expect(result.kpis).toEqual({
      totalAmount: 0,
      orderCount: 0,
      lineCount: 0,
      averageOrderAmount: 0,
    });
    expect(result.byCategory).toEqual([]);
    expect(result.byCommodity).toEqual([]);
    expect(result.byPurchasePlace).toEqual([]);
    expect(result.trend).toEqual([]);
  });
});
