export type DDayUrgency = "overdue" | "urgent" | "soon" | "normal";

export interface DDayInfo {
  /** 표시 문자열: "D-2", "D-DAY", "D+1" */
  label: string;
  days: number;
  urgency: DDayUrgency;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toMidnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * 목표일까지 남은 날짜를 계산한다.
 * @param targetDate "YYYY-MM-DD"
 * @param today 기준 날짜 (보통 new Date())
 */
export function dDay(
  targetDate: string | undefined,
  today: Date,
): DDayInfo | null {
  if (!targetDate) return null;

  const target = new Date(`${targetDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const days = Math.round((toMidnight(target) - toMidnight(today)) / MS_PER_DAY);

  let label: string;
  if (days === 0) label = "D-DAY";
  else if (days > 0) label = `D-${days}`;
  else label = `D+${Math.abs(days)}`;

  let urgency: DDayUrgency;
  if (days < 0) urgency = "overdue";
  else if (days <= 1) urgency = "urgent";
  else if (days <= 3) urgency = "soon";
  else urgency = "normal";

  return { label, days, urgency };
}

/** "2026-06-29" → "6월 29일 (월)" */
export function formatKoreanDate(date: string | undefined): string {
  if (!date) return "—";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`;
}
