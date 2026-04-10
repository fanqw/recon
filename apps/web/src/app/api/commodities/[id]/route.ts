import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonResponseForPrismaUniqueViolation } from "@/lib/prisma-errors";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  desc: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
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
 * GET /api/commodities/[id]：获取单条商品（未删除）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const row = await prisma.commodity.findFirst({
    where: { id, deleted: false },
    include: { category: true, unit: true },
  });
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item: row });
}

/**
 * PATCH /api/commodities/[id]：更新商品；若改外键则校验分类与单位存在；若传 `name` 则先 trim，trim 后为空返回 400；更新后违反商品三元组唯一时返回 409。
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
  const existing = await prisma.commodity.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const { categoryId, unitId, name, desc } = parsed.data;
  const nextCategoryId = categoryId ?? existing.categoryId;
  const nextUnitId = unitId ?? existing.unitId;
  const [cat, unit] = await Promise.all([
    prisma.category.findFirst({ where: { id: nextCategoryId, deleted: false } }),
    prisma.unit.findFirst({ where: { id: nextUnitId, deleted: false } }),
  ]);
  if (!cat || !unit) {
    return NextResponse.json(
      { error: "分类或单位不存在或已删除" },
      { status: 400 }
    );
  }

  let nextName = existing.name;
  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
    }
    nextName = trimmed;
  }

  try {
    const row = await prisma.commodity.update({
      where: { id },
      data: {
        name: nextName,
        desc: desc !== undefined ? desc : existing.desc,
        categoryId: nextCategoryId,
        unitId: nextUnitId,
      },
      include: { category: true, unit: true },
    });
    return NextResponse.json({ item: row });
  } catch (e) {
    const conflict = jsonResponseForPrismaUniqueViolation(e);
    if (conflict) return conflict;
    throw e;
  }
}

/**
 * DELETE /api/commodities/[id]：逻辑删除商品。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.commodity.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.commodity.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
