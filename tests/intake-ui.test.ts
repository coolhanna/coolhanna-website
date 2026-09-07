import assert from "node:assert/strict";
import test from "node:test";
import { applyIntakeAttempt, getIntakeJobs } from "../lib/intake-api.ts";
import { intakeLinkedDate, intakeNeedsPolling, intakeTargetRoute, isIntakeAttempt, isIntakeJob, isIntakeJobsResponse, keepNewestVersion, pinSavedIntake } from "../lib/intake-types.ts";
import type { IntakeJob } from "../lib/intake-types.ts";
import { isJournalEntry, isJournalMutation, readEditorDrafts, readQuickDraft } from "../app/dashboard/diary/home-model.ts";
import { isIntakeCampaign, lastCampaignUpdate } from "../app/dashboard/ads/campaign-model.ts";
import { isIntakeResearchResult, safeResearchUrl } from "../app/dashboard/intake/research/research-model.ts";
import { readHannaObservations } from "../app/dashboard/health/health-model.ts";

const job: IntakeJob = { id: "job-one", source_entry_id: "memo-one", source_version: 1, version: 2, status: "partial", text: "금요일에 서류 보내기\n이 링크도 참고", created_at: "2026-09-07T10:00:00+09:00", updated_at: "2026-09-07T10:01:00+09:00", summary: "일정은 반영했고 자료를 확인하고 있어요.", error: null, retryable: false, undoable: true, actions: [
  { id: "action-one", kind: "task", title: "서류 보내기", source_quote: "금요일에 서류 보내기", status: "applied", message: "주간에 반영했어요.", question: null, target: { route: "/dashboard/diary?entry=derived-one", id: "derived-one" }, error: null },
  { id: "action-two", kind: "reference", title: "자료 확인", source_quote: "이 링크도 참고", status: "applying", message: "자료를 확인 중이에요.", question: null, target: null, error: null },
] };
const response = { jobs: [job], journal_revision: 4, worker: { status: "running", last_heartbeat: "2026-09-07T10:01:00+09:00" }, server_time: "2026-09-07T10:01:05+09:00" };

test("the just-completed memo stays visible beyond twenty unresolved jobs", async t => {
  const completed = { ...job, status: "completed" as const, version: 8 };
  const waiting = Array.from({ length: 20 }, (_, i) => ({ ...job, id: `waiting-${i}`, source_entry_id: `older-${i}`, status: "needs_input" as const }));
  const merged = pinSavedIntake(waiting, [completed], { id: job.source_entry_id, version: 1 });
  assert.equal(merged[0], completed); assert.equal(merged.length, 21);
  assert.equal(pinSavedIntake([...waiting, completed], [], { id: job.source_entry_id, version: 1 })[0], completed);
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let target = "";
  globalThis.fetch = async url => { target = String(url); return Response.json(response); };
  await getIntakeJobs(20, "memo-one");
  assert.match(target, /source_id=memo-one/);
});

test("partial receipt retains independently applied and processing actions", () => {
  assert.ok(isIntakeJob(job)); assert.ok(isIntakeJobsResponse(response)); assert.ok(intakeNeedsPolling(job));
  assert.equal(intakeNeedsPolling({ ...job, status: "needs_input", actions: [{ ...job.actions[1], status: "needs_input", question: "어떤 자료인가요?" }] }), false);
  assert.equal(isIntakeJobsResponse({ ...response, journal_revision: -1 }), false);
  assert.equal(isIntakeJobsResponse({ ...response, worker: { status: "invented", last_heartbeat: null } }), false);
  assert.equal(isIntakeJob({ ...job, actions: [{ ...job.actions[0], target: {} }] }), false);
  assert.equal(isIntakeJob({ ...job, source_version: 0 }), false);
});

test("receipt destinations are limited to dashboard routes", () => {
  assert.equal(intakeTargetRoute("/dashboard/diary?entry=one"), "/dashboard/diary?entry=one");
  for (const value of ["https://outside.example", "//outside.example", "javascript:alert(1)", "/dashboard\\outside", "/dashboard-fake"]) assert.equal(intakeTargetRoute(value), null);
});

test("uncertain intake mutation retries the exact body and rejects malformed acknowledgements", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls: string[] = [];
  const attempt = { operation: "resolve" as const, body: { request_id: "fixed-request", expected_version: 2, action_id: "action-two", answer: "  표현 참고야.\n말투를 봐줘.  " } };
  globalThis.fetch = async (_url, init) => { calls.push(String(init?.body)); return Response.json(calls.length === 1 ? { ok: true, job: { id: job.id } } : { ok: true, job }); };
  await assert.rejects(applyIntakeAttempt(job.id, attempt), /Invalid intake acknowledgement/);
  assert.deepEqual(await applyIntakeAttempt(job.id, attempt), job);
  assert.equal(calls[0], calls[1]); assert.equal(JSON.parse(calls[1]).answer, attempt.body.answer);
  globalThis.fetch = async () => Response.json({ ok: true, job: { ...job, id: "another-job" } });
  await assert.rejects(applyIntakeAttempt(job.id, attempt), /Invalid intake acknowledgement/);
  assert.ok(isIntakeAttempt(attempt)); assert.equal(isIntakeAttempt({ ...attempt, body: { ...attempt.body, answer: " " } }), false);
});

test("broken list response is an error rather than an empty inbox", async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => Response.json({ jobs: [] });
  await assert.rejects(getIntakeJobs(), /Invalid intake response/);
});

