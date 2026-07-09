import type { Metadata } from "next";
import ReelsBenchmarkBoard from "./ReelsBenchmarkBoard";

export const metadata: Metadata = {
  title: "릴스 벤치마크",
  robots: { index: false, follow: false },
};

export default function ReelsBenchmarkPage() {
  return <ReelsBenchmarkBoard />;
}
