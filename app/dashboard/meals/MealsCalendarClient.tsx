"use client";

import { useMemo, useRef, useState } from "react";
import type {
  FoodCalendarDay,
  FoodCalendarEntry,
  FoodCalendarResponse,
} from "@/lib/dashboard-api";

type ApiError = { error: string };
type MealKind = "아침" | "점심" | "저녁" | "간식";

const MEAL_COLORS: Record<string, { bg: string; fg: string }> = {
  아침: { bg: "#f4d88b", fg: "#594512" },
  점심: { bg: "#b9c8a5", fg: "#26351f" },
  저녁: { bg: "#d99578", fg: "#4a2114" },
  간식: { bg: "#d8c8a8", fg: "#4a3926" },
  기타: { bg: "#dad8cf", fg: "#45443e" },
};

function currentMonth(): string {
  return kstDateString().slice(0, 7);
}

function todayString(): string {
  return kstDateString();
}

function kstDateString(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shortFood(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 28 ? `${clean.slice(0, 27)}…` : clean;
}

function confidenceLabel(value: string): string {
  return ({ high: "높음", medium: "보통", low: "낮음", unknown: "판단 보류", stale: "다시 계산 필요" } as Record<string, string>)[value] || "판단 보류";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function foodCalendarError(value: unknown): string {
  if (!isObject(value)) return "달력 응답 형식이 올바르지 않아요.";
  const data = value as Partial<FoodCalendarResponse>;
  if (
    typeof data.month !== "string" || !Array.isArray(data.days) ||
    !data.reflection || typeof data.reflection !== "object" ||
    !data.reflection.group_days || !data.nutrition_sources ||
    typeof data.generated !== "string"
  ) return "달력 응답에 필수 정보가 빠졌어요.";
  const reflection = data.reflection;
  if (
    typeof reflection.recorded_days !== "number" || !Array.isArray(reflection.window) ||
    !reflection.window.every((item) => typeof item === "string") ||
    typeof reflection.concern !== "string" || typeof reflection.next_action !== "string" ||
    typeof reflection.notice !== "string" ||
    !Object.values(reflection.group_days).every((item) => typeof item === "number") ||
    data.nutrition_sources.scope !== "general_reference_only" ||
    typeof data.nutrition_sources.reference !== "string" ||
    typeof data.nutrition_sources.food_database !== "string"
  ) return "회고 응답의 내용이 올바르지 않아요.";
  for (const day of data.days) {
    if (
      typeof day?.date !== "string" || !Array.isArray(day.confirmed) ||
      !Array.isArray(day.uncertain) || !Array.isArray(day.excluded) ||
      !day.nutrition || !Array.isArray(day.nutrition.basis)
    ) return "날짜별 식단 응답이 손상됐어요.";
    const entries = [...day.confirmed, ...day.uncertain, ...day.excluded];
    if (entries.some((entry) =>
      !entry || typeof entry.label !== "string" || typeof entry.value !== "string" ||
      typeof entry.meal !== "string" || typeof entry.source !== "string"
    )) return "식단 항목의 내용이 손상됐어요.";
    const nutrition = day.nutrition;
    if (
      ![nutrition.calorie_min, nutrition.calorie_max].every((item) => item === null || typeof item === "number") ||
      typeof nutrition.confidence !== "string" || typeof nutrition.concern !== "string" ||
      typeof nutrition.advice !== "string" || !nutrition.basis.every((item) => typeof item === "string")
    ) return "영양 추정 응답의 내용이 손상됐어요.";
  }
  return "";
}

function assertFoodCalendar(value: unknown): asserts value is FoodCalendarResponse {
  const problem = foodCalendarError(value);
  if (problem) throw new Error(problem);
}

async function proxyJson<T>(path: string, init?: RequestInit, validate?: (value: unknown) => void): Promise<T> {
  const response = await fetch(`/api/dashboard/proxy/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.text();
  let data: unknown = null;
  if (body) {
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(`서버가 JSON이 아닌 응답을 보냈어요 (${response.status}).`);
    }
  }
  if (!response.ok) {
    const problem = data && typeof data === "object" ? data as { detail?: string; error?: string } : {};
    throw new Error(problem.detail || problem.error || `요청 실패 (${response.status})`);
  }
  if (validate) validate(data);
  return data as T;
}

function GroupGauge({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const ratio = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold">{label}</span>
        <span className="text-[10px] tabular-nums" style={{ color: "#77756d" }}>{value}/{total || 7}일</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(28,31,24,.09)" }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${ratio}%`, background: tone }} />
      </div>
    </div>
  );
}

