"use client";

import { useEffect, useState, useTransition } from "react";

// 컬러 시스템은 dashboard/layout.tsx의 CSS 변수에서 관리.
// Pill 컴포넌트 alpha 합성 등에서만 hex 직접 사용 (var(...)는 +"44" 안 됨).
const KO_WD = ["월", "화", "수", "목", "금", "토", "일"]; // Mon=0

// ─────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // Mon=0
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtTimeKo(d: Date): string {
  // "오후 1:34"
  return d.toLocaleString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtTimeFromIso(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return fmtTimeKo(d);
  } catch {
    return "";
  }
}

function fmtDateKo(d: Date): string {
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

// "2026-05-19" → "5월 19일"
function fmtMonthDay(isoStr: string): string {
  try {
    const [, m, dd] = isoStr.split("-");
    return `${parseInt(m, 10)}월 ${parseInt(dd, 10)}일`;
  } catch {
    return isoStr;
  }
}

// "2026-05-19" → "5월 19일 (월)"
function fmtMonthDayWeekday(isoStr: string): string {
  try {
    const [y, m, dd] = isoStr.split("-");
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(dd, 10));
    const wd = KO_WD[(d.getDay() + 6) % 7]; // Mon=0
    return `${parseInt(m, 10)}월 ${parseInt(dd, 10)}일 (${wd})`;
  } catch {
    return isoStr;
  }
}

// Date → "5/18(월)"
function fmtShortDateWeekday(d: Date): string {
  const wd = KO_WD[(d.getDay() + 6) % 7];
  return `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
}

// "✅ 마감 (4): 내일 할 일 4건" / "✅ 마감: 비즈니스PT 준비 영상 보기" 같은
// 봇 메타 이모지/접두어 제거 — 명시적 키워드만 제거 (다른 제목 안 다침)
function cleanEventSummary(s: string): string {
  if (!s) return "";
  let out = s.replace(/^[✅❌✨⚡⭐\u{1F525}\u{1F389}\u{1F4DD}\u{1F6A8}\u{1F4CC}]+\s*/u, "");
  out = out.replace(
    /^(마감|할\s*일|광고|공구|D-?day|투두|TODO|진행중|이월)\s*(?:\(\d+\))?\s*[:：]\s*/i,
    ""
  );
  return out.trim() || s;
}

async function callApi(method: string, path: string, body?: any) {
  const r = await fetch(`/api/dashboard/proxy/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

// ─────────────────────────────────────────────────────────────────────
// 공통 컴포넌트
// ─────────────────────────────────────────────────────────────────────

function Card({
  title,
  children,
  accent,
  bg,
  borderColor,
  rightSlot,
}: {
  title?: string;
  children: React.ReactNode;
  accent?: string;
  bg?: string;
  borderColor?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{
        backgroundColor: bg || "var(--bg-card)",
        border: `1px solid ${borderColor || "var(--border)"}`,
        ...(accent ? { borderTopColor: accent, borderTopWidth: 3 } : {}),
      }}
    >
      {(title || rightSlot) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h2
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--text-secondary)" }}
            >
              {title}
            </h2>
          )}
          {rightSlot}
        </div>
      )}
      {children}
    </section>
  );
}

function Pill({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium border"
      style={
        color
          ? {
              color,
              borderColor: color + "44",
              backgroundColor: color + "0a",
            }
          : {
              color: "var(--text-secondary)",
              borderColor: "var(--border)",
              backgroundColor: "var(--bg-card-soft)",
            }
      }
    >
      {children}
    </span>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  doneDate,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  doneDate?: string | null;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-[3px] w-4 h-4 rounded border-rule cursor-pointer"
      />
      <span
        className={
          "text-sm flex-1 " +
          (checked ? "line-through text-muted" : "text-ink")
        }
      >
        {label}
        {checked && doneDate && (
          <span className="ml-2 text-[10px] text-muted">({doneDate})</span>
        )}
      </span>
    </label>
  );
}

function AddInline({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (text: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(text.trim());
      setText("");
      setOpen(false);
    } catch (e) {
      alert("저장 실패: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs mt-3 transition hover:opacity-70"
        style={{ color: "var(--accent)" }}
      >
        + 추가
      </button>
    );
  }
  return (
    <div className="flex gap-2 mt-3">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setText("");
          }
        }}
        placeholder={placeholder}
        disabled={busy}
        className="flex-1 rounded-md px-2.5 py-1.5 text-sm outline-none"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
          color: "var(--text-main)",
        }}
      />
      <button
        onClick={submit}
        disabled={busy}
        className="text-xs px-2.5 py-1 rounded-md disabled:opacity-50"
        style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
      >
        {busy ? "..." : "Enter"}
      </button>
      <button
        onClick={() => {
          setOpen(false);
          setText("");
        }}
        className="text-xs px-2.5 py-1 border border-rule rounded-md text-muted"
      >
        취소
      </button>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p
      className="text-xs px-2 py-1 rounded"
      style={{ color: "var(--danger-text)", backgroundColor: "var(--danger-soft)" }}
    >
      {msg}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────────────

type Initial = {
  today: any;
  schedule: any;
  incomplete: any;
  stuck: any;
  active: any;
  cashflow: any;
  health: any;
  calendar: any;
  recommendation: any;
  weekProgress: any;
  choresTodo: any;
  choresShop: any;
  quickTasks: any;
  ideasRecent: any;
  scheduleV2: any;
  weeklyTodos: any;
  todayMe: any;
  memosRecent: any;
};

