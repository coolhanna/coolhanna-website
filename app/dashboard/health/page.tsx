import { api } from "@/lib/dashboard-api";
import HealthClient from "./HealthClient";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const data = await api<any>("/api/dashboard/health-days?days=14");
  return <HealthClient data={data} />;
}
