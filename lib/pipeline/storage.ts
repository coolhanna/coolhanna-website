import { emptyStages } from "./stages";
import type { Platform, Video } from "./types";

const STORAGE_KEY = "coolhanna-pipeline:videos:v1";

/** localStorage 에서 영상 목록을 읽는다. 없거나 깨지면 null. */
export function loadVideos(): Video[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Video[];
  } catch {
    return null;
  }
}

export function saveVideos(videos: ReadonlyArray<Video>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  } catch {
    // 저장 실패(용량 초과 등)는 조용히 무시 — 화면은 계속 동작
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createVideo(
  title: string,
  platform: Platform = "reels",
): Video {
  return {
    id: newId(),
    title: title.trim() || "제목 없는 영상",
    platform,
    stages: emptyStages(),
    updatedAt: todayIso(),
  };
}
