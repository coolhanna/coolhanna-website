import type { Metadata } from "next";
import { api } from "@/lib/dashboard-api";
import OpsClient, { type OpsResponse } from "./OpsClient";

export const metadata: Metadata = {
  title: "관제탑",
  robots: { index: false, follow: false },
};

// 판정 근거가 launchd 상태와 산출물 mtime이라 매번 새로 읽어야 한다.
// (API 쪽에 1분 캐시가 있어서 연타해도 부담은 없다)
export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const data = await api<OpsResponse>("/api/dashboard/ops");
  return <OpsClient data={data} />;
}
