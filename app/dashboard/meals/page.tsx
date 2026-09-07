import { dash } from "@/lib/dashboard-api";
import MealsCalendarClient from "./MealsCalendarClient";
import { intakeLinkedDate } from "@/lib/intake-types";

export const dynamic = "force-dynamic";

export default async function MealsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const date = intakeLinkedDate(params.date);
  const data = await dash.foodCalendar(date?.slice(0, 7));
  return <MealsCalendarClient key={date || "current"} initial={data} linkedDate={date} />;
}