function MealTag({ entry, compact = false }: { entry: FoodCalendarEntry; compact?: boolean }) {
  const style = MEAL_COLORS[entry.meal] || MEAL_COLORS.기타;
  return (
    <div
      className={compact ? "rounded px-1 py-0.5" : "rounded-lg px-2.5 py-2"}
      style={{ background: style.bg, color: style.fg }}
      title={entry.value}
    >
      <span className={compact ? "hidden sm:inline text-[8px] font-black mr-1" : "text-[10px] font-black mr-1.5"}>{entry.meal}{!compact && entry.time ? ` ${entry.time}` : ""}</span>
      <span className={compact ? "text-[9px] sm:text-[10px] leading-tight" : "text-[12px] leading-relaxed"}>{compact ? shortFood(entry.value) : entry.value}</span>
    </div>
  );
}

function DayNutrition({ day }: { day: FoodCalendarDay }) {
  const n = day.nutrition;
  const hasCalories = n.calorie_min != null && n.calorie_max != null;
  return (
    <section className="rounded-2xl p-4" style={{ background: "#20251c", color: "#f7f3e8" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.18em]" style={{ color: "#bfc8ae" }}>칼로리 · 주요 영양소</p>
          <p className="mt-1 text-[22px] font-black tabular-nums">
            {hasCalories ? `${n.calorie_min?.toLocaleString()}–${n.calorie_max?.toLocaleString()} kcal` : "양 정보가 부족해요"}
          </p>
        </div>
        <span className="rounded-full px-2 py-1 text-[10px]" style={{ background: "rgba(255,255,255,.09)", color: "#d7dacd" }}>
          신뢰도 {confidenceLabel(n.confidence)}
        </span>
      </div>
      {n.concern ? <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "#e7e3d8" }}>{n.concern}</p> : (
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "#bfc0b8" }}>
          섭취량이 확인되면 열량 범위와 단백질·채소·식이섬유 흐름을 더 정확히 볼 수 있어요.
        </p>
      )}
      {n.advice && <p className="mt-3 pt-3 text-[12px] font-semibold leading-relaxed" style={{ borderTop: "1px solid rgba(255,255,255,.12)", color: "#f2c77d" }}>→ {n.advice}</p>}
      {n.basis.length > 0 && <p className="mt-2 text-[10px]" style={{ color: "#92978a" }}>근거: {n.basis.join(" · ")}</p>}
    </section>
  );
}

