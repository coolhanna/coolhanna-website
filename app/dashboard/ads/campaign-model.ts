export type CampaignClaimState = "proposed" | "confirmed" | "unknown" | "not_applicable";
export interface CampaignEvent {
  id: string;
  field: string;
  value: string;
  state: CampaignClaimState;
  occurred_at: string;
  agreement_quote: string;
  intake: { source_id: string; source_version: number; source_quote: string; recorded_at?: string; source_created_at?: string };
}
export interface IntakeCampaign {
  id: string;
  brand: string;
  account: string;
  period: string;
  title: string;
  version: number;
  fields: Record<string, { agreement?: CampaignEvent; proposal?: CampaignEvent; unknown?: CampaignEvent }>;
  events: CampaignEvent[];
  updated_at?: string;
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export function isCampaignEvent(value: unknown): value is CampaignEvent {
  return object(value) && ["id", "field", "value", "occurred_at", "agreement_quote"].every(key => typeof value[key] === "string")
    && ["proposed", "confirmed", "unknown", "not_applicable"].includes(String(value.state))
    && object(value.intake) && typeof value.intake.source_id === "string" && value.intake.source_id.length > 0
    && Number.isSafeInteger(value.intake.source_version) && Number(value.intake.source_version) > 0 && typeof value.intake.source_quote === "string";
}
export function isIntakeCampaign(value: unknown): value is IntakeCampaign {
  return object(value) && ["id", "brand", "account", "period", "title"].every(key => typeof value[key] === "string")
    && Number.isSafeInteger(value.version) && Number(value.version) > 0 && object(value.fields)
    && Object.entries(value.fields).every(([field, claims]) => object(claims) && Object.entries(claims).every(([key, claim]) =>
      ["agreement", "proposal", "unknown"].includes(key) && isCampaignEvent(claim) && claim.field === field
      && (key === "agreement" ? ["confirmed", "not_applicable"].includes(claim.state) : claim.state === (key === "proposal" ? "proposed" : "unknown"))))
    && Array.isArray(value.events) && value.events.every(isCampaignEvent);
}
export function lastCampaignUpdate(item: IntakeCampaign): string | null {
  const values = [item.updated_at, ...item.events.map(event => event.intake.recorded_at)].filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)));
  return values.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
}
