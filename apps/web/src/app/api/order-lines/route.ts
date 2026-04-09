import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createOrderCommodityLine } from "@/lib/order-lines/create-line";

const postSchema = z.object({
  orderId: z.string().min(1),
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
 * POST /api/order-lines：在指定订单下新增明细；订单 id 置于请求体，避免 Turbopack 下嵌套路由 POST 误匹配 404。
 */
export async function POST(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const { orderId, commodityId, count, desc } = parsed.data;
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

  const item = await createOrderCommodityLine({
    orderId,
    commodityId,
    count,
    price,
    desc,
  });

  return NextResponse.json({ item }, { status: 201 });
}
