import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildPurchaseView } from "../lib/purchases.ts";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const sample = {
  checkedAt: "2026-08-28T20:00:00+09:00",
  purchases: [
    { id: "light", name: "촬영 조명", source: "쿠팡", action: "촬영 전 조립", arrivalLabel: "오늘 도착", linkedTo: "토요일 촬영", category: "content" },
    { id: "mango", name: "망고 2종", source: "네이버", action: "", arrivalLabel: "내일 도착", linkedTo: "망고 비교 영상", category: "food" },
    { id: "book", name: "참고서", source: "네이버", action: "", arrivalLabel: "", linkedTo: "다음 시험 준비", category: "other" },
    { id: "water", name: "생수", source: "컬리", action: "", arrivalLabel: "", linkedTo: "", category: "household" },
  ],
  sources: [
    { id: "coupang", name: "쿠팡", detail: "확인됨", state: "connected", stateLabel: "연결됨" },
    { id: "naver", name: "네이버", detail: "연결 전", state: "pending", stateLabel: "연결 전" },
  ],
};

test("구매 항목을 다음 행동 우선으로 중복 없이 분류한다", () => {
  const view = buildPurchaseView(sample);

  assert.deepEqual(view.actionNeeded.map((item) => item.name), ["촬영 조명"]);
  assert.deepEqual(view.arriving.map((item) => item.name), ["망고 2종"]);
  assert.deepEqual(view.linked.map((item) => item.name), ["참고서"]);
  assert.deepEqual(view.routine.map((item) => item.name), ["생수"]);
});

test("연결된 구매처가 하나라도 있을 때 연결 상태를 정확히 표시한다", () => {
  const view = buildPurchaseView(sample);
  assert.equal(view.isConnected, true);
  assert.equal(view.checkedAt, "2026-08-28T20:00:00+09:00");
});

test("실제 구매 연결 전에는 빈 목록과 연결 전 상태를 유지한다", () => {
  const data = JSON.parse(read("data/purchases.json"));
  const view = buildPurchaseView(data);

  assert.equal(view.isConnected, false);
  assert.deepEqual(view.actionNeeded, []);
  assert.deepEqual(view.sources.map((source) => source.name), ["쿠팡", "네이버", "컬리"]);
});

test("산 것 탭과 개인정보 최소 표시 원칙이 화면에 포함된다", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  const board = read("app/dashboard/purchases/PurchasesBoard.tsx");
  const desk = read("app/dashboard/desk/HannaDeskBoard.tsx");

  assert.ok(nav.includes('{ label: "산 것", href: "/dashboard/purchases" }'));
  assert.ok(desk.includes('<Link href="/dashboard/purchases">산 것 보기'));
  for (const copy of ["먼저 볼 것", "오늘·곧 도착", "촬영·일정과 연결", "그냥 생활 구매", "읽기 연결"])
    assert.ok(board.includes(copy), `missing copy: ${copy}`);
  assert.ok(board.includes("가격·배송 주소·결제수단은 기본 화면에 표시하지 않습니다."));
});
