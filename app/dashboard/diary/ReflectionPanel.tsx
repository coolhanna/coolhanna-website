"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { callApi } from "@/lib/dashboard-client";
import { journalToday } from "@/lib/journal";
import type {
  JournalEntry, JournalMutationResponse, JournalReflection, JournalReflectionItem,
  JournalReflectionsResponse, JournalReplyType, JournalReviewState,
} from "@/lib/journal";
import styles from "./reflection.module.css";

interface ReflectionPanelProps {
  onJournalChange?: () => void;
  refreshKey?: number;
}

type Attempt = { id: string; text: string; version: number; date: string };
type Draft = { text: string; version: number; attempt?: Attempt; conflict?: boolean };
type Drafts = Record<string, Draft>;

const DRAFT_STORAGE_KEY = "hanna-diary-reflection-drafts-v1";
const roleLabels = { context: "한나의 맥락", evidence: "근거", inspiration: "관점·표현 참고" };
const reasonLabels = { new_answer: "한나의 답변이 추가됐어요.", correction: "한나가 이해를 바로잡았어요.", source_changed: "바탕이 된 기록이 바뀌었어요." };

function draftKey(id: string, type: JournalReplyType): string { return `${id}:${type}`; }

function safeSourceUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

function readDrafts(): Drafts {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const restored: Drafts = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object" || typeof value.text !== "string" || value.text.length > 10000 || !Number.isInteger(value.version) || value.version < 1) continue;
      const draft: Draft = { text: value.text, version: value.version };
      const attempt = value.attempt;
      if (attempt && typeof attempt.id === "string" && /^[0-9a-f-]{36}$/i.test(attempt.id) && typeof attempt.text === "string" && attempt.text === draft.text && attempt.version === draft.version && typeof attempt.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(attempt.date)) draft.attempt = attempt;
      restored[key] = draft;
    }
    return restored;
  } catch { return {}; }
}

function messageFor(error: unknown, saving: boolean): string {
  const message = error instanceof Error ? error.message : "";
  if (/API (401|403)/.test(message)) return "로그인 상태를 확인한 뒤 다시 시도해 주세요. 작성 중인 내용은 유지했어요.";
  return saving ? "저장 여부를 확인하지 못했어요. 작성한 내용을 유지했으니 다시 저장해 주세요." : "함께 검토할 제안을 불러오지 못했어요. 다시 시도해 주세요.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isReflection(value: unknown): value is JournalReflection {
  return isRecord(value) && typeof value.title === "string" && typeof value.understanding === "string" &&
    typeof value.why_now === "string" && typeof value.question === "string" &&
    Array.isArray(value.basis) && value.basis.every(source => isRecord(source) && typeof source.entry_id === "string" && source.entry_id.length > 0 && isVersion(source.version)) &&
    Array.isArray(value.evidence) && value.evidence.every(source => isRecord(source) && typeof source.label === "string" && typeof source.detail === "string" &&
      typeof source.role === "string" && Object.hasOwn(roleLabels, source.role) && (source.url === undefined || typeof source.url === "string"));
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0 && typeof value.text === "string" && typeof value.original_text === "string" &&
    isVersion(value.version) && isTimestamp(value.created_at) && isTimestamp(value.updated_at) && typeof value.source === "string" &&
    (value.date === null || (typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date))) &&
    (value.time === null || (typeof value.time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time))) &&
    (value.kind === "memo" || value.kind === "task") && (value.author === "hanna" || value.author === "ai") &&
    (value.confirmation === "confirmed" || value.confirmation === "proposed") && (value.status === "open" || value.status === "done" || value.status === "archived") &&
    (value.review_state === undefined || value.review_state === "unreviewed" || value.review_state === "considering" || value.review_state === "dismissed") &&
    (value.reflection === undefined || isReflection(value.reflection)) &&
    (value.reply === undefined || (isRecord(value.reply) && typeof value.reply.reflection_id === "string" && value.reply.reflection_id.length > 0 &&
      isVersion(value.reply.reflection_version) && (value.reply.type === "answer" || value.reply.type === "correction")));
}

