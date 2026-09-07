import type { JournalEntry, JournalMutationResponse } from "@/lib/journal";

export type HomeView = "morning" | "evening" | "week" | "month";
type SourceStatus = "available" | "missing" | "unavailable";
export interface JournalContext {
  date: string;
  generated_at: string;
  current_focus: { status: SourceStatus; account_name?: string; account_handle?: string; metric?: string; target?: number; effective_date?: string };
  open_tasks: { status: SourceStatus; entries: JournalEntry[]; total: number };
  recent_notes: { status: SourceStatus; entries: JournalEntry[]; total: number; start?: string; end?: string };
  briefing: { status: SourceStatus; date?: string | null; content?: string; age_days?: number | null; freshness?: "same_day" | "previous_day" | "stale" | null; source_route?: string; message?: string };
  questions: { status: SourceStatus; items: Array<{ id: string; date?: string; question: string; status: string; source_route?: string }>; total: number; source_route?: string; message?: string };
}

export interface QuickBody {
  text: string;
  date: string | null;
  time: null;
  kind: "memo" | "task";
  author: "hanna";
  confirmation: "confirmed";
  source: "한나 다이어리";
  processing?: "connect" | "record";
}
export interface QuickDraft {
  text: string;
  date: string;
  followsToday: boolean;
  kind: "memo" | "task";
  attempt: { id: string; body: QuickBody } | null;
  processing?: "connect" | "record";
}
export const QUICK_DRAFT_KEY = "hanna-diary-quick-draft-v1";
export const EDITOR_DRAFT_KEY = "hanna-diary-editor-drafts-v1";
export interface SavedEditorDraft {
  entry: JournalEntry | null;
  text: string;
  date: string;
  time: string;
  kind: "memo" | "task";
  request: { fingerprint: string; id: string } | null;
}

export function readEditorDrafts(raw: string | null): Record<string, SavedEditorDraft> {
  if (!raw) return {};
  try {
    const values = JSON.parse(raw) as Record<string, SavedEditorDraft>;
    if (!values || typeof values !== "object" || Array.isArray(values)) return {};
    return Object.fromEntries(Object.entries(values).filter(([key, value]) => value && typeof value === "object" &&
      typeof value.text === "string" && value.text.length <= 10000 && (value.date === "" || isDate(value.date)) &&
      (value.time === "" || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time)) &&
      (value.kind === "memo" || value.kind === "task") && (value.entry === null ? key === "new" :
        isJournalEntry(value.entry) && value.entry.id === key) &&
      (value.request === null || (typeof value.request?.fingerprint === "string" && typeof value.request?.id === "string" && value.request.id.length > 0))
    ).slice(0, 50));
  } catch { return {}; }
}

export function initialHomeView(now = new Date()): "morning" | "evening" {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", hourCycle: "h23" }).format(now));
  return hour >= 17 ? "evening" : "morning";
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function readQuickDraft(raw: string | null): QuickDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as QuickDraft;
    if (!value || typeof value !== "object" || typeof value.text !== "string" || value.text.length > 10000 ||
      !(value.date === "" || isDate(value.date)) || typeof value.followsToday !== "boolean" ||
      (value.kind !== "memo" && value.kind !== "task") || (value.processing !== undefined && value.processing !== "connect" && value.processing !== "record")) return null;
    if (value.attempt !== null) {
      const attempt = value.attempt;
      if (!attempt || typeof attempt.id !== "string" || !attempt.id || attempt.id.length > 160 || !attempt.body) return null;
      const body = attempt.body;
      if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 10000 ||
        !(body.date === null || isDate(body.date)) || body.time !== null || (body.kind !== "memo" && body.kind !== "task") ||
        body.author !== "hanna" || body.confirmation !== "confirmed" || body.source !== "한나 다이어리" || (body.processing !== undefined && body.processing !== "connect" && body.processing !== "record")) return null;
      // An uncertain request is recovered exactly as submitted, even after midnight.
      return { text: body.text, date: body.date || "", followsToday: false, kind: body.kind, attempt, ...(body.processing ? { processing: body.processing } : {}) };
    }
    return { text: value.text, date: value.date, followsToday: value.followsToday, kind: value.kind, attempt: null, ...(value.processing ? { processing: value.processing } : {}) };
  } catch { return null; }
}

export function isJournalEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as JournalEntry;
  const derivation = entry.derivation;
  return (derivation === undefined || (derivation !== null && typeof derivation === "object" &&
      typeof derivation.source_entry_id === "string" && derivation.source_entry_id.length > 0 &&
      Number.isSafeInteger(derivation.source_version) && derivation.source_version > 0 &&
      typeof derivation.source_quote === "string" && typeof derivation.action_id === "string" && derivation.action_id.length > 0)) &&
    typeof entry.id === "string" && entry.id.length > 0 && typeof entry.text === "string" && typeof entry.original_text === "string" &&
    typeof entry.source === "string" && Number.isInteger(entry.version) && entry.version > 0 &&
    typeof entry.created_at === "string" && Number.isFinite(Date.parse(entry.created_at)) &&
    typeof entry.updated_at === "string" && Number.isFinite(Date.parse(entry.updated_at)) &&
    (entry.date === null || isDate(entry.date)) && (entry.time === null || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.time)) &&
    (entry.kind === "memo" || entry.kind === "task") && (entry.author === "hanna" || entry.author === "ai") &&
    (entry.confirmation === "confirmed" || entry.confirmation === "proposed") &&
    (entry.status === "open" || entry.status === "done" || entry.status === "archived");
}

export function isJournalMutation(value: unknown): value is JournalMutationResponse {
  if (!value || typeof value !== "object") return false;
  const result = value as JournalMutationResponse;
  return result.ok === true && Number.isInteger(result.revision) && result.revision >= 0 && isJournalEntry(result.entry);
}

export function safeDashboardRoute(value: string | undefined, fallback: string): string {
  return value && /^\/dashboard(?:\/|\?|$)/.test(value) && !/[\\\u0000-\u001f]/.test(value) ? value : fallback;
}

export function briefingExcerpt(content: string, maxLength = 700): string {
  const cleaned = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "").trim();
  const lines = cleaned.split("\n");
  function section(pattern: RegExp): string {
    const start = lines.findIndex(line => pattern.test(line));
    if (start < 0) return "";
    const output: string[] = [];
    for (let index = start + 1; index < lines.length; index++) {
      if (/^#{1,6}\s/.test(lines[index]) || /^\s*---+\s*$/.test(lines[index])) break;
      output.push(lines[index]);
    }
    return output.join("\n").trim();
  }
  const core = section(/^#{1,6}\s+.*오늘\s*핵심/);
  const suggestion = section(/^#{1,6}\s+.*→\s*제안/);
  // Use exact source sections; do not summarize operational diagnostics into advice.
  const text = core ? `${core}${suggestion ? `\n\n### 브리핑의 제안\n\n${suggestion}` : ""}` : (() => {
    let skippingSystem = false;
    return lines.filter(line => {
      if (/^#{1,2}\s/.test(line)) skippingSystem = /시스템|관제탑|자동화/.test(line);
      return !skippingSystem && !/^#\s/.test(line) && !/^\s*---+\s*$/.test(line);
    }).join("\n").trim();
  })();
  if (text.length <= maxLength) return text;
  const end = text.lastIndexOf("\n", maxLength);
  return `${text.slice(0, end > maxLength / 2 ? end : maxLength).trimEnd()}…`;
}
