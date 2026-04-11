import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  purchasePlaceId: z.string().trim().min(1).optional(),
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
 * GET /api/orders/[id]：单条订单及未删除明细（含商品、分类、单位）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const item = await prisma.order.findFirst({
    where: { id, deleted: false },
    include: {
      purchasePlace: true,
      orderCommodities: {
        where: { deleted: false, commodity: { deleted: false } },
        include: {
          commodity: {
            include: { category: true, unit: true },
          },
        },
      },
    },
  });
  if (!item) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item });
}

/**
 * PATCH /api/orders/[id]：更新订单名称与描述。
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const existing = await prisma.order.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  const { name, desc, purchasePlaceId } = parsed.data;
  if (purchasePlaceId !== undefined) {
    const purchasePlace = await prisma.purchasePlace.findFirst({
      where: { id: purchasePlaceId, deleted: false },
      select: { id: true },
    });
    if (!purchasePlace) {
      return NextResponse.json({ error: "进货地无效" }, { status: 400 });
    }
  }
  const item = await prisma.order.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      ...(purchasePlaceId !== undefined ? { purchasePlaceId } : {}),
      desc: desc !== undefined ? desc : existing.desc,
    },
    include: { purchasePlace: true },
  });
  return NextResponse.json({ item });
}

/**
 * DELETE /api/orders/[id]：逻辑删除订单。
 * 同时将本订单下所有明细行标记 deleted=true，避免留下仍指向已删订单的「孤儿」明细、与后续统计口径不一致。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.order.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.$transaction([
    prisma.orderCommodity.updateMany({
      where: { orderId: id, deleted: false },
      data: { deleted: true },
    }),
    prisma.order.update({ where: { id }, data: { deleted: true } }),
  ]);
  return NextResponse.json({ ok: true });
}
