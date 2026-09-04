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
  planningCandidate: () =>
    api<PlanningCandidateResponse>("/api/dashboard/planning-candidate"),
  planningFeed: (date = "") =>
    api<PlanningFeedResponse>(`/api/dashboard/planning-feed${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  planningDecisions: () =>
    api<PlanningDecisionsResponse>("/api/dashboard/planning-decisions"),
  productFeedback: () =>
    api<PlanningProductFeedbackResponse>("/api/dashboard/planning-product-feedback"),
  dashboardFeedback: (scope = "") =>
    api<DashboardFeedbackResponse>(`/api/dashboard/dashboard-feedback${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`),
  // v6 — 일별 카드 통합 (오늘 + 내일)
  scheduleV2: () => api<any>("/api/dashboard/schedule-v2"),
  // 한나 데스크 — 수집기가 보낸 실시간 상태에서 미해결 항목만 조회
  deskLive: () => api<DeskLiveResponse>("/api/dashboard/desk-live"),
  // v6.2 — 이번 주(월~일) 일별 카드 todos
  weeklyTodos: () => api<any>("/api/dashboard/weekly-todos"),
  // v6.6.3 — 다른 주 todos (-N=지난 주, +N=다음 주)
  weeklyTodosOffset: (offset: number) =>
    api<any>(`/api/dashboard/weekly-todos?week_offset=${offset}`),
  // v6.2.2 — 오늘의 나 통합 (수면/컨디션/활동/식단 3끼니)
  todayMe: () => api<any>("/api/dashboard/today-me"),
  lifeToday: () => api<LifeDayResponse>("/api/dashboard/life-today"),
  lifeLatest: () => api<LifeDayResponse>("/api/dashboard/life-latest"),
  lifeDay: (date: string) => api<LifeDayResponse>(`/api/dashboard/life-day/${encodeURIComponent(date)}`),
  lifeDays: (limit = 30) => api<LifeDaysResponse>(`/api/dashboard/life-days?limit=${limit}`),
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
  foodCalendar: (month?: string) =>
    api<FoodCalendarResponse>(
      `/api/dashboard/food-calendar${month ? `?month=${encodeURIComponent(month)}` : ""}`,
    ),
};

export interface PlanningCandidateResponse {
  candidate: Record<string, any> | null;
  status: "ok" | "missing";
  error?: string;
}

export interface PlanningDecision {
  candidate_id: string;
  decision: "발전" | "형식 변경" | "스토리 먼저" | "보류" | "버림";
  feedback: string;
  decided_at: string;
}

export interface PlanningDecisionsResponse {
  decisions: PlanningDecision[];
  error?: string;
}

export type PlanningDiscoveryChannel =
  | "manufacturer"
  | "retailer_new"
  | "retailer_reviews"
  | "social"
  | "specialty"
  | "crowdfunding"
  | "editorial";

export interface PlanningResearch {
  searched: string[];
  learned: string[];
  sources: Array<{ label: string; note: string; url?: string }>;
  product_search_channels?: PlanningDiscoveryChannel[];
  product_selection?: {
    featured_group: string;
    solo_product_key: string | null;
    candidate_total: number;
    source_total: number;
    searched_at: string;
    criteria: string[];
    candidates: Array<{
      product_key: string;
      source_label: string;
      source_url: string;
      status: "finalist" | "hold" | "excluded";
      note: string;
    }>;
    finalists: Array<{
      product_key: string;
      role: "reference" | "new_discovery" | "challenger";
      reason: string;
    }>;
  };
  video_audit?: {
    evidence_total: number;
    screened_total: number;
    content_checked_total: number;
    recent_6m_total: number;
    important_total: number;
    repeated_product_total: number;
    cutoff_date: string;
    items: Array<{
      channel: "social";
      creator: string;
      title: string;
      url: string;
      published_at: string;
      content_checked: boolean;
      scope: "exact_product" | "category_context";
      important: boolean;
      product_keys: string[];
    }>;
  };
}

export interface PlanningProduct {
  id: string;
  brand: string;
  name: string;
  category: string;
  comparison_group?: string;
  primary_angle: "taste" | "ingredients" | "value" | "trend";
  recommendation_summary: string;
  video_idea: string;
  signal: "trend" | "evergreen" | "discovery";
  score: number;
  why_now_type: "new_product" | "season" | "price_change" | "new_cooking_method";
  why_now: string;
  why_fit: string;
  storage: "frozen" | "refrigerated" | "ambient" | "fresh";
  ingredient_check: string;
  ingredient_evidence?: {
    status: "verified" | "partial";
    summary: string;
    source_label: string;
    source_url: string;
    checked_at: string;
    full_ingredients_checked: boolean;
    per_serving_nutrition_checked: boolean;
  };
  product_image?: {
    url: string;
    alt: string;
    source_label: string;
    source_url: string;
    checked_at: string;
  };
  social_evidence?: Array<{
    platform: "youtube" | "instagram";
    creator: string;
    title: string;
    url: string;
    published_at: string;
    checked_at: string;
    reason: string;
  }>;
  recommendation_reasons?: Array<{
    category: "trend" | "ingredients" | "taste" | "value" | "convenience" | "content";
    summary: string;
    evidence_urls: string[];
  }>;
  price?: {
    amount: number;
    display: string;
    quantity?: string;
    unit_price?: string;
    source_label: string;
    source_url: string;
    checked_at: string;
  };
  reviews?: {
    count: number;
    rating?: number | null;
    summary: string;
    source_label: string;
    source_url: string;
    checked_at: string;
  };
  discovered_from?: {
    channel: PlanningDiscoveryChannel;
    label: string;
    reason: string;
    url: string;
    checked_at: string;
  };
  test_format: string;
  test_plan: string;
  caution?: string;
  evidence?: Array<{ label: string; note: string; url?: string }>;
  buy_links?: Array<{ label: string; url: string; checked_at?: string }>;
}

export interface PlanningProductFeedbackItem {
  product_id: string;
  status: "active" | "saved" | "try" | "excluded";
  tags: string[];
  note: string;
  product: PlanningProduct & { source_date?: string };
  updated_at: string;
}

export interface PlanningProductRequest {
  id: string;
  product_id: string;
  request_type: "similar" | "better_ingredients";
  instruction: string;
  status: "pending" | "complete";
  requested_at: string;
  product: PlanningProduct & { source_date?: string };
  result_ids?: string[];
}

export interface PlanningProductFeedbackResponse {
  items: PlanningProductFeedbackItem[];
  requests: PlanningProductRequest[];
  events?: Array<Record<string, any>>;
  error?: string;
}

export interface DashboardFeedbackItem {
  id: string;
  scope: string;
  page_label: string;
  action: "confirm" | "correct" | "missing" | "more" | "stop";
  note: string;
  context: Record<string, string>;
  status: "pending" | "routed" | "applied" | "rejected";
  result: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardFeedbackResponse {
  items: DashboardFeedbackItem[];
  events: Array<Record<string, unknown>>;
  counts: Record<DashboardFeedbackItem["status"], number>;
  error?: string;
}

export interface PlanningDay {
  date: string;
  generated_at: string;
  next_run_at?: string;
  batch_label?: string;
  topic_level?: "broad_question";
  cycle_days?: number;
  target_account?: string;
  status: string;
  product_status?: "ready" | "researching" | "blocked" | string;
  research: PlanningResearch;
  product_radar?: PlanningProduct[];
  candidates: Array<Record<string, any>>;
}

export interface PlanningFeedResponse {
  current: PlanningDay | null;
  latest_attempt?: PlanningDay | null;
  dates: Array<{ date: string; generated_at: string; status: string; candidate_count: number }>;
  requests: Array<{ id: string; status: string; request_type: string; candidate_id: string }>;
  status: "ok" | "missing" | "blocked";
  error?: string;
}

export interface LifeDayTimelineItem {
  time: string;
  title: string;
  detail: string;
}

export interface LifeDayConversation {
  person: string;
  topic: string;
  viewpoint: string;
  quote: string;
  detail: string;
}

export interface LifeDayVerbatimQuote {
  time: string;
  speaker: string;
  quote: string;
  context: string;
  significance: string;
  repeated: boolean;
}

export interface LifeDayResponse {
  available: boolean;
  date: string;
  status?: string;
  feedback_processing?: {
    status: "idle" | "pending" | "processing" | "complete" | "failed";
    requested_at: string;
    completed_at: string;
    last_error: string;
    answer_ids: string[];
  };
  recording?: {
    duration: string;
    ranges: string[];
    gap: string;
  };
  headline?: string;
  summary?: string;
  people?: string[];
  places?: string[];
  timeline?: LifeDayTimelineItem[];
  intake?: Array<{ label: string; value: string }>;
  health_signals?: Array<{ title: string; detail: string; level: string }>;
  conversations?: LifeDayConversation[];
  verbatim_quotes?: LifeDayVerbatimQuote[];
  completed?: string[];
  pending?: string[];
  ideas?: string[];
  shopping?: Array<{ item: string; state: string }>;
  weather?: {
    summary: string;
    location: string;
    high_c: number | null;
    low_c: number | null;
    precipitation: string;
    humidity: string;
    air_quality: string;
    source: string;
  };
  questions?: Array<{
    id: string;
    question: string;
    category: string;
    answer: string;
    status: string;
    answered_at: string;
  }>;
  source_note?: string;
  source_audio_folder?: string;
}

export interface LifeDaysResponse {
  days: Array<{ date: string; headline: string; duration: string }>;
}

export type UploadSource = "한나" | "가족먹거리" | "혜린" | "YT숏" | "YT롱" | "게시물";

export interface UploadEntry {
  date: string; // KST YYYY-MM-DD
  platform: "릴스" | "유튜브" | "게시물";
  source: UploadSource;
  title: string | null;
  views: number | null;
  // 캐러셀 게시물은 인스타 API가 조회수를 안 준다 — 좋아요로 대신 표시한다.
  likes?: number | null;
  comments?: number | null;
  key: string;
}

export interface UploadsResponse {
  uploads: UploadEntry[];
}

export interface DeskLiveResponse {
  date: string;
  checked_at: string | null;
  current_work: Array<Record<string, unknown>>;
  needs_attention: Array<Record<string, unknown>>;
  suggestions: Array<Record<string, unknown>>;
  sources: Array<Record<string, unknown>>;
  unavailable_sources: string[];
  error?: string;
}

export type FoodEntryStatus = "confirmed" | "uncertain" | "excluded";

export interface FoodCalendarEntry {
  id?: string;
  optimistic?: boolean;
  label: string;
  value: string;
  meal: "아침" | "점심" | "저녁" | "간식" | "기타";
  source: "life_audio" | "manual";
  time?: string;
}

export interface FoodNutritionEstimate {
  calorie_min: number | null;
  calorie_max: number | null;
  confidence: "unknown" | "stale" | "low" | "medium" | "high";
  concern: string;
  advice: string;
  basis: string[];
}

export interface FoodCalendarDay {
  date: string;
  source_status?: "ok" | "missing" | "read_error" | "invalid_json" | "invalid_schema" | "date_mismatch";
  confirmed: FoodCalendarEntry[];
  uncertain: FoodCalendarEntry[];
  excluded: FoodCalendarEntry[];
  nutrition: FoodNutritionEstimate;
}

export interface FoodReflection {
  recorded_days: number;
  window: string[];
  group_days: {
    protein: number;
    vegetable: number;
    fruit: number;
    processed: number;
  };
  concern: string;
  next_action: string;
  notice: string;
}

export interface FoodCalendarResponse {
  month: string;
  days: FoodCalendarDay[];
  reflection: FoodReflection;
  generated: string;
  nutrition_sources: {
    scope: "general_reference_only";
    reference: string;
    food_database: string;
  };
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
  format: "숏폼" | "미드폼" | "롱폼";
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

export interface YouTubeDeepAnalysis {
  verdict_line: string | null;
  ig_compare: string | null;
  title_review: string | null;
  good: string[];
  bad: string[];
  next_hooks: string[];
  ig_note: string | null;
}

export interface YouTubeUpload {
  id: string;
  title: string | null;
  upload_date: string;
  format: "숏폼" | "미드폼" | "롱폼";
  topic: "요리" | "교육";
  duration_sec: number | null;
  views: number | null;
  views_change_1d: number | null;
  learning: string | null;
  next: string | null;
  verdict: "대박" | "성공" | "평타" | "부진" | "성장중" | null;
  analysis: YouTubeDeepAnalysis | null;
}

export interface YouTubeMatrixCell {
  format: "숏폼" | "미드폼" | "롱폼";
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
