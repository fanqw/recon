import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAuth } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma-errors";

const createSchema = z.object({
  name: z.string().min(1),
  purchasePlaceId: z.string().trim().min(1).optional(),
  desc: z.string().optional(),
});

/**
 * GET /api/orders：列出未删除订单，按更新时间倒序。
 */
export async function GET(req: Request) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
  const where = {
    deleted: false,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { desc: { contains: q, mode: "insensitive" as const } },
            { purchasePlace: { is: { place: { contains: q, mode: "insensitive" as const } } } },
            { purchasePlace: { is: { marketName: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: { purchasePlace: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}

/**
 * POST /api/orders：创建订单（名称与进货地必填，描述可选）。
 */
export async function POST(req: Request) {
  const unauthorized = await guardAuth();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
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
    const item = await prisma.order.create({
      data: { name, desc, purchasePlaceId: purchasePlaceId ?? null },
      include: { purchasePlace: true },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const conflict = handlePrismaError(e);
    if (conflict) return conflict;
    throw e;
  }
}
