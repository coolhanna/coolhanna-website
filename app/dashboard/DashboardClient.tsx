"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CONTACT_CHANNELS } from "@/lib/dashboard-client";
import {
  cleanFields,
  Field as EditField,
  SelectField as EditSelect,
} from "@/app/dashboard/components/card-ui";

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

function fmtWon(n: number | null | undefined): string {
  if (!n) return "금액 미정";
  return new Intl.NumberFormat("ko-KR").format(n) + "원";
}

// v6.6.1 — D-day 색 (마감 임박도 시각 표시)
function deadlineColor(isoStr: string | null | undefined): string {
  if (!isoStr) return "var(--text-secondary)";
  try {
    const [y, m, d] = isoStr.split("-").map((s) => parseInt(s, 10));
    const target = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 1) return "var(--danger)";       // 오늘/내일 = 임박
    if (diff <= 3) return "var(--secondary-text)"; // 2-3일 = 주의
    return "var(--text-secondary)";              // 그 외 = 평범
  } catch {
    return "var(--text-secondary)";
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
  emphasis,
}: {
  title?: string;
  children: React.ReactNode;
  accent?: string;
  bg?: string;
  borderColor?: string;
  rightSlot?: React.ReactNode;
  emphasis?: "primary" | "secondary"; // v6.6.1 — 시각 계층 (primary=오늘 카드)
}) {
  const isPrimary = emphasis === "primary";
  const isSecondary = emphasis === "secondary";
  return (
    <section
      className={isPrimary ? "rounded-2xl p-4 sm:p-5" : "rounded-2xl p-4"}
      style={{
        backgroundColor: bg || (isSecondary ? "var(--bg-card-soft)" : "var(--bg-card)"),
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: borderColor || "var(--border)",
        ...(accent ? { borderTopColor: accent, borderTopWidth: 3 } : {}),
        ...(isPrimary
          ? { boxShadow: "0 1px 3px rgba(60, 70, 50, 0.06)" }
          : {}),
      }}
    >
      {(title || rightSlot) && (
        <div className="flex items-center justify-between mb-2.5">
          {title && (
            <h2
              className={
                isPrimary
                  ? "font-semibold tracking-tight flex items-center gap-2 text-base"
                  : "font-semibold tracking-tight flex items-center gap-2 text-sm"
              }
              style={{ color: "var(--text-main)" }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: isPrimary ? 6 : 4,
                  height: isPrimary ? 6 : 4,
                  backgroundColor: isPrimary
                    ? "var(--accent)"
                    : "var(--border-strong)",
                }}
              />
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

// v6.5.1 — 공통 X 삭제 버튼. 모바일에서 항상 visible, PC는 hover 시 진해짐.
// 크기: 22x22 (이전 11px 대비 ~2배). 터치 안전.
function DeleteX({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="shrink-0 inline-flex items-center justify-center rounded-md text-base leading-none transition select-none"
      style={{
        width: 22,
        height: 22,
        color: "var(--text-secondary)",
        opacity: 0.55,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.backgroundColor = "var(--bg-card-soft)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.55";
        e.currentTarget.style.backgroundColor = "transparent";
      }}
      aria-label="삭제"
      title="삭제"
    >
      ×
    </button>
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
  paymentFollowups: any;
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
  activeTodos: any;
  thinkingTracks: any;
};

export default function DashboardClient({ initial }: { initial: Initial }) {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-3 border-b border-rule">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-sm font-medium text-muted">
            {fmtDateKo(now)}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="inline-flex items-center justify-center rounded-md transition hover:opacity-70"
              style={{
                width: 32,
                height: 32,
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
                color: "var(--accent)",
                fontSize: 18,
                lineHeight: 1,
              }}
              title="새로고침"
              aria-label="새로고침"
            >
              ⟳
            </button>
            <span
              className="text-lg font-medium"
              style={{ color: "var(--accent)" }}
            >
              {fmtTimeKo(now)}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-page mx-auto px-5 sm:px-8 py-6 space-y-3">
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

        <ThinkingTracks initial={initial.thinkingTracks} />

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

        <ActiveTodos data={initial.activeTodos} />

        <ActiveCards
          data={initial.active}
          paymentData={initial.paymentFollowups}
        />

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
        <div className="flex items-center gap-1 flex-wrap justify-end text-xs">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="px-2.5 py-1.5 rounded-md transition"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
            }}
          >
            ‹ 지난주
          </button>
          <span className="text-muted px-1">
            {fmtShortDateWeekday(weekStart)} - {fmtShortDateWeekday(weekEnd)}
          </span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="px-2.5 py-1.5 rounded-md transition"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
            }}
          >
            다음주 ›
          </button>
          {iso(weekStart) !== iso(startOfWeek(new Date())) && (
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="px-2.5 py-1.5 rounded-md transition"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent-text)",
                border: "1px solid var(--accent)",
              }}
            >
              이번 주로
            </button>
          )}
          <button
            onClick={() => window.open("https://calendar.google.com", "_blank", "noopener,noreferrer")}
            className="px-2.5 py-1.5 rounded-md transition"
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
  const [weekStart, setWeekStart] = useState<string>(weeklyTodos?.week_start || "");
  const [weekEnd, setWeekEnd] = useState<string>(weeklyTodos?.week_end || "");
  const [weekOffset, setWeekOffset] = useState(0);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [, startTransition] = useTransition();
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [addText, setAddText] = useState("");
  const [busy, setBusy] = useState(false);

  const evMap: Record<string, any[]> = calendar?.events_by_date || {};
  const dlMap: Record<string, any[]> = calendar?.deadlines_by_date || {};

  // v6.6.3 — 다른 주 fetch (모바일)
  async function loadWeekMobile(offset: number) {
    if (loadingWeek) return;
    setLoadingWeek(true);
    try {
      const r = await callApi("GET", `weekly-todos?week_offset=${offset}`);
      setDays(r.days || []);
      setWeekStart(r.week_start);
      setWeekEnd(r.week_end);
      setWeekOffset(offset);
      // 펼친 날짜 = 새 주의 첫 날
      setExpanded(r.week_start || todayIso);
    } catch (e) {
      alert("불러오기 실패: " + (e as Error).message);
    } finally {
      setLoadingWeek(false);
    }
  }

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

  const weekLabelMobile =
    weekOffset === 0
      ? "이번 주"
      : weekOffset === 1
      ? "다음 주"
      : weekOffset === -1
      ? "지난 주"
      : weekOffset > 0
      ? `${weekOffset}주 후`
      : `${-weekOffset}주 전`;

  return (
    <Card
      title={
        weekStart && weekEnd
          ? `${weekLabelMobile} (${fmtShortRange(weekStart)} - ${fmtShortRange(weekEnd)})`
          : weekLabelMobile
      }
      rightSlot={
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {/* v6.6.4 — 모바일 주 페이지네이션 (큰 터치 영역) */}
          <button
            onClick={() => loadWeekMobile(weekOffset - 1)}
            disabled={loadingWeek}
            className="px-2.5 py-1.5 text-xs rounded-md disabled:opacity-50"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
            }}
          >
            ‹ 지난주
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => loadWeekMobile(0)}
              disabled={loadingWeek}
              className="px-2.5 py-1.5 text-xs rounded-md disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent-text)",
                border: "1px solid var(--accent)",
              }}
            >
              이번 주로
            </button>
          )}
          <button
            onClick={() => loadWeekMobile(weekOffset + 1)}
            disabled={loadingWeek}
            className="px-2.5 py-1.5 text-xs rounded-md disabled:opacity-50"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
            }}
          >
            다음주 ›
          </button>
          <button
            onClick={() =>
              window.open(
                "https://calendar.google.com",
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="px-2.5 py-1.5 text-xs rounded-md transition"
            style={{
              backgroundColor: "var(--secondary-soft)",
              color: "var(--secondary-text)",
              border: "1px solid var(--secondary)",
            }}
            title="구글 캘린더 새 탭으로 열기"
          >
            📅
          </button>
        </div>
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
            <DeleteX onClick={() => onRemove(d.line)} />
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

// v6.6.10 — 일자 droppable 컬럼
function DroppableDayColumn({
  dateStr,
  isToday,
  children,
}: {
  dateStr: string;
  isToday: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day::${dateStr}` });
  return (
    <div
      ref={setNodeRef}
      className="rounded-md p-2 text-[11px] min-h-[120px] flex flex-col transition"
      style={{
        backgroundColor: isOver ? "var(--accent-soft)" : "var(--bg-card-soft)",
        border: isToday
          ? "2px solid var(--accent)"
          : isOver
          ? "2px dashed var(--accent)"
          : "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}

// v6.6.10 — 드래그 가능한 todo 항목
function DraggableTodoItem({
  dateStr,
  todo,
  onToggle,
  onToggleImportant,
}: {
  dateStr: string;
  todo: { line: number; text: string; done: boolean };
  onToggle: () => void;
  onToggleImportant?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `todo::${dateStr}::${todo.line}` });
  const important = isImportantTodo(todo.text);
  const displayText = stripImportant(todo.text);
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    touchAction: "none",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1.5 group"
    >
      <input
        type="checkbox"
        checked={!!todo.done}
        onChange={onToggle}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-[2px] w-3 h-3 rounded shrink-0 cursor-pointer"
      />
      {onToggleImportant && (
        <button
          onClick={onToggleImportant}
          onPointerDown={(e) => e.stopPropagation()}
          className={
            "shrink-0 text-[11px] leading-none mt-[2px] transition " +
            (important ? "" : "opacity-0 group-hover:opacity-50")
          }
          style={important ? { color: "var(--secondary)" } : undefined}
          aria-label="중요 표시 토글"
          title="중요 표시"
        >
          {important ? "★" : "☆"}
        </button>
      )}
      <span
        {...attributes}
        {...listeners}
        className={
          "leading-snug break-keep flex-1 select-none " +
          (todo.done ? "line-through text-muted " : "") +
          (important && !todo.done ? "font-semibold" : "")
        }
      >
        {displayText}
      </span>
    </div>
  );
}

const IMPORTANT_MARK = "⭐";
function isImportantTodo(text: string): boolean {
  return typeof text === "string" && text.startsWith(IMPORTANT_MARK);
}
function stripImportant(text: string): string {
  return isImportantTodo(text) ? text.slice(IMPORTANT_MARK.length).trim() : text;
}

function WeeklyTodos({ initial }: { initial: any }) {
  const todayIso = iso(new Date());
  const [days, setDays] = useState<any[]>(initial?.days || []);
  const [weekStart, setWeekStart] = useState<string>(
    initial?.week_start || todayIso
  );
  const [weekEnd, setWeekEnd] = useState<string>(
    initial?.week_end || todayIso
  );
  const [weekOffset, setWeekOffset] = useState(0); // 0=이번 주, ±N
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addText, setAddText] = useState("");
  const [addDate, setAddDate] = useState<string>(todayIso);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  // v6.6.5 — 일자 드롭다운:
  //  - 이번 주 (offset=0): 오늘부터 7일 (지난 날 제외, 부족하면 다음 주 자동 채움)
  //  - 다른 주 (offset≠0): 그 주 7일 그대로 (지난 주도 기록 가능)
  const KO_WD_SHORT = ["월", "화", "수", "목", "금", "토", "일"];
  const dayOptions = (() => {
    if (weekOffset === 0) {
      const opts: { value: string; label: string }[] = [];
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      for (let i = 0; i < 7; i++) {
        const d = addDays(base, i);
        const wd = KO_WD_SHORT[(d.getDay() + 6) % 7];
        opts.push({
          value: iso(d),
          label: `${wd} ${d.getDate()}일`,
        });
      }
      return opts;
    }
    return days.map((d) => ({
      value: d.date,
      label: `${d.weekday} ${parseInt(d.date.split("-")[2], 10)}일`,
    }));
  })();

  // v6.6.10 — 드래그앤드롭으로 다른 날짜 이동
  const moveSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  );

  async function handleTodoMove(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("todo::") || !overId.startsWith("day::")) return;
    const [, fromDate, lineStr] = activeId.split("::");
    const line = parseInt(lineStr, 10);
    const toDate = overId.replace("day::", "");
    if (fromDate === toDate) return;

    // 낙관적 이동
    const fromDay = days.find((d) => d.date === fromDate);
    const moving = fromDay?.todos.find((t: any) => t.line === line);
    if (!moving) return;
    setDays((cur) =>
      cur.map((d) => {
        if (d.date === fromDate)
          return { ...d, todos: d.todos.filter((t: any) => t.line !== line) };
        if (d.date === toDate)
          return { ...d, todos: [...d.todos, moving] };
        return d;
      })
    );

    try {
      const r = await callApi(
        "PATCH",
        `daily/${fromDate}/todo/${line}/move`,
        { to_date: toDate }
      );
      // 새 line 번호로 갱신
      setDays((cur) =>
        cur.map((d) => {
          if (d.date !== toDate) return d;
          return {
            ...d,
            todos: d.todos.map((t: any) =>
              t.line === line && t.text === moving.text ? r.item : t
            ),
          };
        })
      );
    } catch (e) {
      alert("이동 실패: " + (e as Error).message);
      if (typeof window !== "undefined") window.location.reload();
    }
  }

  // v6.6.3 — 다른 주 fetch
  async function loadWeek(offset: number) {
    if (loadingWeek) return;
    setLoadingWeek(true);
    try {
      const r = await callApi("GET", `weekly-todos?week_offset=${offset}`);
      setDays(r.days || []);
      setWeekStart(r.week_start);
      setWeekEnd(r.week_end);
      setWeekOffset(offset);
      // v6.6.5 — 이번 주(0)면 오늘 기본, 다른 주면 그 주 월요일
      setAddDate(offset === 0 ? todayIso : (r.week_start || todayIso));
    } catch (e) {
      alert("불러오기 실패: " + (e as Error).message);
    } finally {
      setLoadingWeek(false);
    }
  }

  function fmtRange(start: string, end: string): string {
    if (!start || !end) return "";
    const [, sm, sd] = start.split("-");
    const [, em, ed] = end.split("-");
    return `${parseInt(sm, 10)}/${parseInt(sd, 10)} - ${parseInt(em, 10)}/${parseInt(ed, 10)}`;
  }

  const weekLabel =
    weekOffset === 0
      ? "이번 주 할 일"
      : weekOffset === 1
      ? "다음 주 할 일"
      : weekOffset === -1
      ? "지난 주 할 일"
      : weekOffset > 0
      ? `${weekOffset}주 후 할 일`
      : `${-weekOffset}주 전 할 일`;

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

  async function toggleImportant(dateStr: string, line: number, text: string) {
    const next = !isImportantTodo(text);
    const newText = next ? `${IMPORTANT_MARK} ${stripImportant(text)}` : stripImportant(text);
    setDays((cur) =>
      cur.map((d) =>
        d.date !== dateStr
          ? d
          : {
              ...d,
              todos: d.todos.map((t: any) =>
                t.line === line ? { ...t, text: newText } : t
              ),
            }
      )
    );
    try {
      await callApi("PATCH", `daily/${dateStr}/todo/${line}/important`, {
        important: next,
      });
    } catch {
      setDays((cur) =>
        cur.map((d) =>
          d.date !== dateStr
            ? d
            : {
                ...d,
                todos: d.todos.map((t: any) =>
                  t.line === line ? { ...t, text } : t
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
      title={`${weekLabel} (${fmtRange(weekStart, weekEnd)})`}
      rightSlot={
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* v6.6.4 — 주 페이지네이션 (큰 버튼, 자연스러운 라벨) */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => loadWeek(weekOffset - 1)}
              disabled={loadingWeek}
              className="px-3 py-1.5 text-xs rounded-md transition disabled:opacity-50"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-main)",
              }}
              title="지난 주"
            >
              ‹ 지난주
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => loadWeek(0)}
                disabled={loadingWeek}
                className="px-3 py-1.5 text-xs rounded-md transition disabled:opacity-50"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent-text)",
                  border: "1px solid var(--accent)",
                }}
              >
                이번 주로
              </button>
            )}
            <button
              onClick={() => loadWeek(weekOffset + 1)}
              disabled={loadingWeek}
              className="px-3 py-1.5 text-xs rounded-md transition disabled:opacity-50"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-main)",
              }}
              title="다음 주"
            >
              다음주 ›
            </button>
          </div>
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
      <DndContext
        sensors={moveSensors}
        collisionDetection={closestCorners}
        onDragEnd={handleTodoMove}
      >
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const isToday = d.date === todayIso;
            const isOpen = !!expanded[d.date];
            const total = d.todos.length;
            const sortedTodos: any[] = [...d.todos].sort(
              (a, b) =>
                (isImportantTodo(b.text) ? 1 : 0) -
                (isImportantTodo(a.text) ? 1 : 0)
            );
            const visibleTodos: any[] = isOpen
              ? sortedTodos
              : sortedTodos.slice(0, MAX_VISIBLE_TODOS);
            const overflow = total - MAX_VISIBLE_TODOS;
            const dayNum = parseInt(d.date.split("-")[2], 10);
            return (
              <DroppableDayColumn
                key={d.date}
                dateStr={d.date}
                isToday={isToday}
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
                    <DraggableTodoItem
                      key={t.line}
                      dateStr={d.date}
                      todo={t}
                      onToggle={() =>
                        startTransition(() => toggle(d.date, t.line))
                      }
                      onToggleImportant={() =>
                        toggleImportant(d.date, t.line, t.text)
                      }
                    />
                  ))}
                  {total === 0 && <p className="text-muted">·</p>}
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
              </DroppableDayColumn>
            );
          })}
        </div>
      </DndContext>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 생각 이어가기 — 이번 달 / 이번 주
// ─────────────────────────────────────────────────────────────────────

type ThinkingScope = "week" | "month";

function ThinkingTracks({ initial }: { initial: any }) {
  const [tracks, setTracks] = useState<{ week: any[]; month: any[] }>({
    week: initial?.week || [],
    month: initial?.month || [],
  });
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const r = await callApi("GET", "thinking-tracks");
    setTracks({ week: r.week || [], month: r.month || [] });
  }

  async function add(scope: ThinkingScope, text: string) {
    setBusy(true);
    try {
      await callApi("POST", "thinking-track", { scope, text });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(scope: ThinkingScope, line: number) {
    setBusy(true);
    try {
      await callApi("PATCH", "thinking-track/toggle", { scope, line });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addNote(scope: ThinkingScope, line: number, text: string) {
    setBusy(true);
    try {
      await callApi("POST", "thinking-track/note", { scope, line, text });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="생각 이어가기"
      rightSlot={
        <span className="text-xs text-muted">
          월간 {tracks.month.filter((x) => !x.done).length} · 주간{" "}
          {tracks.week.filter((x) => !x.done).length}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        <ThoughtColumn
          title="이번 주에 이어갈 생각"
          scope="week"
          items={tracks.week}
          busy={busy}
          placeholder="이번 주에 놓치면 아쉬운 생각"
          onAdd={add}
          onToggle={toggle}
          onAddNote={addNote}
        />
        <ThoughtColumn
          title="이번 달에 붙잡을 생각"
          scope="month"
          items={tracks.month}
          busy={busy}
          placeholder="이번 달 내내 굴릴 질문"
          onAdd={add}
          onToggle={toggle}
          onAddNote={addNote}
        />
      </div>
    </Card>
  );
}

function ThoughtColumn({
  title,
  scope,
  items,
  busy,
  placeholder,
  onAdd,
  onToggle,
  onAddNote,
}: {
  title: string;
  scope: ThinkingScope;
  items: any[];
  busy: boolean;
  placeholder: string;
  onAdd: (scope: ThinkingScope, text: string) => Promise<void>;
  onToggle: (scope: ThinkingScope, line: number) => Promise<void>;
  onAddNote: (scope: ThinkingScope, line: number, text: string) => Promise<void>;
}) {
  const active = items.filter((it) => !it.done);
  const done = items.filter((it) => it.done);

  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-card-soft)",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="text-[13px] font-semibold leading-tight" style={{ color: "var(--text-main)" }}>
          {title}
        </h3>
        <span className="text-[11px] text-muted shrink-0">{active.length}</span>
      </div>
      {active.length === 0 && done.length === 0 && (
        <p className="text-xs text-muted">아직 없음</p>
      )}
      <div className="space-y-1.5">
        {active.map((it) => (
          <ThoughtRow
            key={it.line}
            item={it}
            busy={busy}
            onToggle={() => onToggle(scope, it.line)}
            onAddNote={(text) => onAddNote(scope, it.line, text)}
          />
        ))}
      </div>
      <AddInline placeholder={placeholder} onAdd={(text) => onAdd(scope, text)} />
    </div>
  );
}

function ThoughtRow({
  item,
  busy,
  onToggle,
  onAddNote,
  compact,
}: {
  item: any;
  busy: boolean;
  onToggle: () => void;
  onAddNote: (text: string) => Promise<void>;
  compact?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const notes = item.notes || [];
  const lastNotes = compact ? notes.slice(-1) : notes.slice(-3);

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    try {
      await onAddNote(value);
      setText("");
      setAdding(false);
    } catch (e) {
      alert("저장 실패: " + (e as Error).message);
    }
  }

  return (
    <div
      className="rounded-md p-2"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!item.done}
          onChange={onToggle}
          disabled={busy}
          className="mt-[3px] w-4 h-4 rounded shrink-0 cursor-pointer"
        />
        <span
          className={
            "text-sm leading-snug flex-1 " +
            (item.done ? "line-through text-muted" : "text-ink")
          }
        >
          {item.text}
        </span>
      </label>
      {lastNotes.length > 0 && (
        <ul className="mt-1.5 ml-6 space-y-0.5">
          {lastNotes.map((note: string, idx: number) => (
            <li key={idx} className="text-xs text-muted leading-snug">
              {note}
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        adding ? (
          <div className="flex gap-1.5 mt-2 ml-6">
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
              placeholder="꼬리 생각"
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
              Enter
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            disabled={busy}
            className="text-[11px] mt-1.5 ml-6 transition hover:opacity-70 disabled:opacity-50"
            style={{ color: "var(--accent)" }}
          >
            + 꼬리
          </button>
        )
      )}
    </div>
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
                <DeleteX
                  onClick={() => startTransition(() => removeDone(d.line))}
                />
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
      <DeleteX onClick={onDelete} />
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
  const [showDone, setShowDone] = useState(false); // v6.6.8 — 완료 섹션 펼침
  const [, startTransition] = useTransition();

  async function toggle(dateStr: string, line: number) {
    // v6.6.7 — 체크해도 화면에 남김 (한나 룰 변경): done 상태로 표시 (줄긋기)
    setItems((cur) =>
      cur.map((it) =>
        it.date === dateStr && it.line === line
          ? { ...it, done: !it.done }
          : it
      )
    );
    try {
      await callApi("PATCH", `memo/${dateStr}/todo/${line}/toggle`);
    } catch {
      // rollback
      setItems((cur) =>
        cur.map((it) =>
          it.date === dateStr && it.line === line
            ? { ...it, done: !it.done }
            : it
        )
      );
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
      {(() => {
        const pending = items.filter((it) => !it.done);
        const done = items.filter((it) => it.done);
        return (
          <>
            {pending.length === 0 && done.length === 0 && (
              <p className="text-sm text-muted">없음</p>
            )}
            {pending.length > 0 && (
              <ul className="space-y-1">
                {pending.map((it) => (
                  <li
                    key={`${it.date}-${it.line}`}
                    className="flex items-start gap-2 group text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() =>
                        startTransition(() => toggle(it.date, it.line))
                      }
                      className="mt-[3px] w-4 h-4 rounded shrink-0 cursor-pointer"
                    />
                    <span className="flex-1 leading-snug">{it.text}</span>
                    <span className="text-[10px] text-muted shrink-0 mt-1">
                      {dateLabel(it)}
                    </span>
                    <DeleteX
                      onClick={() =>
                        startTransition(() => remove(it.date, it.line))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
            {done.length > 0 && (
              <div className={pending.length > 0 ? "mt-3 pt-3 border-t border-rule" : ""}>
                <button
                  onClick={() => setShowDone((v) => !v)}
                  className="text-xs flex items-center gap-1 hover:opacity-70 transition"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>완료 {done.length}건</span>
                  <span>{showDone ? "▲" : "▼"}</span>
                </button>
                {showDone && (
                  <ul className="space-y-1 mt-2">
                    {done.map((it) => (
                      <li
                        key={`${it.date}-${it.line}`}
                        className="flex items-start gap-2 group text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() =>
                            startTransition(() => toggle(it.date, it.line))
                          }
                          className="mt-[3px] w-4 h-4 rounded shrink-0 cursor-pointer"
                        />
                        <span className="flex-1 leading-snug line-through text-muted">
                          {it.text}
                        </span>
                        <span className="text-[10px] text-muted shrink-0 mt-1">
                          {dateLabel(it)}
                        </span>
                        <DeleteX
                          onClick={() =>
                            startTransition(() => remove(it.date, it.line))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        );
      })()}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <MealSlot label="아침" summary={diet.breakfast} />
            <MealSlot label="점심" summary={diet.lunch} />
            <MealSlot label="저녁" summary={diet.dinner} />
            <MealSlot label="간식" summary={diet.snack} />
          </div>
        </div>
        <p className="text-[11px] text-muted">생리 주기 — 추후 추가</p>
      </div>
    </Card>
  );
}

function MealSlot({ label, summary }: { label: string; summary?: string | null }) {
  // v6.6.11 — 끼니별 직접 추가 가능
  const [localSummary, setLocalSummary] = useState(summary || "");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const recorded = !!(localSummary && localSummary.trim());

  async function submit() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await callApi("POST", `diet/${encodeURIComponent(label)}`, { text: t });
      setLocalSummary(localSummary ? `${localSummary}, ${t}` : t);
      setText("");
      setEditing(false);
    } catch (e) {
      alert("저장 실패: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-md p-2"
      style={{
        border: `1px solid var(--border)`,
        backgroundColor: recorded ? "var(--bg-card-soft)" : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="font-medium"
          style={{ color: recorded ? "var(--accent)" : "var(--text-secondary)" }}
        >
          {label}
        </span>
        <span className="text-[10px] text-muted">{recorded ? "✓" : "─"}</span>
        <button
          onClick={() => setEditing((v) => !v)}
          className="ml-auto text-[10px] hover:opacity-70 transition"
          style={{ color: "var(--accent)" }}
          title="추가"
        >
          {editing ? "취소" : "+ 추가"}
        </button>
      </div>
      {recorded && (
        <div className="text-[10px] mt-1 leading-snug text-ink break-keep">
          {localSummary}
        </div>
      )}
      {editing && (
        <div className="mt-1.5 flex gap-1">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setEditing(false);
                setText("");
              }
            }}
            placeholder={`${label}으로 먹은 거`}
            disabled={busy}
            className="flex-1 text-[10px] rounded px-1.5 py-1 outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
            }}
          />
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="text-[10px] px-2 py-1 rounded disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
          >
            {busy ? "..." : "✓"}
          </button>
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
// 입금 대기 — 업로드/마감 이후 돈 들어올 카드만
// ─────────────────────────────────────────────────────────────────────

function PaymentFollowups({ data }: { data: any }) {
  if (data?.error) {
    return (
      <Card title="입금 대기">
        <ErrorBox msg={data.error} />
      </Card>
    );
  }
  const items: any[] = data?.items || [];
  if (items.length === 0) {
    return null;
  }

  return (
    <Card
      title="입금 대기"
      bg="var(--bg-card-soft)"
      borderColor="var(--border)"
      rightSlot={
        <span className="text-xs text-muted">
          {items.length}건
          {data?.overdue > 0 && (
            <span style={{ color: "var(--danger)" }}> · 지연 {data.overdue}</span>
          )}
        </span>
      }
    >
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {items.map((it) => {
          const overdue =
            typeof it.days_until_payment === "number" && it.days_until_payment < 0;
          return (
            <div
              key={`${it.type}-${it.file}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 text-xs"
            >
              <ActiveCardTag audience={it.audience} type={it.type} />
              <span className="font-medium min-w-0 truncate max-w-[180px] sm:max-w-[260px]">
                {it.title}
              </span>
              <span
                className="font-medium"
                style={{
                  color: overdue ? "var(--danger-text)" : "var(--text-secondary)",
                }}
              >
                {it.wait_label}
              </span>
              <span className="text-muted">
                {it.anchor_label} {it.anchor_date ? fmtMonthDayWeekday(it.anchor_date) : "미정"}
              </span>
              <span className="text-muted">
                입금 {it.payment_date ? fmtMonthDayWeekday(it.payment_date) : "미정"}
              </span>
              <span
                className="ml-auto font-medium"
                style={{ color: overdue ? "var(--danger-text)" : "var(--text-secondary)" }}
              >
                {fmtWon(it.amount_won)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 진행중 카드
// ─────────────────────────────────────────────────────────────────────

// v6.5.2 — 새로고침 버튼. localStorage 순서 키 삭제 + 페이지 리로드.
function RefreshButton({
  storageKey,
  title = "순서 초기화 + 새로고침",
}: {
  storageKey: string;
  title?: string;
}) {
  function handleClick() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // 무시
    }
    window.location.reload();
  }
  return (
    <button
      onClick={handleClick}
      title={title}
      aria-label="새로고침"
      className="shrink-0 inline-flex items-center justify-center rounded-md transition"
      style={{
        width: 28,
        height: 28,
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-card-soft)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--accent-soft)";
        e.currentTarget.style.color = "var(--accent-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-card-soft)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>↻</span>
    </button>
  );
}

const ACTIVE_CARDS_ORDER_KEY = "dashboard:active-cards-order";

// 저장된 순서 + API 순서 머지. 새 카드는 뒤에 추가, 제거된 카드는 빠짐.
function applySavedOrder<T extends { file: string }>(
  items: T[],
  savedIds: string[]
): T[] {
  const byId = new Map(items.map((it) => [it.file, it]));
  const ordered: T[] = [];
  for (const id of savedIds) {
    const it = byId.get(id);
    if (it) {
      ordered.push(it);
      byId.delete(id);
    }
  }
  for (const it of byId.values()) ordered.push(it);
  return ordered;
}

function loadOrder(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveOrder(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // localStorage 사용 불가 시 무시
  }
}

// v6.6.11 — 입금 대기 판정 룰 (광고/공구별)
const WAITING_STATES: Record<string, Set<string>> = {
  광고: new Set(["업로드"]),
  공구: new Set(["마감", "매출확인"]),
};

function isWaitingItem(item: any): boolean {
  return WAITING_STATES[item.type]?.has(item.state) ?? false;
}

function nextStateOnMove(item: any, toWaiting: boolean): string {
  if (item.type === "광고") return toWaiting ? "업로드" : "콘텐츠";
  if (item.type === "공구") return toWaiting ? "마감" : "진행중";
  return item.state;
}

// 드래그 가능한 카드 + 드롭 가능한 그룹 영역
function DroppableGroup({
  groupId,
  children,
}: {
  groupId: "active" | "waiting";
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group::${groupId}` });
  return (
    <div
      ref={setNodeRef}
      className="rounded-lg p-2 transition"
      style={{
        minHeight: 80,
        border: isOver ? "2px dashed var(--accent)" : "1px dashed var(--border)",
        backgroundColor: isOver
          ? "var(--accent-soft)"
          : "var(--bg-card-soft)",
      }}
    >
      {children}
    </div>
  );
}

function DraggableActiveCard({ item, onEdit }: { item: any; onEdit?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.file });
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    touchAction: "none",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-card)",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg p-2.5 transition"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <ActiveCardTag audience={item.audience} type={item.type} />
        <span className="text-[11px] text-muted ml-auto shrink-0">{item.state}</span>
        {onEdit && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-[11px] px-1.5 py-0.5 rounded transition shrink-0 hover:opacity-70"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            aria-label="수정"
          >
            수정
          </button>
        )}
      </div>
      <p className="text-[13px] font-medium leading-snug">{item.title}</p>
      <p className="text-[11px] text-muted mt-0.5 truncate">
        {item.deadline && (
          <span style={{ color: deadlineColor(item.deadline) }} className="font-medium">
            {item.deadline_label ? `${item.deadline_label} ` : ""}
            {fmtMonthDayWeekday(item.deadline)}
          </span>
        )}
        {item.deadline && (item.reels || item.shorts) && " · "}
        {item.reels && `릴스 ${item.reels}`}
        {item.reels && item.shorts && " · "}
        {item.shorts && `숏 ${item.shorts}`}
      </p>
    </div>
  );
}

// v6.6.12 — 입금 대기 작은 row (PaymentFollowups 스타일을 그룹 내부에 흡수)
function WaitingRow({ item, onEdit }: { item: any; onEdit?: () => void }) {
  const overdue =
    typeof item.days_until_payment === "number" && item.days_until_payment < 0;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 px-2 text-xs">
      <ActiveCardTag audience={item.audience} type={item.type} />
      <span className="font-medium min-w-0 truncate max-w-[160px] sm:max-w-[240px]">
        {item.title}
      </span>
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-[11px] px-1.5 py-0.5 rounded shrink-0 hover:opacity-70"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          수정
        </button>
      )}
      {item.wait_label && (
        <span
          className="font-medium"
          style={{
            color: overdue ? "var(--danger-text)" : "var(--text-secondary)",
          }}
        >
          {item.wait_label}
        </span>
      )}
      {item.anchor_label && (
        <span className="text-muted">
          {item.anchor_label}{" "}
          {item.anchor_date ? fmtMonthDayWeekday(item.anchor_date) : "미정"}
        </span>
      )}
      {item.payment_date !== undefined && (
        <span className="text-muted">
          입금 {item.payment_date ? fmtMonthDayWeekday(item.payment_date) : "미정"}
        </span>
      )}
      {item.amount_won != null && (
        <span
          className="ml-auto font-medium"
          style={{
            color: overdue ? "var(--danger-text)" : "var(--text-secondary)",
          }}
        >
          {fmtWon(item.amount_won)}
        </span>
      )}
    </div>
  );
}

function DraggableWaitingRow({ item, onEdit }: { item: any; onEdit?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.file });
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none",
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 px-2 text-xs">
        <span {...attributes} {...listeners} style={{ cursor: "grab" }} className="flex items-center gap-2 min-w-0">
          <ActiveCardTag audience={item.audience} type={item.type} />
          <span className="font-medium min-w-0 truncate max-w-[150px] sm:max-w-[220px]">
            {item.title}
          </span>
        </span>
        <span className="text-muted">{item.state}</span>
        {item.deadline && (
          <span
            className="text-muted"
            style={{ color: deadlineColor(item.deadline) }}
          >
            {item.deadline_label || ""} {fmtMonthDayWeekday(item.deadline)}
          </span>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-[11px] px-1.5 py-0.5 rounded shrink-0 hover:opacity-70 ml-auto"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            수정
          </button>
        )}
      </div>
    </div>
  );
}

function ActiveCards({
  data,
  paymentData,
}: {
  data: any;
  paymentData?: any;
}) {
  // v6.5.1 — 광고/공구만. 할 일은 별도 ActiveTodos 영역. 드래그로 순서 변경 가능.
  const [apiItems, setApiItems] = useState<any[]>(() => data?.items || []);
  const [items, setItems] = useState<any[]>(() =>
    applySavedOrder(apiItems, loadOrder(ACTIVE_CARDS_ORDER_KEY))
  );

  // API 응답 갱신 시 저장된 순서로 재정렬
  useEffect(() => {
    const next = data?.items || [];
    setApiItems(next);
    setItems(applySavedOrder(next, loadOrder(ACTIVE_CARDS_ORDER_KEY)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // SSR/개발 HMR 상태가 오래 붙잡히는 경우를 막기 위해 마운트 후 한 번 더 최신화.
  useEffect(() => {
    let cancelled = false;
    callApi("GET", "active-cards")
      .then((r) => {
        if (cancelled || r?.error) return;
        const next = r.items || [];
        setApiItems(next);
        setItems(applySavedOrder(next, loadOrder(ACTIVE_CARDS_ORDER_KEY)));
      })
      .catch(() => {
        // 초기 데이터가 있으므로 조용히 유지.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [showAllWaiting, setShowAllWaiting] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  async function reload() {
    try {
      const r = await callApi("GET", "active-cards");
      if (r?.error) return;
      const next = r.items || [];
      setApiItems(next);
      setItems(applySavedOrder(next, loadOrder(ACTIVE_CARDS_ORDER_KEY)));
    } catch {
      // 조용히 유지
    }
  }

  // v6.6.11 — 그룹 분리 + 그룹 간 드래그로 상태 변경
  // v6.6.12 — payment API의 입금 대기도 통합 (file 기준 중복 제거)
  const activeItems = items.filter((it) => !isWaitingItem(it));
  const waitingFromActive = items.filter((it) => isWaitingItem(it));
  const paymentItems: any[] = paymentData?.items || [];
  const activeFiles = new Set(waitingFromActive.map((it) => it.file));
  const waitingFromPayment = paymentItems.filter((p) => !activeFiles.has(p.file));
  const waitingItems = [...waitingFromActive, ...waitingFromPayment];

  async function changeState(item: any, toWaiting: boolean) {
    const newState = nextStateOnMove(item, toWaiting);
    // 낙관적: 화면 갱신
    setItems((cur) =>
      cur.map((it) =>
        it.file === item.file ? { ...it, state: newState } : it
      )
    );
    try {
      const endpoint = item.type === "광고" ? "ad" : "gongu";
      await callApi(
        "PATCH",
        `${endpoint}/${encodeURIComponent(item.file)}/state`,
        { state: newState }
      );
    } catch (e) {
      alert("상태 변경 실패: " + (e as Error).message);
      if (typeof window !== "undefined") window.location.reload();
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeFile = String(active.id);
    const overId = String(over.id);
    const targetItem = items.find((it) => it.file === activeFile);
    if (!targetItem) return;

    if (overId.startsWith("group::")) {
      const target = overId.replace("group::", "");
      const targetIsWaiting = target === "waiting";
      const sourceIsWaiting = isWaitingItem(targetItem);
      if (targetIsWaiting !== sourceIsWaiting) {
        changeState(targetItem, targetIsWaiting);
      }
    }
  }

  return (
    <Card
      title="진행중 (광고/공구)"
      emphasis="secondary"
      rightSlot={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <a
            href="/dashboard/ads"
            className="text-xs px-2 py-1 rounded-md transition hover:opacity-80"
            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent-text)" }}
          >
            + 광고
          </a>
          <a
            href="/dashboard/gongu"
            className="text-xs px-2 py-1 rounded-md transition hover:opacity-80"
            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent-text)" }}
          >
            + 공구
          </a>
          <a
            href="/dashboard/ads"
            className="text-xs transition hover:opacity-70"
            style={{ color: "var(--secondary-text)" }}
          >
            완료 보기 →
          </a>
          <RefreshButton storageKey={ACTIVE_CARDS_ORDER_KEY} />
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">없음 · 위 “+ 광고/공구”로 추가</p>
      ) : (
        <DndContext
          id="active-cards-dnd"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted mb-1.5">
                진행 중 ({activeItems.length})
              </p>
              <DroppableGroup groupId="active">
                {activeItems.length === 0 ? (
                  <p className="text-sm text-muted p-2">없음</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {activeItems.map((it) => (
                      <DraggableActiveCard
                        key={it.file}
                        item={it}
                        onEdit={() => setEditingItem(it)}
                      />
                    ))}
                  </div>
                )}
              </DroppableGroup>
            </div>
            <div>
              <p
                className="text-xs mb-1.5"
                style={{ color: "var(--secondary-text)" }}
              >
                💰 입금 대기 ({waitingItems.length})
              </p>
              <DroppableGroup groupId="waiting">
                {waitingItems.length === 0 ? (
                  <p className="text-sm text-muted p-2">
                    없음 — 광고는 업로드 후, 공구는 마감 후 여기로 끌어와
                  </p>
                ) : (
                  <>
                    <div
                      className="divide-y"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {(showAllWaiting ? waitingItems : waitingItems.slice(0, 2)).map((it) =>
                        // active 그룹에서 온 카드 = 드래그 가능 (row 형태)
                        // payment-only 카드 = 단순 row (드래그 X — state 자동 추적)
                        activeFiles.has(it.file) ? (
                          <DraggableWaitingRow
                            key={it.file}
                            item={it}
                            onEdit={() => setEditingItem(it)}
                          />
                        ) : (
                          <WaitingRow
                            key={`p::${it.file}`}
                            item={it}
                            onEdit={() => setEditingItem(it)}
                          />
                        )
                      )}
                    </div>
                    {waitingItems.length > 2 && (
                      <button
                        onClick={() => setShowAllWaiting((v) => !v)}
                        className="text-xs mt-1.5 transition hover:opacity-70"
                        style={{ color: "var(--secondary-text)" }}
                      >
                        {showAllWaiting
                          ? "접기 ▲"
                          : `외 ${waitingItems.length - 2}건 더보기 ▼`}
                      </button>
                    )}
                  </>
                )}
              </DroppableGroup>
            </div>
          </div>
        </DndContext>
      )}
      {editingItem && (
        <ActiveCardEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={async () => {
            setEditingItem(null);
            await reload();
          }}
          onDeleted={async () => {
            setEditingItem(null);
            await reload();
            if (typeof window !== "undefined") window.location.reload();
          }}
        />
      )}
    </Card>
  );
}

// 광고/공구 카드 인라인 수정 모달 (대시보드에서 바로)
const AD_STATES = ["제안", "협의", "계약", "제품수령", "콘텐츠", "업로드", "입금완료"];
const GONGU_STATES = [
  "제안", "검토", "계약", "제품수령", "콘텐츠준비",
  "오픈전", "진행중", "마감", "매출확인", "입금완료",
];

function ActiveCardEditModal({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: any;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}) {
  const isAd = item?.type === "광고";
  const states: string[] =
    item?.states?.length ? item.states : isAd ? AD_STATES : GONGU_STATES;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [state, setState] = useState<string>(item?.state || "");
  const [kpi, setKpi] = useState<string>(item?.kpi || "");
  const [manager, setManager] = useState<string>(item?.["담당자"] || "");
  const [channel, setChannel] = useState<string>(item?.["소통_채널"] || "카톡");
  const [price, setPrice] = useState<string>(
    isAd ? item?.["광고비"] || "" : item?.["공구가"] || ""
  );
  const [extra, setExtra] = useState<string>(
    isAd ? item?.["특이사항"] || "" : item?.["실_매출"] || ""
  );

  if (!item) return null;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const endpoint = isAd ? "ad" : "gongu";
      const fields = isAd
        ? cleanFields({
            목표_KPI: kpi,
            담당자: manager,
            소통_채널: channel,
            광고비: price,
            특이사항: extra,
          })
        : cleanFields({
            목표_KPI: kpi,
            업체담당자: manager,
            소통_채널: channel,
            공구가: price,
            실_매출: extra,
          });
      await callApi("PATCH", `${endpoint}/${encodeURIComponent(item.file)}`, {
        state,
        fields,
      });
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`"${item.title}" 삭제할까요? (취소 폴더로 이동 — 되돌릴 수 있어요)`)
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const endpoint = isAd ? "ad" : "gongu";
      await callApi("DELETE", `${endpoint}/${encodeURIComponent(item.file)}`);
      await onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "삭제 실패");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(40,46,40,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-5 space-y-3 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-strong)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">
            {item.type} 수정 · {item.title}
          </h3>
          <button onClick={onClose} className="text-muted text-sm hover:opacity-70">
            ✕
          </button>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">상태</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
          >
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <EditField label="목표(KPI)" value={kpi} onChange={setKpi} placeholder="자유롭게" />
        <div className="grid grid-cols-2 gap-3">
          <EditField label="담당자" value={manager} onChange={setManager} />
          <EditSelect
            label="연락망"
            value={channel}
            options={[...CONTACT_CHANNELS]}
            onChange={setChannel}
          />
          <EditField label={isAd ? "광고비" : "공구가"} value={price} onChange={setPrice} />
          <EditField label={isAd ? "특이사항" : "실 매출"} value={extra} onChange={setExtra} />
        </div>

        {err && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            {err}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            disabled={busy}
            onClick={remove}
            className="px-3 py-2.5 rounded-lg text-sm transition disabled:opacity-40 shrink-0"
            style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
          >
            삭제
          </button>
          <button
            disabled={busy}
            onClick={save}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-40"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ACTIVE_TODOS_ORDER_KEY = "dashboard:active-todos-order";

function ActiveTodos({ data }: { data: any }) {
  // v6.5.1 — 진행중 할 일. 광고/공구와 분리. 드래그로 순서 변경.
  // v6.6.2 — ✓ 완료 버튼 (대시보드에서 완료 폴더로 이동).
  const apiItems: any[] = data?.items || [];
  const [items, setItems] = useState<any[]>(() =>
    applySavedOrder(apiItems, loadOrder(ACTIVE_TODOS_ORDER_KEY))
  );
  useEffect(() => {
    setItems(applySavedOrder(apiItems, loadOrder(ACTIVE_TODOS_ORDER_KEY)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function completeTodo(file: string) {
    // 낙관: 화면에서 즉시 제거
    const snapshot = items;
    setItems((cur) => cur.filter((it) => it.file !== file));
    try {
      await callApi("DELETE", `active-todos/${encodeURIComponent(file)}`);
    } catch (e) {
      setItems(snapshot);
      alert("완료 처리 실패: " + (e as Error).message);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((it) => it.file === active.id);
    const newIndex = items.findIndex((it) => it.file === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    saveOrder(
      ACTIVE_TODOS_ORDER_KEY,
      next.map((it) => it.file)
    );
  }

  return (
    <Card
      title="진행중 할 일"
      emphasis="secondary"
      rightSlot={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {items.length}건 · 드래그로 순서 변경
          </span>
          <RefreshButton storageKey={ACTIVE_TODOS_ORDER_KEY} />
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">없음</p>
      ) : (
        <DndContext
          id="active-todos-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((it) => it.file)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((it) => (
                <SortableTodoCard
                  key={it.file}
                  item={it}
                  onComplete={() => completeTodo(it.file)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <ActiveAdd />
    </Card>
  );
}

function SortableTodoCard({
  item,
  onComplete,
}: {
  item: any;
  onComplete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.file });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: "1px solid var(--border)",
    opacity: isDragging ? 0.7 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg p-3 transition relative group"
    >
      {/* v6.6.2 — ✓ 완료 버튼. 드래그 안 시작하게 stopPropagation + pointerdown stop */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (window.confirm(`"${item.title}" 완료 처리할까?`)) {
            onComplete();
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 inline-flex items-center justify-center rounded-md transition"
        style={{
          width: 28,
          height: 28,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--accent)",
          fontSize: 16,
          lineHeight: 1,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--accent-soft)";
          e.currentTarget.style.borderColor = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-card)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
        title="완료 처리"
        aria-label="완료 처리"
      >
        ✓
      </button>
      <p className="text-sm font-medium leading-snug pr-8">{item.title}</p>
      <p className="text-xs text-muted mt-1">
        {item.state}
        {item.items_total > 0 && ` · ${item.items_done}/${item.items_total}`}
      </p>
      {item.deadline && (
        <p
          className="text-xs mt-1 font-medium"
          style={{ color: deadlineColor(item.deadline) }}
        >
          {item.deadline_label ? `${item.deadline_label} ` : ""}
          {fmtMonthDayWeekday(item.deadline)}
        </p>
      )}
    </div>
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
  const [expanded, setExpanded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const total: number = initial?.total ?? items.length;
  const hiddenCount = Math.max(0, total - items.length);

  async function add(text: string) {
    const r = await callApi("POST", "idea", { text });
    setItems([
      { title: r.title, category: r.category, file: r.file, created: "방금" },
      ...items,
    ]);
  }

  async function done(file: string) {
    setItems((cur) => cur.filter((x) => x.file !== file));
    try {
      await callApi("POST", `idea/${encodeURIComponent(file)}/done`);
    } catch (e) {
      alert("완료 실패: " + (e as Error).message);
    }
  }

  async function rename(file: string, title: string) {
    if (!title.trim()) return;
    setItems((cur) =>
      cur.map((x) => (x.file === file ? { ...x, title } : x))
    );
    try {
      await callApi("PATCH", `idea/${encodeURIComponent(file)}`, { title });
    } catch (e) {
      alert("수정 실패: " + (e as Error).message);
    }
  }

  async function loadAll() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await callApi("GET", "ideas-recent?limit=50");
      setItems(r.items || []);
      setExpanded(true);
    } catch (e) {
      alert("불러오기 실패: " + (e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  function collapse() {
    setItems(initial?.items || []);
    setExpanded(false);
  }

  return (
    <Card
      title="아이디어 (최근)"
      rightSlot={
        expanded ? (
          <button
            onClick={collapse}
            className="text-xs transition hover:opacity-70"
            style={{ color: "var(--accent)" }}
          >
            접기 ▲
          </button>
        ) : hiddenCount > 0 ? (
          <button
            onClick={loadAll}
            disabled={loadingMore}
            className="text-xs transition hover:opacity-70 disabled:opacity-50"
            style={{ color: "var(--accent)" }}
          >
            {loadingMore ? "불러오는 중..." : `외 ${hiddenCount}건 더보기 ▼`}
          </button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">없음</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {items.map((it, i) => (
            <IdeaRow
              key={it.file || i}
              item={it}
              onDone={() => done(it.file)}
              onRename={(t) => rename(it.file, t)}
            />
          ))}
        </ul>
      )}
      <AddInline placeholder="떠오른 아이디어" onAdd={add} />
    </Card>
  );
}

function IdeaRow({
  item,
  onDone,
  onRename,
}: {
  item: any;
  onDone: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<string>(item.title || "");

  function saveEdit() {
    const t = text.trim();
    if (t && t !== item.title) onRename(t);
    setEditing(false);
  }

  const dateLabel = /^\d{4}-\d{2}-\d{2}/.test(item.created)
    ? fmtMonthDayWeekday(item.created.slice(0, 10))
    : item.created;

  return (
    <li className="text-[13px] flex items-center gap-2 min-w-0 group">
      <Pill>{item.category}</Pill>
      {editing ? (
        <input
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") {
              setText(item.title || "");
              setEditing(false);
            }
          }}
          className="flex-1 min-w-0 rounded px-1.5 py-0.5 text-[13px]"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
        />
      ) : (
        <span className="truncate flex-1">{item.title}</span>
      )}
      {!editing && (
        <span className="text-[10px] text-muted shrink-0 group-hover:hidden">
          {dateLabel}
        </span>
      )}
      {!editing && (
        <span className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] px-1 rounded hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
            aria-label="수정"
          >
            수정
          </button>
          <button
            onClick={onDone}
            className="text-[10px] px-1 rounded hover:opacity-70"
            style={{ color: "var(--accent)" }}
            aria-label="완료"
          >
            ✓완료
          </button>
        </span>
      )}
    </li>
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
  // v6.6 — 광고/공구/매출 실제 페이지. 나머지는 아직 준비 중 alert.
  const links: { label: string; href?: string; alert?: string }[] = [
    { label: "🗂 큐레이션", href: "/dashboard/curation" },
    { label: "광고", href: "/dashboard/ads" },
    { label: "공구", href: "/dashboard/gongu" },
    { label: "매출", href: "/dashboard/revenue" },
    { label: "인사이트", href: "/dashboard/insights" },
    { label: "할일", alert: "준비 중 — 곧 만들 예정" },
    { label: "아이디어", alert: "준비 중 — 곧 만들 예정" },
    { label: "건강", alert: "준비 중 — 곧 만들 예정" },
    { label: "식단", alert: "준비 중 — 곧 만들 예정" },
    {
      label: "📔 일기",
      alert: "일기는 옵시디언에서 직접 확인:\n03_본질/일기/YYYY-MM-DD.md\n(전용 페이지는 추후)",
    },
    { label: "루틴 설정", alert: "준비 중 — 곧 만들 예정" },
  ];

  return (
    <Card title="상세 보기">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {links.map((l) =>
          l.href ? (
            <a
              key={l.label}
              href={l.href}
              className="rounded-md py-2 text-center text-sm transition cursor-pointer"
              style={{
                backgroundColor: "var(--bg-card-soft)",
                color: "var(--text-main)",
                border: "1px solid var(--border)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent-soft)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-card-soft)";
              }}
            >
              {l.label} →
            </a>
          ) : (
            <button
              key={l.label}
              onClick={() => {
                if (typeof window !== "undefined" && l.alert) {
                  window.alert(l.alert);
                }
              }}
              className="rounded-md py-2 text-center text-sm transition cursor-pointer"
              style={{
                backgroundColor: "var(--bg-card-soft)",
                color: "var(--text-muted-new, var(--text-secondary))",
                border: "1px dashed var(--border)",
                opacity: 0.6,
              }}
            >
              {l.label}
            </button>
          )
        )}
      </div>
    </Card>
  );
}
