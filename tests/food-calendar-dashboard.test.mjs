import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("dashboard replaces short-form operations with the food reflection calendar", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  assert.ok(nav.includes('{ label: "먹은 것", href: "/dashboard/meals" }'));
  assert.ok(!nav.includes("숏폼운영실"));
  for (const asset of ["shorts.html", "shorts-app.js", "shorts-styles.css", "data/shorts-ops.json"]) {
    assert.ok(!fs.existsSync(path.join(root, "public/shorts-ops", asset)), `legacy asset remains: ${asset}`);
  }
});

test("food calendar exposes reflection, nutrition confidence, and immediate entry", () => {
  const page = read("app/dashboard/meals/page.tsx");
  const client = read("app/dashboard/meals/MealsCalendarClient.tsx");
  const api = read("lib/dashboard-api.ts");

  assert.ok(page.includes("foodCalendar"));
  for (const copy of ["최근 7일", "반성 포인트", "다음 한 끼", "칼로리", "단백질", "채소"]) {
    assert.ok(client.includes(copy), `missing reflection copy: ${copy}`);
  }
  assert.ok(client.includes("food-calendar/"));
  assert.ok(client.includes("추정"));
  assert.ok(api.includes("FoodCalendarResponse"));
});

test("legacy short-form URLs leave no embedded room behind", () => {
  const oldRoom = read("app/dashboard/shorts-ops/page.tsx");
  const oldEditing = read("app/dashboard/editing/page.tsx");

  assert.ok(oldRoom.includes('redirect("/dashboard/meals")'));
  assert.ok(oldEditing.includes('redirect("/dashboard/meals")'));
  assert.ok(!oldRoom.includes("iframe"));
});
