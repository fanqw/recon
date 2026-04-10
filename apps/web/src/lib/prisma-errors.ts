import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * 将 Prisma **创建或更新**时触发的唯一约束冲突（P2002）映射为 HTTP 409，便于客户端与测试断言；非此类错误返回 null 由调用方继续抛出或处理。
 */
export function jsonResponseForPrismaUniqueViolation(
  e: unknown
): NextResponse | null {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002"
  ) {
    return NextResponse.json(
      { error: "名称已存在或与现有未删除记录冲突" },
      { status: 409 }
    );
  }
  return null;
}
