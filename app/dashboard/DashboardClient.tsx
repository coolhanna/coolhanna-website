"use client";

import { useEffect, useState, useTransition } from "react";

const TONE = {
  schedule: "#5D7EE0",
  deadline: "#D85A30",
  done: "#2D7A4F",
  warn: "#B8553A",
  pt: "#FFE8DB",
  lecture: "#E8F0FF",
  due: "#FFE0DB",
  content: "#E0F0E5",
} as const;

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
  rightSlot,
}: {
  title?: string;
  children: React.ReactNode;
  accent?: string;
  bg?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <section
      className="border border-rule rounded-2xl p-5"
      style={{
        backgroundColor: bg || "#ffffff",
        ...(accent ? { borderTopColor: accent, borderTopWidth: 3 } : {}),
      }}
    >
      {(title || rightSlot) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h2 className="text-sm font-semibold text-muted tracking-tight">
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
              color: "#6b6b6b",
              borderColor: "#e5e5e0",
              backgroundColor: "#fafaf7",
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
        className="text-xs text-muted hover:text-ink mt-3 transition"
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
        className="flex-1 border border-rule rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-ink"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="text-xs px-2.5 py-1 bg-ink text-white rounded-md disabled:opacity-50"
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
    <p className="text-xs text-[#B8553A] bg-[#B8553A0a] px-2 py-1 rounded">
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
  weeklyRoutines: any;
  ideasRecent: any;
};

export default function DashboardClient({ initial }: { initial: Initial }) {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-6 border-b border-rule">
        <p className="text-xs text-muted">{fmtDateKo(now)}</p>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mt-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            한나 운영 대시보드
          </h1>
          <span
            className="text-lg font-medium"
            style={{ color: TONE.schedule }}
          >
            {fmtTimeKo(now)}
          </span>
        </div>
      </header>

      <div className="max-w-page mx-auto px-5 sm:px-8 py-6 space-y-4">
        <WeeklyCalendar
          initialEvents={initial.calendar}
          initialActive={initial.active}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodayPanel
            schedule={initial.schedule}
            today={initial.today}
            incomplete={initial.incomplete}
          />
          <TomorrowPanel
            calendar={initial.calendar}
            active={initial.active}
          />
        </div>

        <TodayMe health={initial.health} />

        <QuickTasks initial={initial.quickTasks} />

        <ActiveCards data={initial.active} />

        <IdeasRecent initial={initial.ideasRecent} />

        <Chores initialTodo={initial.choresTodo} initialShop={initial.choresShop} />

        <MonthlyCalendar data={initial.calendar} />

        <WeeklyRoutines initial={initial.weeklyRoutines} />

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
  const today = startOfWeek(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
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
            {weekStart.getMonth() + 1}/{weekStart.getDate()} ~{" "}
            {addDays(weekStart, 6).getMonth() + 1}/{addDays(weekStart, 6).getDate()}
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
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dateStr = iso(d);
          const isToday = iso(d) === iso(today);
          const evs = eventsByDate[dateStr] || [];
          const dls = deadlinesByDate[dateStr] || [];
          return (
            <div
              key={dateStr}
              className="border border-rule rounded-md p-2 min-h-[80px] text-[11px]"
              style={
                isToday
                  ? { borderColor: TONE.schedule, borderWidth: 2 }
                  : undefined
              }
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
                      backgroundColor: ev.all_day ? TONE.content : TONE.lecture,
                    }}
                    title={ev.summary}
                  >
                    {!ev.all_day && ev.time && (
                      <span className="text-muted mr-1">{fmtShortTime(ev.time)}</span>
                    )}
                    {ev.summary}
                  </div>
                ))}
                {dls.slice(0, 2).map((dl: any, idx: number) => (
                  <div
                    key={`d${idx}`}
                    className="truncate px-1 py-0.5 rounded"
                    style={{ backgroundColor: TONE.due }}
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
// 오늘 / 내일 패널
// ─────────────────────────────────────────────────────────────────────

function TodayPanel({
  schedule,
  today,
  incomplete,
}: {
  schedule: any;
  today: any;
  incomplete: any;
}) {
  const events = (schedule?.events || []) as any[];
  return (
    <section
      className="bg-white rounded-2xl p-5"
      style={{ border: `1.5px solid ${TONE.schedule}` }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: TONE.schedule }}>
        오늘
      </h2>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted mb-1">일정 · 캘린더 + 루틴</p>
          {events.length ? (
            <ul className="space-y-1">
              {events.map((ev: any, i: number) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="text-xs text-muted w-14 shrink-0">
                    {ev.time_label}
                  </span>
                  <span className="flex-1">
                    {cleanEventSummary(ev.summary)}
                    {ev.source === "루틴" && (
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
        <div className="border-t border-rule pt-2">
          <p className="text-xs text-muted mb-1">체크 · 오늘 마감</p>
          {today?.items?.length ? (
            <ul className="space-y-1">
              {today.items.map((it: any, i: number) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <Pill color={TONE.deadline}>{it.type}</Pill>
                  <span>{it.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: TONE.done }}>
              오늘 마감 없음 ✓
            </p>
          )}
        </div>
        {incomplete?.items?.length > 0 && (
          <div className="border-t border-rule pt-2">
            <p className="text-xs text-muted mb-1">이월 · 어제 못 끝낸 거</p>
            <ul className="space-y-1">
              {incomplete.items.slice(0, 3).map((it: any, i: number) => (
                <li key={i} className="text-sm text-muted">
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

function TomorrowPanel({ calendar, active }: { calendar: any; active: any }) {
  const tomorrow = addDays(new Date(), 1);
  const tomorrowStr = iso(tomorrow);
  const evsRaw = (calendar?.events_by_date || {})[tomorrowStr] || [];
  const dls = (calendar?.deadlines_by_date || {})[tomorrowStr] || [];

  // 시간순 정렬 (종일 → 앞, 그 외 time 오름차순)
  const evs = [...evsRaw].sort((a: any, b: any) => {
    if (a.all_day && !b.all_day) return -1;
    if (!a.all_day && b.all_day) return 1;
    return (a.time || "").localeCompare(b.time || "");
  });

  return (
    <Card title={`내일 (${tomorrow.getMonth() + 1}/${tomorrow.getDate()})`}>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted mb-1">일정 · 캘린더 + 루틴</p>
          {evs.length ? (
            <ul className="space-y-1">
              {evs.map((ev: any, i: number) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="text-xs text-muted w-14 shrink-0">
                    {ev.all_day ? "종일" : fmtShortTime(ev.time || "")}
                  </span>
                  <span className="flex-1">
                    {cleanEventSummary(ev.summary)}
                    {ev.source === "루틴" && (
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
        <div className="border-t border-rule pt-2">
          <p className="text-xs text-muted mb-1">마감</p>
          {dls.length ? (
            <ul className="space-y-1">
              {dls.map((dl: any, i: number) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <Pill color={TONE.deadline}>{dl.type}</Pill>
                  <span>{dl.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">없음</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// "오늘의 나"
// ─────────────────────────────────────────────────────────────────────

function TodayMe({ health }: { health: any }) {
  const last = health?.days?.[health.days.length - 1] || {};
  const hasAny =
    last.sleep_min != null ||
    last.sleep_score != null ||
    last.condition != null ||
    last.steps != null;
  const sleepHm =
    last.sleep_min != null
      ? `${Math.floor(last.sleep_min / 60)}시간 ${last.sleep_min % 60}분`
      : null;

  return (
    <Card title="오늘의 나">
      <div className="text-sm space-y-2">
        {hasAny ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-muted">수면</span>{" "}
              <span className="font-medium">{sleepHm ?? "—"}</span>
            </span>
            <span>
              <span className="text-muted">점수</span>{" "}
              <span className="font-medium">{last.sleep_score ?? "—"}</span>
            </span>
            <span>
              <span className="text-muted">컨디션</span>{" "}
              <span className="font-medium">
                {last.condition != null ? `${last.condition}/10` : "—"}
              </span>
            </span>
            <span>
              <span className="text-muted">걸음</span>{" "}
              <span className="font-medium">
                {last.steps != null
                  ? new Intl.NumberFormat("ko-KR").format(last.steps)
                  : "—"}
              </span>
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted">
            데이터 없음 — 텔레그램 봇에서 <span className="font-medium text-ink">/건강</span> 명령으로 등록
          </p>
        )}
        <div className="border-t border-rule pt-2">
          <p className="text-xs text-muted mb-1">식사</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <MealSlot label="아침" />
            <MealSlot label="점심" />
            <MealSlot label="저녁" />
          </div>
        </div>
        <p className="text-[11px] text-muted">생리 주기 — 추후 추가</p>
      </div>
    </Card>
  );
}

function MealSlot({ label }: { label: string }) {
  // 식사 데이터는 health-trend에 없음 — placeholder. (실제 데이터는 추후 API 추가 시 채움)
  return (
    <div className="border border-rule rounded-md p-2 text-center text-muted">
      {label}
      <div className="text-[10px] mt-1">미기록</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 빠른 처리
// ─────────────────────────────────────────────────────────────────────

function QuickTasks({ initial }: { initial: any }) {
  const [items, setItems] = useState<any[]>(initial?.items || []);
  const [, startTransition] = useTransition();

  async function add(text: string) {
    const optimistic = { index: items.length, text, done: false };
    setItems([...items, optimistic]);
    const r = await callApi("POST", "quick-task", { text });
    setItems((cur) => cur.map((it, i) => (i === optimistic.index ? r.item : it)));
  }
  async function toggle(idx: number) {
    setItems((cur) =>
      cur.map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
    );
    try {
      await callApi("PATCH", "quick-task/toggle", { index: idx });
    } catch {
      // rollback
      setItems((cur) =>
        cur.map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
      );
    }
  }

  return (
    <Card title="빠른 처리" bg="#FFF8E8">
      {items.length === 0 && (
        <p className="text-sm text-muted">없음</p>
      )}
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <Checkbox
            key={i}
            checked={!!it.done}
            onChange={() => startTransition(() => toggle(i))}
            label={it.text}
            doneDate={it.done_date}
          />
        ))}
      </div>
      <AddInline placeholder="메시지/연락/잡일" onAdd={add} />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 매주 반복 루틴
// ─────────────────────────────────────────────────────────────────────

// 루틴 이름 단축 매핑 (한나 v5.1 — 클라이언트 fallback. API가 이미 짧은 이름 줄 수도 있음)
const ROUTINE_SHORT_NAME: Record<string, string> = {
  "비즈니스PT": "비즈니스PT",
  "윤소정_앤드엔_강의": "윤소정 강의",
  "윤소정 앤드엔 강의": "윤소정 강의",
  "뉴스레터_작성": "뉴스레터 작성",
  "줄당번": "줄당번",
  "시사원정대_자료발송": "시사원정대 자료발송",
  "혜린_글_메일발송": "혜린 글메일",
  "공양당번": "공양당번",
  "혜린_글선생님_줌수업": "혜린 글수업",
  "윤소정_생각구독_읽기": "생각구독 읽기",
  "법회": "법회",
  "혜린_글수업_월결제": "혜린 글수업 월결제",
  "안놀공": "안놀공",
};

function shortRoutineName(name: string): string {
  return ROUTINE_SHORT_NAME[name] ?? name.replace(/_/g, " ");
}

// "매주 월/화/수", "22:00" → "월화수 오후 10시"
function shortRoutinePeriod(period: string, time: string): string {
  let timeLabel = "";
  const tMatch = time?.match(/(\d{1,2}):(\d{2})/);
  if (tMatch) {
    const h = parseInt(tMatch[1], 10);
    const mm = tMatch[2];
    if (h === 0) timeLabel = " 자정";
    else if (h < 12) timeLabel = ` 오전 ${h}시`;
    else if (h === 12) timeLabel = " 낮 12시";
    else if (h === 18 && mm === "30") timeLabel = " 오후 6시반";
    else timeLabel = ` 오후 ${h - 12}시`;
  }
  if (period.includes("매주")) {
    const wds = period.match(/[월화수목금토일]/g) || [];
    const uniq = Array.from(new Set(wds));
    if (uniq.length) {
      const order = "월화수목금토일";
      const sorted = uniq.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      return `${sorted.join("")}${timeLabel}`.trim();
    }
  }
  if (period.includes("마지막주")) {
    const m = period.match(/(월|화|수|목|금|토|일)/);
    if (m) return `마지막 ${m[1]}${timeLabel}`.trim();
    return `마지막 주${timeLabel}`.trim();
  }
  if (period.includes("말일")) return `월말${timeLabel}`.trim();
  const md = period.match(/매월\s*(\d{1,2})일/);
  if (md) return `매월 ${md[1]}일${timeLabel}`.trim();
  const n = period.match(/매월\s*(\d+)회/);
  if (n) return `월${n[1]}회`;
  if (period.includes("매월")) return "월 가변";
  if (period.includes("2-3개월")) return "2-3개월 1회";
  return period;
}

function WeeklyRoutines({ initial }: { initial: any }) {
  const [items, setItems] = useState<any[]>(initial?.items || []);
  const [, startTransition] = useTransition();
  const done = items.filter((it) => it.checked).length;

  async function toggle(name: string, idx: number) {
    setItems((cur) =>
      cur.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it))
    );
    try {
      await callApi("PATCH", "routine/toggle", { name });
    } catch {
      setItems((cur) =>
        cur.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it))
      );
    }
  }

  return (
    <Card
      title="매주 반복 (활성 루틴)"
      rightSlot={
        <span className="text-[11px] text-muted">
          {done}/{items.length} 완료 · 이번 주 메모용
        </span>
      }
    >
      <p className="text-[11px] text-muted mb-2">
        그날 일정 목록에 자동 노출됨. 여기는 활성 루틴 요약·체크용.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1">
        {items.map((it, i) => (
          <label
            key={it.name}
            className="flex items-start gap-1.5 cursor-pointer group text-[12px]"
          >
            <input
              type="checkbox"
              checked={!!it.checked}
              onChange={() => startTransition(() => toggle(it.name, i))}
              className="mt-[3px] w-3.5 h-3.5 rounded border-rule cursor-pointer"
            />
            <span
              className={
                "flex-1 leading-snug " +
                (it.checked ? "line-through text-muted" : "text-ink")
              }
            >
              {shortRoutineName(it.name)}{" "}
              <span className="text-muted">
                ({shortRoutinePeriod(it.period || "", it.time || "")})
              </span>
            </span>
          </label>
        ))}
      </div>
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
              className="border border-rule rounded-lg p-3 hover:border-ink transition"
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
                  style={{ color: TONE.deadline }}
                >
                  {it.deadline_label ? `${it.deadline_label} ` : ""}
                  {fmtMonthDay(it.deadline)}
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
  const color =
    type === "광고"
      ? TONE.deadline
      : type === "공구"
      ? TONE.schedule
      : "#6b6b6b";
  return (
    <span
      className="inline-block text-[11px] px-2 py-0.5 rounded-md font-semibold tracking-tight"
      style={{
        color: "#ffffff",
        backgroundColor: color,
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
              <span className="text-[10px] text-muted">{it.created}</span>
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
  const [items, setItems] = useState<any[]>(initial?.items || []);
  const [, startTransition] = useTransition();
  const pending = items.filter((it) => !it.done).length;

  async function add(text: string) {
    const optimistic = { index: items.length, text, done: false };
    setItems([...items, optimistic]);
    const r = await callApi("POST", endpointAdd, { text });
    setItems((cur) =>
      cur.map((it, i) => (i === optimistic.index ? r.item : it))
    );
  }
  async function toggle(idx: number) {
    setItems((cur) =>
      cur.map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
    );
    try {
      await callApi("PATCH", endpointToggle, { index: idx });
    } catch {
      setItems((cur) =>
        cur.map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
      );
    }
  }
  return (
    <Card
      title={title}
      rightSlot={<span className="text-xs text-muted">{pending}건</span>}
    >
      {items.length === 0 && <p className="text-sm text-muted">없음</p>}
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <Checkbox
            key={i}
            checked={!!it.done}
            onChange={() => startTransition(() => toggle(i))}
            label={it.text}
            doneDate={it.done_date}
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
              className="relative h-14 border border-rule rounded p-1 text-[11px] group"
              style={{
                borderColor: isToday ? TONE.schedule : undefined,
                borderWidth: isToday ? 2 : 1,
                backgroundColor: inThisWeek && !isToday ? "#FAF5ED" : undefined,
              }}
            >
              <div className="text-ink">{d.getDate()}</div>
              <div className="flex gap-0.5 mt-0.5">
                {evs.length > 0 && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: TONE.schedule }}
                  />
                )}
                {dls.length > 0 && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: TONE.deadline }}
                  />
                )}
              </div>
              {hasAny && (
                <div
                  className="hidden group-hover:block absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1 w-52 p-2 rounded-md shadow-lg text-[11px] text-ink"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1cfc8",
                    pointerEvents: "none",
                  }}
                >
                  <p className="font-semibold mb-1">
                    {d.getMonth() + 1}월 {d.getDate()}일 ({KO_WD[(d.getDay() + 6) % 7]})
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
                    <p key={`d${idx}`} className="truncate" style={{ color: TONE.deadline }}>
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
    { label: "할일", href: "/dashboard/할일" },
    { label: "광고", href: "/dashboard/광고" },
    { label: "공구", href: "/dashboard/공구" },
    { label: "아이디어", href: "/dashboard/아이디어" },
    { label: "건강", href: "/dashboard/건강" },
    { label: "매출", href: "/dashboard/매출" },
    { label: "식단", href: "/dashboard/식단" },
    { label: "루틴 설정", href: "/dashboard/루틴설정" },
  ];
  return (
    <Card title="상세 보기">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="border border-rule rounded-md py-2 text-center text-sm hover:border-ink transition"
          >
            {l.label} →
          </a>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-2">
        각 페이지는 다음 단계 — 지금은 메인만 작동.
      </p>
    </Card>
  );
}
