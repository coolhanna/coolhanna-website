import type { DDayInfo, DDayUrgency } from "@/lib/pipeline/dday";
import styles from "./pipeline.module.css";

const URGENCY_CLASS: Record<DDayUrgency, string> = {
  overdue: styles.ddayOverdue,
  urgent: styles.ddayUrgent,
  soon: styles.ddaySoon,
  normal: styles.ddayNormal,
};

interface DDayBadgeProps {
  info: DDayInfo | null;
}

export function DDayBadge({ info }: DDayBadgeProps) {
  if (!info) return <span className={styles.ddayEmpty}>—</span>;
  return (
    <span className={`${styles.dday} ${URGENCY_CLASS[info.urgency]}`}>
      {info.label}
    </span>
  );
}
