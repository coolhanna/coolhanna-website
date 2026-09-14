import type { Metadata } from "next";
import ConcernBoard from "./ConcernBoard";

export const metadata: Metadata = { title: "고민 DM — 한나", robots: { index: false, follow: false } };
export default function ConcernsPage() { return <ConcernBoard />; }
