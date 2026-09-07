"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { applyIntakeAttempt, getIntakeJobs, intakeErrorMessage } from "@/lib/intake-api";
import { intakeNeedsPolling, intakeTargetRoute, isIntakeAttempt, keepNewestVersion, pinSavedIntake } from "@/lib/intake-types";
import type { IntakeAction, IntakeAttempt, IntakeJob, IntakeJobsResponse } from "@/lib/intake-types";
import styles from "./intake.module.css";

export interface SavedIntakeSource { id: string; version: number; text: string; processing: "connect" | "record" }
interface Props { refreshKey: number; savedSource: SavedIntakeSource | null; onJournalChange: () => void }
const statusLabels = { queued: "접수했어요", interpreting: "내용을 읽고 있어요", applying: "연결하고 있어요", needs_input: "이 부분만 알려 주세요", completed: "정리했어요", partial: "일부는 이어서 처리해요", failed: "정리를 마치지 못했어요", superseded: "원문이 바뀌어 새로 정리해요", undone: "반영을 되돌렸어요" } as const;
const actionLabels = { pending: "처리 대기", applying: "처리 중", applied: "반영 완료", needs_input: "확인 필요", failed: "처리 실패", skipped: "적용하지 않음", undone: "되돌림" } as const;
const kindLabels = { task: "일정·할 일", reference: "참고자료", research: "이어갈 조사", health: "건강", campaign: "협업", feedback: "바로잡기", answer: "답변" } as const;

function readStored(key: string): unknown {
  const raw = sessionStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

function IntakeQuestion({ job, action, onUpdated, onReload }: { job: IntakeJob; action: IntakeAction; onUpdated: (job: IntakeJob) => void; onReload: () => void }) {
  const storageKey = `hanna-intake-answer-v1:${job.id}:${action.id}`;
  const [text, setText] = useState("");
  const [basis, setBasis] = useState({ version: job.version, question: action.question || "" });
  const [attempt, setAttempt] = useState<IntakeAttempt | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const changed = basis.version !== job.version;
  const active = Boolean(action.question) && action.status === "needs_input" && job.status !== "superseded" && job.status !== "undone";

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = readStored(storageKey);
        if (raw && typeof raw === "object" && "text" in raw && typeof raw.text === "string" && raw.text.length <= 10000 && "version" in raw && Number.isSafeInteger(raw.version) && Number(raw.version) > 0 && "question" in raw && typeof raw.question === "string") {
          const pending = "attempt" in raw && isIntakeAttempt(raw.attempt) && raw.attempt.operation === "resolve" && raw.attempt.body.action_id === action.id ? raw.attempt : null;
          setText(pending?.body.answer || raw.text); setBasis({ version: Number(raw.version), question: raw.question }); setAttempt(pending);
          if (pending) setError("앞선 답변의 반영 여부를 같은 요청으로 확인해 주세요.");
        }
      } catch { setNotice("이 브라우저에는 답변 초안을 보관할 수 없어요. 닫기 전에 반영해 주세요."); }
      setReady(true);
    });
    return () => { active = false; };
  }, [action.id, storageKey]);

  function persist(nextText: string, nextBasis: typeof basis, pending: IntakeAttempt | null) {
    try {
      if (nextText || pending) sessionStorage.setItem(storageKey, JSON.stringify({ text: nextText, ...nextBasis, attempt: pending }));
      else sessionStorage.removeItem(storageKey);
    } catch { setNotice("이 브라우저에 답변 초안을 보관하지 못했어요. 반영 확인 전에는 창을 닫지 말아 주세요."); }
  }

  async function submit() {
    if (lock.current || !ready) return;
    if (!attempt && (!text.trim() || changed)) { setError(changed ? "바뀐 내용을 먼저 확인해 주세요. 적은 답변은 유지했어요." : "답변을 먼저 적어 주세요."); return; }
    lock.current = true; setSaving(true); setError(""); setNotice("");
    const pending = attempt || { operation: "resolve", body: { request_id: crypto.randomUUID(), expected_version: basis.version, action_id: action.id, answer: text } } satisfies IntakeAttempt;
    setAttempt(pending); persist(text, basis, pending);
    try {
      const updated = await applyIntakeAttempt(job.id, pending);
      setAttempt(null); setText(""); persist("", basis, null); setNotice("답변을 원문으로 남겼어요."); onUpdated(updated);
    } catch (failure) {
      if (failure instanceof Error && /API (409|422)/.test(failure.message)) { setAttempt(null); persist(text, basis, null); onReload(); }
      setError(intakeErrorMessage(failure, true));
    } finally { lock.current = false; setSaving(false); }
  }

  if (!active && !text && !attempt) return null;
  if (!active && !attempt) return <div className={styles.question}><p className={styles.muted}>이 확인은 이미 끝났어요. 작성하던 답변은 따로 보존했어요.</p><p>{text}</p><button type="button" onClick={() => { setText(""); persist("", basis, null); }}>남은 답변 초안 지우기</button></div>;
  return <form className={styles.question} onSubmit={event => { event.preventDefault(); void submit(); }}>
    <label htmlFor={`intake-answer-${action.id}`}>{attempt || (text && changed) ? basis.question : action.question}</label>
    {changed && text && !attempt && <div className={styles.changed}><p>답변을 쓰는 동안 처리 내용이 바뀌었어요. 현재 질문: {action.question || "새 결과를 확인해 주세요."}</p><button type="button" onClick={() => { const next = { version: job.version, question: action.question || "" }; setBasis(next); persist(text, next, null); setError(""); }}>바뀐 내용 확인 · 내 답변 유지</button></div>}
    <textarea id={`intake-answer-${action.id}`} rows={2} maxLength={10000} value={text} disabled={!ready || saving || Boolean(attempt)} onChange={event => { const nextBasis = text ? basis : { version: job.version, question: action.question || "" }; setText(event.target.value); setBasis(nextBasis); setError(""); persist(event.target.value, nextBasis, null); }} placeholder="이 부분만 편하게 알려 주세요." />
    <div className={styles.questionFooter}><span>다른 내용은 그대로 이어서 처리해요.</span><button type="submit" disabled={!ready || saving || (!attempt && Boolean(text) && changed)}>{saving ? "반영 확인 중…" : attempt ? "같은 답변으로 다시 확인" : "답변 남기기"}</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.muted} role="status">{notice}</p>}
  </form>;
}

