import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken, safeEqual } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token && safeEqual(token, await adminToken())) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
