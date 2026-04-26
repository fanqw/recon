import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAuth } from "@/lib/auth";
import { guardOrderDelete } from "@/lib/delete-guards";
import { handlePrismaError } from "@/lib/prisma-errors";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  purchasePlaceId: z.string().trim().min(1).optional().nullable(),
  desc: z.string().optional(),
});

/**
 * GET /api/orders/[id]：单条订单及未删除明细（含商品、分类、单位）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guardAuth();
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
 * PATCH /api/orders/[id]：更新订单名称、进货地与描述。
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guardAuth();
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
  if (purchasePlaceId) {
    const purchasePlace = await prisma.purchasePlace.findFirst({
      where: { id: purchasePlaceId, deleted: false },
      select: { id: true },
    });
    if (!purchasePlace) {
      return NextResponse.json({ error: "进货地无效" }, { status: 400 });
    }
  }
  try {
    const item = await prisma.order.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        purchasePlaceId: purchasePlaceId !== undefined ? (purchasePlaceId ?? null) : existing.purchasePlaceId,
        desc: desc !== undefined ? desc : existing.desc,
      },
      include: { purchasePlace: true },
    });
    return NextResponse.json({ item });
  } catch (e) {
    const conflict = handlePrismaError(e);
    if (conflict) return conflict;
    throw e;
  }
}

/**
 * DELETE /api/orders/[id]：逻辑删除订单。订单下存在未删除明细时返回 409，需先逐条删除明细。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.order.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  const blocked = await guardOrderDelete(id);
  if (blocked) return blocked;
  await prisma.order.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
