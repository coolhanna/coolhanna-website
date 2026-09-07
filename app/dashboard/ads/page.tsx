import { dash } from "@/lib/dashboard-api";
import AdsManager from "./AdsManager";
import IntakeCases from "./IntakeCases";

export const dynamic = "force-dynamic";

export default async function AdsDetailPage({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const params = await searchParams;
  const selectedCaseId = typeof params.case === "string" && params.case.length <= 256 ? params.case : undefined;
  const data: any = await dash.adsDetail();
  if (data?.error) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink p-6">
        <IntakeCases selectedCaseId={selectedCaseId} />
        <p>기존 광고 카드를 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.</p>
      </main>
    );
  }
  return (
    <AdsManager
      selectedCaseId={selectedCaseId}
      initial={{
        items: data?.items || [],
        total: data?.total || 0,
        total_amount_won: data?.total_amount_won || 0,
        unpaid_count: data?.unpaid_count || 0,
        unpaid_amount_won: data?.unpaid_amount_won || 0,
      }}
    />
  );
}
