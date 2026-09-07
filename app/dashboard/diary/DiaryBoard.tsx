"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { callApi } from "@/lib/dashboard-client";
import {
  addDays, formatDay, journalToday, monthDates, monthTitle, shiftMonth, startOfWeek, weekDates,
} from "@/lib/journal";
import type { JournalEntry, JournalMutationResponse, JournalResponse } from "@/lib/journal";
import styles from "./diary.module.css";
import ReflectionPanel from "./ReflectionPanel";
import DayContext from "./DayContext";
import { EDITOR_DRAFT_KEY, initialHomeView, isJournalMutation, QUICK_DRAFT_KEY, readEditorDrafts, readQuickDraft } from "./home-model";
import type { HomeView, JournalContext, QuickDraft, SavedEditorDraft } from "./home-model";

type Kind = "memo" | "task";
type Editor = {
  entry: JournalEntry | null;
  text: string;
  date: string;
  time: string;
  kind: Kind;
  error: string;
  conflict: JournalEntry | null;
};
type RequestKey = { fingerprint: string; id: string };

function errorMessage(error: unknown, saving = false): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("API 401") || message.includes("API 403")) {
    return "로그인 상태를 확인한 뒤 다시 시도해 주세요. 적고 있던 내용은 그대로 있어요.";
  }
  return saving
    ? "저장 여부를 확인하지 못했어요. 적은 내용은 유지했으니 다시 시도해 주세요."
    : "기록을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.";
}

function authorLabel(entry: JournalEntry): string {
  if (entry.author === "ai") return entry.confirmation === "proposed" ? "AI 제안" : "AI · 한나 확인";
  if (entry.reply) return entry.reply.type === "correction" ? "한나 · 뜻 고치기" : "한나 · 질문에 답변";
  return "한나";
}

function sortEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    if (a.status !== b.status) return a.status === "done" ? 1 : -1;
    return (a.time || "99:99").localeCompare(b.time || "99:99") || a.created_at.localeCompare(b.created_at);
  });
}

function newRequestKey(previous: RequestKey | null, body: unknown): RequestKey {
  const fingerprint = JSON.stringify(body);
  return previous?.fingerprint === fingerprint
    ? previous
    : { fingerprint, id: crypto.randomUUID() };
}

