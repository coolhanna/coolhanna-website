import { NextRequest, NextResponse } from "next/server";

// /dashboard 접근 시 dashboard_session 쿠키 체크. 없으면 /dashboard/login으로.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();
  if (pathname === "/dashboard/login") return NextResponse.next();
  if (pathname.startsWith("/api/dashboard/login")) return NextResponse.next();

  const session = req.cookies.get("dashboard_session")?.value;
  const expected = process.env.DASHBOARD_PASSWORD || "";
  if (!expected || session !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
