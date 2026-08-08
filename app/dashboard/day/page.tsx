import { dash } from "@/lib/dashboard-api";
import LifeDayClient from "./LifeDayClient";

export const dynamic = "force-dynamic";

export default async function LifeDayPage() {
  const lifeToday = await dash.lifeLatest();
  return <LifeDayClient data={lifeToday} />;
}
