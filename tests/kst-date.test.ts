import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { formatKstDateKo, formatKstTimeKo, isoKst } from "../lib/kst-date.ts";

test("운영 화면의 날짜와 시각은 서버 위치와 무관하게 한국시간으로 고정된다", () => {
  const justAfterKstMidnight = new Date("2026-08-28T16:05:00.000Z");

  assert.equal(isoKst(justAfterKstMidnight), "2026-08-29");
  assert.match(formatKstDateKo(justAfterKstMidnight), /2026년 8월 29일/);
  assert.match(formatKstTimeKo(justAfterKstMidnight), /오전 1:05/);
});

test("실시간 시계 문구의 미세한 서버·브라우저 차이는 초기화를 깨뜨리지 않는다", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const source = fs.readFileSync(path.join(root, "app/dashboard/DashboardClient.tsx"), "utf8");

  assert.match(source, /<h1[^>]*suppressHydrationWarning/);
  assert.match(source, /<span[^>]*suppressHydrationWarning[\s\S]*?\{fmtTimeKo\(now\)\}/);
});
