import type { Platform } from "@/lib/pipeline/types";
import { platformLabel } from "@/lib/pipeline/stages";
import styles from "./pipeline.module.css";

const PILL_CLASS: Record<Platform, string> = {
  reels: styles.pillReels,
  youtube: styles.pillYoutube,
};

interface PlatformPillProps {
  platform: Platform;
  /** true 면 릴스도 표시. 기본은 유튜브만 표시(릴스는 숨김) */
  showAll?: boolean;
}

export function PlatformPill({ platform, showAll = false }: PlatformPillProps) {
  // 릴스가 기본이라 표에서는 숨기고, 유튜브만 간단히 표시
  if (platform === "reels" && !showAll) return null;
  return (
    <span className={`${styles.pill} ${PILL_CLASS[platform]}`}>
      {platformLabel(platform)}
    </span>
  );
}