function IntakeControls({ job, onUpdated, onReload }: { job: IntakeJob; onUpdated: (job: IntakeJob) => void; onReload: () => void }) {
  const storageKey = `hanna-intake-operation-v1:${job.id}`;
  const [attempt, setAttempt] = useState<IntakeAttempt | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try { const raw = readStored(storageKey); if (isIntakeAttempt(raw) && raw.operation !== "resolve") setAttempt(raw); }
      catch { setError("이 창에는 처리 요청을 보관할 수 없어요. 결과 확인 전에는 창을 닫지 말아 주세요."); }
      setReady(true);
    });
    return () => { active = false; };
  }, [storageKey]);

  async function apply(operation: "retry" | "undo") {
    if (lock.current || !ready) return;
    lock.current = true; setSaving(true); setError("");
    const pending = attempt || { operation, body: { request_id: crypto.randomUUID(), expected_version: job.version } } satisfies IntakeAttempt;
    setAttempt(pending);
    try { sessionStorage.setItem(storageKey, JSON.stringify(pending)); } catch { setError("이 창에 요청을 보관하지 못했어요. 결과 확인 전에는 창을 닫지 말아 주세요."); }
    try {
      const updated = await applyIntakeAttempt(job.id, pending);
      setAttempt(null); try { sessionStorage.removeItem(storageKey); } catch { /* Server acknowledgement confirms the action. */ }
      onUpdated(updated);
    } catch (failure) {
      if (failure instanceof Error && /API (409|422)/.test(failure.message)) {
        setAttempt(null); try { sessionStorage.removeItem(storageKey); } catch { /* The request was rejected. */ }
        onReload();
      }
      setError(intakeErrorMessage(failure, true));
    } finally { lock.current = false; setSaving(false); }
  }

  return <div className={styles.controls}>
    {attempt ? <button type="button" disabled={saving || !ready} onClick={() => void apply(attempt.operation === "undo" ? "undo" : "retry")}>{saving ? "결과 확인 중…" : `${attempt.operation === "undo" ? "되돌리기" : "다시 처리"} 결과 확인`}</button> : <>
      {job.retryable && <button type="button" disabled={saving || !ready} onClick={() => void apply("retry")}>정리 다시 시도</button>}
      {job.undoable && <details className={styles.undo}><summary>반영한 내용 되돌리기</summary><p>이 메모에서 연결한 내용을 되돌려요. 처음 남긴 원문은 보존하고, 이후 바뀐 기록은 확인이 필요할 수 있어요.</p><button type="button" disabled={saving || !ready} onClick={() => void apply("undo")}>연결한 내용 되돌리기</button></details>}
    </>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}

