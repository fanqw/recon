import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAuth } from "@/lib/auth";

const patchSchema = z.object({
  count: z.number().finite().refine((value) => value !== 0).optional(),
  price: z.union([z.number(), z.string()]).optional(),
  lineTotal: z.union([z.number(), z.string()]).optional(),
  desc: z.string().optional(),
});

/**
 * PATCH /api/order-lines/[id]：更新明细数量、单价、行金额、备注。
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const existing = await prisma.orderCommodity.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const { count, desc } = parsed.data;
  const price =
    parsed.data.price !== undefined
      ? new Prisma.Decimal(String(parsed.data.price))
      : undefined;
  const lineTotal =
    parsed.data.lineTotal !== undefined
      ? new Prisma.Decimal(String(parsed.data.lineTotal))
      : undefined;

  const item = await prisma.orderCommodity.update({
    where: { id },
    data: {
      count: count ?? existing.count,
      price: price ?? existing.price,
      lineTotal: lineTotal ?? existing.lineTotal,
      desc: desc !== undefined ? desc : existing.desc,
    },
    include: {
      commodity: { include: { category: true, unit: true } },
    },
  });
  return NextResponse.json({ item });
}

/**
 * DELETE /api/order-lines/[id]：逻辑删除订单明细。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.orderCommodity.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.orderCommodity.update({
    where: { id },
    data: { deleted: true },
  });
  return NextResponse.json({ ok: true });
}
