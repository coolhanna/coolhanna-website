// Server Component에서만 사용 (API 키 클라이언트 노출 X).
// 클라이언트 mutation은 /api/dashboard/proxy/[path]로 호출.

const API_URL = process.env.DASHBOARD_API_URL || "http://127.0.0.1:8000";
const API_KEY = process.env.DASHBOARD_API_KEY || "";

export async function api<T = any>(path: string): Promise<T | { error: string }> {
  if (!API_KEY) return { error: "DASHBOARD_API_KEY 미설정 (Vercel 환경 변수)" };
  try {
    const r = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: "no-store",
    });
    if (!r.ok) return { error: `API ${r.status}: ${path}` };
    return await r.json();
  } catch (e: any) {
    return { error: e?.message || "fetch 실패" };
  }
}

export const dash = {
  today: () => api<any>("/api/dashboard/today"),
  recommendation: () => api<any>("/api/dashboard/recommendation"),
  weekProgress: () => api<any>("/api/dashboard/week-progress"),
  schedule: () => api<any>("/api/dashboard/schedule"),
  incomplete: () => api<any>("/api/dashboard/incomplete?limit=5"),
  stuck: () => api<any>("/api/dashboard/stuck"),
  activeCards: () => api<any>("/api/dashboard/active-cards"),
  paymentFollowups: () => api<any>("/api/dashboard/payment-followups"),
  cashflow: () => api<any>("/api/dashboard/cashflow"),
  healthTrend: () => api<any>("/api/dashboard/health-trend"),
  calendar: () => api<any>("/api/dashboard/calendar"),
  // v5 추가
  choresTodo: () => api<any>("/api/dashboard/chores/todo"),
  choresShop: () => api<any>("/api/dashboard/chores/shop"),
  quickTasks: () => api<any>("/api/dashboard/quick-tasks"),
  weeklyRoutines: () => api<any>("/api/dashboard/weekly-routines"),
  ideasRecent: () => api<any>("/api/dashboard/ideas-recent?limit=3"),
  ideasAll: (limit = 50) =>
    api<any>(`/api/dashboard/ideas-recent?limit=${limit}`),
  // v6 — 일별 카드 통합 (오늘 + 내일)
  scheduleV2: () => api<any>("/api/dashboard/schedule-v2"),
  // v6.2 — 이번 주(월~일) 일별 카드 todos
  weeklyTodos: () => api<any>("/api/dashboard/weekly-todos"),
  // v6.6.3 — 다른 주 todos (-N=지난 주, +N=다음 주)
  weeklyTodosOffset: (offset: number) =>
    api<any>(`/api/dashboard/weekly-todos?week_offset=${offset}`),
  // v6.2.2 — 오늘의 나 통합 (수면/컨디션/활동/식단 3끼니)
  todayMe: () => api<any>("/api/dashboard/today-me"),
  // v6.4 — 최근 메모 (오늘 + 어제, 미완료만)
  memosRecent: () => api<any>("/api/dashboard/memos-recent"),
  // v6.5.1 — 진행중 할 일 (광고/공구와 분리)
  activeTodos: () => api<any>("/api/dashboard/active-todos"),
  thinkingTracks: () => api<any>("/api/dashboard/thinking-tracks"),
  // v6.6 — 상세 페이지 (광고/공구/매출)
  adsDetail: () => api<any>("/api/dashboard/ads-detail"),
  gonguDetail: () => api<any>("/api/dashboard/gongu-detail"),
  revenueMonthly: () => api<any>("/api/dashboard/revenue-monthly"),
  // 혜린 학습 대시보드 — 일별 스냅샷 카드 기반
  hyerinToday: () => api<HyerinTodayResponse>("/api/dashboard/hyerin/today"),
  hyerinWeek: (weekOffset = 0) =>
    api<HyerinWeekResponse>(`/api/dashboard/hyerin/week?week_offset=${weekOffset}`),
  hyerin30Days: () => api<HyerinMonthResponse>("/api/dashboard/hyerin/30days"),
  hyerinTrainingDetail: (folder: string, date: string) =>
    api<HyerinTrainingDetailResponse>(
      `/api/dashboard/hyerin/training/${encodeURIComponent(folder)}/${date}`,
    ),
  hyerinDiaryState: () => api<HyerinDiaryStateResponse>("/api/dashboard/hyerin/diary/state"),
};

export interface HyerinDiaryTodo {
  done: boolean;
  text: string;
}

export interface HyerinDiaryToday {
  date: string;
  요일: string;
  sections: Record<string, HyerinDiaryTodo[]>;
  일기: string;
  routine_done: string[];
}

export interface HyerinDiaryWeekChip {
  section: string;
  text: string;
  done: boolean;
  line: number;
}

export interface HyerinDiaryWeekDay {
  date: string;
  요일: string;
  is_today: boolean;
  chips: HyerinDiaryWeekChip[];
  note_len: number;
}

export interface HyerinDiaryPin {
  text: string;
  tone: string;
  icon: string;
}

export interface HyerinDiaryStats {
  today_chars: number;
  week_chars: number;
  month_chars: number;
  today_goal: number;
}

export interface HyerinDiaryProgress {
  리스트: { 누적: number; 목표: number; 퍼센트: number };
  에샤: { chapter: string };
}

export interface HyerinDiaryStateResponse {
  today: HyerinDiaryToday;
  week: { start: string; days: HyerinDiaryWeekDay[] };
  pins: HyerinDiaryPin[];
  seeds: string[];
  seeds_total: number;
  video: Record<string, string[]>;
  routine_def: string[];
  stats: HyerinDiaryStats;
  progress: HyerinDiaryProgress;
}

// ─────────────────────────────────────────────────────────────────────
// 혜린 학습 대시보드 타입 (일별 스냅샷 카드 기반)
// ─────────────────────────────────────────────────────────────────────

export interface HyerinTodayResponse {
  date: string;
  exists: boolean;
  요일?: string;
  message?: string;
  summary?: {
    글자수_오늘: number;
    평균_점수: number;
    훈련_완료: number;
    훈련_전체: number;
    연속_일수: number;
  };
  한줄평?: Record<string, string>;
  훈련별_지표?: Record<string, HyerinTrainingMetric>;
  한나용_코멘트?: string;
  혜린용_코멘트?: string;
  누적_지표?: Record<string, string>;
  data_status?: {
    source: "snapshot" | "live";
    is_stale: boolean;
    warning: string;
  };
}

export interface HyerinWeekDay {
  date: string;
  요일: string;
  글자수: number;
  평균점수: number;
  훈련완료: number;
  exists: boolean;
  source?: "snapshot" | "live";
}

export interface HyerinWeekResponse {
  days: HyerinWeekDay[];
  표시일: string;
  week_offset?: number;
  week_start?: string;
  week_end?: string;
}

export interface HyerinMonthDay {
  date: string;
  글자수: number;
  평균점수: number;
  훈련완료: number;
  훈련별: Record<string, HyerinTrainingMetric>;
  코멘트: {
    한나: string;
    혜린: string;
    stale: boolean;
  };
}

export interface HyerinMonthResponse {
  days: HyerinMonthDay[];
  표시일: string;
}

export interface HyerinTrainingMetric {
  글자수: number;
  카드수: number;
  완료: boolean;
}

export interface HyerinTrainingCard {
  filename: string;
  frontmatter: Record<string, string>;
  content: string;
}

export interface HyerinTrainingDetailResponse {
  folder: string;
  date: string;
  cards: HyerinTrainingCard[];
}
