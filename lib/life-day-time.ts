type TimePoint = {
  hour: number;
  minute: string;
  minuteNumber: number;
};

type TimelineTime = {
  start: TimePoint;
  end?: TimePoint;
};

function parseTimePoint(value: string): TimePoint | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, hourText, minute] = match;
  const hour = Number(hourText);
  const minuteNumber = Number(minute);
  if (hour < 0 || hour > 23 || minuteNumber < 0 || minuteNumber > 59) return null;

  return { hour, minute, minuteNumber };
}

function parseTimelineTime(value: string): TimelineTime | null {
  const [startText, endText, ...rest] = value.split("~").map((part) => part.trim());
  if (rest.length > 0) return null;

  const start = parseTimePoint(startText);
  if (!start) return null;
  if (!endText) return { start };

  const end = parseTimePoint(endText);
  return end ? { start, end } : null;
}

function period(point: TimePoint) {
  return point.hour < 12 ? "오전" : "오후";
}

function clock(point: TimePoint) {
  return `${point.hour % 12 || 12}:${point.minute}`;
}

function formatPoint(point: TimePoint) {
  return `${period(point)} ${clock(point)}`;
}

export function formatTimelineTime(value: string) {
  const parsed = parseTimelineTime(value);
  if (!parsed) return value.trim() || "시간 미상";
  if (!parsed.end) return formatPoint(parsed.start);

  const crossesMidnight = parsed.end.hour * 60 + parsed.end.minuteNumber
    < parsed.start.hour * 60 + parsed.start.minuteNumber;
  const endLabel = crossesMidnight
    ? `다음날 ${formatPoint(parsed.end)}`
    : period(parsed.start) === period(parsed.end)
      ? clock(parsed.end)
      : formatPoint(parsed.end);
  return `${formatPoint(parsed.start)}~${endLabel}`;
}

export function formatTimelineBoundary(value: string, boundary: "start" | "end") {
  const parsed = parseTimelineTime(value);
  if (!parsed) return value.trim() || "시간 미상";
  return formatPoint(boundary === "end" ? parsed.end || parsed.start : parsed.start);
}

export function timelineStartMinutes(value: string) {
  const parsed = parseTimelineTime(value);
  if (!parsed) return Number.MAX_SAFE_INTEGER;
  return parsed.start.hour * 60 + parsed.start.minuteNumber;
}