function isMutationResponse(value: unknown): value is JournalMutationResponse {
  return isRecord(value) && value.ok === true && isJournalEntry(value.entry) && typeof value.revision === "number" && Number.isInteger(value.revision) && value.revision >= 0;
}

function validateResponse(value: unknown): value is JournalReflectionsResponse {
  return isRecord(value) && Array.isArray(value.reflections) && value.reflections.every(item =>
    isRecord(item) && isJournalEntry(item.entry) && isReflection(item.entry.reflection) &&
    Array.isArray(item.replies) && item.replies.every(isJournalEntry) && isRecord(item.freshness) &&
    (item.freshness.status === "current" || item.freshness.status === "needs_review") && Array.isArray(item.freshness.reasons) &&
    item.freshness.reasons.every(reason => typeof reason === "string" && Object.hasOwn(reasonLabels, reason)),
  );
}

interface ReplyFormProps {
  entryId: string;
  entryVersion: number;
  type: JournalReplyType;
  question: string;
  draft?: Draft;
  feedback?: { text: string; error: boolean };
  saving: string;
  draftsReady: boolean;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>, type: JournalReplyType) => Promise<void>;
  onChange: (type: JournalReplyType, text: string) => void;
  onAcknowledge: (type: JournalReplyType) => void;
  onReload: () => Promise<void>;
}

