import assert from "node:assert/strict";
import test from "node:test";
import { briefingExcerpt, initialHomeView, isJournalMutation, readEditorDrafts, readQuickDraft, safeDashboardRoute } from "../app/dashboard/diary/home-model.ts";

test("daily opening uses Korea time around the evening boundary", () => {
  assert.equal(initialHomeView(new Date("2026-09-07T07:59:59Z")), "morning");
  assert.equal(initialHomeView(new Date("2026-09-07T08:00:00Z")), "evening");
  assert.equal(initialHomeView(new Date("2026-09-07T15:00:00Z")), "morning");
});

test("quick draft keeps an uncertain request exactly as submitted across midnight", () => {
  const attempt = { id: "request-stable", body: { text: "오늘 편집 완료, 게시 전", date: "2026-09-07", time: null, kind: "memo", author: "hanna", confirmation: "confirmed", source: "한나 다이어리" } };
  const restored = readQuickDraft(JSON.stringify({ text: "a stale display value", date: "2026-09-08", followsToday: true, kind: "task", attempt }));
  assert.deepEqual(restored, { text: attempt.body.text, date: "2026-09-07", followsToday: false, kind: "memo", attempt });
});

test("unsubmitted memo and optional task/date survive draft recovery without becoming a request", () => {
  const draft = { text: "오늘은 방향을 바꿔보자", date: "", followsToday: false, kind: "memo", attempt: null };
  assert.deepEqual(readQuickDraft(JSON.stringify(draft)), draft);
  assert.equal(readQuickDraft("{partial"), null);
  assert.equal(readQuickDraft(JSON.stringify({ ...draft, date: "2026-02-31" })), null);
  assert.equal(readQuickDraft(JSON.stringify({ ...draft, attempt: { id: "x", body: { text: "missing required fields" } } })), null);
});

test("a calendar creation draft retains its retry key without auto-submitting or accepting a new version", () => {
  const draft = { entry: null, text: "내일 대본 검토", date: "2026-09-08", time: "10:30", kind: "task", request: { id: "same-create-id", fingerprint: "same-body" } };
  assert.deepEqual(readEditorDrafts(JSON.stringify({ new: draft })), { new: draft });
  assert.deepEqual(readEditorDrafts(JSON.stringify({ wrongKey: draft })), {});
  assert.deepEqual(readEditorDrafts("broken JSON"), {});
});

test("morning excerpt preserves exact core and proposed action while omitting system diagnostics", () => {
  const source = "---\ntitle: saved briefing\n---\n# Morning\n\n## ★ 오늘 핵심\n\n첫째 줄은 확인된 원문.\n둘째 줄도 그대로.\n\n---\n\n## ⚙️ 시스템\n\ncom.example.failed 종료코드 1\n\n## 🎬 릴스\n\n긴 분석 본문\n\n### → 제안\n한 대목만 다시 비교한다.\n선택은 한나와 함께.\n\n---\n\n## 💭 생각\n뒤의 이야기";
  const excerpt = briefingExcerpt(source);
  assert.equal(excerpt, "첫째 줄은 확인된 원문.\n둘째 줄도 그대로.\n\n### 브리핑의 제안\n\n한 대목만 다시 비교한다.\n선택은 한나와 함께.");
  assert.ok(!excerpt.includes("com.example"));
  assert.ok(!excerpt.includes("긴 분석 본문"));
  assert.ok(!excerpt.includes("---"));
});

test("briefing formats without a core section still skip system sections and retain source text", () => {
  const excerpt = briefingExcerpt("# 브리핑\n## 시스템\nprivate-process-name\n## 콘텐츠\n원문의 제안\n---\n## 건강\n원문의 관찰");
  assert.ok(!excerpt.includes("private-process-name"));
  assert.ok(excerpt.includes("원문의 제안"));
  assert.ok(excerpt.includes("원문의 관찰"));
  assert.ok(briefingExcerpt("한 문장.\n\n" + "긴 근거 ".repeat(200)).length <= 701);
});

test("source navigation stays within dashboard routes", () => {
  assert.equal(safeDashboardRoute("/dashboard/briefing?date=2026-09-07", "/dashboard/briefing"), "/dashboard/briefing?date=2026-09-07");
  for (const value of ["https://outside.example", "//outside.example", "/dashboard\\outside", "/dashboard-fake"]) assert.equal(safeDashboardRoute(value, "/dashboard/briefing"), "/dashboard/briefing");
});

test("malformed save acknowledgements cannot be treated as confirmed saves", () => {
  assert.equal(isJournalMutation({ ok: true }), false);
  assert.equal(isJournalMutation({ ok: true, revision: 1, entry: { id: "x", text: "partial" } }), false);
  const entry = { id: "x", original_text: "편집 완료", text: "편집 완료", date: "2026-09-07", time: null, kind: "memo", author: "hanna", confirmation: "confirmed", source: "한나 다이어리", status: "open", version: 1, created_at: "2026-09-07T01:00:00Z", updated_at: "2026-09-07T01:00:00Z" };
  assert.equal(isJournalMutation({ ok: true, revision: 1, entry }), true);
  assert.equal(isJournalMutation({ ok: true, revision: 1, entry: { ...entry, date: "2026-02-31" } }), false);
});
