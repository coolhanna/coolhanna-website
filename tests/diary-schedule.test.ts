import assert from "node:assert/strict";
import test from "node:test";
import type { JournalEntry } from "../lib/journal.ts";
import type { IntakeJob } from "../lib/intake-types.ts";
import { calendarTasks, dailyTaskGroups, pendingIntakeQuestions, scheduleRow } from "../app/dashboard/diary/schedule-model.ts";

const entry = (text: string, extra: Partial<JournalEntry> = {}): JournalEntry => ({ id: "one", text, original_text: text, kind: "task", author: "ai", confirmation: "confirmed", status: "open", date: "2026-09-07", time: null, version: 1, source: "메모", created_at: "2026-09-07T16:00:00+09:00", updated_at: "2026-09-07T16:00:00+09:00", ...extra });

test("calendar excludes long source memos without removing them from storage", () => {
  const memo = entry("여러 계정의 긴 음성 메모", { kind: "memo" });
  const task = entry("광고 업로드");
  const records = [memo, task];
  assert.deepEqual(calendarTasks(records), [task]);
  assert.equal(records.length, 2);
});

test("account labels are independent of collaborators mentioned in the task", () => {
  assert.equal(scheduleRow(entry("먹거리 계정 혜린이랑 요리하는 영상 업로드 — 이번 주")).account, "food");
  assert.equal(scheduleRow(entry("혜린이 계정 도도클럽 광고 업로드 — 자동 DM 설정 필요")).account, "hyerin");
  assert.equal(scheduleRow(entry("수요일 본계정 영상 2개 주촬영 — 대본 완성 후 진행")).account, "main");
  assert.equal(scheduleRow(entry("메타 행사 참석 — 장소 확인 필요")).account, "life");
});

test("short calendar label preserves action and required setup without changing the record", () => {
  const original = entry("혜린이 계정 '도도클럽' 책 광고 영상 업로드 — 자동 DM 설정 필요");
  const before = structuredClone(original);
  const row = scheduleRow(original);
  assert.equal(row.label, "도도클럽 책 광고 영상 업로드");
  assert.deepEqual(row.cues, ["자동 DM 설정 필요"]);
  assert.deepEqual(original, before);
  const scripts = scheduleRow(entry("본계정 영상 2개 대본 작성 — '절대적인 시간' 편 + 두 번째 편(주제 미정). 둘 다 10대 타겟."));
  assert.equal(scripts.cues[0], "절대적인 시간 · 주제 미정");
});

test("question desk includes unresolved questions from completed interpretations, not old versions", () => {
  const base = { id: "job", status: "needs_input", actions: [{ id: "q", status: "needs_input", question: "10대 대상은 어느 영상인가요?" }, { id: "applied", status: "applied", question: null }] } as IntakeJob;
  const old = { ...base, id: "old", status: "superseded" as const };
  assert.equal(pendingIntakeQuestions([base, old]).length, 1);
  assert.equal(pendingIntakeQuestions([{ ...base, status: "undone" }]).length, 0);
});


test("daily focus separates future and undated work and excludes stored proposals", () => {
  const today = entry("오늘 업로드");
  const overdue = entry("어제 서류", { date: "2026-09-06" });
  const future = entry("목요일 광고", { date: "2026-09-10" });
  const undated = entry("이번 주 브이로그", { date: null });
  const saved = entry("보관한 기획", { confirmation: "proposed" });
  const done = entry("끝낸 일", { status: "done" });
  const groups = dailyTaskGroups([today, future, undated, overdue, saved, done], "2026-09-07");
  assert.deepEqual(groups.due, [overdue, today]);
  assert.deepEqual(groups.upcoming, [future]);
  assert.deepEqual(groups.undated, [undated]);
  assert.deepEqual(calendarTasks([saved, done]), [done]);
});
