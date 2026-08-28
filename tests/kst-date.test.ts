import assert from "node:assert/strict";
import test from "node:test";

import { formatKstDateKo, formatKstTimeKo, isoKst } from "../lib/kst-date.ts";

test("운영 화면의 날짜와 시각은 서버 위치와 무관하게 한국시간으로 고정된다", () => {
  const justAfterKstMidnight = new Date("2026-08-28T16:05:00.000Z");

  assert.equal(isoKst(justAfterKstMidnight), "2026-08-29");
  assert.match(formatKstDateKo(justAfterKstMidnight), /2026년 8월 29일/);
  assert.match(formatKstTimeKo(justAfterKstMidnight), /오전 1:05/);
});