export default function DiaryBoard({ today: initialToday, initialView = "morning" }: { today: string; initialView?: "morning" | "evening" }) {
  const [today, setToday] = useState(initialToday);
  const [mode, setMode] = useState<HomeView>(initialView);
  const [anchor, setAnchor] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadedRange, setLoadedRange] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [reflectionRefresh, setReflectionRefresh] = useState(0);
  const [actionError, setActionError] = useState("");
  const [quickText, setQuickText] = useState("");
  const [quickDate, setQuickDate] = useState(today);
  const [quickDateFollowsToday, setQuickDateFollowsToday] = useState(true);
  const [quickKind, setQuickKind] = useState<Kind>("memo");
  const [quickError, setQuickError] = useState("");
  const [draftsReady, setDraftsReady] = useState(false);
  const [draftWarning, setDraftWarning] = useState("");
  const [quickAttempt, setQuickAttempt] = useState<QuickDraft["attempt"]>(null);
  const [composerOptions, setComposerOptions] = useState(false);
  const [context, setContext] = useState<JournalContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorDrafts, setEditorDrafts] = useState<Record<string, SavedEditorDraft>>({});
  const [failedAction, setFailedAction] = useState<{ id: string; patch: Partial<JournalEntry> } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorKey = useRef<RequestKey | null>(null);
  const contextSequence = useRef(0);
  const invalidateContext = useCallback(() => { ++contextSequence.current; }, []);
  const requestSequence = useRef(0);
  const saveLock = useRef(false);
  const currentRange = useRef("");

  const calendarMode = mode === "week" || mode === "month";
  const dates = useMemo(() => mode === "month" ? monthDates(anchor) : weekDates(calendarMode ? anchor : today), [anchor, mode, today, calendarMode]);
  const range = `${dates[0]}:${dates[dates.length - 1]}`;
  const ready = !loading && !loadError && loadedRange === range;
  const activeEntries = useMemo(() => entries.filter(entry => entry.status !== "archived" && !entry.reflection), [entries]);
  const undated = useMemo(() => sortEntries(activeEntries.filter(entry => !entry.date)), [activeEntries]);
  const dayEntries = useCallback((date: string) => sortEntries(activeEntries.filter(entry => entry.date === date)), [activeEntries]);
  const proposals = activeEntries.filter(entry => entry.author === "ai" && entry.confirmation === "proposed");
  const editorRetryPending = Boolean(editor && !editor.entry && editorDrafts.new?.request);

  const loadContext = useCallback(async () => {
    const sequence = ++contextSequence.current;
    setContextLoading(true);
    setContextError("");
    setContext(current => current?.date === today ? current : null);
    try {
      const data = await callApi<JournalContext>("GET", `journal/context?date=${today}`);
      if (sequence !== contextSequence.current) return;
      if (data.date !== today || !data.current_focus || !data.briefing || !Array.isArray(data.open_tasks?.entries) || !Array.isArray(data.questions?.items)) throw new Error("Invalid daily context");
      setContext(data);
    } catch (error) {
      if (sequence === contextSequence.current) setContextError(errorMessage(error));
    } finally { if (sequence === contextSequence.current) setContextLoading(false); }
  }, [today]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const draft = readQuickDraft(localStorage.getItem(QUICK_DRAFT_KEY));
        setEditorDrafts(readEditorDrafts(sessionStorage.getItem(EDITOR_DRAFT_KEY)));
        if (draft) {
          setQuickText(draft.text); setQuickDate(draft.followsToday ? journalToday() : draft.date);
          setQuickDateFollowsToday(draft.followsToday); setQuickKind(draft.kind); setQuickAttempt(draft.attempt);
          if (draft.attempt) setQuickError("앞선 저장 결과를 확인하지 못했어요. 같은 기록으로 다시 확인해 주세요.");
          setNotice(draft.attempt ? "앞선 저장 결과를 확인해야 해요. 같은 기록으로 다시 확인하면 중복 저장되지 않아요." : "이 창에서 쓰던 메모를 이어서 불러왔어요.");
          setComposerOptions(Boolean(draft.attempt) || !draft.followsToday || draft.kind === "task");
        }
      } catch { setDraftWarning("이 브라우저에서는 초안을 보관할 수 없어요. 창을 닫기 전에 저장해 주세요."); }
      setDraftsReady(true);
      setMode(initialHomeView());
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draftsReady) return;
    let active = true;
    try {
      if (quickText || quickAttempt) localStorage.setItem(QUICK_DRAFT_KEY, JSON.stringify({ text: quickText, date: quickDate, followsToday: quickDateFollowsToday, kind: quickKind, attempt: quickAttempt }));
      else localStorage.removeItem(QUICK_DRAFT_KEY);
    } catch { queueMicrotask(() => { if (active) setDraftWarning("이 브라우저에 초안을 보관하지 못했어요. 창을 닫기 전에 저장해 주세요."); }); }
    return () => { active = false; };
  }, [draftsReady, quickText, quickDate, quickDateFollowsToday, quickKind, quickAttempt]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void loadContext(); });
    return () => { active = false; invalidateContext(); };
  }, [invalidateContext, loadContext]);

  const refreshToday = useCallback(() => {
    const current = journalToday();
    if (current === today) return;
    setToday(current);
    setAnchor(previous => {
      const followingCurrentPeriod = mode === "week"
        ? startOfWeek(previous) === startOfWeek(today)
        : previous.slice(0, 7) === today.slice(0, 7);
      return followingCurrentPeriod ? current : previous;
    });
    setSelectedDate(previous => previous === today ? current : previous);
    if (quickDateFollowsToday) setQuickDate(current);
  }, [mode, quickDateFollowsToday, today]);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const requestedRange = currentRange.current;
    const [start, end] = requestedRange.split(":");
    setLoading(true);
    setLoadError("");
    try {
      const data = await callApi<JournalResponse>("GET", `journal?start=${start}&end=${end}&include_undated=true`);
      if (sequence !== requestSequence.current || requestedRange !== currentRange.current) return;
      if (!Array.isArray(data.entries)) throw new Error("Invalid journal response");
      setEntries(data.entries);
      setLoadedRange(requestedRange);
    } catch (error) {
      if (sequence === requestSequence.current) setLoadError(errorMessage(error));
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    currentRange.current = range;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load, range]);
  useEffect(() => {
    const refreshOnReturn = () => { if (!saveLock.current) { void load(); void loadContext(); } };
    window.addEventListener("focus", refreshOnReturn);
    return () => { window.removeEventListener("focus", refreshOnReturn); };
  }, [load, loadContext]);
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshToday();
    };
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshToday]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (editor && dialog && !dialog.open) dialog.showModal();
    if (!editor && dialog?.open) dialog.close();
  }, [editor]);

  function beginSave(): boolean {
    if (saveLock.current) return false;
    saveLock.current = true;
    setSaving(true);
    setActionError("");
    setNotice("");
    return true;
  }

  function finishSave() {
    saveLock.current = false;
    setSaving(false);
  }

  function acceptSaved(entry: JournalEntry) {
    setReflectionRefresh(value => value + 1);
    ++requestSequence.current;
    setEntries(current => [...current.filter(item => item.id !== entry.id), entry]);
    setContext(current => current ? { ...current, open_tasks: { ...current.open_tasks, entries: current.open_tasks.entries.filter(item => item.id !== entry.id).concat(entry.kind === "task" && entry.status === "open" && entry.confirmation === "confirmed" ? [entry] : []) } } : current);
    void loadContext();
    setNotice("서버에 저장했어요.");
  }

  async function saveQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftsReady || (!quickAttempt && !quickText.trim())) { setQuickError("남길 내용을 먼저 적어 주세요."); return; }
    if (!beginSave()) return;
    setQuickError("");
    const date = quickDateFollowsToday ? journalToday() : quickDate;
    refreshToday();
    const attempt = quickAttempt || { id: crypto.randomUUID(), body: { text: quickText, date: date || null, time: null, kind: quickKind, author: "hanna", confirmation: "confirmed", source: "한나 다이어리" } } satisfies NonNullable<QuickDraft["attempt"]>;
    setQuickAttempt(attempt);
    setQuickDate(attempt.body.date || ""); setQuickDateFollowsToday(false);
    try { localStorage.setItem(QUICK_DRAFT_KEY, JSON.stringify({ text: attempt.body.text, date: attempt.body.date || "", followsToday: false, kind: attempt.body.kind, attempt })); }
    catch { setDraftWarning("이 브라우저에 초안을 보관하지 못했어요. 저장 확인 전에는 창을 닫지 말아 주세요."); }
    try {
      const result = await callApi<JournalMutationResponse>("POST", "journal", { ...attempt.body, request_id: attempt.id });
      if (!isJournalMutation(result) || result.entry.author !== "hanna" || result.entry.kind !== attempt.body.kind || result.entry.date !== attempt.body.date) throw new Error("Invalid saved journal response");
      acceptSaved(result.entry);
      setQuickText("");
      setQuickAttempt(null);
      setQuickDate(journalToday()); setQuickDateFollowsToday(true); setQuickKind("memo");
      try { localStorage.removeItem(QUICK_DRAFT_KEY); } catch { /* The visible result is still confirmed by the server. */ }
      await load();
    } catch (error) {
      setQuickError(errorMessage(error, true));
    } finally { finishSave(); }
  }

  function openNew(date: string) {
    if (editorDrafts.new) { resumeEditor(editorDrafts.new); return; }
    editorKey.current = null;
    if (date) setSelectedDate(date);
    setEditor({ entry: null, text: "", date, time: "", kind: "memo", error: "", conflict: null });
  }

  function openEntry(entry: JournalEntry) {
    if (editorDrafts[entry.id]) { resumeEditor(editorDrafts[entry.id]); return; }
    editorKey.current = null;
    setEditor({ entry, text: entry.text, date: entry.date || "", time: entry.time || "", kind: entry.kind, error: "", conflict: null });
  }

  function updateEditor(patch: Partial<Editor>) {
    if (!editor) return;
    const next = { ...editor, ...patch };
    setEditor(next);
    cacheEditor(next);
  }

  function writeEditorDrafts(next: Record<string, SavedEditorDraft>) {
    setEditorDrafts(next);
    try {
      if (Object.keys(next).length) sessionStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(EDITOR_DRAFT_KEY);
    } catch { setDraftWarning("이 브라우저에 수정 초안을 보관하지 못했어요. 창을 닫기 전에 저장해 주세요."); }
  }

  function cacheEditor(draft: Editor, request = editorKey.current) {
    const key = draft.entry?.id || "new";
    const changed = draft.entry ? draft.text !== draft.entry.text || draft.date !== (draft.entry.date || "") || draft.time !== (draft.entry.time || "") || draft.kind !== draft.entry.kind : Boolean(draft.text.trim());
    const next = { ...editorDrafts };
    if (changed || request) next[key] = { entry: draft.entry, text: draft.text, date: draft.date, time: draft.time, kind: draft.kind, request };
    else delete next[key];
    writeEditorDrafts(next);
  }

  function resumeEditor(draft: SavedEditorDraft) {
    editorKey.current = draft.request;
    setEditor({ entry: draft.entry, text: draft.text, date: draft.date, time: draft.time, kind: draft.kind, conflict: null, error: draft.request ? "앞선 저장 결과를 확인하지 못했어요. 같은 내용으로 다시 저장해 주세요." : "" });
  }

  function discardEditorDraft(key: string) {
    const next = { ...editorDrafts };
    delete next[key];
    writeEditorDrafts(next);
  }

  async function findLatest(id: string): Promise<JournalEntry | null> {
    const data = await callApi<JournalMutationResponse>("GET", `journal/${encodeURIComponent(id)}`);
    return data.entry;
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !editor.text.trim()) { updateEditor({ error: "남길 내용을 먼저 적어 주세요." }); return; }
    if (!beginSave()) return;
    const draft = editor;
    updateEditor({ error: "", conflict: null });
    const content = {
      text: draft.text, date: draft.date || null, time: draft.date && draft.time ? draft.time : null, kind: draft.kind,
      ...(draft.entry?.status === "done" && draft.kind === "memo" ? { status: "open" as const } : {}),
    };
    try {
      let result: JournalMutationResponse;
      if (draft.entry) {
        result = await callApi<JournalMutationResponse>("PATCH", `journal/${encodeURIComponent(draft.entry.id)}`, { ...content, actor: "hanna", expected_version: draft.entry.version });
      } else {
        const body = { ...content, author: "hanna", confirmation: "confirmed", source: "한나 다이어리" };
        editorKey.current = newRequestKey(editorKey.current, body);
        cacheEditor(draft, editorKey.current);
        result = await callApi<JournalMutationResponse>("POST", "journal", { ...body, request_id: editorKey.current.id });
      }
      if (!isJournalMutation(result) || (draft.entry ? result.entry.id !== draft.entry.id : result.entry.author !== "hanna") || result.entry.kind !== draft.kind || result.entry.date !== (draft.date || null)) throw new Error("Invalid saved journal response");
      acceptSaved(result.entry);
      discardEditorDraft(draft.entry?.id || "new");
      setEditor(null);
      editorKey.current = null;
      await load();
    } catch (error) {
      if (error instanceof Error && error.message.includes("API 409") && draft.entry) {
        let latest: JournalEntry | null = null;
        try { latest = await findLatest(draft.entry.id); } catch { /* Keep the draft when the refresh also fails. */ }
        updateEditor({ error: "다른 곳에서 이 기록이 바뀌었어요. 적은 내용은 유지했어요. 최신 기록을 확인한 뒤 다시 저장해 주세요.", conflict: latest });
      } else updateEditor({ error: errorMessage(error, true) });
    } finally { finishSave(); }
  }

  async function changeEntry(entry: JournalEntry, patch: Partial<JournalEntry>) {
    if (!beginSave()) return;
    setFailedAction(null);
    try {
      const result = await callApi<JournalMutationResponse>("PATCH", `journal/${encodeURIComponent(entry.id)}`, { ...patch, actor: "hanna", expected_version: entry.version });
      if (!isJournalMutation(result) || result.entry.id !== entry.id || Object.entries(patch).some(([key, value]) => result.entry[key as keyof JournalEntry] !== value)) throw new Error("Invalid updated journal response");
      acceptSaved(result.entry);
      await load();
    } catch (error) {
      if (error instanceof Error && error.message.includes("API 409")) {
        setActionError("다른 곳에서 기록이 바뀌어 적용하지 않았어요. 최신 내용을 확인한 뒤 다시 선택해 주세요.");
        await load();
        await loadContext();
      } else {
        setActionError(errorMessage(error, true));
        setFailedAction({ id: entry.id, patch });
      }
    } finally { finishSave(); }
  }

  function closeEditor() {
    if (!saving) setEditor(null);
  }

  function movePeriod(amount: number) {
    const date = mode === "week" ? addDays(anchor, amount * 7) : shiftMonth(anchor, amount);
    setAnchor(date);
    setSelectedDate(date);
  }

  function goWeek(offset: number) {
    const current = journalToday();
    refreshToday();
    const date = addDays(startOfWeek(current), offset * 7);
    setMode("week");
    setAnchor(date);
    setSelectedDate(offset === 0 ? current : date);
  }

  function renderEntry(entry: JournalEntry, compact = false) {
    return (
      <article key={entry.id} className={`${styles.entry} ${entry.status === "done" ? styles.done : ""} ${entry.confirmation === "proposed" ? styles.proposed : ""}`}>
        <div className={styles.entryMeta}>
          <span>{authorLabel(entry)}</span><span>{entry.kind === "memo" ? "메모" : "할 일"}{entry.time ? ` · ${entry.time}` : ""}</span>
        </div>
        <div className={styles.entryBody}>
          {entry.kind === "task" && entry.confirmation === "confirmed" && <input type="checkbox" checked={entry.status === "done"} disabled={saving} aria-label={`${entry.text.slice(0, 60)} 완료`} onChange={() => void changeEntry(entry, { status: entry.status === "done" ? "open" : "done" })} />}
          <button type="button" className={`${styles.entryText} ${compact ? styles.compactText : ""}`} onClick={() => openEntry(entry)} aria-label={`기록 수정: ${entry.text.slice(0, 80)}`}>{entry.text}</button>
        </div>
        {entry.confirmation === "proposed" && <button type="button" className={styles.confirmButton} disabled={saving} onClick={() => void changeEntry(entry, { confirmation: "confirmed" })}>한나가 확인 · 확정하기</button>}
      </article>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>HANNA’S NOTEBOOK</p><h1>오늘, 한나</h1><p className={styles.headerDescription}>{formatDay(today)} · 생각을 맞추고, 내 속도로 하루를.</p></div>
          <div className={styles.todayMark}><span>{today.slice(5, 7)}월</span><strong>{Number(today.slice(8))}</strong><span>{["일", "월", "화", "수", "목", "금", "토"][new Date(`${today}T00:00:00Z`).getUTCDay()]}요일</span></div>
        </header>

        <div className={styles.focusLine}><span>지금의 방향</span><p>{context?.current_focus.status === "available" ? <><strong>{context.current_focus.account_name}</strong> · 팔로워 {context.current_focus.target?.toLocaleString("ko-KR")}명</> : contextLoading ? "현재 목표를 확인하고 있어요." : "현재 목표를 확인하지 못했어요."}</p><Link href="/dashboard/reels">성과 보기 ↗</Link></div>

        <nav className={styles.homeTabs} aria-label="오늘과 다이어리 보기">{([["morning", "아침"], ["evening", "저녁"], ["week", "주간"], ["month", "월간"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); if (value === "week" || value === "month") { const nextDate = calendarMode ? selectedDate : today; setAnchor(nextDate); setSelectedDate(nextDate); } }}>{label}<span>{value === "morning" ? "하루 열기" : value === "evening" ? "하루 돌아보기" : value === "week" ? "이번 주와 다음 주" : "한 달 보기"}</span></button>)}</nav>

        <section className={styles.quickSection} aria-labelledby="diary-quick-title">
          <form onSubmit={saveQuick}>
            <div className={styles.sectionHeading}><h2 id="diary-quick-title">지금 남기고 싶은 것</h2><span>한 줄이어도 충분해요.</span></div>
            <label className={styles.srOnly} htmlFor="diary-quick-text">메모 내용</label>
            <textarea id="diary-quick-text" value={quickText} disabled={saving || !draftsReady || Boolean(quickAttempt)} onChange={event => { setQuickText(event.target.value); setQuickError(""); }} rows={3} maxLength={10000} placeholder={mode === "evening" ? "오늘 끝낸 일, 바뀐 계획, 먹은 것, 기억하고 싶은 생각…" : "오늘 꼭 할 일, 컨디션, 방금 든 생각을 편하게 적어두세요."} />
            <div className={styles.quickFooter}>
              <button type="button" className={styles.textButton} aria-expanded={composerOptions} onClick={() => setComposerOptions(value => !value)}>{quickKind === "task" ? "☑ 할 일" : "메모"} · {quickDateFollowsToday ? "오늘" : quickDate ? formatDay(quickDate) : "날짜 없이"} <span aria-hidden="true">{composerOptions ? "⌃" : "⌄"}</span></button>
              <button type="submit" className={styles.primaryButton} disabled={saving || !draftsReady}>{saving ? "저장 중…" : quickAttempt ? "같은 기록으로 저장 확인" : "남기기 ↗"}</button>
            </div>
            {composerOptions && <div className={styles.composerOptions}><label><span>날짜</span><input aria-label="빠른 메모 날짜" type="date" value={quickDate} disabled={saving || Boolean(quickAttempt)} onChange={event => { setQuickDate(event.target.value); setQuickDateFollowsToday(false); }} /></label><label className={styles.taskChoice}><input type="checkbox" checked={quickKind === "task"} disabled={saving || Boolean(quickAttempt)} onChange={event => setQuickKind(event.target.checked ? "task" : "memo")} />할 일로 남기기</label><button type="button" className={styles.textButton} disabled={saving || Boolean(quickAttempt)} onClick={() => { setQuickDate(journalToday()); setQuickDateFollowsToday(true); }}>오늘</button><button type="button" className={styles.textButton} disabled={saving || Boolean(quickAttempt)} onClick={() => { setQuickDate(""); setQuickDateFollowsToday(false); }}>날짜 없이</button></div>}
            {quickError && <p className={styles.errorText} role="alert">{quickError}</p>}
            {draftWarning && <p className={styles.errorText} role="status">{draftWarning}</p>}
          </form>
        </section>
        <div className={styles.saveStatus} role="status">{notice || (saving ? "서버에 저장하고 있어요…" : quickText && draftsReady && !draftWarning ? "작성 중인 메모는 이 브라우저에 보관돼요. 남기기를 누르면 함께 공유해요." : "메모는 그대로 남아요. 꼭 챙길 일만 ‘할 일로 남기기’를 선택해 주세요.")}</div>
        {Object.keys(editorDrafts).length > 0 && <details className={styles.draftRecovery}><summary>아직 저장하지 않은 수정 초안 · {Object.keys(editorDrafts).length}개</summary>{Object.entries(editorDrafts).map(([key, draft]) => <div key={key}><button type="button" disabled={saving} onClick={() => resumeEditor(draft)}><span>{draft.date ? formatDay(draft.date) : "날짜 미정"} · {draft.request ? "저장 결과 확인 필요" : "이어서 쓰기"}</span><p>{draft.text || "내용 없이 날짜를 수정한 기록"}</p></button>{!draft.request && <button type="button" className={styles.textButton} disabled={saving} onClick={() => discardEditorDraft(key)}>초안 지우기</button>}</div>)}</details>}
        {actionError && <div className={styles.errorBanner} role="alert"><span>{actionError}</span>{failedAction && <button type="button" disabled={saving} onClick={() => { const entry = entries.find(item => item.id === failedAction.id) || context?.open_tasks.entries.find(item => item.id === failedAction.id); if (entry) void changeEntry(entry, failedAction.patch); }}>다시 시도</button>}</div>}

        {!calendarMode && <>
          <div className={styles.rhythmHeading}><span>{mode === "morning" ? "AM" : "PM"}</span><div><h2>{mode === "morning" ? "오늘은 어디에 마음을 쓸까" : "오늘은 어떻게 흘러갔을까"}</h2><p>{mode === "morning" ? "읽고, 바로잡고, 오늘의 방향을 정하는 시간." : "완성한 것과 달라진 생각만 편하게 돌아봐요."}</p></div><span className={styles.timeHint}>약 20분</span></div>
          {mode === "evening" && <>
            <div className={styles.eveningPrompts}><p>무엇을 끝냈는지 · 계획이 왜 달라졌는지 · 몸과 마음은 어땠는지</p><span>오늘 녹음은 밤에 정리돼요. 지금 기억나는 내용을 먼저 남겨 주세요.</span></div>
            <section className={styles.todayRecords} aria-labelledby="today-records-title"><div className={styles.sectionHeading}><h2 id="today-records-title">오늘 함께 남긴 기록</h2><button type="button" className={styles.textButton} onClick={() => openNew(today)}>＋ 더 쓰기</button></div>{loadError ? <p className={styles.errorText} role="alert">{loadError}</p> : !ready ? <p className={styles.emptyState}>오늘 기록을 불러오고 있어요.</p> : dayEntries(today).length ? dayEntries(today).map(entry => renderEntry(entry)) : <p className={styles.emptyState}>아직 오늘 공유한 기록이 없어요. 짧게 남겨도 괜찮아요.</p>}<p className={styles.sectionFootnote}>당일에 만든 영상은 결과만 적어도 돼요. 편집 완료와 게시 완료는 구분해서 남겨 주세요.</p></section>
          </>}
          <DayContext context={context} loading={contextLoading} error={contextError} today={today} evening={mode === "evening"} renderEntry={renderEntry} onReload={() => void loadContext()} />
          {mode === "morning" && <div id="diary-reflections" className={styles.reflectionAnchor}><ReflectionPanel onJournalChange={() => { void load(); void loadContext(); }} refreshKey={reflectionRefresh} /></div>}
          {mode === "morning" && ready && dayEntries(today).length > 0 && <section className={styles.todayRecords}><div className={styles.sectionHeading}><h2>오늘 남긴 기록</h2><button type="button" className={styles.textButton} onClick={() => setMode("evening")}>저녁에서 돌아보기 ↗</button></div>{dayEntries(today).map(entry => renderEntry(entry))}</section>}
          <div className={styles.dayLinks}><Link href="/dashboard/day">하루 기록 읽기 ↗</Link><Link href="/dashboard/thoughts">생각의 흐름 ↗</Link><Link href="/dashboard/health">건강 살펴보기 ↗</Link><button type="button" onClick={() => goWeek(0)}>이번 주 일정 →</button></div>
        </>}

        {calendarMode && <section id="diary-calendar" className={styles.diarySection} aria-labelledby="diary-period-title">
          <div className={styles.diaryToolbar}><div><p className={styles.eyebrow}>{mode === "week" ? `${dates[0].slice(0, 4)}년 · 월요일부터 일요일까지` : "한 달을 함께 보기"}</p><h2 id="diary-period-title">{mode === "week" ? `${formatDay(dates[0])} — ${formatDay(dates[6])}` : monthTitle(anchor)}</h2></div></div>
          <div className={styles.periodControls}><div className={styles.navigationButtons}><button type="button" aria-label={mode === "week" ? "이전 주" : "이전 달"} onClick={() => movePeriod(-1)}>← 이전</button><button type="button" onClick={() => goWeek(0)}>이번 주</button><button type="button" onClick={() => goWeek(1)}>다음 주</button><button type="button" aria-label={mode === "week" ? "다음 주로 이동" : "다음 달"} onClick={() => movePeriod(1)}>다음 →</button></div><div className={styles.jumpControls}>{mode === "month" && <label><span className={styles.srOnly}>이동할 달</span><input type="month" aria-label="이동할 달" value={anchor.slice(0, 7)} onChange={event => { if (event.target.value) { setAnchor(`${event.target.value}-01`); setSelectedDate(`${event.target.value}-01`); } }} /></label>}<button type="button" className={styles.textButton} onClick={() => void load()} disabled={loading || saving}>{loading ? "불러오는 중…" : "새로고침"}</button></div></div>
          {loadError && <div className={styles.errorBanner} role="alert"><span>{loadError}</span><button type="button" onClick={() => void load()}>다시 불러오기</button></div>}
          {!ready && !loadError && <p className={styles.loading} role="status">저장한 기록을 불러오고 있어요.</p>}
          {ready && <>
            {mode === "week" ? <div className={styles.weekStrip}>{dates.map((date, index) => { const records = dayEntries(date); return <button key={date} type="button" className={`${styles.weekDate} ${date === selectedDate ? styles.selectedDate : ""} ${date === today ? styles.currentDate : ""}`} aria-pressed={date === selectedDate} aria-label={`${formatDay(date)}, 기록 ${records.length}개`} onClick={() => setSelectedDate(date)}><span>{["월", "화", "수", "목", "금", "토", "일"][index]}</span><strong>{Number(date.slice(8))}</strong><small>{date === today ? "오늘" : records.length ? `${records.length}개` : "·"}</small>{records.length > 0 && <span className={styles.weekDatePreview}>{records[0].text}</span>}</button>; })}</div> : <div><div className={styles.monthWeekdays}>{["월", "화", "수", "목", "금", "토", "일"].map(day => <span key={day}>{day}</span>)}</div><div className={styles.monthGrid}>{dates.map(date => { const records = dayEntries(date); return <button key={date} type="button" className={`${styles.monthDay} ${date.slice(0, 7) !== anchor.slice(0, 7) ? styles.outsideMonth : ""} ${date === selectedDate ? styles.selectedDay : ""} ${date === today ? styles.monthToday : ""}`} aria-label={`${formatDay(date)}, 기록 ${records.length}개. 눌러서 보기`} aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}><span>{Number(date.slice(8))}</span>{records.length > 0 && <><span className={styles.monthPreview}>{records.slice(0, 2).map(entry => <span key={entry.id}>{entry.time ? `${entry.time} ` : ""}{entry.text}</span>)}{records.length > 2 && <small>외 {records.length - 2}개</small>}</span><small className={styles.monthCount}>{records.length}<span className={styles.countSuffix}>개</span></small></>}</button>; })}</div></div>}
            <section className={styles.selectedDayList}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{selectedDate === today ? "오늘의 페이지" : "선택한 날의 페이지"}</p><h3>{formatDay(selectedDate)}</h3></div><button type="button" className={styles.secondaryButton} onClick={() => openNew(selectedDate)}>＋ 이날에 쓰기</button></div>{dayEntries(selectedDate).length ? dayEntries(selectedDate).map(entry => renderEntry(entry)) : <p className={styles.emptyState}>아직 남긴 기록이 없어요.<br />업로드할 영상, 해야 할 일, 그날의 생각을 그대로 적어두세요.</p>}</section>
          </>}
          <p className={styles.calendarHint}>날짜를 누르면 그날의 기록이 펼쳐져요. 빈 날은 아직 공유한 기록이 없는 날이에요.</p>
          {ready && <details className={styles.undatedSection}><summary>날짜를 정하지 않은 기록 <span>{undated.length}개</span></summary><p className={styles.sectionDescription}>생각은 남겨두고, 날짜는 정해졌을 때 붙여요.</p>{undated.length ? undated.map(entry => renderEntry(entry)) : <p className={styles.emptyState}>날짜 없이 남긴 기록이 아직 없어요.</p>}<button type="button" className={styles.textButton} onClick={() => openNew("")}>＋ 날짜 없이 쓰기</button></details>}
          {ready && proposals.length > 0 && <section className={styles.proposalSection}><div className={styles.sectionHeading}><h2>확인하고 정할 제안</h2><span>아직 할 일로 확정되지 않았어요.</span></div>{proposals.map(entry => renderEntry(entry))}</section>}
        </section>}
      </div>

      <dialog ref={dialogRef} className={styles.editorDialog} onCancel={event => { if (saving) event.preventDefault(); else closeEditor(); }} onClose={() => { if (!saving) setEditor(null); }} aria-labelledby="diary-editor-title">
        {editor && <form onSubmit={saveEditor}>
          <div className={styles.editorHeading}><div><p className={styles.eyebrow}>{editor.entry ? authorLabel(editor.entry) : "한나의 기록"}</p><h2 id="diary-editor-title">{editor.entry ? "기록 이어 쓰기" : editor.date ? `${formatDay(editor.date)}에 쓰기` : "날짜 없이 남기기"}</h2></div><button type="button" className={styles.textButton} disabled={saving} onClick={closeEditor}>닫기</button></div>
          <div className={styles.editorTextLabel}><label htmlFor="diary-editor-text">내용</label><textarea id="diary-editor-text" autoFocus rows={7} maxLength={10000} value={editor.text} disabled={saving || editorRetryPending} onChange={event => updateEditor({ text: event.target.value })} placeholder="오늘의 생각이나 할 일을 편하게 적어 주세요." /></div>
          <div className={styles.editorFields}><label>날짜<input type="date" value={editor.date} disabled={saving || editorRetryPending} onChange={event => updateEditor({ date: event.target.value, time: event.target.value ? editor.time : "" })} /></label><label>시간 · 선택<input type="time" value={editor.time} disabled={saving || editorRetryPending || !editor.date} onChange={event => updateEditor({ time: event.target.value })} /></label><label>종류<select value={editor.kind} disabled={saving || editorRetryPending || Boolean(editor.entry?.reply)} onChange={event => updateEditor({ kind: event.target.value as Kind })}><option value="task">할 일</option><option value="memo">메모</option></select></label></div>
          <button type="button" className={styles.textButton} disabled={saving || editorRetryPending || !editor.date} onClick={() => updateEditor({ date: "", time: "" })}>날짜 정하지 않기</button>
          {editor.entry && <details className={styles.original}><summary>처음 남긴 원문과 출처</summary><p>{editor.entry.original_text}</p><small>{authorLabel(editor.entry)} · {editor.entry.source || "출처 기록 없음"}</small></details>}
          {editor.error && <p className={styles.errorText} role="alert">{editor.error}</p>}
          {editor.conflict && <div className={styles.conflict}><h3>현재 서버에 있는 기록</h3><p>{editor.conflict.text}</p><span>{editor.conflict.date ? formatDay(editor.conflict.date) : "날짜 미정"}{editor.conflict.time ? ` · ${editor.conflict.time}` : ""}</span><button type="button" className={styles.secondaryButton} onClick={() => updateEditor({ entry: editor.conflict, conflict: null, error: "최신 기록을 확인했어요. 위의 초안을 검토한 뒤 저장하면 반영돼요." })}>최신 변경 확인 · 내 초안 유지</button></div>}
          <div className={styles.editorActions}><span>{editor.entry?.confirmation === "proposed" ? "내용을 고쳐도 AI 제안 상태는 유지돼요." : "줄바꿈과 처음 남긴 원문을 보존해요."}</span><button type="submit" className={styles.primaryButton} disabled={saving || Boolean(editor.conflict)}>{saving ? "저장 중…" : editorRetryPending ? "같은 기록으로 저장 확인" : editor.error ? "다시 저장하기" : "저장하기"}</button></div>
        </form>}
      </dialog>
    </div>
  );
}
