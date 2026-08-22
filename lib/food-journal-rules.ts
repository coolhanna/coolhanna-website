import type { FoodCalendarDay, FoodCalendarEntry } from "./dashboard-api";

export type FoodJournalSource = FoodCalendarEntry["source"] | "routine";

export interface FoodCalorieRange {
  min: number;
  max: number;
  basis: string;
}

export interface FoodJournalEntry extends Omit<FoodCalendarEntry, "source"> {
  source: FoodJournalSource;
  estimated_calorie_min: number | null;
  estimated_calorie_max: number | null;
  calorie_basis: string;
  late_night: boolean;
  question?: string;
  question_kind?: "meal" | "consumption";
}

export interface FoodJournalDay extends Omit<FoodCalendarDay, "confirmed" | "uncertain"> {
  confirmed: FoodJournalEntry[];
  uncertain: FoodJournalEntry[];
  estimated_calorie_min: number | null;
  estimated_calorie_max: number | null;
  estimated_calorie_partial: boolean;
  late_night_count: number;
}

const MEAL_LABEL_RE = /(아침|점심|저녁|간식|야식)/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ROUTINE_ENTRIES = [
  {
    label: "아침 고정 루틴",
    value: "올리브유 1큰술 + 레몬즙",
    meal: "아침" as const,
    source: "routine" as const,
    time: "",
  },
  {
    label: "아침 고정 루틴",
    value: "믹스커피 1잔",
    meal: "아침" as const,
    source: "routine" as const,
    time: "",
  },
];

const CALORIE_RULES: Array<[RegExp, number, number, string]> = [
  [/신라면|라면/, 450, 600, "일반 1회분 기준"],
  [/김치볶음밥/, 450, 700, "일반 1인분 기준"],
  [/김밥/, 350, 550, "김밥 1줄 기준"],
  [/마라탕/, 600, 1_000, "일반 1인분 기준"],
  [/삼계탕/, 700, 1_000, "일반 1인분 기준"],
  [/삼겹살/, 500, 900, "일반 1인분 기준"],
  [/파스타/, 450, 800, "일반 1인분 기준"],
  [/쫄면/, 450, 650, "일반 1인분 기준"],
  [/떡볶이/, 350, 650, "일반 1인분 기준"],
  [/어묵탕/, 100, 250, "일반 1인분 기준"],
  [/샐러드/, 100, 400, "소스와 양에 따른 범위"],
  [/아이스크림|모나카/, 120, 300, "제품 1회분 기준"],
  [/빵/, 150, 400, "빵 1개 기준"],
  [/달걀|계란/, 60, 90, "달걀 1개 기준"],
  [/복숭아/, 40, 80, "복숭아 1개 기준"],
  [/사과/, 70, 120, "사과 1개 기준"],
  [/토마토/, 20, 60, "토마토 1개 기준"],
  [/멜론/, 50, 120, "보통 섭취량 기준"],
  [/밥/, 250, 350, "밥 1공기 기준"],
  [/전(?:\s|$)|전$/, 150, 350, "종류와 양에 따른 범위"],
  [/커피/, 0, 20, "무가당 커피 기준"],
];

