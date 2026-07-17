import type { StageStatus } from "@/lib/pipeline/types";
import styles from "./pipeline.module.css";

const DOT_CLASS: Record<StageStatus, string> = {
  done: styles.dotDone,
  doing: styles.dotDoing,
  blocked: styles.dotBlocked,
  todo: styles.dotTodo,
};

interface StatusDotProps {
  status: StageStatus;
  /** 호버 라벨 등에 쓰는 단계 이름 (선택) */
  stageLabel?: string;
}

export function StatusDot({ status }: StatusDotProps) {
  return <span className={`${styles.dot} ${DOT_CLASS[status]}`} aria-hidden />;
}
