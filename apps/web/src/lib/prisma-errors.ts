import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * 将已知 Prisma 错误映射为 HTTP 响应：
 * - P2002 唯一约束冲突 → 409
 * - P2003 外键约束冲突 → 409
 * - P2025 记录不存在 → 404
 * 其余错误返回 null，由调用方继续抛出。
 */
export function handlePrismaError(e: unknown): NextResponse | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (e.code) {
    case "P2002":
      return NextResponse.json(
        { error: "名称已存在或与现有未删除记录冲突" },
        { status: 409 }
      );
    case "P2003":
      return NextResponse.json(
        { error: "数据存在关联，无法操作" },
        { status: 409 }
      );
    case "P2025":
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    default:
      return null;
  }
}

/** @deprecated 使用 handlePrismaError */
export const jsonResponseForPrismaUniqueViolation = handlePrismaError;
