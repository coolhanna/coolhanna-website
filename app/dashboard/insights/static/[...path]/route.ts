import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const ROOT = path.join(process.cwd(), "data", "insight-dashboard");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const requested = path.resolve(ROOT, ...segments);

  if (!requested.startsWith(ROOT)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  try {
    const body = await fs.readFile(requested);
    const contentType = CONTENT_TYPES[path.extname(requested)] || "application/octet-stream";
    return new NextResponse(body, {
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
