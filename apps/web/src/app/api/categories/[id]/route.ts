import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
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
 * GET /api/categories/[id]：获取单条分类（未删除）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const row = await prisma.category.findFirst({
    where: { id, deleted: false },
  });
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item: row });
}

/**
 * PATCH /api/categories/[id]：更新分类。
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
  const existing = await prisma.category.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  const row = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ item: row });
}

/**
 * DELETE /api/categories/[id]：逻辑删除分类。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.category.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.category.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