function FoodEntryForm({ date, disabled, onBusyChange, onSaved }: {
  date: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onSaved: (calendar: FoodCalendarResponse) => void;
}) {
  const [meal, setMeal] = useState<MealKind>("저녁");
  const [time, setTime] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy || disabled) return;
    setBusy(true);
    onBusyChange(true);
    setMessage("");
    try {
      const result = await proxyJson<{ day: FoodCalendarDay; calendar: FoodCalendarResponse }>(`food-calendar/${date}`, {
        method: "POST",
        body: JSON.stringify({ meal, text: text.trim(), time: time || null }),
      });
      assertFoodCalendar(result.calendar);
      onSaved(result.calendar);
      setText("");
      setTime("");
      setMessage("바로 반영했어요. 다음 자동 분석에도 합쳐집니다.");
    } catch (error) {
      setMessage(`저장하지 못했어요: ${(error as Error).message}`);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl p-4" style={{ border: "1px solid #ded9cb", background: "#fffdf7" }}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-black">빠진 음식 바로 적기</h3>
        <span className="text-[10px]" style={{ color: "#858178" }}>{date.slice(5).replace("-", ".")}</span>
      </div>
      <div className="grid grid-cols-[88px_1fr] gap-2 mt-3">
        <label className="sr-only" htmlFor={`meal-${date}`}>끼니</label>
        <select id={`meal-${date}`} disabled={disabled || busy} value={meal} onChange={(event) => setMeal(event.target.value as MealKind)} className="rounded-xl px-2 py-2 text-[12px] disabled:opacity-50" style={{ border: "1px solid #ded9cb", background: "white" }}>
          {(["아침", "점심", "저녁", "간식"] as MealKind[]).map((item) => <option key={item}>{item}</option>)}
        </select>
        <label className="sr-only" htmlFor={`time-${date}`}>먹은 시간</label>
        <input id={`time-${date}`} disabled={disabled || busy} type="time" value={time} onChange={(event) => setTime(event.target.value)} className="rounded-xl px-3 py-2 text-[12px] disabled:opacity-50" style={{ border: "1px solid #ded9cb", background: "white" }} />
      </div>
      <label className="sr-only" htmlFor={`food-${date}`}>먹은 음식</label>
      <textarea
        id={`food-${date}`}
        disabled={disabled || busy}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="예: 삶은 달걀 1개와 복숭아 반 개"
        rows={3}
        className="mt-2 w-full resize-none rounded-xl px-3 py-2.5 text-[12px] leading-relaxed outline-none disabled:opacity-50"
        style={{ border: "1px solid #ded9cb", background: "white" }}
      />
      <button disabled={disabled || busy || !text.trim()} className="mt-2 w-full rounded-xl py-2.5 text-[12px] font-black text-white disabled:opacity-40" style={{ background: "#6f7753" }}>
        {busy ? "반영 중…" : "이 날짜에 추가"}
      </button>
      {message && <p aria-live="polite" className="mt-2 text-[10.5px] leading-relaxed" style={{ color: message.startsWith("저장하지") ? "#a53e2c" : "#587044" }}>{message}</p>}
    </form>
  );
}

