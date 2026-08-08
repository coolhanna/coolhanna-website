import { dash } from "@/lib/dashboard-api";
import LifeDayClient from "./LifeDayClient";

export const dynamic = "force-dynamic";

export default async function LifeDayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const [lifeDay, lifeDays] = await Promise.all([
    date ? dash.lifeDay(date) : dash.lifeLatest(),
    dash.lifeDays(),
  ]);
  return <LifeDayClient data={lifeDay} days={"error" in lifeDays ? [] : lifeDays.days} />;
}
