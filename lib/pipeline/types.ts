export type Platform = "reels" | "youtube";

export type StageStatus = "todo" | "doing" | "done" | "blocked";

export type StageId =
  | "idea"
  | "script"
  | "shoot"
  | "caption"
  | "edit"
  | "upload";

/** 단계 하나의 상태 + 메모 + 링크 */
export interface StageState {
  status: StageStatus;
  note?: string;
  link?: string;
}

/** 발행 후 데이터 (수동 입력, 나중에 API 자동화 가능) */
export interface VideoMetrics {
  views?: number;
  likes?: number;
  saves?: number;
  comments?: number;
}

export interface Video {
  id: string;
  title: string;
  platform: Platform;
  stages: Record<StageId, StageState>;
  /** 업로드 목표일 (YYYY-MM-DD) */
  targetDate?: string;
  /** 실제 발행일 (YYYY-MM-DD) */
  publishedDate?: string;
  /** 기획 / 후크 메모 */
  ideaMemo?: string;
  metrics?: VideoMetrics;
  updatedAt: string;
}
