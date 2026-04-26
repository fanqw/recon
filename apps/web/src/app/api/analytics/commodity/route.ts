import { NextResponse } from "next/server";
import { guardAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCommodityAnalytics } from "@/lib/analytics/commodity";
import type { AnalyticsGranularity } from "@/lib/analytics/workbench";

/**
 * GET /api/analytics/commodity
 *
 * 查询参数：
 *   commodityId  必填，目标商品 ID
 *   from         开始日期（YYYY-MM-DD），默认 30 天前
 *   to           结束日期（YYYY-MM-DD），默认今天
 *   granularity  day | week | month | year，默认 day
 */
export async function GET(req: Request) {
  const unauth = await guardAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(req.url);
  const commodityId = searchParams.get("commodityId")?.trim();
  if (!commodityId) {
    return NextResponse.json({ error: "commodityId 必填" }, { status: 400 });
  }

  const commodity = await prisma.commodity.findFirst({
    where: { id: commodityId, deleted: false },
    include: {
      unit: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  });
  if (!commodity) {
    return NextResponse.json({ error: "商品不存在或已删除" }, { status: 404 });
  }

  const commodityInfo = {
    id: commodity.id,
    name: commodity.name,
    unit: commodity.unit,
    category: commodity.category,
  };

  const input = {
    commodityId,
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    granularity: searchParams.get("granularity") as AnalyticsGranularity | null,
  };

  const { parseAnalyticsFilters } = await import("@/lib/analytics/workbench");
  const filters = parseAnalyticsFilters(input);

  const rawLines = await prisma.orderCommodity.findMany({
    where: {
      commodityId,
      deleted: false,
      order: {
        deleted: false,
        createdAt: {
          gte: filters.range.from,
          lte: filters.range.to,
        },
      },
    },
    select: {
      price: true,
      count: true,
      lineTotal: true,
      order: { select: { id: true, createdAt: true } },
    },
  });

  const lines = rawLines.map((l) => ({
    orderId: l.order.id,
    orderCreatedAt: l.order.createdAt,
    price: l.price,
    count: l.count,
    lineTotal: l.lineTotal,
  }));

  const data = buildCommodityAnalytics(commodityInfo, lines, input);
  return NextResponse.json(data);
}
