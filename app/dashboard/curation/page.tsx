import type { Metadata } from "next";
import CurationBoard from "./CurationBoard";

export const metadata: Metadata = {
  title: "큐레이션 인풋함",
  robots: { index: false, follow: false },
};

// Phase 1: 프로토타입(목데이터). Phase 2에서 Vault/FastAPI 연결 시 server fetch로 교체.
export default function CurationPage() {
  return <CurationBoard />;
}
