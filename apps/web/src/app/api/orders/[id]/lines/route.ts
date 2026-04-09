import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  aggregateOrderLinesForUi,
  type OrderLineWithRelations,
} from "@/lib/order-lines/aggregate";

const postSchema = z.object({
  commodityId: z.string().min(1),
  count: z.number().int().positive(),
  price: z.union([z.number(), z.string()]),
  desc: z.string().optional(),
});

async function guard() {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  return null;
}

/**
 * GET /api/orders/[id]/lines：订单下未删除明细列表，含 v1 findAll 对齐的金额聚合字段。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
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

/**
 * POST /api/orders/[id]/lines：新增订单明细；校验订单与商品存在且未删除。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id: orderId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const { commodityId, count, desc } = parsed.data;
  const price = new Prisma.Decimal(String(parsed.data.price));

  const [order, commodity] = await Promise.all([
    prisma.order.findFirst({ where: { id: orderId, deleted: false } }),
    prisma.commodity.findFirst({
      where: { id: commodityId, deleted: false },
    }),
  ]);
  if (!order || !commodity) {
    return NextResponse.json(
      { error: "订单或商品不存在或已删除" },
      { status: 400 }
    );
  }

  const item = await prisma.orderCommodity.create({
    data: {
      orderId,
      commodityId,
      count,
      price,
      desc,
    },
    include: {
      commodity: { include: { category: true, unit: true } },
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
