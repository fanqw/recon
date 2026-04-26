import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAuth } from "@/lib/auth";
import {
  aggregateOrderLinesForUi,
  type OrderLineWithRelations,
} from "@/lib/order-lines/aggregate";

/**
 * GET /api/orders/[id]/lines：订单下未删除明细列表，含 v1 findAll 对齐的金额聚合字段。
 *
 * JSON 中每行使用蛇形字段名：`line_total` 为持久化行金额；`total_price` 等为按该金额舍入后的聚合展示基准（与 OpenAPI/文档中的 camelCase 命名可能不同，前后端已统一为蛇形）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const { id: orderId } = await ctx.params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, deleted: false },
  });
  if (!order) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const rows = await prisma.orderCommodity.findMany({
    where: {
      orderId,
      deleted: false,
      commodity: { deleted: false },
    },
    include: {
      commodity: { include: { category: true, unit: true } },
    },
  });

  const items = aggregateOrderLinesForUi(rows as OrderLineWithRelations[]);
  return NextResponse.json({ items });
}