function ReplyForm({ entryId, entryVersion, type, question, draft, feedback, saving, draftsReady, loading, onSubmit, onChange, onAcknowledge, onReload }: ReplyFormProps) {
  const key = draftKey(entryId, type);
  const versionChanged = Boolean(draft?.text && draft.version !== entryVersion);
  const conflict = (versionChanged && !draft?.attempt) || draft?.conflict;
  return <form onSubmit={event => void onSubmit(event, type)} className={styles.replyForm}>
    <label htmlFor={`${key}-input`}>{type === "answer" ? question : "지금의 뜻으로 바로잡기"}</label>
    <textarea id={`${key}-input`} rows={type === "answer" ? 2 : 3} maxLength={10000} value={draft?.text || ""} disabled={Boolean(saving) || !draftsReady} onChange={event => onChange(type, event.target.value)} placeholder={type === "answer" ? "내 생각을 편하게 이어서 적기" : "내 뜻은 이래. 이 부분을 다르게 이해해 줬으면 해…"} />
    {versionChanged && draft?.attempt && <p className={styles.staleNote}>이 답변은 변경 전 제안에 쓴 내용이에요. 앞선 저장 여부를 같은 답변으로 다시 확인할 수 있어요.</p>}
    {conflict && <div className={styles.conflict}>
      <p>작성하는 동안 제안이 바뀌었어요. 입력한 내용은 유지했어요.</p>
      <button type="button" disabled={Boolean(saving) || loading} onClick={() => { if (versionChanged) onAcknowledge(type); else void onReload(); }}>{versionChanged ? "최신 제안 확인 · 초안 유지" : "최신 제안 다시 불러오기"}</button>
    </div>}
    <div className={styles.replyActions}><span>한나의 원문으로 남겨요.</span><button type="submit" disabled={Boolean(saving) || !draftsReady || Boolean(conflict)}>{saving === key ? "저장 중…" : versionChanged && draft?.attempt ? "이전 답변 저장 확인" : type === "answer" ? "답변 남기기" : "이해 바로잡기"}</button></div>
    {feedback?.text && <p className={feedback.error ? styles.error : styles.notice} role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
  </form>;
}

export default function ReflectionPanel({ onJournalChange, refreshKey = 0 }: ReflectionPanelProps) {
  const [items, setItems] = useState<JournalReflectionItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [drafts, setDrafts] = useState<Drafts>({});
  const [draftsReady, setDraftsReady] = useState(false);
  const [saving, setSaving] = useState("");
  const [feedback, setFeedback] = useState<Record<string, { text: string; error: boolean }>>({});
  const [reviewConflict, setReviewConflict] = useState<string | null>(null);
  const sequence = useRef(0);
  const savingLock = useRef(false);
  const invalidateRequests = useCallback(() => { ++sequence.current; }, []);

  const reload = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setLoadError("");
    try {
      const data = await callApi<JournalReflectionsResponse>("GET", "journal/reflections?limit=10");
      if (request !== sequence.current) return;
      if (!validateResponse(data)) throw new Error("Invalid reflection response");
      setItems(data.reflections);
      setLoaded(true);
    } catch (error) {
      if (request === sequence.current) setLoadError(messageFor(error, false));
    } finally { if (request === sequence.current) setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) { setDrafts(readDrafts()); setDraftsReady(true); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draftsReady) return;
    try {
      if (Object.keys(drafts).length) sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
      else sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch { /* A blocked draft cache must not prevent server saves or erase the in-memory draft. */ }
  }, [drafts, draftsReady]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void reload(); });
    return () => { active = false; };
  }, [refreshKey, reload]);

  useEffect(() => {
    const onFocus = () => { if (!savingLock.current) void reload(); };
    const onVisibility = () => { if (document.visibilityState === "visible") onFocus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      invalidateRequests();
    };
  }, [invalidateRequests, reload]);

  const selected = items.find(item => item.entry.id === selectedId) || items[0];
  const entry = selected?.entry;
  const reflection = entry?.reflection;
  const latestCorrection = selected && reflection ? selected.replies.filter(reply => reply.reply?.type === "correction" &&
    !reflection.basis.some(source => source.entry_id === reply.id && source.version === reply.version))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] : undefined;

  function setMessage(key: string, text: string, error = false) {
    setFeedback(current => ({ ...current, [key]: { text, error } }));
  }

  function editDraft(type: JournalReplyType, text: string) {
    if (!entry) return;
    const key = draftKey(entry.id, type);
    setDrafts(current => ({ ...current, [key]: { text, version: current[key]?.version || entry.version, conflict: current[key]?.conflict } }));
    setFeedback(current => ({ ...current, [key]: { text: "", error: false } }));
  }

  async function saveReply(event: FormEvent<HTMLFormElement>, type: JournalReplyType) {
    event.preventDefault();
    if (!entry || savingLock.current) return;
    const key = draftKey(entry.id, type);
    const draft = drafts[key];
    if (!draft?.text.trim()) { setMessage(key, "한나의 뜻을 먼저 적어 주세요.", true); return; }
    if (draft.conflict || (draft.version !== entry.version && !draft.attempt)) {
      setMessage(key, "제안이 바뀌었어요. 최신 제안을 확인한 뒤 초안을 이어서 저장해 주세요.", true);
      return;
    }
    const attempt = draft.attempt || { id: crypto.randomUUID(), text: draft.text, version: draft.version, date: journalToday() };
    setDrafts(current => ({ ...current, [key]: { ...draft, attempt } }));
    savingLock.current = true;
    setSaving(key);
    setMessage(key, "서버에 저장하고 있어요.");
    try {
      const result = await callApi<JournalMutationResponse>("POST", "journal", {
        request_id: attempt.id, text: attempt.text, date: attempt.date, time: null,
        kind: "memo", author: "hanna", confirmation: "confirmed",
        source: type === "answer" ? "함께 생각할 것 · 한나의 답변" : "함께 생각할 것 · 한나의 정정",
        reply: { reflection_id: entry.id, reflection_version: attempt.version, type },
      });
      if (!isMutationResponse(result) || result.entry.reply?.reflection_id !== entry.id || result.entry.reply.type !== type ||
        result.entry.reply.reflection_version !== attempt.version || result.entry.author !== "hanna" || result.entry.kind !== "memo" || result.entry.confirmation !== "confirmed") {
        throw new Error("Invalid saved reply response");
      }
      ++sequence.current;
      setDrafts(current => { const next = { ...current }; delete next[key]; return next; });
      setItems(current => current.map(item => item.entry.id === entry.id ? {
        ...item,
        replies: [...item.replies.filter(reply => reply.id !== result.entry.id), result.entry],
        freshness: { status: "needs_review", reasons: [...new Set([...item.freshness.reasons, type === "answer" ? "new_answer" as const : "correction" as const])] },
      } : item));
      setMessage(key, type === "answer" ? "답변을 원문으로 저장했어요." : "정정을 원문으로 저장했어요. 이전 이해와 기록도 남겼어요.");
      onJournalChange?.();
      await reload();
    } catch (error) {
      if (error instanceof Error && error.message.includes("API 409")) {
        setDrafts(current => ({ ...current, [key]: { ...draft, conflict: true } }));
        setMessage(key, "다른 곳에서 제안이 바뀌었어요. 초안은 그대로 두었으니 최신 제안을 확인해 주세요.", true);
        await reload();
      } else setMessage(key, messageFor(error, true), true);
    } finally { savingLock.current = false; setSaving(""); }
  }

  async function toggleConsideration() {
    if (!entry || savingLock.current) return;
    const key = `${entry.id}:review`;
    const reviewState: JournalReviewState = entry.review_state === "considering" ? "unreviewed" : "considering";
    savingLock.current = true;
    setSaving(key);
    setMessage(key, "서버에 저장하고 있어요.");
    try {
      const result = await callApi<JournalMutationResponse>("PATCH", `journal/${encodeURIComponent(entry.id)}`, { actor: "hanna", expected_version: entry.version, review_state: reviewState });
      if (!isMutationResponse(result) || result.entry.id !== entry.id || !isReflection(result.entry.reflection) || result.entry.review_state !== reviewState) {
        throw new Error("Invalid saved reflection response");
      }
      ++sequence.current;
      setItems(current => current.map(item => item.entry.id === entry.id ? { ...item, entry: result.entry } : item));
      setReviewConflict(null);
      setMessage(key, reviewState === "considering" ? "검토할 제안으로 저장했어요." : "검토 목록에서 뺐어요.");
      onJournalChange?.();
      await reload();
    } catch (error) {
      if (error instanceof Error && error.message.includes("API 409")) {
        setReviewConflict(entry.id);
        setMessage(key, "제안이 바뀌어 선택을 적용하지 않았어요. 최신 내용을 확인한 뒤 다시 선택해 주세요.", true);
        await reload();
      } else setMessage(key, messageFor(error, true), true);
    } finally { savingLock.current = false; setSaving(""); }
  }

  function acknowledgeVersion(type: JournalReplyType) {
    if (!entry) return;
    const key = draftKey(entry.id, type);
    if (drafts[key]?.attempt) return;
    setDrafts(current => ({ ...current, [key]: { text: current[key]?.text || "", version: entry.version } }));
    setMessage(key, "최신 제안을 확인했어요. 초안을 검토한 뒤 저장해 주세요.");
  }

  return <section className={styles.panel} aria-labelledby="reflection-panel-title">
    <div className={styles.panelHeading}><div><p className={styles.eyebrow}>기록에서 한 걸음 더</p><h2 id="reflection-panel-title">함께 생각할 것</h2></div><button type="button" className={styles.quietButton} onClick={() => void reload()} disabled={loading || Boolean(saving)}>{loading ? "불러오는 중…" : "제안 새로고침"}</button></div>
    {loadError && <div className={styles.loadError} role="alert"><p>{loadError}</p><button type="button" onClick={() => void reload()} disabled={loading}>다시 불러오기</button></div>}
    {!loaded && loading && <p className={styles.empty} role="status">저장된 제안과 한나의 답변을 읽고 있어요.</p>}
    {loaded && !items.length && !loadError && <div className={styles.empty}><p>아직 함께 검토할 제안이 없어요.</p><span>메모를 읽고 준비한 관점과 근거, 한나에게 묻고 싶은 것을 이곳에서 이어가요.</span></div>}
    {selected && entry && reflection && <>
      {items.length > 1 && <div className={styles.selector}><label htmlFor="reflection-selection">함께 검토할 제안</label><select id="reflection-selection" value={entry.id} onChange={event => setSelectedId(event.target.value)} disabled={Boolean(saving)}>{items.map(item => <option key={item.entry.id} value={item.entry.id}>{item.entry.reflection?.title || item.entry.text.slice(0, 50)}{item.entry.review_state === "considering" ? " · 검토 중" : ""}</option>)}</select></div>}
      <div className={styles.reflectionLayout}>
        <article className={styles.advice} aria-labelledby={`reflection-title-${entry.id}`}>
          <div className={styles.adviceMeta}><span>AI가 제안한 관점</span><strong>{loadError ? "최신 상태 확인 필요" : selected.freshness.status === "needs_review" ? "다시 검토 필요" : "한나와 검토할 제안"}</strong></div>
          <h3 id={`reflection-title-${entry.id}`}>{reflection.title}</h3>
          <p className={styles.adviceText}>{entry.text}</p>
          {selected.freshness.status === "needs_review" && <p className={styles.staleNote}>{selected.freshness.reasons.map(reason => reasonLabels[reason]).filter(Boolean).join(" ")} 현재 제안을 그대로 확정하지 않고 다시 살펴봐야 해요.</p>}
          {reflection.why_now && <div className={styles.whyNow}><span>왜 지금 이 제안인가</span><p>{reflection.why_now}</p></div>}
          <details className={styles.evidence}><summary>근거와 생각 보기 <span>{reflection.evidence.length}개</span></summary><div>{reflection.evidence.length ? reflection.evidence.map((source, index) => { const url = safeSourceUrl(source.url); return <section key={`${source.label}-${index}`}><span>{roleLabels[source.role]}</span><h4>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a> : source.label}</h4><p>{source.detail}</p></section>; }) : <p className={styles.noEvidence}>아직 연결된 근거가 없어요. 제안의 근거를 확인할 차례예요.</p>}</div></details>
          {reflection.question && <ReplyForm entryId={entry.id} entryVersion={entry.version} type="answer" question={reflection.question} draft={drafts[draftKey(entry.id, "answer")]} feedback={feedback[draftKey(entry.id, "answer")]} saving={saving} draftsReady={draftsReady} loading={loading} onSubmit={saveReply} onChange={editDraft} onAcknowledge={acknowledgeVersion} onReload={reload} />}
          <div className={styles.consideration}><button type="button" aria-pressed={entry.review_state === "considering"} disabled={Boolean(saving)} onClick={() => void toggleConsideration()}>{saving === `${entry.id}:review` ? "저장 중…" : entry.review_state === "considering" ? "검토 목록에서 빼기" : "검토할 제안으로 담기 →"}</button><span>{entry.review_state === "considering" ? "검토 중" : entry.review_state === "dismissed" ? "보류한 제안" : "대본 작성이나 일정 확정은 별도예요."}</span></div>
          {reviewConflict === entry.id && <p className={styles.staleNote}>최신 제안을 읽은 뒤, 위 버튼으로 검토 여부를 다시 선택해 주세요.</p>}
          {feedback[`${entry.id}:review`]?.text && <p className={feedback[`${entry.id}:review`].error ? styles.error : styles.notice} role={feedback[`${entry.id}:review`].error ? "alert" : "status"}>{feedback[`${entry.id}:review`].text}</p>}
        </article>
        <aside className={styles.understanding}>
          <h3>내가 이해한 한나</h3>
          {latestCorrection ? <><span className={styles.correctedLabel}>한나가 바로잡은 뜻 · AI 재검토 전</span><p className={styles.understandingText}>{latestCorrection.text}</p><details className={styles.previousUnderstanding}><summary>이전 이해 보기</summary><p>{reflection.understanding}</p></details></> : <p className={styles.understandingText}>{reflection.understanding}</p>}
          <details className={styles.correction}><summary>내 뜻과 달라요</summary><ReplyForm entryId={entry.id} entryVersion={entry.version} type="correction" question={reflection.question} draft={drafts[draftKey(entry.id, "correction")]} feedback={feedback[draftKey(entry.id, "correction")]} saving={saving} draftsReady={draftsReady} loading={loading} onSubmit={saveReply} onChange={editDraft} onAcknowledge={acknowledgeVersion} onReload={reload} /></details>
          {selected.replies.length > 0 && <details className={styles.replyHistory}><summary>주고받은 기록 · {selected.replies.length}</summary><div>{[...selected.replies].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(reply => <div key={reply.id}><span>한나의 {reply.reply?.type === "correction" ? "정정" : "답변"}</span><p>{reply.text}</p></div>)}</div></details>}
        </aside>
      </div>
    </>}
  </section>;
}
