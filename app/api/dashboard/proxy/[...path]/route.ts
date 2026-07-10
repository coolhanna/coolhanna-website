import { NextRequest, NextResponse } from "next/server";

// 클라이언트(브라우저) → Next.js proxy → Mac mini FastAPI
// 클라이언트에 API_KEY 노출 안 됨 (서버에서만 사용).
// path 자리에 'quick-task' / 'chore-todo' / 'chore-shop/toggle' 등 그대로 전달.

const API_URL = process.env.DASHBOARD_API_URL || "http://127.0.0.1:8000";
const API_KEY = process.env.DASHBOARD_API_KEY || "";

async function forward(req: NextRequest, path: string[]) {
  if (!API_KEY) {
    return NextResponse.json({ error: "DASHBOARD_API_KEY 미설정" }, { status: 500 });
  }
  const sub = path.join("/");
  // v6.5.3 — query string(?limit=50 등)도 같이 forward
  const url = `${API_URL}/api/dashboard/${sub}${req.nextUrl.search}`;
  const body = req.method === "GET" ? undefined : await req.text();
  const r = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });
  // arrayBuffer로 읽어 바이너리(이미지 프레임 등)도 안 깨지게 그대로 통과
  const contentType = r.headers.get("content-type") || "application/json";
  const buf = await r.arrayBuffer();
  const headers: Record<string, string> = { "Content-Type": contentType };
  // 프레임 이미지는 브라우저 캐시 허용(같은 프레임 재요청 방지)
  if (contentType.startsWith("image/")) {
    headers["Cache-Control"] = "public, max-age=86400, immutable";
  }
  return new NextResponse(buf, { status: r.status, headers });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path);
}
