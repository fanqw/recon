import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  desc: z.string().optional(),
});

/**
 * GET /api/categories：列出未删除分类。
 */
export async function GET() {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  const rows = await prisma.category.findMany({
    where: { deleted: false },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items: rows });
}

/**
 * POST /api/categories：创建分类。
 */
export async function POST(req: Request) {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const row = await prisma.category.create({ data: parsed.data });
  return NextResponse.json({ item: row }, { status: 201 });
}
