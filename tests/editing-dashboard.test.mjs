import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("dashboard navigation exposes the short-form operations room as a top-level category", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  assert.ok(nav.includes('{ label: "숏폼운영실", href: "/dashboard/shorts-ops" }'));
  assert.ok(!nav.includes('{ label: "편집", href: "/dashboard/editing" }'));
});

test("short-form operations room includes editing training as one section", () => {
  const page = read("app/dashboard/shorts-ops/page.tsx");
  const board = read("app/dashboard/shorts-ops/ShortsOpsBoard.tsx");

  assert.ok(page.includes("ShortsOpsBoard"));
  assert.ok(board.includes("숏폼 운영실"));
  for (const section of [
    "오늘 할 일",
    "판정 대기",
    "두 채널 주간판",
    "제작 중",
    "내 영상에서 배운 것",
    "오늘 볼 영상",
    "다음 실험",
    "편집 자동화 학습",
  ]) {
    assert.ok(board.includes(section), `missing section: ${section}`);
  }
});

test("the old editing URL redirects to the short-form operations room", () => {
  const redirectPage = read("app/dashboard/editing/page.tsx");
  assert.ok(redirectPage.includes('redirect("/dashboard/shorts-ops")'));
});
