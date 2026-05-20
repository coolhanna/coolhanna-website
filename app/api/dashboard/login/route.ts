import { NextRequest, NextResponse } from "next/server";

// 5회 실패 시 1시간 차단 — 메모리 카운터 (Vercel 콜드 스타트마다 리셋되지만
// 짧은 시간 무차별 시도 막는 용도로 충분).
const attempts: Map<string, { count: number; lockedUntil: number }> = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anon";
  const now = Date.now();
  const a = attempts.get(ip) || { count: 0, lockedUntil: 0 };

  if (a.lockedUntil > now) {
    const minutes = Math.ceil((a.lockedUntil - now) / 60000);
    return NextResponse.json({ ok: false, error: `잠금 ${minutes}분 남음` }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || "");
  const expected = process.env.DASHBOARD_PASSWORD || "";

  if (!expected) {
    return NextResponse.json({ ok: false, error: "DASHBOARD_PASSWORD 미설정" }, { status: 500 });
  }
  if (password !== expected) {
    a.count += 1;
    if (a.count >= MAX_ATTEMPTS) {
      a.lockedUntil = now + LOCK_MS;
      a.count = 0;
    }
    attempts.set(ip, a);
    return NextResponse.json({ ok: false, error: "비밀번호 틀림" }, { status: 401 });
  }

  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  // 쿠키에 expected 값 그대로 (middleware가 비교) — Production이면 https-only
  res.cookies.set("dashboard_session", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: "/",
  });
  return res;
}
