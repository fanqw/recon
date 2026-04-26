import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAuth } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma-errors";

const createSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空"),
  categoryId: z.string().min(1),
  unitId: z.string().min(1),
  desc: z.string().optional(),
});

/**
 * GET /api/commodities：列出未删除商品（含分类与单位）；支持 ?q= 按名称包含过滤（不区分大小写）。
 */
export async function GET(req: Request) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get("pageSize") ?? "200", 10) || 200));
  const where = {
    deleted: false,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { desc: { contains: q, mode: "insensitive" as const } },
            { category: { name: { contains: q, mode: "insensitive" as const } } },
            { unit: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.commodity.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: { category: true, unit: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.commodity.count({ where }),
  ]);
  return NextResponse.json({ items: rows, total, page, pageSize });
}

/**
 * POST /api/commodities：创建商品，校验分类与单位存在且未删除（name 会 trim，空则 400）。
 */
export async function POST(req: Request) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const { name, categoryId, unitId, desc } = parsed.data;
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
  try {
    const row = await prisma.commodity.create({
      data: { name, desc, categoryId, unitId },
      include: { category: true, unit: true },
    });
    return NextResponse.json({ item: row }, { status: 201 });
  } catch (e) {
    const conflict = handlePrismaError(e);
    if (conflict) return conflict;
    throw e;
  }
}