function IntakeJobCard({ job, onUpdated, onReload }: { job: IntakeJob; onUpdated: (job: IntakeJob) => void; onReload: () => void }) {
  return <article className={styles.job}>
    <div className={styles.jobHeading}><span className={styles.status} data-state={job.status}>{statusLabels[job.status]}</span><span>{new Date(job.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
    {job.summary && <p className={styles.summary}>{job.summary}</p>}
    <details className={styles.original}><summary>처음 남긴 원문</summary><p>{job.text}</p></details>
    {job.status === "superseded" && <p className={styles.muted}>이전 원문을 기준으로 한 결과예요. 최신 기록의 처리 결과를 확인해 주세요.</p>}
    {job.error && <p className={styles.error} role="alert">{job.error}</p>}
    <div className={styles.actions}>{job.actions.map(action => {
      const route = intakeTargetRoute(action.target?.route);
      return <section key={action.id} className={styles.action}>
        <div className={styles.actionMeta}><span>{kindLabels[action.kind]}</span><span data-state={action.status}>{actionLabels[action.status]}</span></div>
        <h3>{action.title}</h3>{action.message && <p>{action.message}</p>}
        {action.error && <p className={styles.error}>{action.error}</p>}
        {route && <Link className={styles.target} href={route}>연결된 내용 보기 ↗</Link>}
        {action.source_quote && <details className={styles.quote}><summary>이렇게 이해한 문장</summary><p>{action.source_quote}</p></details>}
        <IntakeQuestion job={job} action={action} onUpdated={onUpdated} onReload={onReload} />
      </section>;
    })}</div>
    <IntakeControls job={job} onUpdated={onUpdated} onReload={onReload} />
  </article>;
}

export default function IntakeInbox({ refreshKey, savedSource, onJournalChange }: Props) {
  const [data, setData] = useState<IntakeJobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [limit, setLimit] = useState(20);
  const inFlight = useRef(false);
  const sequence = useRef(0);
  const lastRevision = useRef<number | null>(null);
  const onChange = useRef(onJournalChange);
  useEffect(() => { onChange.current = onJournalChange; }, [onJournalChange]);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const current = ++sequence.current;
    try {
      const next = await getIntakeJobs(limit);
      if (savedSource?.processing === "connect" && !next.jobs.some(job => job.source_entry_id === savedSource.id && job.source_version === savedSource.version)) {
        const saved = await getIntakeJobs(20, savedSource.id);
        const matching = saved.jobs.filter(job => job.source_entry_id === savedSource.id && job.source_version === savedSource.version);
        next.jobs = pinSavedIntake(next.jobs, matching, savedSource);
        next.journal_revision = Math.max(next.journal_revision, saved.journal_revision);
      }
      next.jobs = pinSavedIntake(next.jobs, [], savedSource);
      if (current !== sequence.current) return;
      setData(current => ({ ...next, jobs: next.jobs.map(job => keepNewestVersion(current?.jobs.find(item => item.id === job.id), job)), journal_revision: Math.max(current?.journal_revision || 0, next.journal_revision) })); setError("");
      if (lastRevision.current !== null && lastRevision.current !== next.journal_revision) onChange.current();
      lastRevision.current = next.journal_revision;
    } catch (failure) { if (current === sequence.current) setError(intakeErrorMessage(failure)); }
    finally { inFlight.current = false; if (current === sequence.current) setLoading(false); }
  }, [limit, savedSource]);

  const awaitingJob = Boolean(savedSource?.processing === "connect" && !data?.jobs.some(job => job.source_entry_id === savedSource.id && job.source_version === savedSource.version));
  const active = awaitingJob || Boolean(data?.jobs.some(intakeNeedsPolling));
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => { if (mounted) void load(); });
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refreshWhenVisible, active ? 5_000 : 20_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener("focus", refreshWhenVisible); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [active, load, refreshKey]);
  useEffect(() => () => { ++sequence.current; }, []);

  const updated = useCallback((job: IntakeJob) => {
    ++sequence.current;
    setData(current => current ? { ...current, jobs: current.jobs.map(item => item.id === job.id ? keepNewestVersion(item, job) : item) } : current);
    onChange.current();
    void load();
  }, [load]);
  const jobs = data?.jobs || [];
  const visible = showAll ? jobs : jobs.filter((job, index) => index < 3 || job.status === "needs_input" || intakeNeedsPolling(job));

  return <section className={styles.inbox} aria-labelledby="intake-title">
    <div className={styles.heading}><h2 id="intake-title">남긴 내용, 이렇게 이어져요</h2><button type="button" onClick={() => void load()}>처리 상태 새로고침</button></div>
    {savedSource && <div className={styles.received} role="status"><strong>원문을 저장했어요.</strong> {savedSource.processing === "record" ? "이 메모는 정리하지 않고 기록만 남겨요." : awaitingJob ? "정리 접수를 확인하고 있어요." : "아래에서 연결된 내용을 확인할 수 있어요."}</div>}
    {data?.worker.status !== undefined && data.worker.status !== "running" && <p className={styles.workerNote} role="status">{data.worker.status === "offline" ? "정리 작업의 연결을 확인하지 못했어요. 저장된 메모는 남아 있고, 연결이 돌아오면 이어서 처리해요." : "정리 작업이 평소보다 늦어지고 있어요. 저장된 메모는 남아 있어요."}{data.worker.last_heartbeat && <span>마지막 확인 {new Date(data.worker.last_heartbeat).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })}</span>}</p>}
    {error && <div className={styles.loadError} role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>다시 불러오기</button></div>}
    {loading && !data && <p className={styles.muted}>접수한 메모와 처리 결과를 확인하고 있어요.</p>}
    {active && !error && <p className={styles.muted}>첫 정리는 1~3분을 목표로 해요. 영상 확인이나 추가 조사는 더 걸릴 수 있어요.</p>}
    {!loading && !error && jobs.length === 0 && !awaitingJob && <p className={styles.muted}>아직 정리할 메모가 없어요. 위에 일정, 생각, 링크를 함께 남겨 주세요.</p>}
    {visible.map(job => <IntakeJobCard key={job.id} job={job} onUpdated={updated} onReload={() => void load()} />)}
    {jobs.length > visible.length && <button type="button" className={styles.more} onClick={() => setShowAll(true)}>이전 처리 결과 {jobs.length - visible.length}개 더 보기</button>}
    {showAll && jobs.length > 3 && <button type="button" className={styles.more} onClick={() => setShowAll(false)}>최근 결과 위주로 보기</button>}
    {limit < 100 && jobs.length >= limit && <button type="button" className={styles.more} onClick={() => { setLimit(100); setShowAll(true); }}>더 오래된 처리 결과 불러오기 · 최대 100개</button>}
    {limit === 100 && jobs.length >= 100 && <p className={styles.muted}>확인이 필요한 내용을 먼저, 최대 100개까지 보여드려요.</p>}
  </section>;
}
