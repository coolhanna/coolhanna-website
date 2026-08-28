export type DeskWorkState = "working" | "needs_decision" | "waiting";
export type DeskSourceState = "connected" | "scheduled" | "pending";

export interface DeskWorkItem {
  id: string;
  title: string;
  detail: string;
  source: string;
  state: DeskWorkState;
  stateLabel: string;
}

export interface DeskTodayItem {
  id: string;
  title: string;
  detail: string;
  time: string | null;
  source: string;
}

export interface DeskSourceItem {
  id: string;
  title: string;
  detail: string;
  state: DeskSourceState;
  stateLabel: string;
}

export interface HannaDeskView {
  date: string;
  checkedAt: string | null;
  currentWork: DeskWorkItem[];
  needsAttention: DeskWorkItem[];
  today: DeskTodayItem[];
  sources: DeskSourceItem[];
  unavailableSources: string[];
  isPartial: boolean;
}

type UnknownRecord = Record<string, any>;

export interface HannaDeskInput {
  liveState?: UnknownRecord;
  scheduleV2?: UnknownRecord;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function hasError(value: unknown): boolean {
  return Boolean(cleanText(asRecord(value).error));
}

function makeId(prefix: string, value: string, index: number): string {
  const slug = value.toLocaleLowerCase("ko-KR").replace(/[^0-9a-z가-힣]+/gi, "-").slice(0, 36);
  return `${prefix}-${slug || index}-${index}`;
}

function workItems(
  value: unknown,
  prefix: string,
  lane: "working" | "needs_decision",
): DeskWorkItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    const item = asRecord(raw);
    const title = cleanText(item.title);
    if (!title) return [];
    const state: DeskWorkState = lane;
    return [{
      id: cleanText(item.id) || makeId(prefix, title, index),
      title,
      detail: cleanText(item.detail, "현재 상태를 확인하고 있어요."),
      source: cleanText(item.source, "현재 작업"),
      state,
      stateLabel: cleanText(item.state_label, state === "needs_decision" ? "내 확인 필요" : "진행 중"),
    }];
  });
}

function sourceItems(value: unknown): DeskSourceItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    const item = asRecord(raw);
    const title = cleanText(item.title);
    if (!title) return [];
    const state: DeskSourceState = ["connected", "scheduled", "pending"].includes(item.state)
      ? item.state
      : "pending";
    return [{
      id: cleanText(item.id) || makeId("source", title, index),
      title,
      detail: cleanText(item.detail),
      state,
      stateLabel: cleanText(item.state_label, state === "pending" ? "연결 전" : "연결됨"),
    }];
  });
}

export function buildHannaDesk(input: HannaDeskInput, todayIso: string): HannaDeskView {
  const unavailableSources: string[] = [];
  const live = asRecord(input.liveState);
  const schedule = asRecord(input.scheduleV2);
  const liveHasError = hasError(input.liveState);
  const liveIsToday = !liveHasError && cleanText(live.date) === todayIso;

  if (!liveIsToday) unavailableSources.push("오늘 작업 상태");
  if (hasError(input.scheduleV2)) unavailableSources.push("오늘 일정");
  if (liveIsToday && Array.isArray(live.unavailable_sources)) {
    live.unavailable_sources.forEach((source: unknown) => {
      const label = cleanText(source);
      if (label && !unavailableSources.includes(label)) unavailableSources.push(label);
    });
  }

  const todayBundle = hasError(input.scheduleV2) ? {} : asRecord(schedule.today);
  const today: DeskTodayItem[] = [];

  const routines = Array.isArray(todayBundle.routines) ? todayBundle.routines : [];
  routines.forEach((routine: UnknownRecord, index: number) => {
    const title = cleanText(routine.name, "오늘 루틴");
    today.push({
      id: makeId("routine", title, index),
      title,
      detail: cleanText(routine.location, "반복 일정"),
      time: cleanText(routine.time) || null,
      source: "루틴",
    });
  });

  const todos = Array.isArray(todayBundle.todos) ? todayBundle.todos : [];
  todos
    .filter((todo: UnknownRecord) => !todo.done)
    .forEach((todo: UnknownRecord, index: number) => {
      const title = cleanText(todo.text);
      if (!title) return;
      today.push({
        id: makeId("today", title, index),
        title,
        detail: "오늘 남아 있는 일정",
        time: cleanText(todo.time) || null,
        source: "오늘",
      });
    });

  const suggestions = liveIsToday && Array.isArray(live.suggestions) ? live.suggestions : [];
  suggestions.forEach((raw: UnknownRecord, index: number) => {
    const suggestion = asRecord(raw);
    const title = cleanText(suggestion.title);
    if (!title) return;
    today.push({
      id: cleanText(suggestion.id) || makeId("suggestion", title, index),
      title,
      detail: cleanText(suggestion.detail, "오늘 해보면 좋을 일"),
      time: cleanText(suggestion.time) || null,
      source: "오늘 제안",
    });
  });

  today.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.title.localeCompare(b.title, "ko-KR");
  });

  return {
    date: todayIso,
    checkedAt: liveIsToday ? cleanText(live.checked_at) || null : null,
    currentWork: liveIsToday ? workItems(live.current_work, "work", "working") : [],
    needsAttention: liveIsToday
      ? workItems(live.needs_attention, "attention", "needs_decision")
      : [],
    today,
    sources: liveIsToday ? sourceItems(live.sources) : [],
    unavailableSources,
    isPartial: unavailableSources.length > 0,
  };
}
