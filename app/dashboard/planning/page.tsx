import type { Metadata } from "next";
import { dash } from "@/lib/dashboard-api";
import PlanningBoard from "./PlanningBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "콘텐츠 기획",
  robots: { index: false, follow: false },
};

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [feed, decisions, saved, params] = await Promise.all([
    dash.planningFeed(),
    dash.planningDecisions(),
    dash.planningSaved(),
    searchParams,
  ]);

  const view = params.view === "saved" ? "saved" : "feed";
  return <PlanningBoard key={view} initialFeed={feed} initialDecisions={decisions} initialSaved={saved} initialView={view} />;
}
