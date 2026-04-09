import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  const path = req.nextUrl.pathname;
  const protectedPrefix = ["/basic", "/order"];
  const isProtected = protectedPrefix.some((p) => path.startsWith(p));
  if (isProtected && !session.userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/basic/:path*", "/order/:path*"],
};
