import type { Metadata } from "next";
import { journalToday } from "@/lib/journal";
import DiaryBoard from "./DiaryBoard";

export const metadata: Metadata = {
  title: "함께 쓰는 다이어리 — 한나",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function DiaryPage() {
  return <DiaryBoard today={journalToday()} />;
}
