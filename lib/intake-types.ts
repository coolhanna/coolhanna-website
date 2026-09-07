export type IntakeStatus = "queued" | "interpreting" | "applying" | "needs_input" | "completed" | "partial" | "failed" | "superseded" | "undone";
export type IntakeActionStatus = "pending" | "applying" | "applied" | "needs_input" | "failed" | "skipped" | "undone";
export type IntakeActionKind = "task" | "reference" | "research" | "health" | "campaign" | "feedback" | "answer";

export interface IntakeAction {
  id: string;
  kind: IntakeActionKind;
  title: string;
  source_quote: string;
  status: IntakeActionStatus;
  message: string;
  question: string | null;
  target: { route: string; id: string } | null;
  error: string | null;
}

export interface IntakeJob {
  id: string;
  source_entry_id: string;
  source_version: number;
  version: number;
  status: IntakeStatus;
  text: string;
  created_at: string;
  updated_at: string;
  summary: string;
  error: string | null;
  retryable: boolean;
  undoable: boolean;
  actions: IntakeAction[];
}

export interface IntakeJobsResponse {
  jobs: IntakeJob[];
  journal_revision: number;
  worker: { status: "running" | "delayed" | "offline"; last_heartbeat: string | null };
  server_time: string;
}

export interface IntakeAttempt {
  operation: "retry" | "undo" | "resolve";
  body: { request_id: string; expected_version: number; action_id?: string; answer?: string };
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";
const nullableString = (value: unknown): boolean => value === null || string(value);
const id = (value: unknown): boolean => string(value) && value.length > 0 && value.length <= 256;
const version = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const timestamp = (value: unknown): boolean => string(value) && Number.isFinite(Date.parse(value));

export function isIntakeJob(value: unknown): value is IntakeJob {
  if (!object(value)) return false;
  return id(value.id) && id(value.source_entry_id) && version(value.source_version) && version(value.version)
    && ["queued", "interpreting", "applying", "needs_input", "completed", "partial", "failed", "superseded", "undone"].includes(String(value.status))
    && string(value.text) && string(value.summary) && nullableString(value.error)
    && timestamp(value.created_at) && timestamp(value.updated_at)
    && typeof value.retryable === "boolean" && typeof value.undoable === "boolean"
    && Array.isArray(value.actions) && value.actions.every(action => object(action) && id(action.id)
      && ["task", "reference", "research", "health", "campaign", "feedback", "answer"].includes(String(action.kind))
      && ["pending", "applying", "applied", "needs_input", "failed", "skipped", "undone"].includes(String(action.status))
      && string(action.title) && string(action.source_quote) && string(action.message)
      && nullableString(action.question) && nullableString(action.error)
      && (action.target === null || (object(action.target) && string(action.target.route) && id(action.target.id))));
}

export function isIntakeJobsResponse(value: unknown): value is IntakeJobsResponse {
  return object(value) && Array.isArray(value.jobs) && value.jobs.every(isIntakeJob)
    && Number.isSafeInteger(value.journal_revision) && Number(value.journal_revision) >= 0
    && object(value.worker) && ["running", "delayed", "offline"].includes(String(value.worker.status))
    && (value.worker.last_heartbeat === null || timestamp(value.worker.last_heartbeat)) && timestamp(value.server_time);
}

export function isIntakeAttempt(value: unknown): value is IntakeAttempt {
  if (!object(value) || !["retry", "undo", "resolve"].includes(String(value.operation)) || !object(value.body)) return false;
  if (!id(value.body.request_id) || !version(value.body.expected_version)) return false;
  return value.operation === "resolve" ? id(value.body.action_id) && string(value.body.answer) && value.body.answer.trim().length > 0 && value.body.answer.length <= 10000 : value.body.action_id === undefined && value.body.answer === undefined;
}

export function intakeNeedsPolling(job: IntakeJob): boolean {
  return ["queued", "interpreting", "applying"].includes(job.status)
    || (["partial", "needs_input"].includes(job.status) && job.actions.some(action => ["pending", "applying"].includes(action.status)));
}

export function intakeTargetRoute(route: string | undefined): string | null {
  if (!route || !/^\/dashboard(?:[/?#]|$)/.test(route) || /[\\\u0000-\u001f]/.test(route)) return null;
  return route;
}

export function keepNewestVersion<T extends { id: string; version: number }>(current: T | null | undefined, incoming: T): T {
  return current?.id === incoming.id && current.version > incoming.version ? current : incoming;
}

export function intakeLinkedDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

export function pinSavedIntake(jobs: IntakeJob[], extra: IntakeJob[], source: { id: string; version: number } | null): IntakeJob[] {
  const byId = new Map(jobs.map(job => [job.id, job]));
  for (const job of extra) byId.set(job.id, keepNewestVersion(byId.get(job.id), job));
  const result = [...byId.values()];
  if (!source) return result;
  return result.sort((a, b) => Number(b.source_entry_id === source.id && b.source_version === source.version) - Number(a.source_entry_id === source.id && a.source_version === source.version));
}
