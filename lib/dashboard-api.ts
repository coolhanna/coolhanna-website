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
  // v7 — 애플워치 건강 (coolhanna-health 프록시: 어제/이번주/이번달 병합)
  watchHealth: () => api<any>("/api/dashboard/watch-health"),
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
  // Phase 4 — 릴스 분석 노트 (조회수순 + 전사상태)
  reels: () => api<ReelsResponse>("/api/dashboard/reels"),
  // 유튜브 전용 탭 — 채널 지표 + 업로드 달력
  youtube: () => api<YouTubeTabResponse>("/api/dashboard/youtube"),
  // 통합 업로드 캘린더 — 릴스 3계정 + 유튜브 숏/롱
  uploads: () => api<UploadsResponse>("/api/dashboard/uploads"),
};

export type UploadSource = "한나" | "가족먹거리" | "혜린" | "YT숏" | "YT롱";

export interface UploadEntry {
  date: string; // KST YYYY-MM-DD
  platform: "릴스" | "유튜브";
  source: UploadSource;
  title: string | null;
  views: number | null;
  key: string;
}

export interface UploadsResponse {
  uploads: UploadEntry[];
}

export type TranscriptionStatus = "ok" | "no_speech" | "no_audio" | "failed" | "unknown";

export interface ReelStructureStep {
  section: string;
  duration: number;
  content: string;
}

export interface ReelVisualSection {
  title: string;
  content: string;
}
export interface ReelVisual {
  author: string;
  sections: ReelVisualSection[];
}

export interface ReelItem {
  account: "한나" | "혜린";
  shortcode: string;
  title: string;
  url: string;
  posted_at: string;
  posted_date: string;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
  engagement_rate: number;
  hook: string;
  hook_pattern: string;
  hook_pattern_short: string;
  cta_type: string;
  cta_short: string;
  structure: ReelStructureStep[];
  viral_factors: string[];
  applicable: string;
  warning: string;
  transcript: string;
  caption: string;
  caption_analysis: string;
  has_transcript: boolean;
  transcription_status: TranscriptionStatus;
  visual: ReelVisual | null;
  has_visual: boolean;
  // v2 — 성과 판정·댓글·트렌드·변주 훅·지표 시계열
  verdict: "대박" | "성공" | "평타" | "부진" | "";
  verdict_reason: string;
  comment_insight: string;
  trend_fit: string;
  next_hooks: string[];
  formula: string;
  duration_sec: number;
  music: string;
  metrics_captured_at: string;
  views_d1: number | null;
  views_d3: number | null;
  views_d7: number | null;
  shares: number | null;
  saves: number | null;
  content_type: "공구" | "광고" | "일반";
  snapshot_count: number;
  // v2.2 — 주제 평가·좋았던/아쉬운·메모
  topic: string;
  topic_verdict: string;
  good: string[];
  bad: string[];
  memo: string;
  // v3 — 인스타 공식 API 파생지표 (그래프 API 전환 후)
  engagement_includes_saves_shares: boolean; // 참여율에 공유·저장 포함 여부
  save_rate: number | null;                  // 저장 ÷ 조회 (%)
  share_rate: number | null;                 // 공유 ÷ 조회 (%)
  avg_watch_sec: number | null;              // 평균 시청시간(초)
  completion_rate: number | null;            // 완주율(추정, %) = 시청 ÷ 길이
  views_per_follower: number | null;         // 조회 ÷ 팔로워 (비팔로워 확산 배수)
  views_source?: "note" | "graph_snapshot";
  views_updated_at?: string;
}

export interface AccountSummary {
  display_name: "한나" | "혜린" | "가족먹거리";
  username: string;
  date: string;
  followers: number;
  followers_change_1d: number;
  reach: number;
  views: number;
  profile_views: number;
  accounts_engaged: number;
  website_clicks: number;
  profile_links_taps: number;
  history: Array<{
    date: string;
    followers: number;
    reach: number;
    website_clicks: number;
  }>;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  views: number;
  views_change_1d: number | null;
  duration_sec: number | null;
  format: "숏폼" | "롱폼";
}

export interface YouTubeSummary {
  display_name: string;
  channel_id: string;
  date: string;
  subscribers: number;
  subscribers_change_1d: number;
  history: Array<{ date: string; followers: number }>;
  videos: YouTubeVideo[];
}

export interface YouTubeUpload {
  id: string;
  title: string | null;
  upload_date: string;
  format: "숏폼" | "롱폼";
  topic: "요리" | "교육";
  duration_sec: number | null;
  views: number | null;
  views_change_1d: number | null;
  learning: string | null;
  next: string | null;
  verdict: "대박" | "성공" | "평타" | "부진" | "성장중" | null;
}

export interface YouTubeMatrixCell {
  format: "숏폼" | "롱폼";
  topic: "요리" | "교육";
  n: number;
  median: number;
  max: number;
}

export interface YouTubeDiagnosis {
  headline: string;
  points: string[];
  next_moves: string[];
  source: string;
  updated: string;
}

export interface YouTubeTabResponse extends YouTubeSummary {
  uploads: YouTubeUpload[];
  matrix: YouTubeMatrixCell[];
  diagnosis: YouTubeDiagnosis | null;
}

export interface ReelsResponse {
  items: ReelItem[];
  overview: unknown; // 서버 집계(전체 기준). UI는 계정필터 반영 위해 items에서 재집계.
  accounts?: AccountSummary[];
  youtube?: YouTubeSummary | null;
}

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

export interface HyerinDiaryWeekTodo {
  text: string;
  done: boolean;
  line: number;
}

export interface HyerinDiaryWeekDay {
  date: string;
  요일: string;
  is_today: boolean;
  weekly_todos: HyerinDiaryWeekTodo[];
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
