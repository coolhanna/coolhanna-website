import type { Metadata } from "next";
import ResearchResult from "../ResearchResult";

export const metadata: Metadata = { title: "메모에서 이어진 조사 — 한나", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function IntakeResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResearchResult id={id} />;
}
