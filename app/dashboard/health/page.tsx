import { dash } from "@/lib/dashboard-api";
import HealthClient from "./HealthClient";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const data = await dash.watchHealth();
  return <HealthClient data={data} />;
}