export default function MealsCalendarClient({ initial }: { initial: FoodCalendarResponse | ApiError }) {
  const incoming: unknown = initial;
  const apiError = isObject(incoming) && typeof incoming.error === "string" && incoming.error ? incoming.error : "";
  const initialError = apiError || foodCalendarError(incoming);
  const validInitial = initialError ? null : initial as FoodCalendarResponse;
  const nowMonth = currentMonth();
  const [data, setData] = useState<FoodCalendarResponse | null>(validInitial);
  const [month, setMonth] = useState(validInitial?.month || nowMonth);
  const [selected, setSelected] = useState(todayString());
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState(initialError);
  const requestSequence = useRef(0);

  const selectedDay = data?.days.find((day) => day.date === selected) || data?.days.find((day) => day.confirmed.length > 0) || data?.days[0];

  const calendar = useMemo(() => {
    const [year, number] = month.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate();
    const leadBlank = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
    return { year, number, daysInMonth, leadBlank };
  }, [month]);

  async function loadMonth(target: string) {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const next = await proxyJson<FoodCalendarResponse>(`food-calendar?month=${encodeURIComponent(target)}`, undefined, assertFoodCalendar);
      if (requestId !== requestSequence.current) return;
      setData(next);
      setMonth(target);
      const preferred = target === nowMonth ? todayString() : next.days.filter((day) => day.confirmed.length).at(-1)?.date;
      setSelected(preferred || `${target}-01`);
    } catch (loadError) {
      if (requestId !== requestSequence.current) return;
      setError((loadError as Error).message);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }

  function updateCalendar(next: FoodCalendarResponse) {
    requestSequence.current += 1;
    setLoading(false);
    setData(next);
    setMonth(next.month);
  }

  function updateMutationState(busy: boolean) {
    if (busy) {
      requestSequence.current += 1;
      setLoading(false);
    }
    setMutating(busy);
  }

  if (!data) {
    return <main className="mx-auto max-w-5xl px-5 py-10 text-[13px]" style={{ color: "#9b3f2d" }}>먹은 것 달력을 불러오지 못했어요: {error}</main>;
  }

  const reflection = data.reflection;
  const group = reflection.group_days;
  const total = reflection.recorded_days;

  return (
    <main className="dashboard-root mx-auto max-w-[1180px] px-4 sm:px-7 pb-24" style={{ color: "#202019" }}>
      <header className="pt-7 pb-5">
        <p className="text-[10px] font-black tracking-[.22em] uppercase" style={{ color: "#8d553e" }}>Food reflection · 생활 기록 기반</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[27px] sm:text-[34px] font-black tracking-[-.04em]">먹은 것, 그리고 다음 한 끼</h1>
            <p className="mt-1 text-[12px] sm:text-[13px]" style={{ color: "#6f6b62" }}>최근의 나를 혼내는 기록이 아니라, 오늘 하나를 바꾸기 위한 식사 회고</p>
          </div>
          <button onClick={() => loadMonth(month)} disabled={loading || mutating} className="rounded-full px-3.5 py-2 text-[11px] font-bold disabled:opacity-40" style={{ border: "1px solid #d8d2c3", background: "#fffdf8" }}>↻ {loading ? "읽는 중" : mutating ? "저장 중" : "원장 다시 읽기"}</button>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[28px] p-5 sm:p-7" style={{ background: "#e8e1cf" }}>
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full" style={{ border: "42px solid rgba(111,119,83,.13)" }} />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <p className="text-[11px] font-black tracking-[.16em] uppercase" style={{ color: "#6f7753" }}>최근 7일 · 반성 포인트</p>
            <p className="mt-3 max-w-2xl text-[20px] sm:text-[25px] font-black leading-[1.4] tracking-[-.03em]">{reflection.concern}</p>
            <div className="mt-5 rounded-2xl p-4" style={{ background: "#fff9e9", borderLeft: "5px solid #ca6e4d" }}>
              <p className="text-[10px] font-black" style={{ color: "#a64e35" }}>다음 한 끼</p>
              <p className="mt-1 text-[14px] font-bold leading-relaxed">{reflection.next_action}</p>
            </div>
          </div>
          <div className="rounded-2xl p-4 sm:p-5" style={{ background: "rgba(255,253,247,.72)", backdropFilter: "blur(8px)" }}>
            <p className="text-[11px] font-black mb-4">기록에서 발견한 주요 영양소 단서</p>
            <div className="space-y-4">
              <GroupGauge label="단백질" value={group.protein} total={total} tone="#75815a" />
              <GroupGauge label="채소" value={group.vegetable} total={total} tone="#8f9c6d" />
              <GroupGauge label="과일" value={group.fruit} total={total} tone="#d4955f" />
              <GroupGauge label="면·빵·가공/매운 음식" value={group.processed} total={total} tone="#bd6549" />
            </div>
            <p className="mt-4 text-[9.5px] leading-relaxed" style={{ color: "#777269" }}>{reflection.notice}</p>
          </div>
        </div>
      </section>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => loadMonth(shiftMonth(month, -1))} disabled={loading || mutating} className="h-9 w-9 rounded-full disabled:opacity-30" style={{ border: "1px solid #d8d2c3" }} aria-label="이전 달">←</button>
          <span className="w-32 text-center text-[16px] font-black tabular-nums">{calendar.year}년 {calendar.number}월</span>
          <button onClick={() => loadMonth(shiftMonth(month, 1))} disabled={loading || mutating || month >= nowMonth} className="h-9 w-9 rounded-full disabled:opacity-30" style={{ border: "1px solid #d8d2c3" }} aria-label="다음 달">→</button>
          {month !== nowMonth && <button onClick={() => loadMonth(nowMonth)} disabled={loading || mutating} className="ml-1 rounded-full px-3 py-1.5 text-[11px] disabled:opacity-30" style={{ background: "#20251c", color: "white" }}>오늘</button>}
        </div>
        {error && <p className="text-[11px]" style={{ color: "#a53e2c" }}>{error}</p>}
      </div>

      <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <section className="overflow-hidden rounded-2xl" style={{ border: "1px solid #dcd7ca", background: "#dcd7ca" }}>
          <div className="grid grid-cols-7 gap-px">
            {["월", "화", "수", "목", "금", "토", "일"].map((weekday) => <div key={weekday} className="py-2 text-center text-[10px] font-black" style={{ background: "#f0ecdf", color: "#767168" }}>{weekday}</div>)}
            {Array.from({ length: calendar.leadBlank }, (_, index) => <div key={`blank-${index}`} className="min-h-[76px] sm:min-h-[128px]" style={{ background: "#f6f3e9" }} />)}
            {Array.from({ length: calendar.daysInMonth }, (_, index) => {
              const date = `${month}-${String(index + 1).padStart(2, "0")}`;
              const day = data.days.find((item) => item.date === date);
              const hasFood = Boolean(day?.confirmed.length);
              const isToday = date === todayString();
              const active = date === selected;
              return (
                <button key={date} onClick={() => setSelected(date)} disabled={mutating} aria-label={`${date}, ${day?.confirmed.length || 0}개 기록`} aria-pressed={active} className="min-h-[76px] sm:min-h-[128px] p-1.5 sm:p-2 text-left align-top transition disabled:cursor-wait" style={{ background: active ? "#fff8e6" : "#fffdf7", boxShadow: active ? "inset 0 0 0 2px #78805f" : "none" }}>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] tabular-nums" style={{ background: isToday ? "#20251c" : "transparent", color: isToday ? "white" : "#777168", fontWeight: isToday ? 800 : 500 }}>{index + 1}</span>
                  <div className="mt-1 space-y-1">
                    {day?.confirmed.slice(0, 3).map((entry, entryIndex) => <MealTag key={`${entry.source}-${entry.meal}-${entryIndex}`} entry={entry} compact />)}
                    {!hasFood && date <= todayString() && <span className="block text-[9px] sm:text-[10px]" style={{ color: "#777168" }}>기록 없음</span>}
                    {(day?.confirmed.length || 0) > 3 && <span className="text-[8px]" style={{ color: "#777168" }}>+{day!.confirmed.length - 3}</span>}
                    {(day?.uncertain.length || 0) > 0 && <span className="block text-[8px] font-bold" style={{ color: "#b6653f" }}>확인 필요</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {selectedDay && <aside className="space-y-3 lg:sticky lg:top-4">
          <section className="rounded-2xl p-4" style={{ border: "1px solid #ded9cb", background: "#fffdf7" }}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-black tabular-nums">{selectedDay.date.slice(5).replace("-", "월 ")}일</h2>
              <span className="text-[10px]" style={{ color: "#858178" }}>{selectedDay.confirmed.length}개 기록</span>
            </div>
            <div className="mt-3 space-y-2">
              {selectedDay.source_status && !["ok", "missing"].includes(selectedDay.source_status) && (
                <p role="alert" className="rounded-xl px-3 py-2 text-[11px] font-bold" style={{ background: "#fff0e6", color: "#943f2d" }}>
                  하루 원장을 정상적으로 읽지 못했어요. ‘기록 없음’으로 단정하지 않을게요.
                </p>
              )}
              {selectedDay.confirmed.length ? selectedDay.confirmed.map((entry, index) => <MealTag key={`${entry.source}-${index}`} entry={entry} />) : <p className="rounded-xl px-3 py-6 text-center text-[12px]" style={{ background: "#f3efe4", color: "#918b80" }}>먹지 않은 날이 아니라<br />아직 기록이 없는 날이에요.</p>}
            </div>
            {selectedDay.uncertain.length > 0 && <div className="mt-3 rounded-xl p-3" style={{ background: "#fff1de", color: "#7b472c" }}><p className="text-[10px] font-black">모르는 건 확인할게요</p>{selectedDay.uncertain.map((entry, index) => <p key={index} className="mt-1 text-[11px] leading-relaxed">{entry.label}: {entry.value}</p>)}<a href={`/dashboard/day?date=${encodeURIComponent(selectedDay.date)}`} className="mt-2 inline-block text-[10px] font-black underline underline-offset-2">하루 기록에서 답하기 →</a></div>}
          </section>
          <DayNutrition day={selectedDay} />
          <FoodEntryForm key={selectedDay.date} date={selectedDay.date} disabled={loading || mutating} onBusyChange={updateMutationState} onSaved={updateCalendar} />
        </aside>}
      </div>

      <footer className="mt-8 text-[9.5px] leading-relaxed" style={{ color: "#8d887e" }}>
        일반 참고 기준: {data.nutrition_sources.reference} · {data.nutrition_sources.food_database}. 실제 열량 산출에 사용한 근거는 해당 날의 basis에 별도 표시합니다. 이 화면은 생활 회고용 추정이며 질병 진단이나 치료 지시가 아닙니다.
      </footer>
    </main>
  );
}
