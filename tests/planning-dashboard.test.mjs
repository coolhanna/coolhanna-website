import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("the shared dashboard navigation includes the planning desk", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  assert.ok(nav.includes('{ label: "기획", href: "/dashboard/planning" }'));
});

test("planning is a real dashboard route with the dense decision desk", () => {
  const page = read("app/dashboard/planning/page.tsx");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");
  const styles = read("app/dashboard/planning/planning.module.css");

  assert.ok(page.includes("planningFeed"));
  assert.ok(page.includes("planningDecisions"));
  for (const copy of ["본계정", "혜린", "먹거리", "가치관", "실제 고민", "유행·시의성", "제품·계절", "상황극", "브이로그", "비교·리뷰"]) {
    assert.ok(board.includes(copy), `missing planning filter: ${copy}`);
  }
  for (const copy of ["우선 형식", "깊이 확장", "반응 수집", "A/B 구조", "참고한 자료", "한나 의견", "발전", "형식 변경", "스토리 먼저", "보류", "버림"]) {
    assert.ok(board.includes(copy), `missing planning detail: ${copy}`);
  }
  assert.ok(styles.includes("grid-template-columns"));
  assert.ok(styles.includes("var(--accent)"));
  assert.ok(!styles.includes("#000"));
});

test("planning makes the nightly research loop, history, and follow-up actions visible", () => {
  const page = read("app/dashboard/planning/page.tsx");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");

  assert.ok(page.includes("planningFeed"));
  for (const copy of [
    "밤 조사", "아침 후보", "한나 판단", "선택 후보 발전", "성과 확인", "다음 밤 반영",
    "지난 후보", "다음 조사", "무엇을 찾았나", "무엇을 알게 됐나", "적합",
    "이 주제 더 깊게", "유사 주제 찾기", "새 주제 더 받기", "복사하고 GPT 열기",
  ]) {
    assert.ok(board.includes(copy), `missing daily planning loop copy: ${copy}`);
  }
});

test("planning decisions use the authenticated dashboard API", () => {
  const api = read("lib/dashboard-api.ts");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");

  assert.ok(api.includes("planningCandidate"));
  assert.ok(api.includes("planningDecisions"));
  assert.ok(api.includes("planningFeed"));
  assert.ok(board.includes('/api/dashboard/proxy/planning-decision'));
  assert.ok(board.includes('/api/dashboard/proxy/planning-request'));
  assert.ok(board.includes('method: "POST"'));
});
