import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAuth } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma-errors";

const createSchema = z.object({
  place: z.string().trim().min(1, "进货地不能为空"),
  marketName: z.string().trim().min(1, "市场名称不能为空"),
  desc: z.string().optional(),
});

/**
 * GET /api/purchase-places：列出未删除进货地；支持 ?q= 按进货地或市场名称包含过滤（不区分大小写）。
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
            { place: { contains: q, mode: "insensitive" as const } },
            { marketName: { contains: q, mode: "insensitive" as const } },
            { desc: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.purchasePlace.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchasePlace.count({ where }),
  ]);
  return NextResponse.json({ items: rows, total, page, pageSize });
}

/**
 * POST /api/purchase-places：创建进货地（place / marketName 会 trim，空则 400）。
 */
export async function POST(req: Request) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  try {
    const row = await prisma.purchasePlace.create({
      data: { place: parsed.data.place, marketName: parsed.data.marketName, desc: parsed.data.desc },
    });
    return NextResponse.json({ item: row }, { status: 201 });
  } catch (e) {
    const conflict = handlePrismaError(e);
    if (conflict) return conflict;
    throw e;
  }
}
