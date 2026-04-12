import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/analytics/workbench/route";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
        order: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
}));

describe("GET /api/analytics/workbench", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.requireUser.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("未登录访问返回 401", async () => {
    const err = new Error("UNAUTHORIZED") as Error & { status: number };
    err.status = 401;
    mocks.requireUser.mockRejectedValueOnce(err);

    const res = await GET(new Request("http://localhost/api/analytics/workbench"));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未授权" });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("已登录默认请求返回最近一个月范围、核心指标、维度聚合和趋势字段", async () => {
    mocks.requireUser.mockResolvedValueOnce({ id: "admin", username: "admin" });
    mocks.findMany.mockResolvedValueOnce([]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T08:30:00.000Z"));

    const res = await GET(
      new Request("http://localhost/api/analytics/workbench"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.filters.range.label).toBe("2026-03-12 至 2026-04-12");
    expect(body.kpis).toEqual({
      totalAmount: 0,
      orderCount: 0,
      lineCount: 0,
      averageOrderAmount: 0,
    });
    expect(body.byCategory).toEqual([]);
    expect(body.byCommodity).toEqual([]);
    expect(body.byPurchasePlace).toEqual([]);
    expect(body.trend).toEqual([]);
  });

  it("将时间范围筛选应用到订单创建时间查询条件", async () => {
    mocks.requireUser.mockResolvedValueOnce({ id: "admin", username: "admin" });
    mocks.findMany.mockResolvedValueOnce([]);

    await GET(
      new Request(
        "http://localhost/api/analytics/workbench?from=2026-04-01&to=2026-04-05&granularity=week",
      ),
    );

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deleted: false,
          createdAt: {
            gte: new Date("2026-04-01T00:00:00.000Z"),
            lte: new Date("2026-04-05T23:59:59.999Z"),
          },
        },
      }),
    );
  });

  it("响应包含商品 Top 50、分类占比和进货地占比字段", async () => {
    mocks.requireUser.mockResolvedValueOnce({ id: "admin", username: "admin" });
    mocks.findMany.mockResolvedValueOnce([
      {
        id: "order-1",
        createdAt: new Date("2026-04-10T10:00:00.000Z"),
        deleted: false,
        purchasePlace: {
          id: "place-1",
          place: "武汉",
          marketName: "中心港市场",
        },
        orderCommodities: Array.from({ length: 51 }, (_, index) => ({
          id: `line-${index}`,
          deleted: false,
          lineTotal: new Prisma.Decimal(index + 1),
          commodity: {
            id: `commodity-${index}`,
            name: `商品-${index}`,
            category: {
              id: index % 2 === 0 ? "fruit" : "food",
              name: index % 2 === 0 ? "水果" : "副食",
            },
          },
        })),
      },
    ]);

    const res = await GET(
      new Request("http://localhost/api/analytics/workbench?from=2026-04-01&to=2026-04-30"),
    );
    const body = await res.json();

    expect(body.byCommodity).toHaveLength(50);
    expect(body.byCommodity[0]).toMatchObject({
      name: "商品-50",
      amount: 51,
    });
    expect(body.byCategory[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        share: expect.any(Number),
      }),
    );
    expect(body.byPurchasePlace[0]).toEqual(
      expect.objectContaining({
        name: "武汉 / 中心港市场",
        share: 100,
      }),
    );
  });
});
