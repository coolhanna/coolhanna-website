export type DeskUrgency = "urgent" | "attention" | "calm";

export interface DeskItem {
  id: string;
  title: string;
  detail: string;
  source: string;
  urgency: DeskUrgency;
}

export interface DeskTodayItem {
  id: string;
  title: string;
  detail: string;
  time: string | null;
  source: string;
}

export interface HannaDeskView {
  date: string;
  decisions: DeskItem[];
  mustNotMiss: DeskItem[];
  today: DeskTodayItem[];
  waiting: DeskItem[];
  unavailableSources: string[];
  isPartial: boolean;
  summary: {
    decisions: number;
    mustNotMiss: number;
    waiting: number;
  };
}

type UnknownRecord = Record<string, any>;

export interface HannaDeskInput {
  recommendation?: UnknownRecord;
  scheduleV2?: UnknownRecord;
  incomplete?: UnknownRecord;
  stuck?: UnknownRecord;
  paymentFollowups?: UnknownRecord;
  quickTasks?: UnknownRecord;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asItems(value: unknown): UnknownRecord[] {
  const items = asRecord(value).items;
  return Array.isArray(items) ? items.filter((item) => item && typeof item === "object") : [];
}

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function titleKey(value: unknown): string {
  return cleanText(value).toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

function hasError(value: unknown): boolean {
  return Boolean(cleanText(asRecord(value).error));
}

function uniqueByTitle<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = titleKey(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dueDetail(item: UnknownRecord, todayIso: string): string {
  const deadline = cleanText(item.deadline);
  if (!deadline) {
    const age = Number(item.modified_days_ago);
    return Number.isFinite(age) && age > 0 ? `${age}일째 멈춰 있어요` : "진행 여부를 확인해요";
  }

  const today = Date.parse(`${todayIso}T00:00:00+09:00`);
  const due = Date.parse(`${deadline}T00:00:00+09:00`);
  if (!Number.isFinite(today) || !Number.isFinite(due)) return `마감 ${deadline}`;
  const delta = Math.round((due - today) / 86_400_000);
  if (delta < 0) return `마감이 ${Math.abs(delta)}일 지났어요`;
  if (delta === 0) return "오늘 마감이에요";
  return `마감 D-${delta}`;
}

function makeId(prefix: string, title: string, index: number): string {
  const slug = titleKey(title).slice(0, 30) || String(index);
  return `${prefix}-${slug}-${index}`;
}

export function buildHannaDesk(input: HannaDeskInput, todayIso: string): HannaDeskView {
  const unavailableSources: string[] = [];
  if (hasError(input.scheduleV2)) unavailableSources.push("오늘 일정");
  if (hasError(input.incomplete)) unavailableSources.push("놓친 할 일");
  if (hasError(input.stuck)) unavailableSources.push("정체된 일");
  if (hasError(input.paymentFollowups)) unavailableSources.push("기다리는 일");
  if (hasError(input.quickTasks)) unavailableSources.push("빠른 처리");

  const waitingSourceItems = asItems(input.paymentFollowups);
  const waitingKeys = new Set(waitingSourceItems.map((item) => titleKey(item.title)));

  const overdue = asItems(input.incomplete)
    .filter((item) => !waitingKeys.has(titleKey(item.title)))
    .map((item, index): DeskItem => {
    const title = cleanText(item.title, "제목 없는 할 일");
    return {
      id: makeId("overdue", title, index),
      title,
      detail: dueDetail(item, todayIso),
      source: "할 일",
      urgency: "urgent",
    };
  });

  const overdueKeys = new Set(overdue.map((item) => titleKey(item.title)));
  const stuck = asItems(input.stuck)
    .filter(
      (item) =>
        !overdueKeys.has(titleKey(item.title)) && !waitingKeys.has(titleKey(item.title)),
    )
    .map((item, index): DeskItem => {
      const title = cleanText(item.title, "제목 없는 진행 중 일");
      return {
        id: makeId("stuck", title, index),
        title,
        detail: dueDetail(item, todayIso),
        source: cleanText(item.type, "진행 중"),
        urgency: Number(item.modified_days_ago) >= 7 ? "urgent" : "attention",
      };
    });

  const recommended = asRecord(input.recommendation).recommendation;
  const recommendationItem = asRecord(recommended);
  const recommendationTitle = cleanText(recommendationItem.title);
  const existingKeys = new Set([...overdue, ...stuck].map((item) => titleKey(item.title)));
  const recommendation: DeskItem[] =
    recommendationTitle && !existingKeys.has(titleKey(recommendationTitle))
      ? [
          {
            id: makeId("recommendation", recommendationTitle, 0),
            title: recommendationTitle,
            detail: cleanText(asRecord(input.recommendation).reason, "오늘 먼저 처리할 일이에요"),
            source: "AI 제안",
            urgency: "calm",
          },
        ]
      : [];

  const decisions = uniqueByTitle([...overdue, ...stuck, ...recommendation]);
  const todayBundle = hasError(input.scheduleV2) ? {} : asRecord(asRecord(input.scheduleV2).today);

  const today: DeskTodayItem[] = [];
  const calendarEvents = Array.isArray(todayBundle.calendar_events) ? todayBundle.calendar_events : [];
  calendarEvents.forEach((event: UnknownRecord, index: number) => {
    const title = cleanText(event.summary, "제목 없는 일정");
    today.push({
      id: makeId("calendar", title, index),
      title,
      detail: event.all_day ? "종일 일정" : "캡린 일정",
      time: cleanText(event.time) || null,
      source: "캡린 일정",
    });
  });

  const routines = Array.isArray(todayBundle.routines) ? todayBundle.routines : [];
  routines.forEach((routine: UnknownRecord, index: number) => {
    const title = cleanText(routine.name, "루틴");
    today.push({
      id: makeId("routine", title, index),
      title,
      detail: cleanText(routine.location, "반복 루틴"),
      time: cleanText(routine.time) || null,
      source: "루틴",
    });
  });

  today.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.title.localeCompare(b.title, "ko-KR");
  });

  const mustNotMiss: DeskItem[] = [];
  const addMustNotMiss = (titleValue: unknown, detail: string, source: string, index: number) => {
    const title = cleanText(titleValue);
    if (!title) return;
    mustNotMiss.push({
      id: makeId("attention", title, index),
      title,
      detail,
      source,
      urgency: "attention",
    });
  };

  const yesterday = Array.isArray(todayBundle.incomplete_yesterday) ? todayBundle.incomplete_yesterday : [];
  yesterday.forEach((item: UnknownRecord, index: number) =>
    addMustNotMiss(item.text, "어제에서 이월됐어요", "이월", index),
  );

  const todos = Array.isArray(todayBundle.todos) ? todayBundle.todos : [];
  todos
    .filter((item: UnknownRecord) => !item.done)
    .forEach((item: UnknownRecord, index: number) =>
      addMustNotMiss(item.text, "오늘 할 일이에요", "오늘 할 일", index),
    );

  const deadlines = [
    ...(Array.isArray(todayBundle.ad_deadlines) ? todayBundle.ad_deadlines : []),
    ...(Array.isArray(todayBundle.gongu_milestones) ? todayBundle.gongu_milestones : []),
  ];
  deadlines.forEach((item: UnknownRecord, index: number) => {
    const title = `${cleanText(item.title, "마감")} · ${cleanText(item.kind, "확인")}`;
    addMustNotMiss(title, `${cleanText(item.audience, "한나")} 담당`, cleanText(item.kind, "마감"), index);
  });

  asItems(input.quickTasks)
    .filter((item) => !item.done)
    .forEach((item, index) =>
      addMustNotMiss(item.text, "짧게 닫을 일이에요", "빠른 처리", index),
    );

  const waiting = waitingSourceItems.map((item, index): DeskItem => {
    const title = cleanText(item.title, "확인 필요");
    const isOverdue = Number(item.days_until_payment) < 0;
    return {
      id: makeId("waiting", title, index),
      title,
      detail: cleanText(item.wait_label, "상대 확인을 기다리고 있어요"),
      source: cleanText(item.type, "대기"),
      urgency: isOverdue ? "urgent" : "calm",
    };
  });

  const uniqueMustNotMiss = uniqueByTitle(mustNotMiss);
  const uniqueWaiting = uniqueByTitle(waiting);
  return {
    date: todayIso,
    decisions,
    mustNotMiss: uniqueMustNotMiss,
    today,
    waiting: uniqueWaiting,
    unavailableSources,
    isPartial: unavailableSources.length > 0,
    summary: {
      decisions: decisions.length,
      mustNotMiss: uniqueMustNotMiss.length,
      waiting: uniqueWaiting.length,
    },
  };
}
