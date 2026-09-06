import { isoKst } from "./kst-date.ts";

export interface JournalEntry {
  id: string;
  original_text: string;
  text: string;
  date: string | null;
  time: string | null;
  kind: "memo" | "task";
  author: "hanna" | "ai";
  confirmation: "confirmed" | "proposed";
  source: string;
  status: "open" | "done" | "archived";
  version: number;
  created_at: string;
  updated_at: string;
}

export interface JournalResponse {
  entries: JournalEntry[];
  revision: number;
  timezone: "Asia/Seoul";
  start: string;
  end: string;
}

export interface JournalMutationResponse {
  ok: true;
  entry: JournalEntry;
  revision: number;
}

// Calendar arithmetic uses UTC date-only values, independent of device timezone.
function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError("올바른 날짜가 필요해요.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError("올바른 날짜가 필요해요.");
  }
  return date;
}

export function journalToday(now = new Date()): string {
  return isoKst(now);
}

export function addDays(value: string, count: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(value: string): string {
  const day = parseDate(value).getUTCDay();
  return addDays(value, -((day + 6) % 7));
}

export function weekDates(value: string): string[] {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthDates(value: string): string[] {
  const date = parseDate(value);
  date.setUTCDate(1);
  const first = date.toISOString().slice(0, 10);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  const last = date.toISOString().slice(0, 10);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(last), 6);
  const count = Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86400000) + 1;
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function shiftMonth(value: string, count: number): string {
  const date = parseDate(value);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + count);
  const last = new Date(date);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(originalDay, last.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

export function formatDay(value: string): string {
  return parseDate(value).toLocaleDateString("ko-KR", {
    timeZone: "UTC", month: "long", day: "numeric", weekday: "short",
  });
}

export function monthTitle(value: string): string {
  return parseDate(value).toLocaleDateString("ko-KR", {
    timeZone: "UTC", year: "numeric", month: "long",
  });
}
