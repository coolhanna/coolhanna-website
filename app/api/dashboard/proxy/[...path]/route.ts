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
  // Next has already decoded route parameters. Reject separators and dot segments
  // before constructing a URL so normalization cannot bypass resource-specific rules.
  if (path.some(segment => !segment || segment === "." || segment === ".." || /[\\/?#\u0000-\u001f]/.test(segment))) {
    return NextResponse.json({ error: "올바르지 않은 요청 경로입니다." }, { status: 400 });
  }
  const sub = path.map(encodeURIComponent).join("/");
  // v6.5.3 — query string(?limit=50 등)도 같이 forward
  const url = `${API_URL}/api/dashboard/${sub}${req.nextUrl.search}`;
  const isJournal = path[0] === "journal";
  let body = req.method === "GET" ? undefined : await req.text();
  if (isJournal && req.method !== "GET") {
    const origin = req.headers.get("origin");
    // Next may normalize its internal URL to localhost. Host retains the browser's
    // actual destination, including the port; forwarded protocol is set by hosting.
    const requestHost = req.headers.get("host") || req.nextUrl.host;
    const requestProtocol = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
    const requestOrigin = `${requestProtocol}://${requestHost}`;
    if ((origin && origin !== requestOrigin) || req.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "같은 대시보드에서 다시 저장해 주세요." }, { status: 403 });
    }
    if (!["POST", "PATCH"].includes(req.method)) {
      return NextResponse.json({ error: "지원하지 않는 다이어리 작업입니다." }, { status: 405 });
    }
    if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ error: "JSON 형식이 필요합니다." }, { status: 415 });
    }
    if (!body || body.length > 100_000) {
      return NextResponse.json({ error: "입력 크기를 확인해 주세요." }, { status: 413 });
    }
    try {
      const fields: unknown = JSON.parse(body);
      if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("invalid body");
      // Browser writes always belong to Hanna. AI writes use the authenticated backend directly.
      body = JSON.stringify({
        ...fields,
        ...(req.method === "POST" ? { author: "hanna", confirmation: "confirmed" } : {}),
        actor: "hanna",
      });
    } catch {
      return NextResponse.json({ error: "입력 형식을 확인해 주세요." }, { status: 400 });
    }
  }
  let r: Response;
  let buf: ArrayBuffer;
  try {
    r = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
    ...(isJournal ? { signal: AbortSignal.timeout(12_000) } : {}),
    });
    buf = await r.arrayBuffer();
  } catch (error) {
    if (!isJournal) throw error;
    return NextResponse.json({ error: "다이어리 저장소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
  // arrayBuffer로 읽어 바이너리(이미지 프레임 등)도 안 깨지게 그대로 통과
  const contentType = r.headers.get("content-type") || "application/json";
  const headers: Record<string, string> = { "Content-Type": contentType };
  if (isJournal) headers["Cache-Control"] = "no-store";
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
