import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAuth } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma-errors";

const createSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空"),
  desc: z.string().optional(),
});

/**
 * GET /api/categories：列出未删除分类；支持 ?q= 按名称包含过滤（不区分大小写）。
 */
export async function GET(req: Request) {
  const unauth = await guardAuth();
  if (unauth) return unauth;
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
          ],
        }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.category.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.category.count({ where }),
  ]);
  return NextResponse.json({ items: rows, total, page, pageSize });
}

/**
 * POST /api/categories：创建分类（name 会 trim，空则 400）。
 */
export async function POST(req: Request) {
  const unauth = await guardAuth();
  if (unauth) return unauth;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  try {
    const row = await prisma.category.create({
      data: { ...parsed.data },
    });
    return NextResponse.json({ item: row }, { status: 201 });
  } catch (e) {
    const conflict = handlePrismaError(e);
    if (conflict) return conflict;
    throw e;
  }
}
