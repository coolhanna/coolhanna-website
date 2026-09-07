import type { Metadata } from "next";
import { journalToday } from "@/lib/journal";
import DiaryBoard from "./DiaryBoard";
import { initialHomeView } from "./home-model";

export const metadata: Metadata = {
  title: "오늘, 한나 — 함께 쓰는 다이어리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DiaryPage({ searchParams }: { searchParams: Promise<{ entry?: string }> }) {
  const { entry } = await searchParams;
  return <DiaryBoard today={journalToday()} initialView={initialHomeView()} entryId={typeof entry === "string" && entry.length <= 256 ? entry : undefined} />;
}
