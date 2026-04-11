import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonResponseForPrismaUniqueViolation } from "@/lib/prisma-errors";

const patchSchema = z.object({
  place: z.string().min(1).optional(),
  marketName: z.string().min(1).optional(),
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
 * GET /api/purchase-places/[id]：获取单条未删除进货地。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  const row = await prisma.purchasePlace.findFirst({
    where: { id, deleted: false },
  });
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item: row });
}

/**
 * PATCH /api/purchase-places/[id]：更新进货地；若传字符串字段则 trim，空则 400。
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const existing = await prisma.purchasePlace.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const data: { place?: string; marketName?: string; desc?: string | null } = {};
  if (parsed.data.place !== undefined) {
    const place = parsed.data.place.trim();
    if (!place) {
      return NextResponse.json({ error: "进货地不能为空" }, { status: 400 });
    }
    data.place = place;
  }
  if (parsed.data.marketName !== undefined) {
    const marketName = parsed.data.marketName.trim();
    if (!marketName) {
      return NextResponse.json({ error: "市场名称不能为空" }, { status: 400 });
    }
    data.marketName = marketName;
  }
  if (parsed.data.desc !== undefined) {
    data.desc = parsed.data.desc;
  }

  try {
    const row = await prisma.purchasePlace.update({
      where: { id },
      data,
    });
    return NextResponse.json({ item: row });
  } catch (e) {
    const conflict = jsonResponseForPrismaUniqueViolation(e);
    if (conflict) return conflict;
    throw e;
  }
}

/**
 * DELETE /api/purchase-places/[id]：逻辑删除进货地。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  const existing = await prisma.purchasePlace.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  await prisma.purchasePlace.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
