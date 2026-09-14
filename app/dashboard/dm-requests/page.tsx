import type { Metadata } from "next";
import ConcernBoard from "../concerns/ConcernBoard";

export const metadata: Metadata = { title: "협업·일반 DM — 한나", robots: { index: false, follow: false } };
export default function DMRequestsPage() { return <ConcernBoard general />; }
