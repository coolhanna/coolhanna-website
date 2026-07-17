import type { Platform, StageId, StageState, StageStatus } from "./types";

export interface StageDef {
  id: StageId;
  label: string;
}

export const STAGES: StageDef[] = [
  { id: "idea", label: "아이디어" },
  { id: "script", label: "대본" },
  { id: "shoot", label: "촬영" },
  { id: "edit", label: "편집" },
  { id: "caption", label: "캡션" },
  { id: "upload", label: "업로드" },
];

export const STAGE_IDS: StageId[] = STAGES.map((s) => s.id);

export interface PlatformDef {
  id: Platform;
  label: string;
}

export const PLATFORMS: PlatformDef[] = [
  { id: "reels", label: "릴스" },
  { id: "youtube", label: "유튜브" },
];

export const STATUS_LABEL: Record<StageStatus, string> = {
  todo: "대기",
  doing: "진행중",
  done: "완료",
  blocked: "막힘",
};

/** 클릭할 때마다 순환하는 상태 순서 */
export const STATUS_CYCLE: StageStatus[] = ["todo", "doing", "done", "blocked"];

export function nextStatus(current: StageStatus): StageStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

/** 모든 단계가 '대기'인 빈 단계 맵 */
export function emptyStages(): Record<StageId, StageState> {
  return STAGE_IDS.reduce(
    (acc, id) => {
      acc[id] = { status: "todo" };
      return acc;
    },
    {} as Record<StageId, StageState>,
  );
}

export function platformLabel(id: Platform): string {
  return PLATFORMS.find((p) => p.id === id)?.label ?? id;
}
