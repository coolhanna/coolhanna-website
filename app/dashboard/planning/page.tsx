import type { Metadata } from "next";
import { dash } from "@/lib/dashboard-api";
import PlanningBoard from "./PlanningBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "콘텐츠 기획",
  robots: { index: false, follow: false },
};

export default async function PlanningPage() {
  const [candidate, decisions] = await Promise.all([
    dash.planningCandidate(),
    dash.planningDecisions(),
  ]);

  return <PlanningBoard initialCandidate={candidate} initialDecisions={decisions} />;
}