test("record-only intent survives draft recovery including an uncertain original request", () => {
  const attempt = { id: "stable", body: { text: "원문 그대로\n기록만", date: "2026-09-07", time: null, kind: "memo", author: "hanna", confirmation: "confirmed", source: "한나 다이어리", processing: "record" } };
  const restored = readQuickDraft(JSON.stringify({ text: "different", date: "2026-09-08", followsToday: true, kind: "task", processing: "connect", attempt }));
  assert.equal(restored?.processing, "record"); assert.deepEqual(restored?.attempt, attempt); assert.equal(restored?.text, attempt.body.text);
  assert.equal(readQuickDraft(JSON.stringify({ ...restored, processing: "invalid" })), null);
});

test("campaign view keeps an agreement and a later proposal as separate claims", () => {
  const agreement = { id: "old", field: "amount", value: "합의한 금액", state: "confirmed", occurred_at: "2026-09-01", agreement_quote: "이 금액으로 확정", intake: { source_id: "source-one", source_version: 1, source_quote: "이 금액으로 확정", recorded_at: "2026-09-07T10:00:00+09:00" } };
  const proposal = { ...agreement, id: "new", value: "추가 요청", state: "proposed", occurred_at: "2026-09-06", agreement_quote: "", intake: { ...agreement.intake, recorded_at: "2026-09-07T10:01:00+09:00" } };
  const campaign = { id: "case-one", brand: "테스트", account: "main", period: "2026-09", title: "9월 협업", version: 2, fields: { amount: { agreement, proposal } }, events: [agreement, proposal] };
  assert.ok(isIntakeCampaign(campaign));
  if (!isIntakeCampaign(campaign)) throw new Error("Fixture must be a valid campaign");
  assert.equal(campaign.fields.amount.agreement?.state, "confirmed");
  assert.equal(campaign.fields.amount.proposal?.state, "proposed");
  assert.equal(lastCampaignUpdate(campaign), "2026-09-07T10:01:00+09:00");
  assert.equal(isIntakeCampaign({ ...campaign, fields: { amount: { agreement: proposal } } }), false);
  assert.equal(isIntakeCampaign({ ...campaign, fields: { upload_date: { agreement } } }), false);
});

test("a late mutation acknowledgement or campaign detail cannot replace a newer version", () => {
  const current = { ...job, version: 5, status: "completed" as const };
  assert.equal(keepNewestVersion(current, job), current);
  assert.equal(keepNewestVersion(job, current), current);
  const newerCase = { id: "case-one", version: 3, agreement: "confirmed current" };
  assert.equal(keepNewestVersion(newerCase, { ...newerCase, version: 2, agreement: "old" }), newerCase);
  assert.equal(keepNewestVersion(newerCase, { id: "case-two", version: 1, agreement: "other" }).id, "case-two");
});

test("malformed derivation cannot enter journal rendering or restored editor drafts", () => {
  const entry = { id: "entry", original_text: "서류 보내기", text: "서류 보내기", date: "2026-09-07", time: null, kind: "task", author: "ai", confirmation: "confirmed", source: "한나 메모", status: "open", version: 1, created_at: "2026-09-07T10:00:00+09:00", updated_at: "2026-09-07T10:00:00+09:00" };
  const derivation = { source_entry_id: "original", source_version: 1, source_quote: "금요일에 서류 보내기", action_id: "action" };
  assert.ok(isJournalEntry({ ...entry, derivation }));
  for (const broken of [null, { ...derivation, source_quote: { broken: true } }, { ...derivation, source_version: 0 }, { ...derivation, source_entry_id: "" }]) {
    const malformed = { ...entry, derivation: broken };
    assert.equal(isJournalMutation({ ok: true, revision: 1, entry: malformed }), false);
    assert.deepEqual(readEditorDrafts(JSON.stringify({ entry: { entry: malformed, text: "초안", date: "2026-09-07", time: "", kind: "task", request: null } })), {});
  }
});

test("deep link dates are real calendar dates and body observations retain their own source", () => {
  assert.equal(intakeLinkedDate("2024-02-29"), "2024-02-29");
  for (const date of ["2026-02-29", "2026-09-31", "2026-9-7", "2026-09-07&other=1"]) assert.equal(intakeLinkedDate(date), undefined);
  const observation = { id: "one", date: "2026-09-07", text: "밤에 잘 잤더니\n몸이 가벼워", score: null, intake: { source_id: "original" } };
  assert.deepEqual(readHannaObservations([observation], "2026-09-07"), { observations: [observation], invalid: false });
  assert.deepEqual(readHannaObservations([{ ...observation, date: "2026-09-06" }], "2026-09-07"), { observations: [], invalid: true });
  assert.equal(readHannaObservations([{ ...observation, text: {} }], "2026-09-07").invalid, true);
});

test("research results distinguish archived state and successful page versus search reading", () => {
  const result = { id: "research", status: "done", summary: "요약", why_now: "지금의 이유", perspective: "관점", application: "활용", open_question: "남은 질문", generated_at: "2026-09-07T10:00:00+09:00", source: { id: "memo", version: 1, quote: "질문", date: "2026-09-07", created_at: null }, sources: [{ title: "논문", url: "https://example.org/paper", claim: "핵심", evidence: { read_level: "page_fetch" } }, { title: "조사", url: "https://example.org/report", claim: "요약", evidence: { read_level: "search_result" } }] };
  assert.ok(isIntakeResearchResult(result));
  assert.equal(isIntakeResearchResult({ ...result, status: "archived" }), false);
  assert.ok(isIntakeResearchResult({ ...result, status: "archived", archive: { reason: "원문 변경", archived_at: "2026-09-07T10:10:00+09:00" } }));
  assert.equal(isIntakeResearchResult({ ...result, sources: [{ ...result.sources[0], evidence: { read_level: "guessed" } }] }), false);
  assert.equal(safeResearchUrl("javascript:alert(1)"), null);
  assert.equal(safeResearchUrl("https://user:password@example.org"), null);
});
