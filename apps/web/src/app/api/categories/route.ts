import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  desc: z.string().optional(),
});

/**
 * GET /api/categories：列出未删除分类；支持 ?q= 按名称包含过滤（不区分大小写）。
 */
export async function GET(req: Request) {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const rows = await prisma.category.findMany({
    where: {
      deleted: false,
      ...(q
        ? { name: { contains: q, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items: rows });
}

/**
 * POST /api/categories：创建分类（name 会 trim，空则 400）。
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
  const name = parsed.data.name.trim();
  if (!name) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }
  const row = await prisma.category.create({
    data: { ...parsed.data, name },
  });
  return NextResponse.json({ item: row }, { status: 201 });
}
