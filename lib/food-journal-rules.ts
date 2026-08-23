import type { FoodCalendarDay, FoodCalendarEntry } from "./dashboard-api";

export type FoodJournalSource = FoodCalendarEntry["source"] | "routine";

export interface FoodCalorieRange {
  min: number;
  max: number;
  basis: string;
  partial?: boolean;
}

export interface FoodJournalEntry extends Omit<FoodCalendarEntry, "source"> {
  source: FoodJournalSource;
  estimated_calorie_min: number | null;
  estimated_calorie_max: number | null;
  calorie_basis: string;
  calorie_partial: boolean;
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

export type QuickMealKind = "아침" | "점심" | "저녁" | "간식";

export function parseQuickFoodEntry(
  value: string,
  fallbackMeal: QuickMealKind,
): { meal: QuickMealKind; food: string } {
  const clean = value.replace(/\s+/g, " ").trim();
  const explicit = clean.match(/^(아침|점심|저녁|간식)(?:\s*[:：-]\s*|\s+|$)(.*)$/);
  if (!explicit) return { meal: fallbackMeal, food: clean };
  return {
    meal: explicit[1] as QuickMealKind,
    food: explicit[2].trim(),
  };
}

export function buildQuickFoodEntry(
  value: string,
  selectedMeal: QuickMealKind,
): { meal: QuickMealKind; food: string } {
  return {
    meal: selectedMeal,
    food: parseQuickFoodEntry(value, selectedMeal).food,
  };
}

const MEAL_LABEL_RE = /(아침|점심|저녁|간식|야식)/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const KOREAN_COUNTS: Record<string, number> = {
  한: 1,
  두: 2,
  세: 3,
  네: 4,
  다섯: 5,
  여섯: 6,
  일곱: 7,
  여덟: 8,
  아홉: 9,
  열: 10,
};
const SPOKEN_COUNT = "\\d+|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열";
const SERVING_UNIT = "개|잔|큰술|줄|인분|공기|그릇|컵";
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
  [/치킨/, 400, 800, "치킨 보통 1회분 기준"],
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

function foodCount(value?: string): number {
  if (!value) return 1;
  return Number(value) || KOREAN_COUNTS[value] || 1;
}

function isIgnoredSegment(segment: string): boolean {
  const clean = segment.trim();
  if (!clean) return true;
  const withoutTime = clean.replace(/^\d{1,2}:\d{2}\s*/, "");
  return /^(?:물|물을|생수)(?:\s*(?:\d+(?:ml|mL|리터|L)|한\s*잔|두\s*잔|조금|많이|섭취|마심|마셨(?:다|음)?|마셔|발언))*$/i.test(withoutTime);
}

function removeBreathMints(segment: string): string {
  return segment
    .replace(
      /(?:이클립스|민트\s*캔디|무설탕\s*캔디|껌)(?:\s*(?:먹고|먹음|먹었(?:다|어|고)?|섭취(?:했(?:다|고)?|함)?))?/gi,
      "",
    )
    .replace(/^(?:그리고|또|및|와|과)\s+/, "")
    .trim();
}

export function sanitizeFoodValue(value: string): string {
  return value
    .split(/\s*[·;,]\s*/)
    .map(removeBreathMints)
    .filter((segment) => !isIgnoredSegment(segment))
    .join(" · ");
}

export function estimateFoodCalories(
  value: string,
  meal: FoodCalendarEntry["meal"],
): FoodCalorieRange | null {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const segments = normalized.split(/\s*[·;,]\s*/).filter(Boolean);
  let min = 0;
  let max = 0;
  const bases = new Set<string>();
  let anyMatched = false;
  let hasUnrecognizedFood = false;
  let recognizedItemCount = 0;
  for (const segment of segments) {
    const occupied = new Set<number>();
    let segmentMatched = false;

    const addRecognized = (
      start: number,
      end: number,
      rangeMin: number,
      rangeMax: number,
      basis: string,
    ) => {
      for (let index = start; index < end; index += 1) occupied.add(index);
      min += rangeMin;
      max += rangeMax;
      bases.add(basis);
      segmentMatched = true;
      anyMatched = true;
      recognizedItemCount += 1;
    };

    const oilMatcher = new RegExp(
      `올리브유(?:\\s*(${SPOKEN_COUNT})\\s*큰술)?\\s*(?:\\+|과|와)\\s*레몬즙`,
      "g",
    );
    for (let oilRoutine = oilMatcher.exec(segment); oilRoutine; oilRoutine = oilMatcher.exec(segment)) {
      if (oilRoutine.index == null) continue;
      const count = foodCount(oilRoutine[1]);
      addRecognized(
        oilRoutine.index,
        oilRoutine.index + oilRoutine[0].length,
        105 * count,
        135 * count,
        `올리브유 ${count}큰술 기준`,
      );
    }

    const mixMatcher = new RegExp(
      `(?:믹스커피|맥심\\s*커피)(?:\\s*(${SPOKEN_COUNT})\\s*잔)?`,
      "g",
    );
    for (let mixCoffee = mixMatcher.exec(segment); mixCoffee; mixCoffee = mixMatcher.exec(segment)) {
      if (mixCoffee.index == null) continue;
      const start = mixCoffee.index;
      const end = start + mixCoffee[0].length;
      const overlaps = Array.from({ length: end - start }, (_, index) => start + index)
        .some((index) => occupied.has(index));
      if (!overlaps) {
        const count = foodCount(mixCoffee[1]);
        addRecognized(start, end, 45 * count, 70 * count, `믹스커피 ${count}잔 기준`);
      }
    }

    for (const [pattern, ruleMin, ruleMax, basis] of CALORIE_RULES) {
      const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
      const matcher = new RegExp(pattern.source, flags);
      for (let match = matcher.exec(segment); match; match = matcher.exec(segment)) {
        if (match.index == null) continue;
        const start = match.index;
        const end = start + match[0].length;
        if (Array.from({ length: end - start }, (_, index) => start + index)
          .some((index) => occupied.has(index))) continue;

        const quantity = segment.slice(end).match(
          new RegExp(`^\\s*(${SPOKEN_COUNT})\\s*(${SERVING_UNIT})`),
        );
        const count = foodCount(quantity?.[1]);
        const unit = quantity?.[2] || "";
        addRecognized(
          start,
          end + (quantity?.[0].length || 0),
          ruleMin * count,
          ruleMax * count,
          count > 1 ? `${match[0].trim()} ${count}${unit} 기준` : basis,
        );
      }
    }

    const residue = Array.from(segment)
      .map((character, index) => occupied.has(index) ? " " : character)
      .join("")
      .replace(/\d{1,2}:\d{2}(?:\s*~\s*\d{1,2}:\d{2})?/g, " ")
      .replace(
        new RegExp(`(?:${SPOKEN_COUNT}|몇)\\s*(?:${SERVING_UNIT})`, "g"),
        " ",
      )
      .replace(/\d+(?:\.\d+)?\s*(?:개|잔|큰술|줄|인분|공기|그릇|컵)/g, " ")
      .replace(/(?:그리고|이랑|랑|와|과|먹고|먹음|먹었(?:다|어|고)?)/g, " ")
      .replace(/(?:큰|작은|보통|컵|조금(?:씩)?|일부|정도|섭취|흐름|발언|실제|추가)/g, " ")
      .replace(/[\s+·;,&/()~.-]/g, "");
    if (!segmentMatched || residue) hasUnrecognizedFood = true;
  }
  if (anyMatched) {
    return {
      min,
      max,
      basis: recognizedItemCount === 1 && bases.size === 1
        ? [...bases][0]
        : "일반적인 1회 섭취량 기준",
      ...(hasUnrecognizedFood ? { partial: true } : {}),
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

function isOilRoutine(value: string): boolean {
  return /올리브유/.test(value) && /레몬즙/.test(value);
}

function isMixCoffee(value: string): boolean {
  return /(?:믹스커피|맥심\s*커피)/.test(value);
}

function isCompactRoutineOil(entry: FoodJournalEntry): boolean {
  return entry.meal === "아침" && !entry.late_night &&
    /^올리브유\s*(?:1|한)\s*큰술\s*(?:\+|·|과|와)\s*레몬즙$/.test(entry.value.trim());
}

function isCompactRoutineCoffee(entry: FoodJournalEntry): boolean {
  return entry.meal === "아침" && !entry.late_night &&
    /^(?:믹스커피|맥심\s*커피)\s*(?:1|한)\s*잔$/.test(entry.value.trim());
}

function isBreakfastRoutine(value: string): boolean {
  return isOilRoutine(value) || isMixCoffee(value);
}

function inferAudioMeal(entry: FoodCalendarEntry): {
  meal: FoodCalendarEntry["meal"];
  question?: string;
} {
  if (entry.source === "manual" || MEAL_LABEL_RE.test(entry.label)) {
    return { meal: entry.meal };
  }
  if (isBreakfastRoutine(entry.value)) return { meal: "아침" };
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
    calorie_partial: calories?.partial ?? false,
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

  const entryKey = (entry: FoodJournalEntry) =>
    `${normalizeFood(entry.value)}|${entry.time || ""}`;
  const manualValues = new Set(
    confirmed
      .filter((entry) => entry.source === "manual")
      .map(entryKey),
  );
  const unresolved = uncertain.filter((entry) => !manualValues.has(entryKey(entry)));

  if (day.date <= today) {
    const hasOilRoutine = confirmed.some(isCompactRoutineOil);
    const hasMixCoffee = confirmed.some(isCompactRoutineCoffee);
    const missingRoutine: FoodJournalEntry[] = [];
    for (const routine of ROUTINE_ENTRIES) {
      if ((routine.value.startsWith("올리브유") && hasOilRoutine) ||
          (routine.value.startsWith("믹스커피") && hasMixCoffee)) continue;
      const entry = decorateEntry(routine);
      if (entry) missingRoutine.push(entry);
    }
    confirmed.unshift(...missingRoutine);

    const hasCompleteRoutine = confirmed.some(isCompactRoutineOil) &&
      confirmed.some(isCompactRoutineCoffee);
    if (hasCompleteRoutine) {
      const combinedRoutine = decorateEntry({
        label: "아침 고정 루틴",
        value: "올리브유 1큰술 + 레몬즙 · 믹스커피 1잔",
        meal: "아침" as const,
        source: "routine" as const,
        time: "",
      });
      const withoutRoutineParts = confirmed.filter(
        (entry) => !isCompactRoutineOil(entry) && !isCompactRoutineCoffee(entry),
      );
      confirmed.splice(
        0,
        confirmed.length,
        ...(combinedRoutine ? [combinedRoutine] : []),
        ...withoutRoutineParts,
      );
    }
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
    estimated_calorie_partial:
      knownCalories.length < confirmed.length || knownCalories.some((entry) => entry.calorie_partial),
    late_night_count: confirmed.filter((entry) => entry.late_night).length,
  };
}
