import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * POST /api/auth/logout：销毁当前会话。
 */
export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
