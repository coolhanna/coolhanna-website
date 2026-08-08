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

test("short-form operations category embeds the original room unchanged", () => {
  const page = read("app/dashboard/shorts-ops/page.tsx");
  const room = read("public/shorts-ops/shorts.html");
  const app = read("public/shorts-ops/shorts-app.js");
  const styles = read("public/shorts-ops/shorts-styles.css");
  const data = JSON.parse(read("public/shorts-ops/data/shorts-ops.json"));

  assert.ok(page.includes('src="/shorts-ops/shorts.html"'));
  for (const section of [
    "오늘 할 일",
    "판정 대기",
    "두 채널 주간판",
    "제작 중",
    "내 영상에서 배운 것",
    "오늘 볼 영상",
    "다음 실험",
  ]) {
    assert.ok(room.includes(section), `missing section: ${section}`);
  }
  assert.ok(app.includes("renderDashboard"));
  assert.ok(styles.includes(".weekly-brief"));
  assert.equal(data.todayActions.length, 3);
  assert.equal(data.channels.length, 2);
});

test("the old editing URL redirects to the short-form operations room", () => {
  const redirectPage = read("app/dashboard/editing/page.tsx");
  assert.ok(redirectPage.includes('redirect("/dashboard/shorts-ops")'));
});
