import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAuth } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma-errors";
import { guardUnitDelete } from "@/lib/delete-guards";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  desc: z.string().optional(),
});

/**
 * GET /api/units/[id]：获取单条单位（未删除）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const row = await prisma.unit.findFirst({
    where: { id, deleted: false },
  });
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item: row });
}

/**
 * PATCH /api/units/[id]：更新单位；若传 `name` 则先 trim，trim 后为空返回 400；改名违反未删除名称唯一时返回 409。
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
  const existing = await prisma.unit.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const data: { name?: string; desc?: string | null } = {};
  if (parsed.data.name !== undefined) {
    const name = parsed.data.name.trim();
    if (!name) {
      return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
    }
    data.name = name;
  }
  if (parsed.data.desc !== undefined) {
    data.desc = parsed.data.desc;
  }
  try {
    const row = await prisma.unit.update({
      where: { id },
      data,
    });
    return NextResponse.json({ item: row });
  } catch (e) {
    const conflict = handlePrismaError(e);
    if (conflict) return conflict;
    throw e;
  }
}

/**
 * DELETE /api/units/[id]：逻辑删除单位。
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const existing = await prisma.unit.findFirst({
    where: { id, deleted: false },
  });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const blocked = await guardUnitDelete(id);
  if (blocked) return blocked;
  await prisma.unit.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
