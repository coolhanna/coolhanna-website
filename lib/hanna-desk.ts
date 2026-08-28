export type DeskUrgency = "attention" | "calm";

export interface DeskItem {
  id: string;
  title: string;
  detail: string;
  source: string;
  urgency: DeskUrgency;
  href: string;
}

export interface DeskTodayItem {
  id: string;
  title: string;
  detail: string;
  time: string | null;
  source: string;
}

export interface DeskUploadItem {
  id: string;
  date: string;
  title: string;
  source: string;
  platform: string;
  views: number | null;
}

export interface HannaDeskView {
  date: string;
  lifeRecord: {
    date: string;
    headline: string;
    summary: string;
  } | null;
  carryOver: DeskItem[];
  resolvedByAccounts: DeskItem[];
  today: DeskTodayItem[];
  recentUploads: DeskUploadItem[];
  uploadSummary: {
    weekCount: number;
    latestDate: string | null;
    latestCount: number;
  };
  unavailableSources: string[];
  isPartial: boolean;
}

type UnknownRecord = Record<string, any>;

export interface HannaDeskInput {
  lifeLatest?: UnknownRecord;
  scheduleV2?: UnknownRecord;
  uploads?: UnknownRecord;
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

function isoDate(value: unknown): string {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function shortDate(value: string): string {
  const [, month, day] = value.split("-");
  return month && day ? `${Number(month)}월 ${Number(day)}일` : value;
}

function weekStart(todayIso: string): string {
  const [year, month, day] = todayIso.split("-").map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (current.getUTCDay() + 6) % 7;
  current.setUTCDate(current.getUTCDate() - mondayOffset);
  return current.toISOString().slice(0, 10);
}

const PENDING_MATCH_STOP_WORDS = [
  "영상", "최종", "게시", "재확인", "확인", "업로드", "릴스", "유튜브", "숏폼", "완료",
];

function pendingMatchTerms(pending: string): string[] {
  let searchable = pending;
  PENDING_MATCH_STOP_WORDS.forEach((word) => {
    searchable = searchable.replaceAll(word, " ");
  });
  return searchable
    .split(/[^0-9a-z가-힣]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function matchingUploads(
  pending: string,
  lifeDate: string,
  uploads: UnknownRecord[],
): UnknownRecord[] {
  if (!/(영상|게시|업로드|릴스|유튜브|숏폼)/.test(pending)) return [];
  const terms = pendingMatchTerms(pending);
  if (!terms.length) return [];
  return uploads.filter((upload) => {
    const uploadDate = isoDate(upload.date);
    const title = cleanText(upload.title).replace(/\s+/g, "");
    return uploadDate >= lifeDate && terms.some((term) => title.includes(term.replace(/\s+/g, "")));
  });
}

function uploadSources(matches: UnknownRecord[]): string {
  const labels = matches.map((upload) => {
    const source = cleanText(upload.source, "계정");
    const platform = cleanText(upload.platform);
    return platform && !source.includes(platform) ? `${source} ${platform}` : source;
  });
  return [...new Set(labels)].join(" · ");
}

export function buildHannaDesk(input: HannaDeskInput, todayIso: string): HannaDeskView {
  const unavailableSources: string[] = [];
  const life = asRecord(input.lifeLatest);
  const schedule = asRecord(input.scheduleV2);
  const uploadPayload = asRecord(input.uploads);

  if (hasError(input.lifeLatest) || life.available === false) unavailableSources.push("하루 기록");
  if (hasError(input.scheduleV2)) unavailableSources.push("오늘 루틴");
  if (hasError(input.uploads)) unavailableSources.push("실제 업로드");

  const lifeDate = isoDate(life.date);
  const lifeRecord = life.available && lifeDate
    ? {
        date: lifeDate,
        headline: cleanText(life.headline, "하루 기록"),
        summary: cleanText(life.summary),
      }
    : null;

  const uploads = Array.isArray(uploadPayload.uploads)
    ? uploadPayload.uploads.filter((item: unknown) => item && typeof item === "object") as UnknownRecord[]
    : [];
  const sortedUploads = [...uploads].sort((a, b) => isoDate(b.date).localeCompare(isoDate(a.date)));

  const carryOver: DeskItem[] = [];
  const resolvedByAccounts: DeskItem[] = [];
  const pending = Array.isArray(life.pending) ? life.pending : [];
  pending.forEach((pendingValue: unknown, index: number) => {
    const title = cleanText(pendingValue);
    if (!title || !lifeDate) return;
    const matches = matchingUploads(title, lifeDate, sortedUploads);
    if (matches.length) {
      resolvedByAccounts.push({
        id: makeId("resolved", title, index),
        title,
        detail: `${uploadSources(matches)} · ${shortDate(isoDate(matches[0].date))} 실제 게시 확인`,
        source: "계정 확인",
        urgency: "calm",
        href: "/dashboard/uploads",
      });
      return;
    }
    carryOver.push({
      id: makeId("carry", title, index),
      title,
      detail: `${shortDate(lifeDate)} 생활기록에서 이어짐`,
      source: "하루 기록",
      urgency: "attention",
      href: "/dashboard/day",
    });
  });

  const todayBundle = hasError(input.scheduleV2) ? {} : asRecord(schedule.today);
  const today: DeskTodayItem[] = [];
  const routines = Array.isArray(todayBundle.routines) ? todayBundle.routines : [];
  routines.forEach((routine: UnknownRecord, index: number) => {
    const title = cleanText(routine.name, "오늘 루틴");
    today.push({
      id: makeId("routine", title, index),
      title,
      detail: cleanText(routine.location, "반복 루틴"),
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
        detail: "오늘 기록에 남아 있어요",
        time: cleanText(todo.time) || null,
        source: "오늘 기록",
      });
    });
  today.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.title.localeCompare(b.title, "ko-KR");
  });

  const currentWeekStart = weekStart(todayIso);
  const weekCount = sortedUploads.filter((upload) => {
    const date = isoDate(upload.date);
    return date >= currentWeekStart && date <= todayIso;
  }).length;
  const latestDate = isoDate(sortedUploads[0]?.date) || null;
  const latestCount = latestDate
    ? sortedUploads.filter((upload) => isoDate(upload.date) === latestDate).length
    : 0;
  const recentUploads = sortedUploads.slice(0, 8).map((upload, index): DeskUploadItem => ({
    id: cleanText(upload.key) || makeId("upload", cleanText(upload.title), index),
    date: isoDate(upload.date),
    title: cleanText(upload.title, "제목 확인 필요"),
    source: cleanText(upload.source, "계정"),
    platform: cleanText(upload.platform, "게시물"),
    views: Number.isFinite(Number(upload.views)) ? Number(upload.views) : null,
  }));

  return {
    date: todayIso,
    lifeRecord,
    carryOver,
    resolvedByAccounts,
    today,
    recentUploads,
    uploadSummary: { weekCount, latestDate, latestCount },
    unavailableSources,
    isPartial: unavailableSources.length > 0,
  };
}
