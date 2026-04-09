import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  unitId: z.string().min(1),
  desc: z.string().optional(),
});

async function ensureAuth() {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  return null;
}

/**
 * GET /api/commodities：列出未删除商品（含分类与单位）；支持 ?q= 按名称包含过滤（不区分大小写）。
 */
export async function GET(req: Request) {
  const unauthorized = await ensureAuth();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const rows = await prisma.commodity.findMany({
    where: {
      deleted: false,
      ...(q
        ? { name: { contains: q, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { category: true, unit: true },
  });
  return NextResponse.json({ items: rows });
}

/**
 * POST /api/commodities：创建商品，校验分类与单位存在且未删除（name 会 trim，空则 400）。
 */
export async function POST(req: Request) {
  const unauthorized = await ensureAuth();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const name = parsed.data.name.trim();
  if (!name) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }
  const { categoryId, unitId, desc } = parsed.data;
  const [cat, unit] = await Promise.all([
    prisma.category.findFirst({ where: { id: categoryId, deleted: false } }),
    prisma.unit.findFirst({ where: { id: unitId, deleted: false } }),
  ]);
  if (!cat || !unit) {
    return NextResponse.json(
      { error: "分类或单位不存在或已删除" },
      { status: 400 },
    );
  }
  const row = await prisma.commodity.create({
    data: { name, desc, categoryId, unitId },
    include: { category: true, unit: true },
  });
  return NextResponse.json({ item: row }, { status: 201 });
}
