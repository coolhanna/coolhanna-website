export interface IntakeResearchResult {
  id: string;
  status: "done" | "archived";
  summary: string;
  why_now: string;
  perspective: string;
  application: string;
  open_question: string;
  generated_at: string;
  source: { id: string; version: number; quote: string; date: string | null; created_at: string | null };
  sources: Array<{ title: string; url: string; claim: string; evidence: { read_level: "page_fetch" | "search_result" } }>;
  archive?: { reason: string; archived_at: string };
}
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export function safeResearchUrl(value: unknown): string | null {
  if (typeof value !== "string" || /[\s\u0000-\u001f]/.test(value)) return null;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function isIntakeResearchResult(value: unknown): value is IntakeResearchResult {
  return object(value) && ["id", "summary", "why_now", "perspective", "application", "open_question", "generated_at"].every(key => typeof value[key] === "string" && Boolean(value[key]))
    && ["done", "archived"].includes(String(value.status)) && Number.isFinite(Date.parse(String(value.generated_at)))
    && object(value.source) && typeof value.source.id === "string" && Boolean(value.source.id) && typeof value.source.quote === "string"
    && Number.isSafeInteger(value.source.version) && Number(value.source.version) > 0
    && (value.source.date === null || typeof value.source.date === "string") && (value.source.created_at === null || typeof value.source.created_at === "string")
    && Array.isArray(value.sources) && value.sources.length > 0 && value.sources.every(source => object(source)
      && typeof source.title === "string" && typeof source.claim === "string" && Boolean(safeResearchUrl(source.url))
      && object(source.evidence) && ["page_fetch", "search_result"].includes(String(source.evidence.read_level)))
    && (value.status !== "archived" || (object(value.archive) && typeof value.archive.reason === "string" && typeof value.archive.archived_at === "string"));
}