function normalizeFood(value: string): string {
  return value.replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function isIgnoredSegment(segment: string): boolean {
  const clean = segment.trim();
  if (!clean) return true;
  if (/(?:이클립스|민트\s*캔디|무설탕\s*캔디|껌)/i.test(clean)) return true;
  const withoutTime = clean.replace(/^\d{1,2}:\d{2}\s*/, "");
  return /^(?:물|물을|생수)(?:\s*(?:\d+(?:ml|mL|리터|L)|한\s*잔|두\s*잔|조금|많이|섭취|마심|마셨(?:다|음)?|마셔|발언))*$/i.test(withoutTime);
}

export function sanitizeFoodValue(value: string): string {
  return value
    .split(/\s*[·;,]\s*/)
    .map((segment) => segment.trim())
    .filter((segment) => !isIgnoredSegment(segment))
    .join(" · ");
}

export function estimateFoodCalories(
  value: string,
  meal: FoodCalendarEntry["meal"],
): FoodCalorieRange | null {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (/올리브유/.test(normalized) && /레몬즙/.test(normalized)) {
    return { min: 105, max: 135, basis: "올리브유 1큰술 기준" };
  }
  if (/(?:믹스커피|맥심\s*커피)/.test(normalized)) {
    return { min: 45, max: 70, basis: "믹스커피 1잔 기준" };
  }

  const segments = normalized.split(/\s*[·;,]\s*/).filter(Boolean);
  let min = 0;
  let max = 0;
  const bases = new Set<string>();
  let matched = 0;
  for (const segment of segments) {
    const rule = CALORIE_RULES.find(([pattern]) => pattern.test(segment));
    if (!rule) continue;
    min += rule[1];
    max += rule[2];
    bases.add(rule[3]);
    matched += 1;
  }
  if (matched) {
    return {
      min,
      max,
      basis: bases.size === 1 ? [...bases][0] : "일반적인 1회 섭취량 기준",
    };
  }

  const fallback = {
    아침: { min: 200, max: 600 },
    점심: { min: 350, max: 900 },
    저녁: { min: 350, max: 900 },
    간식: { min: 50, max: 350 },
    기타: null,
  }[meal];
  return fallback ? { ...fallback, basis: "음식 양 미상·끼니 일반 범위" } : null;
}

function isLateNight(time?: string): boolean {
  return Boolean(time && TIME_RE.test(time) && time >= "21:00");
}

function inferAudioMeal(entry: FoodCalendarEntry): {
  meal: FoodCalendarEntry["meal"];
  question?: string;
} {
  if (entry.source === "manual" || MEAL_LABEL_RE.test(entry.label)) {
    return { meal: entry.meal };
  }
  if (entry.time && TIME_RE.test(entry.time)) {
    if (entry.time < "10:30") return { meal: "아침" };
    if (entry.time < "15:00") return { meal: "점심" };
    return { meal: "저녁" };
  }
  return {
    meal: "기타",
    question: `${entry.value}은 아침·점심·저녁·간식 중 언제 먹었어?`,
  };
}

function decorateEntry(
  entry: FoodCalendarEntry | (typeof ROUTINE_ENTRIES)[number],
): FoodJournalEntry | null {
  const value = sanitizeFoodValue(entry.value);
  if (!value) return null;
  const resolved = entry.source === "routine"
    ? { meal: "아침" as const }
    : inferAudioMeal({ ...entry, value });
  const calories = estimateFoodCalories(value, resolved.meal);
  return {
    ...entry,
    value,
    meal: resolved.meal,
    estimated_calorie_min: calories?.min ?? null,
    estimated_calorie_max: calories?.max ?? null,
    calorie_basis: calories?.basis ?? "",
    late_night: isLateNight(entry.time),
    question: resolved.question,
    question_kind: resolved.question ? "meal" : undefined,
  };
}

export function prepareFoodDay(day: FoodCalendarDay, today: string): FoodJournalDay {
  const confirmed: FoodJournalEntry[] = [];
  const uncertain: FoodJournalEntry[] = [];

  for (const raw of day.confirmed) {
    const entry = decorateEntry(raw);
    if (!entry) continue;
    if (entry.question) uncertain.push(entry);
    else confirmed.push(entry);
  }
  for (const raw of day.uncertain) {
    const entry = decorateEntry(raw);
    if (!entry) continue;
    uncertain.push({
      ...entry,
      question: `${entry.value}은 실제로 먹은 게 맞아?`,
      question_kind: "consumption",
    });
  }

  const manualValues = new Set(
    confirmed
      .filter((entry) => entry.source === "manual")
      .map((entry) => normalizeFood(entry.value)),
  );
  const unresolved = uncertain.filter((entry) => !manualValues.has(normalizeFood(entry.value)));

  const hasDayEvidence =
    day.date <= today &&
    (day.source_status === "ok" || day.confirmed.length > 0 || day.uncertain.length > 0);
  if (hasDayEvidence) {
    const hasOilRoutine = confirmed.some((entry) => /올리브유/.test(entry.value) && /레몬즙/.test(entry.value));
    const hasMixCoffee = confirmed.some((entry) => /(?:믹스커피|맥심\s*커피)/.test(entry.value));
    const missingRoutine: FoodJournalEntry[] = [];
    for (const routine of ROUTINE_ENTRIES) {
      if ((routine.value.startsWith("올리브유") && hasOilRoutine) ||
          (routine.value.startsWith("믹스커피") && hasMixCoffee)) continue;
      const entry = decorateEntry(routine);
      if (entry) missingRoutine.push(entry);
    }
    confirmed.unshift(...missingRoutine);
  }

  const knownCalories = confirmed.filter(
    (entry) => entry.estimated_calorie_min != null && entry.estimated_calorie_max != null,
  );
  const calorieMin = knownCalories.reduce((sum, entry) => sum + (entry.estimated_calorie_min || 0), 0);
  const calorieMax = knownCalories.reduce((sum, entry) => sum + (entry.estimated_calorie_max || 0), 0);

  return {
    ...day,
    confirmed,
    uncertain: unresolved,
    estimated_calorie_min: knownCalories.length ? calorieMin : null,
    estimated_calorie_max: knownCalories.length ? calorieMax : null,
    estimated_calorie_partial: knownCalories.length < confirmed.length,
    late_night_count: confirmed.filter((entry) => entry.late_night).length,
  };
}
