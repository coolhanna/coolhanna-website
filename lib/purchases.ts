export type PurchaseSourceState = "connected" | "pending" | "blocked";
export type PurchaseCategory = "content" | "food" | "household" | "other";

export interface PurchaseItem {
  id: string;
  name: string;
  source: string;
  orderedAt: string;
  arrivalLabel: string;
  category: PurchaseCategory;
  action: string;
  linkedTo: string;
}

export interface PurchaseSource {
  id: string;
  name: string;
  detail: string;
  state: PurchaseSourceState;
  stateLabel: string;
}

export interface PurchaseView {
  checkedAt: string | null;
  actionNeeded: PurchaseItem[];
  arriving: PurchaseItem[];
  linked: PurchaseItem[];
  routine: PurchaseItem[];
  sources: PurchaseSource[];
  isConnected: boolean;
}

type UnknownRecord = Record<string, any>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function purchaseItems(value: unknown): PurchaseItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    const item = asRecord(raw);
    const name = text(item.name);
    if (!name) return [];
    const category: PurchaseCategory = ["content", "food", "household", "other"].includes(item.category)
      ? item.category
      : "other";
    return [{
      id: text(item.id, `purchase-${index}`),
      name,
      source: text(item.source, "구매처 확인 전"),
      orderedAt: text(item.orderedAt),
      arrivalLabel: text(item.arrivalLabel),
      category,
      action: text(item.action),
      linkedTo: text(item.linkedTo),
    }];
  });
}

function purchaseSources(value: unknown): PurchaseSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    const source = asRecord(raw);
    const name = text(source.name);
    if (!name) return [];
    const state: PurchaseSourceState = ["connected", "pending", "blocked"].includes(source.state)
      ? source.state
      : "pending";
    return [{
      id: text(source.id, `source-${index}`),
      name,
      detail: text(source.detail),
      state,
      stateLabel: text(source.stateLabel, state === "connected" ? "연결됨" : "연결 전"),
    }];
  });
}

export function buildPurchaseView(input: unknown): PurchaseView {
  const payload = asRecord(input);
  const items = purchaseItems(payload.purchases);
  const sources = purchaseSources(payload.sources);

  return {
    checkedAt: text(payload.checkedAt) || null,
    actionNeeded: items.filter((item) => Boolean(item.action)),
    arriving: items.filter((item) => !item.action && Boolean(item.arrivalLabel)),
    linked: items.filter((item) => !item.action && !item.arrivalLabel && Boolean(item.linkedTo)),
    routine: items.filter((item) => !item.action && !item.arrivalLabel && !item.linkedTo),
    sources,
    isConnected: sources.some((source) => source.state === "connected"),
  };
}
