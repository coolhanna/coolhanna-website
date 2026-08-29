import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("every dashboard route inherits one persistent feedback loop", () => {
  const layout = read("app/dashboard/layout.tsx");
  assert.ok(layout.includes("DashboardFeedbackLoop"));
  assert.ok(layout.includes("<DashboardFeedbackLoop"));
});

test("the shared loop stores judgment and shows processing status", () => {
  const component = read("app/dashboard/components/DashboardFeedbackLoop.tsx");
  for (const copy of [
    "맞아", "수정 필요", "빠졌어", "더 해줘", "그만 보여줘",
    "반영 대기", "전달됨", "반영 완료",
  ]) assert.ok(component.includes(copy), `missing shared feedback copy: ${copy}`);
  assert.ok(component.includes("/api/dashboard/proxy/dashboard-feedback"));
  assert.ok(component.includes('method: "POST"'));
});

test("the dashboard API exposes the shared feedback ledger", () => {
  const api = read("lib/dashboard-api.ts");
  assert.ok(api.includes("dashboardFeedback"));
  assert.ok(api.includes("DashboardFeedbackResponse"));
});
