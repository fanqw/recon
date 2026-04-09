import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * POST /api/auth/logout：销毁当前会话。
 */
export async function POST() {
  const session = await getSession();
  session.destroy();
  await session.save();
  return NextResponse.json({ ok: true });
}
