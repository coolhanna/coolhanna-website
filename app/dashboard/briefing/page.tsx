import { api } from "@/lib/dashboard-api";
import BriefingClient from "./BriefingClient";

export const dynamic = "force-dynamic";

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const data = await api<any>(`/api/dashboard/briefing${qs}`);
  return <BriefingClient data={data} />;
}
