import type { Metadata } from "next";
import ShortsOpsBoard from "./ShortsOpsBoard";

export const metadata: Metadata = {
  title: "숏폼 운영실",
  robots: { index: false, follow: false },
};

export default function ShortsOpsPage() {
  return <ShortsOpsBoard />;
}
