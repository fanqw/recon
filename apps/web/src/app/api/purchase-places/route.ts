import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonResponseForPrismaUniqueViolation } from "@/lib/prisma-errors";

const createSchema = z.object({
  place: z.string().min(1),
  marketName: z.string().min(1),
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
 * GET /api/purchase-places：列出未删除进货地；支持 ?q= 按进货地或市场名称包含过滤（不区分大小写）。
 */
export async function GET(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const rows = await prisma.purchasePlace.findMany({
    where: {
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
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items: rows });
}

/**
 * POST /api/purchase-places：创建进货地（place / marketName 会 trim，空则 400）。
 */
export async function POST(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const place = parsed.data.place.trim();
  const marketName = parsed.data.marketName.trim();
  if (!place || !marketName) {
    return NextResponse.json({ error: "进货地和市场名称不能为空" }, { status: 400 });
  }

  try {
    const row = await prisma.purchasePlace.create({
      data: { place, marketName, desc: parsed.data.desc },
    });
    return NextResponse.json({ item: row }, { status: 201 });
  } catch (e) {
    const conflict = jsonResponseForPrismaUniqueViolation(e);
    if (conflict) return conflict;
    throw e;
  }
}
