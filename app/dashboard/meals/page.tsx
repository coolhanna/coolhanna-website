import { dash } from "@/lib/dashboard-api";
import MealsCalendarClient from "./MealsCalendarClient";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  const data = await dash.foodCalendar();
  return <MealsCalendarClient initial={data} />;
}
