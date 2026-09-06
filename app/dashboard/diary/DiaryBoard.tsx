"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { callApi } from "@/lib/dashboard-client";
import {
  addDays, formatDay, journalToday, monthDates, monthTitle, shiftMonth, startOfWeek, weekDates,
} from "@/lib/journal";
import type { JournalEntry, JournalMutationResponse, JournalResponse } from "@/lib/journal";
import styles from "./diary.module.css";
import ReflectionPanel from "./ReflectionPanel";

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

export default function DiaryBoard({ today: initialToday }: { today: string }) {
  const [today, setToday] = useState(initialToday);
  const [mode, setMode] = useState<"week" | "month">("week");
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
  const [editor, setEditor] = useState<Editor | null>(null);
  const [failedAction, setFailedAction] = useState<{ id: string; patch: Partial<JournalEntry> } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const quickKey = useRef<RequestKey | null>(null);
  const editorKey = useRef<RequestKey | null>(null);
  const requestSequence = useRef(0);
  const saveLock = useRef(false);
  const currentRange = useRef("");

  const dates = useMemo(() => mode === "week" ? weekDates(anchor) : monthDates(anchor), [anchor, mode]);
  const range = `${dates[0]}:${dates[dates.length - 1]}`;
  const ready = !loading && !loadError && loadedRange === range;
  const activeEntries = useMemo(() => entries.filter(entry => entry.status !== "archived" && !entry.reflection), [entries]);
  const undated = useMemo(() => sortEntries(activeEntries.filter(entry => !entry.date)), [activeEntries]);
  const dayEntries = useCallback((date: string) => sortEntries(activeEntries.filter(entry => entry.date === date)), [activeEntries]);
  const recentMemos = useMemo(() => activeEntries.filter(entry => entry.kind === "memo")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4), [activeEntries]);
  const proposals = activeEntries.filter(entry => entry.author === "ai" && entry.confirmation === "proposed");

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
    const refreshOnReturn = () => { if (!saveLock.current) void load(); };
    window.addEventListener("focus", refreshOnReturn);
    return () => { window.removeEventListener("focus", refreshOnReturn); };
  }, [load]);
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
    setNotice("서버에 저장했어요.");
  }

  async function saveQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickText.trim()) { setQuickError("남길 내용을 먼저 적어 주세요."); return; }
    if (!beginSave()) return;
    setQuickError("");
    const date = quickDateFollowsToday ? journalToday() : quickDate;
    refreshToday();
    const body = { text: quickText, date: date || null, time: null, kind: quickKind, author: "hanna", confirmation: "confirmed", source: "한나 다이어리" };
    quickKey.current = newRequestKey(quickKey.current, body);
    try {
      const result = await callApi<JournalMutationResponse>("POST", "journal", { ...body, request_id: quickKey.current.id });
      acceptSaved(result.entry);
      setQuickText("");
      quickKey.current = null;
      await load();
    } catch (error) {
      setQuickError(errorMessage(error, true));
    } finally { finishSave(); }
  }

  function openNew(date: string) {
    editorKey.current = null;
    setSelectedDate(date);
    setEditor({ entry: null, text: "", date, time: "", kind: "task", error: "", conflict: null });
  }

  function openEntry(entry: JournalEntry) {
    editorKey.current = null;
    setEditor({ entry, text: entry.text, date: entry.date || "", time: entry.time || "", kind: entry.kind, error: "", conflict: null });
  }

  function updateEditor(patch: Partial<Editor>) {
    setEditor(current => current ? { ...current, ...patch } : current);
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
        result = await callApi<JournalMutationResponse>("POST", "journal", { ...body, request_id: editorKey.current.id });
      }
      acceptSaved(result.entry);
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
      acceptSaved(result.entry);
      await load();
    } catch (error) {
      if (error instanceof Error && error.message.includes("API 409")) {
        setActionError("다른 곳에서 기록이 바뀌어 적용하지 않았어요. 최신 내용을 확인한 뒤 다시 선택해 주세요.");
        await load();
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
          <div><p className={styles.eyebrow}>한나의 하루 · 함께 생각하고 기록하는 곳</p><h1>오늘을 적고, 다음을 함께 생각해요.</h1><p className={styles.headerDescription}>한나의 메모와 일정 위에, 근거 있는 질문과 방향을 더해요.</p></div>
          <div className={styles.todayMark}><span>{today.slice(5, 7)}월</span><strong>{Number(today.slice(8))}</strong><span>오늘</span></div>
        </header>

        <nav className={styles.pageLinks} aria-label="이 페이지에서 바로 가기"><a href="#diary-quick-title">메모 남기기</a><a href="#diary-reflections">함께 생각할 것</a><a href="#diary-calendar">주간·월간 다이어리</a></nav>

        <section className={styles.quickSection} aria-labelledby="diary-quick-title">
          <form onSubmit={saveQuick}>
            <div className={styles.sectionHeading}><h2 id="diary-quick-title">지금, 한나의 메모</h2><span>컨디션도, 할 일도, 방금 든 생각도.</span></div>
            <label className={styles.srOnly} htmlFor="diary-quick-text">메모 내용</label>
            <textarea id="diary-quick-text" value={quickText} disabled={saving} onChange={event => setQuickText(event.target.value)} rows={2} maxLength={10000} placeholder="어제 푹 자서 컨디션이 좋다. 오늘은 이쪽에 연락하기…" />
            <div className={styles.quickFooter}>
              <div className={styles.inputGroup}>
                <label><span>날짜</span><input aria-label="빠른 메모 날짜" type="date" value={quickDate} disabled={saving} onChange={event => { setQuickDate(event.target.value); setQuickDateFollowsToday(false); }} /></label>
                <label><span>종류</span><select aria-label="빠른 메모 종류" value={quickKind} disabled={saving} onChange={event => setQuickKind(event.target.value as Kind)}><option value="memo">메모</option><option value="task">할 일</option></select></label>
                <button type="button" className={styles.textButton} disabled={saving || !quickDate} onClick={() => { setQuickDate(""); setQuickDateFollowsToday(false); }}>날짜 없이</button>
              </div>
              <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? "저장 중…" : quickError ? "다시 저장하기" : "메모 남기기 ↗"}</button>
            </div>
            {quickError && <p className={styles.errorText} role="alert">{quickError}</p>}
          </form>
        </section>

        <div className={styles.saveStatus} role="status">{notice || (saving ? "서버에 저장하고 있어요…" : "")}</div>
        {actionError && <div className={styles.errorBanner} role="alert"><span>{actionError}</span>{failedAction && <button type="button" disabled={saving} onClick={() => { const entry = entries.find(item => item.id === failedAction.id); if (entry) void changeEntry(entry, failedAction.patch); }}>다시 시도</button>}</div>}

        <div id="diary-reflections" className={styles.reflectionAnchor}><ReflectionPanel onJournalChange={load} refreshKey={reflectionRefresh} /></div>

        <section id="diary-calendar" className={styles.diarySection} aria-labelledby="diary-period-title">
          <div className={styles.diaryToolbar}>
            <div><p className={styles.eyebrow}>{mode === "week" ? `${dates[0].slice(0, 4)}년 · 월요일부터 일요일까지` : "한 달을 함께 보기"}</p><h2 id="diary-period-title">{mode === "week" ? `${formatDay(dates[0])} — ${formatDay(dates[6])}` : monthTitle(anchor)}</h2></div>
            <div className={styles.viewToggle} aria-label="다이어리 보기"><button type="button" aria-pressed={mode === "week"} onClick={() => setMode("week")}>주간</button><button type="button" aria-pressed={mode === "month"} onClick={() => setMode("month")}>월간</button></div>
          </div>
          <div className={styles.periodControls}>
            <div className={styles.navigationButtons}><button type="button" aria-label={mode === "week" ? "이전 주" : "이전 달"} onClick={() => movePeriod(-1)}>← 이전</button><button type="button" onClick={() => goWeek(0)}>이번 주</button><button type="button" onClick={() => goWeek(1)}>다음 주</button><button type="button" aria-label={mode === "week" ? "다음 주로 이동" : "다음 달"} onClick={() => movePeriod(1)}>다음 →</button></div>
            <div className={styles.jumpControls}>{mode === "month" && <label><span className={styles.srOnly}>이동할 달</span><input type="month" aria-label="이동할 달" value={anchor.slice(0, 7)} onChange={event => { if (event.target.value) { setAnchor(`${event.target.value}-01`); setSelectedDate(`${event.target.value}-01`); } }} /></label>}<button type="button" className={styles.textButton} onClick={() => void load()} disabled={loading || saving}>{loading ? "불러오는 중…" : "새로고침"}</button></div>
          </div>

          {loadError && <div className={styles.errorBanner} role="alert"><span>{loadError}</span><button type="button" onClick={() => void load()}>다시 불러오기</button></div>}
          {!ready && !loadError && <p className={styles.loading} role="status">저장한 기록을 불러오고 있어요.</p>}

          {ready && mode === "week" && <div className={styles.weekGrid}>{dates.map((date, index) => <section key={date} className={`${styles.weekDay} ${date === today ? styles.today : ""}`} aria-label={formatDay(date)}><button type="button" className={styles.dayHeading} onClick={() => openNew(date)} aria-label={`${formatDay(date)}에 기록 추가`}><span>{["월", "화", "수", "목", "금", "토", "일"][index]}</span><strong>{Number(date.slice(8))}</strong>{date === today && <small>오늘</small>}</button><div className={styles.dayContents}>{dayEntries(date).length ? dayEntries(date).map(entry => renderEntry(entry, true)) : <p className={styles.emptyDay}>아직 적은<br />일정이 없어요.</p>}</div><button type="button" className={styles.addDay} onClick={() => openNew(date)}>＋ 이날에 쓰기</button></section>)}</div>}

          {ready && mode === "month" && <div className={styles.monthLayout}><div><div className={styles.monthWeekdays}>{["월", "화", "수", "목", "금", "토", "일"].map(day => <span key={day}>{day}</span>)}</div><div className={styles.monthGrid}>{dates.map(date => { const records = dayEntries(date); return <button key={date} type="button" className={`${styles.monthDay} ${date.slice(0, 7) !== anchor.slice(0, 7) ? styles.outsideMonth : ""} ${date === selectedDate ? styles.selectedDay : ""} ${date === today ? styles.monthToday : ""}`} aria-label={`${formatDay(date)}, 기록 ${records.length}개. 눌러서 보기`} aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}><span>{Number(date.slice(8))}</span>{records.length > 0 && <><span className={styles.monthPreview}>{records.slice(0, 2).map(entry => <span key={entry.id}>{entry.time ? `${entry.time} ` : ""}{entry.text}</span>)}{records.length > 2 && <small>외 {records.length - 2}개</small>}</span><small className={styles.monthCount}>{records.length}<span className={styles.countSuffix}>개 기록</span></small></>}</button>; })}</div><p className={styles.calendarHint}>날짜를 눌러 기록을 보고, ＋ 쓰기로 그날에 바로 남겨요.</p></div><section className={styles.selectedDayList}><div className={styles.sectionHeading}><h3>{formatDay(selectedDate)}</h3><button type="button" className={styles.textButton} onClick={() => openNew(selectedDate)}>＋ 쓰기</button></div>{dayEntries(selectedDate).length ? dayEntries(selectedDate).map(entry => renderEntry(entry)) : <p className={styles.emptyDay}>아직 적은 일정이 없어요.</p>}</section></div>}
          <p className={styles.calendarHint}>기록이 없는 날은 아직 공유하지 않은 날이에요.</p>
        </section>

        {ready && <div className={styles.contextLayout}><section className={styles.undatedSection}><div className={styles.sectionHeading}><h2>날짜를 정하지 않은 기록</h2><button type="button" className={styles.textButton} onClick={() => openNew("")}>＋ 쓰기</button></div><p className={styles.sectionDescription}>떠오를 때 남겨두고, 날짜가 정해지면 옮겨요.</p>{undated.length ? undated.map(entry => renderEntry(entry)) : <p className={styles.emptyDay}>날짜 없이 남긴 기록이 아직 없어요.</p>}</section><aside className={styles.contextSection}><div className={styles.sectionHeading}><h2>함께 쌓이는 맥락</h2><span>현재 보고 있는 기간</span></div>{proposals.length > 0 && <section className={styles.contextGroup}><h3>한나의 확인을 기다리는 제안</h3>{proposals.map(entry => renderEntry(entry, true))}</section>}<section className={styles.contextGroup}><h3>최근에 남긴 메모</h3>{recentMemos.length ? recentMemos.map(entry => <button type="button" className={styles.contextMemo} key={entry.id} onClick={() => openEntry(entry)}><span>{entry.date ? formatDay(entry.date) : "날짜 미정"} · {authorLabel(entry)}</span><p>{entry.text}</p></button>) : <p className={styles.emptyDay}>짧게 남긴 메모부터 대화의 맥락이 돼요.</p>}</section><p className={styles.contextNote}>기록은 서버에 함께 보관해요. 이 화면에서 자동 조사나 답변 생성은 실행하지 않아요.</p></aside></div>}
      </div>

      <dialog ref={dialogRef} className={styles.editorDialog} onCancel={event => { if (saving) event.preventDefault(); else closeEditor(); }} onClose={() => { if (!saving) setEditor(null); }} aria-labelledby="diary-editor-title">
        {editor && <form onSubmit={saveEditor}>
          <div className={styles.editorHeading}><div><p className={styles.eyebrow}>{editor.entry ? authorLabel(editor.entry) : "한나의 기록"}</p><h2 id="diary-editor-title">{editor.entry ? "기록 이어 쓰기" : editor.date ? `${formatDay(editor.date)}에 쓰기` : "날짜 없이 남기기"}</h2></div><button type="button" className={styles.textButton} disabled={saving} onClick={closeEditor}>닫기</button></div>
          <label className={styles.editorTextLabel}>내용<textarea autoFocus rows={7} maxLength={10000} value={editor.text} disabled={saving} onChange={event => updateEditor({ text: event.target.value })} placeholder="오늘의 생각이나 할 일을 편하게 적어 주세요." /></label>
          <div className={styles.editorFields}><label>날짜<input type="date" value={editor.date} disabled={saving} onChange={event => updateEditor({ date: event.target.value, time: event.target.value ? editor.time : "" })} /></label><label>시간 · 선택<input type="time" value={editor.time} disabled={saving || !editor.date} onChange={event => updateEditor({ time: event.target.value })} /></label><label>종류<select value={editor.kind} disabled={saving || Boolean(editor.entry?.reply)} onChange={event => updateEditor({ kind: event.target.value as Kind })}><option value="task">할 일</option><option value="memo">메모</option></select></label></div>
          <button type="button" className={styles.textButton} disabled={saving || !editor.date} onClick={() => updateEditor({ date: "", time: "" })}>날짜 정하지 않기</button>
          {editor.entry && <details className={styles.original}><summary>처음 남긴 원문과 출처</summary><p>{editor.entry.original_text}</p><small>{authorLabel(editor.entry)} · {editor.entry.source || "출처 기록 없음"}</small></details>}
          {editor.error && <p className={styles.errorText} role="alert">{editor.error}</p>}
          {editor.conflict && <div className={styles.conflict}><h3>현재 서버에 있는 기록</h3><p>{editor.conflict.text}</p><span>{editor.conflict.date ? formatDay(editor.conflict.date) : "날짜 미정"}{editor.conflict.time ? ` · ${editor.conflict.time}` : ""}</span><button type="button" className={styles.secondaryButton} onClick={() => updateEditor({ entry: editor.conflict, conflict: null, error: "최신 기록을 확인했어요. 위의 초안을 검토한 뒤 저장하면 반영돼요." })}>최신 변경 확인 · 내 초안 유지</button></div>}
          <div className={styles.editorActions}><span>{editor.entry?.confirmation === "proposed" ? "내용을 고쳐도 AI 제안 상태는 유지돼요." : "줄바꿈과 처음 남긴 원문을 보존해요."}</span><button type="submit" className={styles.primaryButton} disabled={saving || Boolean(editor.conflict)}>{saving ? "저장 중…" : editor.error ? "다시 저장하기" : "저장하기"}</button></div>
        </form>}
      </dialog>
    </div>
  );
}
