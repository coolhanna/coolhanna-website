import type { PipelineSummary } from "@/lib/pipeline/summary";
import styles from "./pipeline.module.css";

interface SummaryCardsProps {
  summary: PipelineSummary;
}

interface CardConfig {
  key: keyof PipelineSummary;
  label: string;
  dotColor?: string;
  accent?: boolean;
}

const CARDS: CardConfig[] = [
  { key: "working", label: "작업중", dotColor: "var(--status-doing)" },
  { key: "waitingUpload", label: "업로드 대기", dotColor: "var(--status-done)" },
  { key: "published", label: "발행 완료", dotColor: "var(--status-done)" },
  { key: "notStarted", label: "대기" },
];

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section className={styles.summary} aria-label="요약">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={`${styles.card} ${card.accent ? styles.cardAccentBlocked : ""}`}
        >
          <span className={styles.cardLabel}>
            {card.dotColor && (
              <span
                className={styles.cardDot}
                style={{ background: card.dotColor }}
                aria-hidden
              />
            )}
            {card.label}
          </span>
          <span className={styles.cardValue}>{summary[card.key]}</span>
        </div>
      ))}
    </section>
  );
}
