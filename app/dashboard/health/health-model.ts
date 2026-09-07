import { intakeLinkedDate } from "../../../lib/intake-types.ts";

export interface HannaObservation {
  id: string;
  date: string;
  text: string;
  score: number | null;
  intake: { source_id: string };
}

export function readHannaObservations(value: unknown, date: string): { observations: HannaObservation[]; invalid: boolean } {
  if (value === undefined || value === null) return { observations: [], invalid: false };
  if (!Array.isArray(value)) return { observations: [], invalid: true };
  const observations = value.filter((item): item is HannaObservation => item && typeof item === "object"
    && typeof item.id === "string" && item.id.length > 0 && intakeLinkedDate(item.date) === date && typeof item.text === "string"
    && (item.score === null || (typeof item.score === "number" && Number.isFinite(item.score)))
    && item.intake && typeof item.intake === "object" && typeof item.intake.source_id === "string" && item.intake.source_id.length > 0);
  return { observations, invalid: observations.length !== value.length };
}
