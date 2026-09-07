import { api } from "@/lib/dashboard-api";
import HealthClient from "./HealthClient";
import type { HealthDaysResponse } from "./HealthClient";
import { intakeLinkedDate } from "@/lib/intake-types";

export const dynamic = "force-dynamic";

export default async function HealthPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const date = intakeLinkedDate(params.date);
  const data = await api<HealthDaysResponse>(`/api/dashboard/health-days?days=14${date ? `&end=${date}` : ""}`);
  return <HealthClient key={date || "current"} data={data} linkedDate={date} />;
}
