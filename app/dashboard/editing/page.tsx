import type { Metadata } from "next";
import EditingTrainingBoard from "./EditingTrainingBoard";

export const metadata: Metadata = {
  title: "편집 자동화 학습",
  robots: { index: false, follow: false },
};

export default function EditingPage() {
  return <EditingTrainingBoard />;
}
