import type { Metadata } from "next";
import { dash } from "@/lib/dashboard-api";
import PlanningBoard from "./PlanningBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "콘텐츠 기획",
  robots: { index: false, follow: false },
};

export default async function PlanningPage() {
  const [feed, decisions] = await Promise.all([
    dash.planningFeed(),
    dash.planningDecisions(),
  ]);

  return <PlanningBoard initialFeed={feed} initialDecisions={decisions} />;
}
