"use client";

import { useMemo, useRef, useState } from "react";
import type {
  FoodCalendarDay,
  FoodCalendarResponse,
} from "@/lib/dashboard-api";
import {
  prepareFoodDay,
} from "@/lib/food-journal-rules";
import type {
  FoodJournalDay,
  FoodJournalEntry,
} from "@/lib/food-journal-rules";

type ApiError = { error: string };
type MealKind = "아침" | "점심" | "저녁" | "간식";

const MEAL_KINDS: MealKind[] = ["아침", "점심", "저녁", "간식"];
const MEAL_COLORS: Record<string, string> = {
  아침: "var(--secondary)",
  점심: "var(--accent)",
  저녁: "var(--danger)",
  간식: "#A58B70",
  기타: "var(--text-muted-new)",
};

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

function currentMonth(): string {
  return kstDateString().slice(0, 7);
}

function todayString(): string {
  return kstDateString();
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
  return ({
    high: "신뢰 높음",
    medium: "신뢰 보통",
    low: "신뢰 낮음",
    unknown: "판단 보류",
    stale: "다시 계산 필요",
  } as Record<string, string>)[value] || "판단 보류";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function sourceWasRead(status?: FoodCalendarDay["source_status"]): boolean {
  return !status || ["ok", "missing"].includes(status);
}

function foodCalendarError(value: unknown): string {
  if (!isObject(value)) return "달력 응답 형식이 올바르지 않아요.";
  const data = value as Partial<FoodCalendarResponse>;
  if (
    typeof data.month !== "string" ||
    !Array.isArray(data.days) ||
    !data.reflection ||
    typeof data.reflection !== "object" ||
    !data.reflection.group_days ||
    !data.nutrition_sources ||
    typeof data.generated !== "string"
  ) return "달력 응답에 필수 정보가 빠졌어요.";

  const reflection = data.reflection;
  if (
    typeof reflection.recorded_days !== "number" ||
    !Array.isArray(reflection.window) ||
    !reflection.window.every((item) => typeof item === "string") ||
    typeof reflection.concern !== "string" ||
    typeof reflection.next_action !== "string" ||
    typeof reflection.notice !== "string" ||
    !Object.values(reflection.group_days).every((item) => typeof item === "number") ||
    data.nutrition_sources.scope !== "general_reference_only" ||
    typeof data.nutrition_sources.reference !== "string" ||
    typeof data.nutrition_sources.food_database !== "string"
  ) return "회고 응답의 내용이 올바르지 않아요.";

  for (const day of data.days) {
    if (
      typeof day?.date !== "string" ||
      !Array.isArray(day.confirmed) ||
      !Array.isArray(day.uncertain) ||
      !Array.isArray(day.excluded) ||
      !day.nutrition ||
      !Array.isArray(day.nutrition.basis)
    ) return "날짜별 식단 응답이 손상됐어요.";

    const entries = [...day.confirmed, ...day.uncertain, ...day.excluded];
    if (entries.some((entry) =>
      !entry ||
      typeof entry.label !== "string" ||
      typeof entry.value !== "string" ||
      typeof entry.meal !== "string" ||
      typeof entry.source !== "string"
    )) return "식단 항목의 내용이 손상됐어요.";

    const nutrition = day.nutrition;
    if (
      ![nutrition.calorie_min, nutrition.calorie_max].every((item) => item === null || typeof item === "number") ||
      typeof nutrition.confidence !== "string" ||
      typeof nutrition.concern !== "string" ||
      typeof nutrition.advice !== "string" ||
      !nutrition.basis.every((item) => typeof item === "string")
    ) return "영양 추정 응답의 내용이 손상됐어요.";
  }
  return "";
}

function assertFoodCalendar(value: unknown): asserts value is FoodCalendarResponse {
  const problem = foodCalendarError(value);
  if (problem) throw new Error(problem);
}

async function proxyJson<T>(
  path: string,
  init?: RequestInit,
  validate?: (value: unknown) => void,
): Promise<T> {
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
    const problem = data && typeof data === "object"
      ? data as { detail?: string; error?: string }
      : {};
    throw new Error(problem.detail || problem.error || `요청 실패 (${response.status})`);
  }

  if (validate) validate(data);
  return data as T;
}

