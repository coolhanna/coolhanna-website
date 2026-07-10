import type { Metadata } from "next";
import ThoughtsBoard from "./ThoughtsBoard";

export const metadata: Metadata = {
  title: "생각",
  robots: { index: false, follow: false },
};

export default function ThoughtsPage() {
  return <ThoughtsBoard />;
}
