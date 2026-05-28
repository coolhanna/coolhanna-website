import { NextRequest, NextResponse } from "next/server";

// /dashboard and protected dashboard API proxy require dashboard_session.
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isDashboardProxy = pathname.startsWith("/api/dashboard/proxy");

  if (!isDashboardPage && !isDashboardProxy) return NextResponse.next();
  if (pathname === "/dashboard/login") return NextResponse.next();
  if (pathname.startsWith("/api/dashboard/login")) return NextResponse.next();

  const session = req.cookies.get("dashboard_session")?.value;
  const expected = process.env.DASHBOARD_PASSWORD || "";
  if (!expected || session !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/login";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/dashboard/proxy/:path*"],
};