export default function DashboardClient({ initial }: { initial: Initial }) {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-6 border-b border-rule">
        <p className="text-xs text-muted">{fmtDateKo(now)}</p>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mt-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            한나 운영 대시보드
          </h1>
          <span
            className="text-lg font-medium"
            style={{ color: "var(--accent)" }}
          >
            {fmtTimeKo(now)}
          </span>
        </div>
      </header>

      <div className="max-w-page mx-auto px-5 sm:px-8 py-6 space-y-4">
        {/* 데스크탑(≥md) — 주간달력 + 이번 주 할 일 따로 (7컬럼 가로) */}
        <div className="hidden md:block space-y-4">
          <WeeklyCalendar
            initialEvents={initial.calendar}
            initialActive={initial.active}
          />
          <WeeklyTodos initial={initial.weeklyTodos} />
        </div>

        {/* 모바일(<md) — 합쳐서 7줄 컴팩트 */}
        <div className="md:hidden">
          <WeeklyCompact
            calendar={initial.calendar}
            weeklyTodos={initial.weeklyTodos}
            scheduleV2={initial.scheduleV2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DailyPanel
            kind="today"
            initial={initial.scheduleV2?.today}
            incomplete={initial.incomplete}
          />
          <DailyPanel
            kind="tomorrow"
            initial={initial.scheduleV2?.tomorrow}
          />
        </div>

        {/* v6.4.10 — PC(≥md)에서 빠른처리 + 메모 좌우 2단, 모바일은 세로 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickTasks initial={initial.quickTasks} />
          <MemoPanel initial={initial.memosRecent} />
        </div>

        <TodayMe data={initial.todayMe} />

        <ActiveCards data={initial.active} />

        <IdeasRecent initial={initial.ideasRecent} />

        <Chores initialTodo={initial.choresTodo} initialShop={initial.choresShop} />

        <MonthlyCalendar data={initial.calendar} />

        <DetailLinks />

        <p className="text-[11px] text-muted text-center pt-4">
          데이터는 옵시디언과 자동 동기화. 봇에서 추가한 거 / 여기서 추가한 거 다 모임.
        </p>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 주간 달력 (월~일)
// ─────────────────────────────────────────────────────────────────────

function WeeklyCalendar({
  initialEvents,
  initialActive,
}: {
  initialEvents: any;
  initialActive: any;
}) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const todayIso = iso(new Date()); // ★ 실제 오늘 — 버그 수정 (이전: 이번 주 월요일과 비교)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);
  const eventsByDate: Record<string, any[]> = initialEvents?.events_by_date || {};
  const deadlinesByDate: Record<string, any[]> = initialEvents?.deadlines_by_date || {};

  return (
    <Card
      title="이번 주"
      rightSlot={
        <div className="flex items-center gap-2 text-xs text-muted">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="hover:text-ink"
          >
            ‹ 지난주
          </button>
          <span>
            {fmtShortDateWeekday(weekStart)} - {fmtShortDateWeekday(weekEnd)}
          </span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="hover:text-ink"
          >
            다음주 ›
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="hover:text-ink underline"
          >
            오늘
          </button>
          <button
            onClick={() => window.open("https://calendar.google.com", "_blank", "noopener,noreferrer")}
            className="ml-1 px-2 py-0.5 rounded-md transition"
            style={{
              backgroundColor: "var(--secondary-soft)",
              color: "var(--secondary-text)",
              border: "1px solid var(--secondary)",
            }}
            title="구글 캘린더 새 탭으로 열기"
          >
            📅 구글 캘린더
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dateStr = iso(d);
          const isToday = dateStr === todayIso;
          const evs = eventsByDate[dateStr] || [];
          const dls = deadlinesByDate[dateStr] || [];
          return (
            <div
              key={dateStr}
              className="rounded-md p-2 min-h-[80px] text-[11px]"
              style={{
                backgroundColor: "var(--bg-card)",
                border: isToday
                  ? `2px solid var(--accent)`
                  : `1px solid var(--border)`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ink">{KO_WD[i]}</span>
                <span className="text-muted">{d.getDate()}</span>
              </div>
              <div className="space-y-0.5">
                {evs.slice(0, 3).map((ev: any, idx: number) => (
                  <div
                    key={`e${idx}`}
                    className="truncate px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: ev.all_day
                        ? "var(--secondary-soft)"
                        : "var(--accent-soft)",
                      color: ev.all_day
                        ? "var(--secondary-text)"
                        : "var(--accent-text)",
                    }}
                    title={cleanEventSummary(ev.summary)}
                  >
                    {!ev.all_day && ev.time && (
                      <span className="mr-1 opacity-70">{fmtShortTime(ev.time)}</span>
                    )}
                    {cleanEventSummary(ev.summary)}
                  </div>
                ))}
                {dls.slice(0, 2).map((dl: any, idx: number) => (
                  <div
                    key={`d${idx}`}
                    className="truncate px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: "var(--danger-soft)",
                      color: "var(--danger-text)",
                    }}
                    title={`${dl.type}: ${dl.title}`}
                  >
                    {dl.title}
                  </div>
                ))}
                {evs.length + dls.length === 0 && (
                  <div className="text-muted">·</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function fmtShortTime(hhmm: string): string {
  // "22:00" → "오후 10시"
  const [h] = hhmm.split(":");
  const hour = parseInt(h, 10);
  if (hour === 0) return "자정";
  if (hour < 12) return `오전 ${hour}시`;
  if (hour === 12) return "낮 12시";
  return `오후 ${hour - 12}시`;
}

// ─────────────────────────────────────────────────────────────────────
// 모바일 컴팩트 — 주간 달력 + 이번 주 할 일 합쳐서 7줄 (v6.3)
// 각 줄: 요일+날짜 + 요약 + 펼침 토글. 동시 1개 펼침.
// ─────────────────────────────────────────────────────────────────────

function WeeklyCompact({
  calendar,
  weeklyTodos,
  scheduleV2,
}: {
  calendar: any;
  weeklyTodos: any;
  scheduleV2: any;
}) {
  const todayIso = iso(new Date());
  const tomorrowIso = iso(addDays(new Date(), 1));
  const [expanded, setExpanded] = useState<string>(todayIso);
  const [days, setDays] = useState<any[]>(weeklyTodos?.days || []);
  const [, startTransition] = useTransition();
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [addText, setAddText] = useState("");
  const [busy, setBusy] = useState(false);

  const evMap: Record<string, any[]> = calendar?.events_by_date || {};
  const dlMap: Record<string, any[]> = calendar?.deadlines_by_date || {};

  const weekStart = weeklyTodos?.week_start || "";
  const weekEnd = weeklyTodos?.week_end || "";

  function shortLabel(dateStr: string): string {
    const evs = (evMap[dateStr] || []).filter((e: any) => !e?.summary?.startsWith?.("(제목 없음)"));
    const dayBucket = days.find((d) => d.date === dateStr);
    const todos = dayBucket?.todos || [];

    // 미리보기 토큰: 일정 → 할일 순으로 1~2개
    const tokens: string[] = [];
    for (const ev of evs) {
      if (tokens.length >= 2) break;
      const t = cleanEventSummary(ev.summary || "");
      if (t) tokens.push(t);
    }
    if (tokens.length < 2) {
      for (const t of todos) {
        if (tokens.length >= 2) break;
        if (t?.text) tokens.push(t.text);
      }
    }
    const total = evs.length + todos.length;
    if (total === 0) return "─";
    const preview = tokens.join(", ");
    return total > tokens.length ? `${preview} (${total})` : preview;
  }

  async function toggle(dateStr: string, line: number) {
    setDays((cur) =>
      cur.map((d) =>
        d.date !== dateStr
          ? d
          : {
              ...d,
              todos: d.todos.map((t: any) =>
                t.line === line ? { ...t, done: !t.done } : t
              ),
            }
      )
    );
    try {
      await callApi("PATCH", `daily/${dateStr}/todo/${line}/toggle`);
    } catch {
      setDays((cur) =>
        cur.map((d) =>
          d.date !== dateStr
            ? d
            : {
                ...d,
                todos: d.todos.map((t: any) =>
                  t.line === line ? { ...t, done: !t.done } : t
                ),
              }
        )
      );
    }
  }

  async function submitAdd(dateStr: string) {
    const text = addText.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const r = await callApi("POST", `daily/${dateStr}/todo`, { text });
      setDays((cur) =>
        cur.map((d) =>
          d.date !== dateStr ? d : { ...d, todos: [...d.todos, r.item] }
        )
      );
      setAddText("");
      setAddingDate(null);
    } catch (e) {
      alert("저장 실패: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // v6.5 — 한 일 추가/삭제
  async function addDoneCompact(dateStr: string, text: string) {
    try {
      const r = await callApi("POST", `daily/${dateStr}/done`, { text });
      setDays((cur) =>
        cur.map((d) =>
          d.date !== dateStr
            ? d
            : { ...d, dones: [...(d.dones || []), r.item] }
        )
      );
    } catch (e) {
      alert("저장 실패: " + (e as Error).message);
    }
  }
  async function removeDoneCompact(dateStr: string, line: number) {
    const snapshot = days;
    setDays((cur) =>
      cur.map((d) =>
        d.date !== dateStr
          ? d
          : { ...d, dones: (d.dones || []).filter((x: any) => x.line !== line) }
      )
    );
    try {
      await callApi("DELETE", `daily/${dateStr}/done/${line}`);
    } catch {
      setDays(snapshot);
    }
  }

  function renderExpandedBody(dateStr: string) {
    const evs = evMap[dateStr] || [];
    const dls = dlMap[dateStr] || [];
    const dayBucket = days.find((d) => d.date === dateStr);
    const todos = dayBucket?.todos || [];

    // 시간순 정렬 (종일 → 앞, 그 외 time 오름차순)
    const sortedEvs = [...evs].sort((a: any, b: any) => {
      if (a.all_day && !b.all_day) return -1;
      if (!a.all_day && b.all_day) return 1;
      return (a.time || "").localeCompare(b.time || "");
    });

    // 오늘/내일은 scheduleV2의 풍부한 데이터(루틴 source/마감 종류) 활용
    const richBundle =
      dateStr === todayIso
        ? scheduleV2?.today
        : dateStr === tomorrowIso
        ? scheduleV2?.tomorrow
        : null;

    return (
      <div className="pt-2 space-y-2.5">
        {/* 📅 일정 */}
        <div>
          <p className="text-[11px] text-muted mb-1">📅 일정</p>
          {sortedEvs.length === 0 ? (
            <p className="text-xs text-muted">없음</p>
          ) : (
            <ul className="space-y-1">
              {sortedEvs.map((ev: any, i: number) => (
                <li key={i} className="text-xs flex items-center gap-2">
                  <span className="text-[10px] text-muted w-12 shrink-0">
                    {ev.all_day ? "종일" : ev.time ? fmtShortTime(ev.time) : ""}
                  </span>
                  <span className="flex-1 leading-snug">
                    {cleanEventSummary(ev.summary)}
                    {ev.source === "루틴" && (
                      <span className="ml-1 text-[9px] text-muted">루틴</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 마감 (광고/공구) — 오늘/내일만 richBundle 사용, 다른 일자는 calendar의 deadlines */}
        {richBundle &&
          (richBundle.ad_deadlines?.length || 0) +
            (richBundle.gongu_milestones?.length || 0) >
            0 && (
            <div className="border-t border-rule pt-2">
              <p className="text-[11px] text-muted mb-1">마감</p>
              <ul className="space-y-1">
                {richBundle.ad_deadlines.map((a: any, i: number) => (
                  <li key={`a${i}`} className="text-xs flex items-center gap-2">
                    <Pill color="#A85A35">{`광고 ${a.kind}`}</Pill>
                    <span className="flex-1">{`${a.audience} ${a.title}`}</span>
                  </li>
                ))}
                {richBundle.gongu_milestones.map((g: any, i: number) => (
                  <li key={`g${i}`} className="text-xs flex items-center gap-2">
                    <Pill color="#A85A35">{`공구 ${g.kind}`}</Pill>
                    <span className="flex-1">{`${g.audience} ${g.title}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        {!richBundle && dls.length > 0 && (
          <div className="border-t border-rule pt-2">
            <p className="text-[11px] text-muted mb-1">마감</p>
            <ul className="space-y-1">
              {dls.map((dl: any, i: number) => (
                <li key={i} className="text-xs flex items-center gap-2">
                  <Pill color="#A85A35">{dl.type}</Pill>
                  <span className="flex-1">{dl.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ✓ 할 일 */}
        <div className="border-t border-rule pt-2">
          <p className="text-[11px] text-muted mb-1">✓ 할 일</p>
          {todos.length === 0 && (
            <p className="text-xs text-muted">없음</p>
          )}
          <div className="space-y-1">
            {todos.map((t: any) => (
              <label
                key={t.line}
                className="flex items-start gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!!t.done}
                  onChange={() => startTransition(() => toggle(dateStr, t.line))}
                  className="mt-[3px] w-3.5 h-3.5 rounded shrink-0 cursor-pointer"
                />
                <span
                  className={
                    "text-xs flex-1 leading-snug " +
                    (t.done ? "line-through text-muted" : "")
                  }
                >
                  {t.text}
                </span>
              </label>
            ))}
          </div>

          {addingDate === dateStr ? (
            <div className="flex gap-1.5 mt-2">
              <input
                autoFocus
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAdd(dateStr);
                  if (e.key === "Escape") {
                    setAddingDate(null);
                    setAddText("");
                  }
                }}
                placeholder="할 일"
                disabled={busy}
                className="flex-1 text-xs rounded px-2 py-1 outline-none"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-main)",
                }}
              />
              <button
                onClick={() => submitAdd(dateStr)}
                disabled={busy}
                className="text-xs px-2 py-1 rounded disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
              >
                {busy ? "..." : "Enter"}
              </button>
              <button
                onClick={() => {
                  setAddingDate(null);
                  setAddText("");
                }}
                className="text-xs px-2 py-1 rounded text-muted"
                style={{ border: "1px solid var(--border)" }}
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAddingDate(dateStr);
                setAddText("");
              }}
              className="text-[11px] mt-1.5 transition hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              + 추가
            </button>
          )}
        </div>

        {/* ✅ 한 일 (v6.5) */}
        <CompactDoneSection
          dateStr={dateStr}
          dones={dayBucket?.dones || []}
          onAdd={(t) => addDoneCompact(dateStr, t)}
          onRemove={(line) =>
            startTransition(() => removeDoneCompact(dateStr, line))
          }
        />
      </div>
    );
  }

  function fmtShortRange(s: string): string {
    const [, m, d] = s.split("-");
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
  }

  return (
    <Card
      title={
        weekStart && weekEnd
          ? `이번 주 (${fmtShortRange(weekStart)} - ${fmtShortRange(weekEnd)})`
          : "이번 주"
      }
      rightSlot={
        <button
          onClick={() =>
            window.open(
              "https://calendar.google.com",
              "_blank",
              "noopener,noreferrer"
            )
          }
          className="px-2 py-0.5 text-xs rounded-md transition"
          style={{
            backgroundColor: "var(--secondary-soft)",
            color: "var(--secondary-text)",
            border: "1px solid var(--secondary)",
          }}
          title="구글 캘린더 새 탭으로 열기"
        >
          📅 캘린더
        </button>
      }
    >
      <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
        {days.map((d) => {
          const isOpen = expanded === d.date;
          const isToday = d.date === todayIso;
          const dayNum = parseInt(d.date.split("-")[2], 10);
          return (
            <li key={d.date}>
              <button
                onClick={() => setExpanded(isOpen ? "" : d.date)}
                className="w-full text-left py-2 flex items-center gap-2"
              >
                <span
                  className="text-xs font-semibold shrink-0 w-14"
                  style={{ color: isToday ? "var(--accent)" : undefined }}
                >
                  {d.weekday} {dayNum}
                  {isToday && (
                    <span className="ml-1 text-[10px] font-normal">(오늘)</span>
                  )}
                </span>
                <span className="text-xs text-muted flex-1 truncate">
                  {shortLabel(d.date)}
                </span>
                <span className="text-xs text-muted shrink-0">
                  {isOpen ? "▼" : "▸"}
                </span>
              </button>
              {isOpen && renderExpandedBody(d.date)}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 모바일 컴팩트 — ✅ 한 일 섹션 (v6.5)
// ─────────────────────────────────────────────────────────────────────

function CompactDoneSection({
  dateStr,
  dones,
  onAdd,
  onRemove,
}: {
  dateStr: string;
  dones: { line: number; text: string }[];
  onAdd: (text: string) => void | Promise<void>;
  onRemove: (line: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await onAdd(t);
      setText("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-rule pt-2">
      <p className="text-[11px] text-muted mb-1">✅ 한 일</p>
      {dones.length === 0 && <p className="text-xs text-muted">없음</p>}
      <ul className="space-y-1">
        {dones.map((d) => (
          <li
            key={d.line}
            className="text-xs flex items-start gap-2 group leading-snug"
          >
            <span className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }}>·</span>
            <span className="flex-1">{d.text}</span>
            <button
              onClick={() => onRemove(d.line)}
              className="text-[10px] text-muted opacity-0 group-hover:opacity-100 px-1"
              aria-label="삭제"
              title="삭제"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="flex gap-1.5 mt-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setAdding(false);
                setText("");
              }
            }}
            placeholder="한 일 (시간 적고 싶으면 앞에)"
            disabled={busy}
            className="flex-1 text-xs rounded px-2 py-1 outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
            }}
          />
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="text-xs px-2 py-1 rounded disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
          >
            {busy ? "..." : "Enter"}
          </button>
          <button
            onClick={() => {
              setAdding(false);
              setText("");
            }}
            className="text-xs px-2 py-1 rounded text-muted"
            style={{ border: "1px solid var(--border)" }}
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-[11px] mt-1.5 transition hover:opacity-70"
          style={{ color: "var(--accent)" }}
        >
          + 추가
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 이번 주 할 일 — 일별 카드 7일치 가로 펼침 (v6.2)
// ─────────────────────────────────────────────────────────────────────

const MAX_VISIBLE_TODOS = 5;

function WeeklyTodos({ initial }: { initial: any }) {
  const todayIso = iso(new Date());
  const [days, setDays] = useState<any[]>(initial?.days || []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addText, setAddText] = useState("");
  const [addDate, setAddDate] = useState<string>(todayIso);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  // 추가 인풋의 날짜 드롭다운 옵션 — 이번 주 7일
  const dayOptions = days.map((d) => ({
    value: d.date,
    label: `${d.weekday} ${parseInt(d.date.split("-")[2], 10)}일`,
  }));

  async function toggle(dateStr: string, line: number) {
    setDays((cur) =>
      cur.map((d) =>
        d.date !== dateStr
          ? d
          : {
              ...d,
              todos: d.todos.map((t: any) =>
                t.line === line ? { ...t, done: !t.done } : t
              ),
            }
      )
    );
    try {
      await callApi("PATCH", `daily/${dateStr}/todo/${line}/toggle`);
    } catch {
      // rollback
      setDays((cur) =>
        cur.map((d) =>
          d.date !== dateStr
            ? d
            : {
                ...d,
                todos: d.todos.map((t: any) =>
                  t.line === line ? { ...t, done: !t.done } : t
                ),
              }
        )
      );
    }
  }

  async function submitAdd() {
    const text = addText.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const r = await callApi("POST", `daily/${addDate}/todo`, { text });
      setDays((cur) =>
        cur.map((d) =>
          d.date !== addDate ? d : { ...d, todos: [...d.todos, r.item] }
        )
      );
      setAddText("");
    } catch (e) {
      alert("저장 실패: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="이번 주 할 일"
      rightSlot={
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <select
            value={addDate}
            onChange={(e) => setAddDate(e.target.value)}
            className="text-xs rounded px-1.5 py-1"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
            }}
          >
            {dayOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitAdd();
              if (e.key === "Escape") setAddText("");
            }}
            placeholder="할 일"
            disabled={busy}
            className="text-xs rounded px-2 py-1 outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
              width: 160,
            }}
          />
          <button
            onClick={submitAdd}
            disabled={busy || !addText.trim()}
            className="text-xs px-2 py-1 rounded disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
          >
            {busy ? "..." : "Enter"}
          </button>
          <button
            onClick={() => setAddText("")}
            disabled={!addText}
            className="text-xs px-2 py-1 rounded text-muted disabled:opacity-50"
            style={{ border: "1px solid var(--border)" }}
          >
            취소
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isToday = d.date === todayIso;
          const isOpen = !!expanded[d.date];
          const total = d.todos.length;
          const visibleTodos: any[] = isOpen
            ? d.todos
            : d.todos.slice(0, MAX_VISIBLE_TODOS);
          const overflow = total - MAX_VISIBLE_TODOS;
          const dayNum = parseInt(d.date.split("-")[2], 10);
          return (
            <div
              key={d.date}
              className="rounded-md p-2 text-[11px] min-h-[120px] flex flex-col"
              style={{
                backgroundColor: "var(--bg-card-soft)",
                border: isToday
                  ? "2px solid var(--accent)"
                  : "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="font-semibold"
                  style={{ color: isToday ? "var(--accent)" : undefined }}
                >
                  {d.weekday}
                </span>
                <span
                  className="text-muted"
                  style={{ color: isToday ? "var(--accent)" : undefined }}
                >
                  {dayNum}
                </span>
              </div>
              <div className="space-y-1 flex-1">
                {visibleTodos.map((t: any) => (
                  <label
                    key={t.line}
                    className="flex items-start gap-1.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!t.done}
                      onChange={() =>
                        startTransition(() => toggle(d.date, t.line))
                      }
                      className="mt-[2px] w-3 h-3 rounded shrink-0 cursor-pointer"
                    />
                    <span
                      className={
                        "leading-snug break-keep " +
                        (t.done ? "line-through text-muted" : "")
                      }
                    >
                      {t.text}
                    </span>
                  </label>
                ))}
                {total === 0 && (
                  <p className="text-muted">·</p>
                )}
              </div>
              {!isOpen && overflow > 0 && (
                <button
                  onClick={() =>
                    setExpanded((cur) => ({ ...cur, [d.date]: true }))
                  }
                  className="text-[10px] text-muted hover:opacity-70 mt-1 self-start"
                >
                  + {overflow}개 더 ▼
                </button>
              )}
              {isOpen && overflow > 0 && (
                <button
                  onClick={() =>
                    setExpanded((cur) => ({ ...cur, [d.date]: false }))
                  }
                  className="text-[10px] text-muted hover:opacity-70 mt-1 self-start"
                >
                  접기 ▲
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 오늘 / 내일 패널
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// 일별 카드 패널 (오늘 / 내일) — v6
// scheduleV2 응답을 받아서 캘린더 + 루틴 + 일별 카드 todos + 광고/공구 마감을 한 카드에
// 오늘 카드만 보더 강조 + "이월" 영역. 내일은 같은 구조에 일반 보더.
// ─────────────────────────────────────────────────────────────────────

function DailyPanel({
  kind,
  initial,
  incomplete,
}: {
  kind: "today" | "tomorrow";
  initial: any;
  incomplete?: any;
}) {
  const dateStr: string = initial?.date || "";
  // 옵시디언 초기 카드의 빈 `- [ ]` 항목은 대시보드에선 숨김 (line은 보존 안 함)
  const [todos, setTodos] = useState<any[]>(
    (initial?.todos || []).filter((t: any) => (t?.text || "").trim().length > 0)
  );
  const [dones, setDones] = useState<any[]>(initial?.dones || []);
  const [, startTransition] = useTransition();

  async function toggleTodo(line: number) {
    setTodos((cur) =>
      cur.map((t) => (t.line === line ? { ...t, done: !t.done } : t))
    );
    try {
      await callApi("PATCH", `daily/${dateStr}/todo/${line}/toggle`);
    } catch {
      setTodos((cur) =>
        cur.map((t) => (t.line === line ? { ...t, done: !t.done } : t))
      );
    }
  }
  async function addTodo(text: string) {
    const r = await callApi("POST", `daily/${dateStr}/todo`, { text });
    setTodos((cur) => [...cur, r.item]);
  }
  async function removeTodo(line: number) {
    const snapshot = todos;
    setTodos((cur) => cur.filter((t) => t.line !== line));
    try {
      await callApi("DELETE", `daily/${dateStr}/todo/${line}`);
    } catch {
      setTodos(snapshot);
    }
  }

  // v6.5 — 한 일 (사후 활동 기록)
  async function addDone(text: string) {
    const r = await callApi("POST", `daily/${dateStr}/done`, { text });
    setDones((cur) => [...cur, r.item]);
  }
  async function removeDone(line: number) {
    const snapshot = dones;
    setDones((cur) => cur.filter((d) => d.line !== line));
    try {
      await callApi("DELETE", `daily/${dateStr}/done/${line}`);
    } catch {
      setDones(snapshot);
    }
  }

  const calEvents: any[] = initial?.calendar_events || [];
  const routines: any[] = initial?.routines || [];
  const ads: any[] = initial?.ad_deadlines || [];
  const gongus: any[] = initial?.gongu_milestones || [];
  const headerLabel = kind === "today" ? "오늘" : "내일";
  const dateHeader = dateStr
    ? `${headerLabel} ${fmtMonthDayWeekday(dateStr)}`
    : headerLabel;

  const isToday = kind === "today";

  // 시간순 머지 (일정 = 캘린더 + 루틴)
  type TimedItem = {
    time: string | null;
    label: string;
    source: "캘린더" | "루틴";
    all_day: boolean;
  };
  const schedule: TimedItem[] = [
    ...calEvents.map((ev: any) => ({
      time: ev.all_day ? null : ev.time || null,
      label: cleanEventSummary(ev.summary),
      source: "캘린더" as const,
      all_day: !!ev.all_day,
    })),
    ...routines.map((r: any) => ({
      time: r.time,
      label: r.name,
      source: "루틴" as const,
      all_day: false,
    })),
  ].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1;
    if (!a.all_day && b.all_day) return 1;
    return (a.time || "").localeCompare(b.time || "");
  });

  const deadlines = [
    ...ads.map((a: any) => ({
      label: `${a.audience} ${a.title}`,
      kind: `광고 ${a.kind}`,
      state: a.state,
    })),
    ...gongus.map((g: any) => ({
      label: `${g.audience} ${g.title}`,
      kind: `공구 ${g.kind}`,
      state: g.state,
    })),
  ];

  return (
    <section
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: isToday ? "1.5px solid var(--accent)" : "1px solid var(--border)",
      }}
    >
      <h2
        className="text-sm font-semibold mb-3"
        style={{ color: isToday ? "var(--accent)" : "var(--text-secondary)" }}
      >
        {dateHeader}
      </h2>
      <div className="space-y-3">
        {/* 📅 일정 — 캘린더 + 루틴 */}
        <div>
          <p className="text-xs text-muted mb-1">📅 일정</p>
          {schedule.length ? (
            <ul className="space-y-1">
              {schedule.map((it, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="text-xs text-muted w-14 shrink-0">
                    {it.all_day ? "종일" : it.time ? fmtShortTime(it.time) : ""}
                  </span>
                  <span className="flex-1">
                    {it.label}
                    {it.source === "루틴" && (
                      <span className="ml-1.5 text-[10px] text-muted">루틴</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">없음</p>
          )}
        </div>

        {/* 마감 — 광고 + 공구 */}
        {deadlines.length > 0 && (
          <div className="border-t border-rule pt-2">
            <p className="text-xs text-muted mb-1">마감</p>
            <ul className="space-y-1">
              {deadlines.map((dl, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <Pill color="#A85A35">{dl.kind}</Pill>
                  <span className="flex-1">{dl.label}</span>
                  <span className="text-[10px] text-muted">{dl.state}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ✓ 할 일 — 일별 카드의 체크박스 */}
        <div className="border-t border-rule pt-2">
          <p className="text-xs text-muted mb-1">✓ 할 일</p>
          {todos.length === 0 && (
            <p className="text-sm text-muted">없음</p>
          )}
          <div className="space-y-1">
            {todos.map((t) => (
              <DailyTodoRow
                key={t.line}
                todo={t}
                onToggle={() => startTransition(() => toggleTodo(t.line))}
                onDelete={() => startTransition(() => removeTodo(t.line))}
              />
            ))}
          </div>
          <AddInline placeholder="할 일 추가" onAdd={addTodo} />
        </div>

        {/* ✅ 한 일 — 사후 활동 기록 (v6.5). 체크박스 X. 시간은 한나가 적은 그대로. */}
        <div className="border-t border-rule pt-2">
          <p className="text-xs text-muted mb-1">✅ 한 일</p>
          {dones.length === 0 && (
            <p className="text-sm text-muted">없음</p>
          )}
          <ul className="space-y-1">
            {dones.map((d) => (
              <li
                key={d.line}
                className="text-sm flex items-start gap-2 group"
              >
                <span
                  className="shrink-0 mt-0.5"
                  style={{ color: "var(--accent)" }}
                >
                  ·
                </span>
                <span className="flex-1 leading-snug">{d.text}</span>
                <button
                  onClick={() => startTransition(() => removeDone(d.line))}
                  className="text-[11px] text-muted opacity-0 group-hover:opacity-100 transition px-1"
                  title="삭제"
                  aria-label="삭제"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <AddInline placeholder="한 일 (시간 적고 싶으면 앞에)" onAdd={addDone} />
        </div>

        {/* 이월 — 오늘만 표시. 어제 일별 카드 미완료 + 진행중 할일카드 마감 이월 둘 다 */}
        {isToday &&
          ((initial?.incomplete_yesterday?.length || 0) +
            (incomplete?.items?.length || 0) >
            0) && (
            <div className="border-t border-rule pt-2">
              <p className="text-xs text-muted mb-1">이월 · 어제 못 끝낸 거</p>
              <ul className="space-y-1">
                {(initial?.incomplete_yesterday || []).map(
                  (it: any, i: number) => (
                    <li
                      key={`y${i}`}
                      className="text-sm text-muted flex items-baseline gap-2"
                    >
                      <span className="text-[10px] shrink-0">
                        {it.date
                          ? `어제(${fmtShortDateWeekday(new Date(it.date))})`
                          : "어제"}
                      </span>
                      <span className="flex-1">· {it.text}</span>
                    </li>
                  )
                )}
                {(incomplete?.items || []).slice(0, 3).map((it: any, i: number) => (
                  <li key={`d${i}`} className="text-sm text-muted">
                    · {it.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>
    </section>
  );
}

function DailyTodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: { line: number; text: string; done: boolean };
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2 group">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={onToggle}
        className="mt-[3px] w-4 h-4 rounded border-rule cursor-pointer"
      />
      <span
        className={
          "text-sm flex-1 cursor-pointer " +
          (todo.done ? "line-through text-muted" : "text-ink")
        }
        onClick={onToggle}
      >
        {todo.text}
      </span>
      <button
        onClick={onDelete}
        className="text-[11px] text-muted opacity-0 group-hover:opacity-100 transition px-1"
        title="삭제"
        aria-label="삭제"
      >
        ×
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// "오늘의 나"
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// 메모 패널 — 오늘 + 어제 미완료 메모. 체크하면 옵시디언 [x] + 화면 사라짐.
// 추가 폼은 항상 헤더 우측에 노출 (WeeklyTodos와 같은 패턴). 오늘 카드에 추가.
// ─────────────────────────────────────────────────────────────────────

function MemoPanel({ initial }: { initial: any }) {
  const todayIso = iso(new Date());
  const [items, setItems] = useState<any[]>(initial?.items || []);
  const [addText, setAddText] = useState("");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function toggle(dateStr: string, line: number) {
    // 낙관: 즉시 화면에서 제거 (체크 = 사라짐)
    const snapshot = items;
    setItems((cur) =>
      cur.filter((it) => !(it.date === dateStr && it.line === line))
    );
    try {
      await callApi("PATCH", `memo/${dateStr}/todo/${line}/toggle`);
    } catch {
      setItems(snapshot);
    }
  }

  async function remove(dateStr: string, line: number) {
    const snapshot = items;
    setItems((cur) =>
      cur.filter((it) => !(it.date === dateStr && it.line === line))
    );
    try {
      await callApi("DELETE", `memo/${dateStr}/todo/${line}`);
    } catch {
      setItems(snapshot);
    }
  }

  async function submitAdd() {
    const text = addText.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const r = await callApi("POST", `memo/${todayIso}/todo`, { text });
      // 응답 line은 새 줄 번호. 오늘 weekday는 클라이언트에서 계산.
      const wd = ["월", "화", "수", "목", "금", "토", "일"][
        (new Date().getDay() + 6) % 7
      ];
      setItems((cur) => [
        { date: todayIso, weekday: wd, line: r.item.line, text: r.item.text, done: false },
        ...cur,
      ]);
      setAddText("");
    } catch (e) {
      alert("저장 실패: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function dateLabel(it: any): string {
    if (it.date === todayIso) return "오늘";
    const m = it.date.match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (m) return `${it.weekday || ""} ${parseInt(m[1], 10)}/${parseInt(m[2], 10)}`;
    return it.date;
  }

  return (
    <Card
      title="📝 메모"
      rightSlot={
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <input
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitAdd();
              if (e.key === "Escape") setAddText("");
            }}
            placeholder="메모"
            disabled={busy}
            className="text-xs rounded px-2 py-1 outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
              width: 200,
            }}
          />
          <button
            onClick={submitAdd}
            disabled={busy || !addText.trim()}
            className="text-xs px-2 py-1 rounded disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
          >
            {busy ? "..." : "Enter"}
          </button>
          <button
            onClick={() => setAddText("")}
            disabled={!addText}
            className="text-xs px-2 py-1 rounded text-muted disabled:opacity-50"
            style={{ border: "1px solid var(--border)" }}
          >
            취소
          </button>
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">없음</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li
              key={`${it.date}-${it.line}`}
              className="flex items-start gap-2 group text-sm"
            >
              <input
                type="checkbox"
                checked={!!it.done}
                onChange={() =>
                  startTransition(() => toggle(it.date, it.line))
                }
                className="mt-[3px] w-4 h-4 rounded shrink-0 cursor-pointer"
              />
              <span className="flex-1 leading-snug">{it.text}</span>
              <span className="text-[10px] text-muted shrink-0 mt-0.5">
                {dateLabel(it)}
              </span>
              <button
                onClick={() => startTransition(() => remove(it.date, it.line))}
                className="text-[11px] text-muted opacity-0 group-hover:opacity-100 transition px-1"
                title="삭제"
                aria-label="삭제"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TodayMe({ data }: { data: any }) {
  const sleep = data?.sleep || {};
  const cond = data?.condition || {};
  const diet = data?.diet || {};
  const act = data?.activity || {};

  const sleepStr = sleep.duration_str
    ? sleep.duration_str
    : sleep.duration_min != null
    ? `${Math.floor(sleep.duration_min / 60)}:${String(sleep.duration_min % 60).padStart(2, "0")}`
    : null;

  const hasAny =
    sleep.duration_min != null ||
    sleep.score != null ||
    cond.score != null ||
    act.steps != null;

  return (
    <Card title="오늘의 나">
      <div className="text-sm space-y-2">
        {hasAny ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-muted">수면</span>{" "}
              <span className="font-medium" style={{ color: "var(--accent)" }}>
                {sleepStr ?? "—"}
              </span>
            </span>
            <span>
              <span className="text-muted">점수</span>{" "}
              <span className="font-medium" style={{ color: "var(--accent)" }}>
                {sleep.score ?? "—"}
              </span>
            </span>
            <span>
              <span className="text-muted">컨디션</span>{" "}
              <span className="font-medium" style={{ color: "var(--danger)" }}>
                {cond.score != null ? `${cond.score}/10` : "—"}
              </span>
            </span>
            <span>
              <span className="text-muted">걸음</span>{" "}
              <span className="font-medium" style={{ color: "var(--accent)" }}>
                {act.steps != null
                  ? new Intl.NumberFormat("ko-KR").format(act.steps)
                  : "—"}
              </span>
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted">
            데이터 없음 — 텔레그램 봇에서{" "}
            <span className="font-medium text-ink">/건강</span> 명령으로 등록
          </p>
        )}
        <div className="border-t border-rule pt-2">
          <p className="text-xs text-muted mb-1">식사</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <MealSlot label="아침" summary={diet.breakfast} />
            <MealSlot label="점심" summary={diet.lunch} />
            <MealSlot label="저녁" summary={diet.dinner} />
          </div>
        </div>
        <p className="text-[11px] text-muted">생리 주기 — 추후 추가</p>
      </div>
    </Card>
  );
}

function MealSlot({ label, summary }: { label: string; summary?: string | null }) {
  const recorded = !!(summary && summary.trim());
  return (
    <div
      className="rounded-md p-2"
      style={{
        border: `1px solid var(--border)`,
        backgroundColor: recorded ? "var(--bg-card-soft)" : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-medium" style={{ color: recorded ? "var(--accent)" : "var(--text-secondary)" }}>
          {label}
        </span>
        <span className="text-[10px] text-muted">{recorded ? "✓" : "─"}</span>
      </div>
      {recorded && (
        <div className="text-[10px] mt-1 leading-snug text-ink break-keep">
          {summary}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 빠른 처리
// ─────────────────────────────────────────────────────────────────────

function QuickTasks({ initial }: { initial: any }) {
  // v6.4.10 — done 항목 즉시 hide. backend index 보존(it.index).
  const [items, setItems] = useState<any[]>(
    (initial?.items || []).filter((it: any) => !it.done)
  );
  const [, startTransition] = useTransition();

  async function add(text: string) {
    const r = await callApi("POST", "quick-task", { text });
    setItems((cur) => [...cur, r.item]);
  }
  async function toggle(backendIdx: number) {
    const snapshot = items;
    setItems((cur) => cur.filter((it) => it.index !== backendIdx));
    try {
      await callApi("PATCH", "quick-task/toggle", { index: backendIdx });
    } catch {
      setItems(snapshot);
    }
  }

  return (
    <Card
      title="빠른 처리"
      bg="var(--secondary-soft)"
      borderColor="var(--secondary)"
    >
      {items.length === 0 && (
        <p className="text-sm text-muted">없음</p>
      )}
      <div className="space-y-1.5">
        {items.map((it) => (
          <Checkbox
            key={it.index}
            checked={false}
            onChange={() => startTransition(() => toggle(it.index))}
            label={it.text}
          />
        ))}
      </div>
      <AddInline placeholder="메시지/연락/잡일" onAdd={add} />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 진행중 카드
// ─────────────────────────────────────────────────────────────────────

function ActiveCards({ data }: { data: any }) {
  const items = data?.items || [];
  return (
    <Card
      title="진행중"
      rightSlot={
        <span className="text-xs text-muted">{data?.total || 0}건</span>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">없음</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it: any, i: number) => (
            <div
              key={i}
              className="rounded-lg p-3 transition"
              style={{ border: "1px solid var(--border)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div className="mb-1.5">
                <ActiveCardTag audience={it.audience} type={it.type} />
              </div>
              <p className="text-sm font-medium leading-snug">{it.title}</p>
              <p className="text-xs text-muted mt-1">{it.state}</p>
              {(it.reels || it.shorts) && (
                <p className="text-xs text-muted mt-0.5">
                  {it.reels && `릴스 ${it.reels}`}
                  {it.reels && it.shorts && " · "}
                  {it.shorts && `숏 ${it.shorts}`}
                </p>
              )}
              {it.deadline && (
                <p
                  className="text-xs mt-1 font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  {it.deadline_label ? `${it.deadline_label} ` : ""}
                  {fmtMonthDayWeekday(it.deadline)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <ActiveAdd />
    </Card>
  );
}

function ActiveCardTag({
  audience,
  type,
}: {
  audience: string;
  type: string;
}) {
  // 한나 → accent (그린), 혜린 → secondary (버터). type은 텍스트로만 구분.
  const isHanna = audience === "한나";
  return (
    <span
      className="inline-block text-[11px] px-2 py-0.5 rounded-md font-semibold tracking-tight"
      style={{
        color: isHanna ? "var(--accent-text)" : "var(--secondary-text)",
        backgroundColor: isHanna ? "var(--accent-soft)" : "var(--secondary-soft)",
      }}
    >
      {audience} · {type}
    </span>
  );
}

function ActiveAdd() {
  // 광고/공구는 봇으로 자연어 추가 (대시보드는 빠른 todo만)
  async function add(text: string) {
    await callApi("POST", "active-card", { title: text });
    // 페이지 새로고침으로 반영 (단순화)
    if (typeof window !== "undefined") window.location.reload();
  }
  return (
    <AddInline
      placeholder="빠른 할 일 (광고/공구는 봇으로 자연어 추가)"
      onAdd={add}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// 아이디어
// ─────────────────────────────────────────────────────────────────────

function IdeasRecent({ initial }: { initial: any }) {
  const [items, setItems] = useState<any[]>(initial?.items || []);
  async function add(text: string) {
    const r = await callApi("POST", "idea", { text });
    setItems([
      { title: r.title, category: r.category, file: r.file, created: "방금" },
      ...items,
    ]);
  }
  return (
    <Card
      title="아이디어 (최근)"
      rightSlot={
        initial?.total > 3 && (
          <span className="text-xs text-muted">외 {initial.total - 3}건</span>
        )
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">없음</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="text-sm flex items-center gap-2">
              <Pill>{it.category}</Pill>
              <span>{it.title}</span>
              <span className="text-[10px] text-muted">
                {/^\d{4}-\d{2}-\d{2}/.test(it.created)
                  ? fmtMonthDayWeekday(it.created.slice(0, 10))
                  : it.created}
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddInline placeholder="떠오른 아이디어" onAdd={add} />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 집안일 (할일 + 살것)
// ─────────────────────────────────────────────────────────────────────

function Chores({
  initialTodo,
  initialShop,
}: {
  initialTodo: any;
  initialShop: any;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CheckList
        title="집안일 — 할 일"
        endpointAdd="chore-todo"
        endpointToggle="chore-todo/toggle"
        initial={initialTodo}
        placeholder="화장실 청소, 빨래 등"
      />
      <CheckList
        title="집안일 — 살 것"
        endpointAdd="chore-shop"
        endpointToggle="chore-shop/toggle"
        initial={initialShop}
        placeholder="휴지, 세제 등 (음식료는 쿠팡)"
      />
    </div>
  );
}

function CheckList({
  title,
  endpointAdd,
  endpointToggle,
  initial,
  placeholder,
}: {
  title: string;
  endpointAdd: string;
  endpointToggle: string;
  initial: any;
  placeholder: string;
}) {
  // v6.4.10 — done 항목 hide. backend index(it.index) 보존.
  const [items, setItems] = useState<any[]>(
    (initial?.items || []).filter((it: any) => !it.done)
  );
  const [, startTransition] = useTransition();

  async function add(text: string) {
    const r = await callApi("POST", endpointAdd, { text });
    setItems((cur) => [...cur, r.item]);
  }
  async function toggle(backendIdx: number) {
    const snapshot = items;
    setItems((cur) => cur.filter((it) => it.index !== backendIdx));
    try {
      await callApi("PATCH", endpointToggle, { index: backendIdx });
    } catch {
      setItems(snapshot);
    }
  }
  return (
    <Card
      title={title}
      rightSlot={<span className="text-xs text-muted">{items.length}건</span>}
    >
      {items.length === 0 && <p className="text-sm text-muted">없음</p>}
      <div className="space-y-1.5">
        {items.map((it) => (
          <Checkbox
            key={it.index}
            checked={false}
            onChange={() => startTransition(() => toggle(it.index))}
            label={it.text}
          />
        ))}
      </div>
      <AddInline placeholder={placeholder} onAdd={add} />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 월간 달력
// ─────────────────────────────────────────────────────────────────────

function MonthlyCalendar({ data }: { data: any }) {
  if (data?.error) return <Card title="월간 캘린더"><ErrorBox msg={data.error} /></Card>;
  const year = data?.year;
  const month = data?.month;
  if (!year || !month) return <Card title="월간 캘린더">데이터 없음</Card>;

  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startWd = (first.getDay() + 6) % 7; // Mon=0
  const totalDays = last.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayIso = iso(new Date());
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = addDays(thisWeekStart, 6);
  const evMap = data.events_by_date || {};
  const dlMap = data.deadlines_by_date || {};

  return (
    <Card title={`${year}년 ${month}월`}>
      <div className="grid grid-cols-7 gap-0.5 text-xs text-center text-muted mb-1">
        {KO_WD.map((w) => (
          <div key={w} className="py-1 font-semibold">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-14" />;
          const ds = iso(d);
          const isToday = ds === todayIso;
          const inThisWeek = d >= thisWeekStart && d <= thisWeekEnd;
          const evs: any[] = evMap[ds] || [];
          const dls: any[] = dlMap[ds] || [];
          const hasAny = evs.length + dls.length > 0;
          return (
            <div
              key={i}
              className="relative h-14 rounded p-1 text-[11px] group"
              style={{
                border: isToday
                  ? `2px solid var(--accent)`
                  : `1px solid var(--border)`,
                backgroundColor:
                  inThisWeek && !isToday ? "var(--bg-card-soft)" : undefined,
              }}
            >
              <div className="text-ink">{d.getDate()}</div>
              <div className="flex gap-0.5 mt-0.5">
                {evs.length > 0 && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--accent)" }}
                  />
                )}
                {dls.length > 0 && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--danger)" }}
                  />
                )}
              </div>
              {hasAny && (
                <div
                  className="hidden group-hover:block absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1 w-52 p-2 rounded-md shadow-lg text-[11px] text-ink"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-strong)",
                    pointerEvents: "none",
                  }}
                >
                  <p className="font-semibold mb-1">
                    {fmtMonthDayWeekday(iso(d))}
                  </p>
                  {evs.slice(0, 4).map((ev: any, idx: number) => (
                    <p key={`e${idx}`} className="truncate">
                      <span className="text-muted mr-1">
                        {ev.all_day ? "종일" : fmtShortTime(ev.time || "")}
                      </span>
                      {cleanEventSummary(ev.summary)}
                    </p>
                  ))}
                  {dls.slice(0, 3).map((dl: any, idx: number) => (
                    <p key={`d${idx}`} className="truncate" style={{ color: "var(--danger)" }}>
                      <span className="mr-1">·</span>
                      {dl.type} {dl.title}
                    </p>
                  ))}
                  {evs.length + dls.length > 7 && (
                    <p className="text-muted mt-1">외 {evs.length + dls.length - 7}건</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 상세 보기 링크 (8개)
// ─────────────────────────────────────────────────────────────────────

function DetailLinks() {
  const links = [
    "할일",
    "광고",
    "공구",
    "아이디어",
    "건강",
    "매출",
    "식단",
    "📔 일기",
    "루틴 설정",
  ];

  function onClickDisabled(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (typeof window !== "undefined") {
      const label = e.currentTarget.textContent || "";
      if (label.includes("일기")) {
        window.alert(
          "일기는 옵시디언에서 직접 확인:\n03_본질/일기/YYYY-MM-DD.md\n(전용 페이지는 추후)"
        );
      } else {
        window.alert("준비 중 — 곧 만들 예정");
      }
    }
  }

  return (
    <Card title="상세 보기">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {links.map((label) => (
          <button
            key={label}
            onClick={onClickDisabled}
            className="rounded-md py-2 text-center text-sm transition cursor-pointer"
            style={{
              backgroundColor: "var(--bg-card-soft)",
              color: "var(--text-main)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent-soft)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-soft)";
            }}
          >
            {label} →
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-2">
        각 페이지는 다음 단계 — 지금은 메인만 작동.
      </p>
    </Card>
  );
}
