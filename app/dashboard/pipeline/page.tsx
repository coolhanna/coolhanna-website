import type { Metadata } from "next";
import PipelineBoard from "./PipelineBoard";

export const metadata: Metadata = {
  title: "콘텐츠 진행",
  robots: { index: false, follow: false },
};

export default function PipelinePage() {
  return <PipelineBoard />;
}
