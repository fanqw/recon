import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getSession } from "./session";

/**
 * 返回当前登录用户；未登录返回 null。
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return prisma.user.findFirst({
    where: { id: session.userId },
    select: { id: true, username: true, createdAt: true },
  });
}

/**
 * 要求已登录；否则抛出带 status 的错误供 Route Handler 映射为 401。
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}

/**
 * Route Handler 认证守卫：未登录返回 401 响应，已登录返回 null。
 *
 * @example
 * const unauth = await guardAuth();
 * if (unauth) return unauth;
 */
export async function guardAuth(): Promise<NextResponse | null> {
  try {
    await requireUser();
    return null;
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
}
