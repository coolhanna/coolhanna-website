import type { Metadata } from "next";
import CurationBoard from "./CurationBoard";

export const metadata: Metadata = {
  title: "큐레이션 인풋함",
  robots: { index: false, follow: false },
};

export default async function CurationPage({ searchParams }: { searchParams: Promise<{ card?: string }> }) {
  const { card } = await searchParams;
  return <CurationBoard linkedCardId={typeof card === "string" && card.length <= 256 ? card : undefined} />;
}
