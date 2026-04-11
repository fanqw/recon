import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  purchasePlaceId: z.string().trim().min(1),
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
 * GET /api/orders：列出未删除订单，按更新时间倒序。
 */
export async function GET() {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const items = await prisma.order.findMany({
    where: { deleted: false },
    include: { purchasePlace: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items });
}

/**
 * POST /api/orders：创建订单（名称与进货地必填，描述可选）。
 */
export async function POST(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const { name, desc, purchasePlaceId } = parsed.data;
  const purchasePlace = await prisma.purchasePlace.findFirst({
    where: { id: purchasePlaceId, deleted: false },
    select: { id: true },
  });
  if (!purchasePlace) {
    return NextResponse.json({ error: "进货地无效" }, { status: 400 });
  }
  const item = await prisma.order.create({
    data: { name, desc, purchasePlaceId },
    include: { purchasePlace: true },
  });
  return NextResponse.json({ item }, { status: 201 });
}
