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
  const board = read("app/dashboard/editing/EditingTrainingBoard.tsx");

  assert.ok(page.includes("EditingTrainingBoard"));
  assert.ok(board.includes("숏폼 운영실"));
  assert.ok(board.includes("편집 자동화 학습"));
  assert.ok(board.includes("1/8"));
  assert.ok(board.includes("대본이 있는 영상"));
  assert.ok(board.includes("대본 없는 먹거리·모녀 대화"));
  assert.ok(board.includes("다음 녹화"));
});
