import { NextResponse } from "next/server";
import { guardAuth } from "@/lib/auth";
import {
  buildAnalyticsWorkbench,
  parseAnalyticsFilters,
  type AnalyticsGranularity,
} from "@/lib/analytics/workbench";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/analytics/workbench：返回工作台统计数据。
 */
export async function GET(req: Request) {
  const unauth = await guardAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(req.url);
  const filters = parseAnalyticsFilters({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    granularity: searchParams.get("granularity"),
  });

  const orders = await prisma.order.findMany({
    where: {
      deleted: false,
      createdAt: {
        gte: filters.range.from,
        lte: filters.range.to,
      },
    },
    include: {
      purchasePlace: true,
      orderCommodities: {
        where: { deleted: false },
        include: {
          commodity: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  const data = buildAnalyticsWorkbench(orders, {
    from: filters.range.from,
    to: filters.range.to,
    granularity: filters.granularity as AnalyticsGranularity,
  });

  return NextResponse.json(data);
}
