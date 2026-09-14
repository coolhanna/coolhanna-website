export type ConcernDate = { id: string; last_message_at: string; current_received_at?: string; waiting_since?: string };
export type OriginalMessage = { role: "inbound" | "hanna" | "automatic"; text: string; at: string; attachments?: { id: string; label: string }[] };
export type ConcernFilter = "open" | "preparing" | "queued" | "replied" | "waiting" | "skipped" | "all";
export type QueueItem = { state: string; workspace_status: string; has_current_concern?: boolean | null };
export type DraftDispatch = { state: string; updated_at: string; error?: string };

export function canReconnectDraft(event: DraftDispatch | null | undefined, startedAt?: string, now = Date.now()): boolean {
  if (startedAt) return false;
  if (!event || ["failed", "uncertain"].includes(event.state)) return true;
  const age = now - Date.parse(event.updated_at);
  return (["pending", "delivering"].includes(event.state) && age > 30_000)
    || (event.state === "accepted" && age > 600_000);
}

export function concernQueue(item: QueueItem): Exclude<ConcernFilter, "all"> {
  const status = item.workspace_status;
  if (status === "skipped") return "skipped";
  // Approval and uncertain delivery are never proof of an actual reply.
  if (["approved", "sending", "uncertain"].includes(status)) return "queued";
  if (["sent", "answered"].includes(status)) return "replied";
  if (status === "preparing") return "preparing";
  if (item.has_current_concern === false) return "waiting";
  return "open";
}

export function inConcernQueue(item: QueueItem, filter: ConcernFilter): boolean {
  return filter === "all" || concernQueue(item) === filter;
}

export function concernCounts(items: QueueItem[]) {
  return {
    all: items.length,
    open: items.filter(i => inConcernQueue(i, "open")).length,
    replied: items.filter(i => inConcernQueue(i, "replied")).length,
    skipped: items.filter(i => inConcernQueue(i, "skipped")).length,
    queued: items.filter(i => inConcernQueue(i, "queued")).length,
    preparing: items.filter(i => inConcernQueue(i, "preparing")).length,
    waiting: items.filter(i => inConcernQueue(i, "waiting")).length,
    draft: items.filter(i => inConcernQueue(i, "open") && i.workspace_status === "draft").length,
    needsDraft: items.filter(i => inConcernQueue(i, "open") && i.workspace_status !== "draft").length,
  };
}

export function mergeConcernReceipt<T extends { id: string; workspace_revision: number }>(item: T, receipt?: T): T {
  return receipt && receipt.workspace_revision > item.workspace_revision ? receipt : item;
}

export function nextConcernId(items: { id: string }[], current: string): string {
  const index = items.findIndex(i => i.id === current);
  return items[index + 1]?.id || items.find(i => i.id !== current)?.id || "";
}

export function oldestConcernsFirst<T extends ConcernDate>(items: T[]): T[] {
  const date = (item: T) => {
    const received = item.current_received_at || item.last_message_at;
    const value = Date.parse(received);
    if (!Number.isFinite(value)) {
      const day = received.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      const partial = day ? Date.parse(`${day}T00:00:00+09:00`) : NaN;
      return Number.isFinite(partial) ? partial : Infinity;
    }
    return Number.isFinite(value) ? value : Infinity;
  };
  return [...items].sort((a, b) => date(a) - date(b) || a.id.localeCompare(b.id));
}

export function koreaDay(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || value;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
}

export function originalGroups(messages: OriginalMessage[]) {
  // Source order also preserves messages sharing a timestamp and labels whose
  // exact time was not displayed. Never invent times for those messages.
  const human = messages.filter(m => m.role !== "automatic" && !isEntryMessage(m));
  const latestDay = koreaDay([...human].reverse().find(m => m.role === "inbound")?.at || "");
  const start = human.findIndex(m => m.role === "inbound" && koreaDay(m.at) === latestDay);
  return { recent: start < 0 ? [] : human.slice(start), earlier: start < 0 ? human : human.slice(0, start), entries: messages.filter(isEntryMessage) };
}

export function isEntryMessage(message: OriginalMessage): boolean {
  return message.role === "inbound" && !message.attachments?.length && /^고민\s*있어요\s*[!！.。?？~～]*$/u.test(message.text.trim());
}