function WeekMetric({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const ratio = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium">{label}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted">
          {value}/{total || 7}일
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full" style={{ background: "var(--bg-card-soft)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${ratio}%`, background: tone }}
        />
      </div>
    </div>
  );
}
function CalendarMeal({ entry }: { entry: FoodJournalEntry }) {
  const tone = MEAL_COLORS[entry.meal] || MEAL_COLORS.기타;
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={entry.value}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone }} />
      <span className="truncate text-[10px] leading-tight text-muted">{shortFood(entry.value)}</span>
    </div>
  );
}

function MealRow({ entry }: { entry: FoodJournalEntry }) {
  const tone = MEAL_COLORS[entry.meal] || MEAL_COLORS.기타;
  return (
    <div
      className="grid grid-cols-[50px_1fr] gap-3 border-t py-3 first:border-t-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
          <span className="text-[10px] font-medium text-muted">{entry.meal}</span>
        </div>
        {entry.time && (
          <p className="mt-1 pl-3 text-[10px] tabular-nums" style={{ color: "var(--text-muted-new)" }}>
            {entry.time}
          </p>
        )}
      </div>
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] leading-relaxed">{entry.value}</p>
          {entry.source === "routine" && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium"
              style={{ background: "var(--secondary-soft)", color: "var(--secondary-text)" }}
            >
              아침 고정
            </span>
          )}
        </div>
        {entry.estimated_calorie_min != null && entry.estimated_calorie_max != null && (
          <p className="mt-1 text-[10px] tabular-nums" style={{ color: "var(--text-muted-new)" }}>
            약 {entry.estimated_calorie_min.toLocaleString()}–{entry.estimated_calorie_max.toLocaleString()} kcal
            {entry.calorie_basis ? ` · ${entry.calorie_basis}` : ""}
          </p>
        )}
        {entry.late_night && (
          <p className="mt-1 text-[10px] font-medium" style={{ color: "var(--danger)" }}>
            21시 이후 야식
          </p>
        )}
      </div>
    </div>
  );
}

function DayNutrition({ day }: { day: FoodJournalDay }) {
  const nutrition = day.nutrition;
  const calorieMin = day.estimated_calorie_min ?? nutrition.calorie_min;
  const calorieMax = day.estimated_calorie_max ?? nutrition.calorie_max;
  const hasCalories = calorieMin != null && calorieMax != null;

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[12px] font-semibold">영양 기록</h3>
          <p className="mt-1 text-[15px] font-medium tabular-nums">
            {hasCalories
              ? `약 ${calorieMin?.toLocaleString()}–${calorieMax?.toLocaleString()} kcal`
              : "양 정보가 부족해요"}
          </p>
        </div>
        <span
          className="rounded-full px-2 py-1 text-[10px] text-muted"
          style={{ background: "var(--bg-card-soft)" }}
        >
          {day.estimated_calorie_min != null
            ? day.estimated_calorie_partial ? "일부 음식 기준" : "대략 범위"
            : confidenceLabel(nutrition.confidence)}
        </span>
      </div>

      {day.late_night_count > 0 && (
        <p
          className="mt-3 rounded-lg px-3 py-2 text-[11px] font-medium"
          style={{ background: "var(--danger-soft)", color: "var(--danger-text)" }}
        >
          21시 이후 야식 {day.late_night_count}개가 기록됐어요.
        </p>
      )}

      {nutrition.concern ? (
        <p
          className="mt-3 border-t pt-3 text-[11px] leading-relaxed text-muted"
          style={{ borderColor: "var(--border)" }}
        >
          {nutrition.concern}
        </p>
      ) : (
        <p
          className="mt-3 border-t pt-3 text-[11px] leading-relaxed text-muted"
          style={{ borderColor: "var(--border)" }}
        >
          섭취량이 확인되면 열량 범위와 단백질·채소·식이섬유 흐름을 더 정확히 볼 수 있어요.
        </p>
      )}

      {nutrition.advice && (
        <div className="mt-3 border-l-2 pl-3" style={{ borderColor: "var(--accent)" }}>
          <p className="text-[10px] font-medium" style={{ color: "var(--accent-text)" }}>
            이렇게 고쳐보기
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">{nutrition.advice}</p>
        </div>
      )}

      {nutrition.basis.length > 0 && (
        <p className="mt-3 text-[10px]" style={{ color: "var(--text-muted-new)" }}>
          근거 · {nutrition.basis.join(" · ")}
        </p>
      )}
    </section>
  );
}

function FoodEntryForm({
  date,
  disabled,
  onDateChange,
  onBusyChange,
  onSaved,
}: {
  date: string;
  disabled: boolean;
  onDateChange: (date: string) => void;
  onBusyChange: (busy: boolean) => void;
  onSaved: (calendar: FoodCalendarResponse) => void;
}) {
  const [meal, setMeal] = useState<MealKind>("저녁");
  const [time, setTime] = useState("");
  const [food, setFood] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!food.trim() || busy || disabled) return;

    setBusy(true);
    onBusyChange(true);
    setMessage("");

    try {
      const result = await proxyJson<{ day: FoodCalendarDay; calendar: FoodCalendarResponse }>(
        `food-calendar/${date}`,
        {
          method: "POST",
          body: JSON.stringify({ meal, text: food.trim(), time: time || null }),
        },
      );
      assertFoodCalendar(result.calendar);
      onSaved(result.calendar);
      setFood("");
      setTime("");
      setMessage("원장과 달력에 바로 반영했어요.");
    } catch (error) {
      setMessage(`저장하지 못했어요: ${(error as Error).message}`);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[12px] font-semibold">빠진 음식 추가</h3>
          <p className="mt-0.5 text-[10px] text-muted">지난 날짜도 선택해서 기록할 수 있어요.</p>
        </div>
        <label className="sr-only" htmlFor={`record-date-${date}`}>기록 날짜</label>
        <input
          id={`record-date-${date}`}
          type="date"
          value={date}
          max={todayString()}
          disabled={disabled || busy}
          onChange={(event) => onDateChange(event.target.value)}
          className="rounded-lg border px-2 py-1.5 text-[10px] tabular-nums outline-none disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        />
      </div>

      <fieldset className="mt-3">
        <legend className="sr-only">끼니</legend>
        <div className="grid grid-cols-4 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
          {MEAL_KINDS.map((item) => (
            <button
              key={item}
              type="button"
              disabled={disabled || busy}
              aria-pressed={meal === item}
              onClick={() => setMeal(item)}
              className="border-r px-1 py-2 text-[10px] font-medium last:border-r-0 disabled:opacity-40"
              style={{
                borderColor: "var(--border)",
                background: meal === item ? "var(--accent-soft)" : "transparent",
                color: meal === item ? "var(--accent-text)" : "var(--text-secondary)",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-2 grid grid-cols-[1fr_108px] gap-2">
        <label className="sr-only" htmlFor={`food-${date}`}>먹은 음식</label>
        <input
          id={`food-${date}`}
          disabled={disabled || busy}
          value={food}
          onChange={(event) => setFood(event.target.value)}
          placeholder="예: 삶은 달걀 1개"
          className="min-w-0 rounded-lg border px-3 py-2 text-[11px] outline-none disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        />
        <label className="sr-only" htmlFor={`time-${date}`}>먹은 시간</label>
        <input
          id={`time-${date}`}
          disabled={disabled || busy}
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="rounded-lg border px-2 py-2 text-[11px] outline-none disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="min-h-4 text-[10px] leading-relaxed"
          style={{ color: message.startsWith("저장하지") ? "var(--danger)" : "var(--success)" }}
        >
          {message}
        </p>
        <button
          disabled={disabled || busy || !food.trim()}
          className="shrink-0 rounded-lg px-3.5 py-2 text-[11px] font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent-dark)" }}
        >
          {busy ? "반영 중…" : "추가"}
        </button>
      </div>
    </form>
  );
}

function MealQuestion({
  date,
  entry,
  disabled,
  onResolve,
}: {
  date: string;
  entry: FoodJournalEntry;
  disabled: boolean;
  onResolve: (entry: FoodJournalEntry, meal: MealKind) => void;
}) {
  return (
    <div
      className="mt-2 rounded-lg border p-3"
      style={{ borderColor: "var(--border)", background: "var(--danger-soft)" }}
    >
      <p className="text-[10px] font-medium" style={{ color: "var(--danger-text)" }}>
        {entry.question_kind === "consumption" ? "섭취 확인" : "끼니 확정"}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed">
        {entry.question || `${entry.value}은 언제 먹었어?`}
      </p>
      {entry.question_kind === "consumption" && (
        <p className="mt-1 text-[10px] text-muted">먹었다면 아래에서 끼니를 골라줘.</p>
      )}
      <div className="mt-2 grid grid-cols-4 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
        {MEAL_KINDS.map((meal) => (
          <button
            key={meal}
            type="button"
            disabled={disabled}
            onClick={() => onResolve(entry, meal)}
            aria-label={`${entry.value}을 ${meal}으로 끼니 확정`}
            className="border-r bg-white px-1 py-2 text-[10px] font-medium last:border-r-0 disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--danger-text)" }}
          >
            {meal}
          </button>
        ))}
      </div>
      {entry.question_kind === "consumption" && (
        <a
          href={`/dashboard/day?date=${encodeURIComponent(date)}`}
          className="mt-2 inline-block text-[10px] font-medium underline underline-offset-2"
          style={{ color: "var(--danger-text)" }}
        >
          안 먹었다면 하루 기록에서 알려주기 →
        </a>
      )}
    </div>
  );
}

export default function MealsCalendarClient({
  initial,
}: {
  initial: FoodCalendarResponse | ApiError;
}) {
  const incoming: unknown = initial;
  const apiError = isObject(incoming) && typeof incoming.error === "string" && incoming.error
    ? incoming.error
    : "";
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

  const preparedDays = useMemo(
    () => data?.days.map((day) => prepareFoodDay(day, todayString())) || [],
    [data],
  );
  const selectedDay =
    preparedDays.find((day) => day.date === selected) ||
    preparedDays.find((day) => day.confirmed.length > 0) ||
    preparedDays[0];
  const lateNightDays = useMemo(() => {
    const [start, end] = data?.reflection.window || [];
    if (!start || !end) return 0;
    return preparedDays.filter(
      (day) => day.date >= start && day.date <= end && day.late_night_count > 0,
    ).length;
  }, [data?.reflection.window, preparedDays]);

  const calendar = useMemo(() => {
    const [year, number] = month.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate();
    const leadBlank = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
    return { year, number, daysInMonth, leadBlank };
  }, [month]);

  async function loadMonth(target: string, preferredDate?: string) {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError("");

    try {
      const next = await proxyJson<FoodCalendarResponse>(
        `food-calendar?month=${encodeURIComponent(target)}`,
        undefined,
        assertFoodCalendar,
      );
      if (requestId !== requestSequence.current) return;

      setData(next);
      setMonth(target);
      const preferred = preferredDate || (target === nowMonth
        ? todayString()
        : next.days.filter((day) => day.confirmed.length).at(-1)?.date);
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

  function selectRecordDate(target: string) {
    if (!target || target > todayString()) return;
    const targetMonth = target.slice(0, 7);
    if (targetMonth === month) {
      setSelected(target);
      return;
    }
    void loadMonth(targetMonth, target);
  }

  async function resolveMeal(entry: FoodJournalEntry, meal: MealKind) {
    if (!selectedDay || mutating || loading) return;
    updateMutationState(true);
    setError("");
    try {
      const result = await proxyJson<{ day: FoodCalendarDay; calendar: FoodCalendarResponse }>(
        `food-calendar/${selectedDay.date}`,
        {
          method: "POST",
          body: JSON.stringify({ meal, text: entry.value, time: entry.time || null }),
        },
      );
      assertFoodCalendar(result.calendar);
      updateCalendar(result.calendar);
    } catch (resolveError) {
      setError(`끼니를 저장하지 못했어요: ${(resolveError as Error).message}`);
    } finally {
      updateMutationState(false);
    }
  }

  if (!data) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink">
        <div className="mx-auto max-w-page px-5 py-10 text-[13px]" style={{ color: "var(--danger)" }}>
          먹은 것 달력을 불러오지 못했어요: {error}
        </div>
      </main>
    );
  }

  const reflection = data.reflection;
  const group = reflection.group_days;
  const total = reflection.recorded_days;

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-page space-y-4 px-5 pb-24 pt-5 sm:px-8 sm:pt-6">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-[10px] text-muted">생활 기록 기반 · 매일 자동 정리</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">먹은 것</h1>
            <p className="mt-1 text-[11px] text-muted">
              최근 식사를 한눈에 보고, 다음 한 끼에서 바꿀 한 가지를 찾습니다.
            </p>
          </div>
          <button
            onClick={() => loadMonth(month)}
            disabled={loading || mutating}
            className="rounded-lg border px-3 py-2 text-[10px] font-medium text-muted disabled:opacity-40"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            {loading ? "읽는 중…" : mutating ? "저장 중…" : "원장 다시 읽기"}
          </button>
        </header>

        <section
          className="rounded-2xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[12px] font-semibold">최근 7일 회고</h2>
                <span className="text-[10px] text-muted">{total}일 기록 기준</span>
              </div>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed">{reflection.concern}</p>
            </div>
            <div className="border-t pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0" style={{ borderColor: "var(--border)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--accent-text)" }}>다음 한 끼</p>
              <p className="mt-1 text-[12px] leading-relaxed">{reflection.next_action}</p>
            </div>
          </div>

          <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium text-muted">기록에서 읽은 흐름</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted-new)" }}>{reflection.notice}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-5">
              <WeekMetric label="단백질" value={group.protein} total={total} tone="var(--accent)" />
              <WeekMetric label="채소" value={group.vegetable} total={total} tone="#91A47B" />
              <WeekMetric label="과일" value={group.fruit} total={total} tone="var(--secondary)" />
              <WeekMetric label="면·빵·가공/매운 음식" value={group.processed} total={total} tone="var(--danger)" />
              <WeekMetric label="21시 이후 야식" value={lateNightDays} total={total} tone="#A85A35" />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadMonth(shiftMonth(month, -1))}
              disabled={loading || mutating}
              className="h-8 w-8 rounded-lg border text-[12px] disabled:opacity-30"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              aria-label="이전 달"
            >
              ←
            </button>
            <span className="w-28 text-center text-[14px] font-semibold tabular-nums">
              {calendar.year}년 {calendar.number}월
            </span>
            <button
              onClick={() => loadMonth(shiftMonth(month, 1))}
              disabled={loading || mutating || month >= nowMonth}
              className="h-8 w-8 rounded-lg border text-[12px] disabled:opacity-30"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              aria-label="다음 달"
            >
              →
            </button>
            {month !== nowMonth && (
              <button
                onClick={() => loadMonth(nowMonth)}
                disabled={loading || mutating}
                className="ml-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-white disabled:opacity-30"
                style={{ background: "var(--accent-dark)" }}
              >
                이번 달
              </button>
            )}
          </div>
          {error && <p className="text-[10px]" style={{ color: "var(--danger)" }}>{error}</p>}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_328px]">
          <section
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border)" }}>
              {["월", "화", "수", "목", "금", "토", "일"].map((weekday) => (
                <div key={weekday} className="py-2 text-center text-[10px] font-medium text-muted">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: calendar.leadBlank }, (_, index) => (
                <div
                  key={`blank-${index}`}
                  className="min-h-[72px] border-b border-r sm:min-h-[112px]"
                  style={{ borderColor: "var(--border)", background: "var(--bg-card-soft)" }}
                />
              ))}

              {Array.from({ length: calendar.daysInMonth }, (_, index) => {
                const date = `${month}-${String(index + 1).padStart(2, "0")}`;
                const day = preparedDays.find((item) => item.date === date);
                const calendarEntries = day?.confirmed.filter((entry) => entry.source !== "routine") || [];
                const count = calendarEntries.length;
                const uncertainCount = day?.uncertain.length || 0;
                const lateNightCount = day?.late_night_count || 0;
                const sourceReadable = sourceWasRead(day?.source_status);
                const isToday = date === todayString();
                const active = date === selected;
                const isFuture = date > todayString();

                return (
                  <button
                    key={date}
                    onClick={() => setSelected(date)}
                    disabled={mutating}
                    aria-label={`${date}, ${count}개 기록${uncertainCount ? `, 확인 필요 ${uncertainCount}개` : ""}${lateNightCount ? `, 21시 이후 야식 ${lateNightCount}개` : ""}${!sourceReadable ? ", 원장 확인 실패" : ""}`}
                    aria-pressed={active}
                    className="relative min-h-[72px] border-b border-r p-1.5 text-left align-top transition-colors disabled:cursor-wait sm:min-h-[112px] sm:p-2"
                    style={{
                      borderColor: "var(--border)",
                      background: active ? "var(--accent-soft)" : "var(--bg-card)",
                      boxShadow: active ? "inset 0 0 0 1px var(--accent)" : "none",
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums"
                        style={{
                          background: isToday ? "var(--text-main)" : "transparent",
                          color: isToday ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {index + 1}
                      </span>
                      {count > 0 && (
                        <span className="hidden text-[9px] tabular-nums text-muted sm:inline">{count}</span>
                      )}
                    </div>

                    <div className="mt-1.5 hidden space-y-1.5 sm:block">
                      {calendarEntries.slice(0, 3).map((entry, entryIndex) => (
                        <CalendarMeal
                          key={`${entry.source}-${entry.meal}-${entryIndex}`}
                          entry={entry}
                        />
                      ))}
                      {!count && !isFuture && sourceReadable && (
                        <span className="text-[9px]" style={{ color: "var(--text-muted-new)" }}>기록 없음</span>
                      )}
                      {!count && !isFuture && !sourceReadable && (
                        <span className="text-[9px]" style={{ color: "var(--danger)" }}>원장 확인 실패</span>
                      )}
                      {count > 3 && (
                        <span className="text-[9px]" style={{ color: "var(--text-muted-new)" }}>+{count - 3}</span>
                      )}
                    </div>

                    {count > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
                        {calendarEntries.slice(0, 4).map((entry, entryIndex) => (
                          <span
                            key={`dot-${entry.source}-${entryIndex}`}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: MEAL_COLORS[entry.meal] || MEAL_COLORS.기타 }}
                          />
                        ))}
                      </div>
                    )}

                    {uncertainCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1.5 right-1.5 rounded px-1 py-0.5 text-[8px] font-medium"
                        style={{ background: "var(--danger-soft)", color: "var(--danger-text)" }}
                      >
                        확인
                      </span>
                    )}
                    {lateNightCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1.5 left-1.5 rounded px-1 py-0.5 text-[8px] font-medium"
                        style={{ background: "var(--danger-soft)", color: "var(--danger-text)" }}
                      >
                        야식
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {selectedDay && (
            <aside className="space-y-3 lg:sticky lg:top-4">
              <section
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-muted">선택한 날</p>
                    <h2 className="mt-0.5 text-[14px] font-semibold tabular-nums">
                      {selectedDay.date.slice(5).replace("-", "월 ")}일
                    </h2>
                  </div>
                  <span className="text-[10px] text-muted">{selectedDay.confirmed.length}개 기록</span>
                </div>

                {selectedDay.source_status &&
                  !["ok", "missing"].includes(selectedDay.source_status) && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg px-3 py-2 text-[10px] leading-relaxed"
                    style={{ background: "var(--danger-soft)", color: "var(--danger-text)" }}
                  >
                    하루 원장을 정상적으로 읽지 못했어요. 기록 없음으로 단정하지 않을게요.
                  </p>
                )}

                <div className="mt-3">
                  {selectedDay.confirmed.length ? (
                    selectedDay.confirmed.map((entry, index) => (
                      <MealRow key={`${entry.source}-${index}`} entry={entry} />
                    ))
                  ) : sourceWasRead(selectedDay.source_status) ? (
                    <p
                      className="rounded-lg px-3 py-6 text-center text-[11px] leading-relaxed text-muted"
                      style={{ background: "var(--bg-card-soft)" }}
                    >
                      먹지 않은 날이 아니라<br />아직 기록이 없는 날이에요.
                    </p>
                  ) : (
                    <p
                      className="rounded-lg px-3 py-6 text-center text-[11px] leading-relaxed"
                      style={{ background: "var(--danger-soft)", color: "var(--danger-text)" }}
                    >
                      원장을 읽지 못해<br />식사 유무를 판단 보류했어요.
                    </p>
                  )}
                </div>

                {selectedDay.uncertain.length > 0 && (
                  <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <p className="text-[10px] font-medium" style={{ color: "var(--danger-text)" }}>
                      정확히 기록하려면 이것만 알려줘
                    </p>
                    {selectedDay.uncertain.map((entry, index) => (
                      <MealQuestion
                        key={`${entry.source}-${entry.value}-${index}`}
                        date={selectedDay.date}
                        entry={entry}
                        disabled={loading || mutating}
                        onResolve={resolveMeal}
                      />
                    ))}
                  </div>
                )}
              </section>

              <DayNutrition day={selectedDay} />
              <FoodEntryForm
                key={selectedDay.date}
                date={selectedDay.date}
                disabled={loading || mutating}
                onDateChange={selectRecordDate}
                onBusyChange={updateMutationState}
                onSaved={updateCalendar}
              />
            </aside>
          )}
        </div>

        <footer className="border-t pt-3 text-[9.5px] leading-relaxed" style={{ borderColor: "var(--border)", color: "var(--text-muted-new)" }}>
          일반 참고 기준 · {data.nutrition_sources.reference} · {data.nutrition_sources.food_database}.
          실제 열량 근거는 각 날짜에 별도 표시하며, 이 화면은 생활 회고용 추정입니다.
        </footer>
      </div>
    </main>
  );
}
