"use client";

import { STATUS_CYCLE, STATUS_LABEL } from "@/lib/pipeline/stages";
import type { StageStatus } from "@/lib/pipeline/types";
import styles from "./pipeline.module.css";

const ACTIVE_BG: Record<StageStatus, string> = {
  todo: "var(--color-text-faint)",
  doing: "oklch(62% 0.15 75)",
  done: "var(--status-done)",
  blocked: "var(--status-blocked)",
};

interface StatusChipsProps {
  value: StageStatus;
  onChange: (status: StageStatus) => void;
}

export function StatusChips({ value, onChange }: StatusChipsProps) {
  return (
    <div className={styles.statusToggle} role="group" aria-label="상태 선택">
      {STATUS_CYCLE.map((status) => {
        const active = status === value;
        return (
          <button
            key={status}
            type="button"
            className={`${styles.statusChip} ${active ? styles.statusChipActive : ""}`}
            style={active ? { background: ACTIVE_BG[status] } : undefined}
            aria-pressed={active}
            onClick={() => onChange(status)}
          >
            {STATUS_LABEL[status]}
          </button>
        );
      })}
    </div>
  );
}
