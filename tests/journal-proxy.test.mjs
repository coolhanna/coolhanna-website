import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const { getRouteMatcher } = require("next/dist/shared/lib/router/utils/route-matcher");
const { getRouteRegex } = require("next/dist/shared/lib/router/utils/route-regex");
const match = getRouteMatcher(getRouteRegex("/api/dashboard/proxy/[...path]"));

// Execute the real route with Next's request/response and path decoder. Compile
// only to resolve Next's extensionless server import under Node's test runner.
function loadRoute() {
  const url = new URL("../app/api/dashboard/proxy/[...path]/route.ts", import.meta.url);
  const filename = fileURLToPath(url);
  const compiled = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const compiledModule = { exports: {} };
  const previous = { url: process.env.DASHBOARD_API_URL, key: process.env.DASHBOARD_API_KEY };
  try {
    process.env.DASHBOARD_API_URL = "http://journal-backend.test";
    process.env.DASHBOARD_API_KEY = "journal-regression-test-only";
    runInThisContext(`(function(require,module,exports){${compiled.outputText}\n})`, { filename })(
      createRequire(url), compiledModule, compiledModule.exports,
    );
  } finally {
    for (const [name, value] of [["DASHBOARD_API_URL", previous.url], ["DASHBOARD_API_KEY", previous.key]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
  return compiledModule.exports;
}

const route = loadRoute();
const origin = "https://dashboard.test";

test("내부 URL이 localhost여도 브라우저가 접속한 Host와 프로토콜로 출처를 확인한다", async t => {
  const upstream = t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true }, { status: 201 }));
  const req = new NextRequest("http://localhost:3018/api/dashboard/proxy/journal", {
    method: "POST",
    headers: { "content-type": "application/json", host: "127.0.0.1:3018", origin: "http://127.0.0.1:3018", "x-forwarded-proto": "http" },
    body: JSON.stringify({ text: "정상 접속한 화면의 메모" }),
  });
  const response = await route.POST(req, { params: Promise.resolve({ path: ["journal"] }) });
  assert.equal(response.status, 201);
  assert.equal(upstream.mock.callCount(), 1);
});

function request(path = "journal", method = "POST", body = {}, headers = {}) {
  const req = new NextRequest(`${origin}/api/dashboard/proxy/${path}`, {
    method,
    headers: { "content-type": "application/json", origin, ...headers },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
  const params = match(req.nextUrl.pathname);
  assert.ok(params, "request must match the actual catch-all route");
  return route[method](req, { params: Promise.resolve(params) });
}

test("브라우저 생성은 임의 작성자 대신 한나 출처로 전달한다", async t => {
  const upstream = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://journal-backend.test/api/dashboard/journal");
    const body = JSON.parse(options.body);
    assert.equal(body.author, "hanna");
    assert.equal(body.actor, "hanna");
    assert.equal(body.confirmation, "confirmed");
    assert.equal(body.text, "오늘 원고 검토");
    return Response.json({ ok: true }, { status: 201 });
  });
  const response = await request("journal", "POST", {
    text: "오늘 원고 검토", author: "ai", actor: "ai", confirmation: "proposed",
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(upstream.mock.callCount(), 1);
});

test("수정도 한나 actor를 강제하고 충돌 응답을 보존한다", async t => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.actor, "hanna");
    assert.equal(body.expected_version, 3);
    return Response.json({ detail: "다른 곳에서 수정됨" }, { status: 409 });
  });
  const response = await request("journal/entry-id", "PATCH", { actor: "ai", expected_version: 3, status: "done" });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { detail: "다른 곳에서 수정됨" });
});

test("다른 출처의 쓰기는 백엔드에 전달하지 않는다", async t => {
  const upstream = t.mock.method(globalThis, "fetch", async () => assert.fail("blocked writes must not reach upstream"));
  for (const headers of [{ origin: "https://other.test" }, { "sec-fetch-site": "cross-site" }]) {
    const response = await request("journal", "POST", { text: "메모" }, headers);
    assert.equal(response.status, 403);
  }
  assert.equal(upstream.mock.callCount(), 0);
});

test("Next가 디코딩한 우회 경로로 작성자 보호를 건너뛸 수 없다", async t => {
  const upstream = t.mock.method(globalThis, "fetch", async () => assert.fail("invalid paths must not reach upstream"));
  for (const path of ["x%2F..%2Fjournal", "x%5C..%5Cjournal", "journal%3Fignored", "journal%23ignored", "journal%00"]) {
    const response = await request(path, "POST", { author: "ai", actor: "ai", text: "spoofed" });
    assert.equal(response.status, 400, path);
  }
  assert.equal(upstream.mock.callCount(), 0);
});

test("헤더 수신 뒤 본문이 끊겨도 JSON 503을 돌려준다", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) { controller.error(new DOMException("upstream body interrupted", "AbortError")); },
  }), { headers: { "content-type": "application/json" } }));
  const response = await request("journal?start=2026-09-01&end=2026-09-07", "GET");
  assert.equal(response.status, 503);
  assert.equal(typeof (await response.json()).error, "string");
});
