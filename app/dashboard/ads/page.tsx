import { dash } from "@/lib/dashboard-api";
import AdsManager from "./AdsManager";

export const dynamic = "force-dynamic";

export default async function AdsDetailPage() {
  const data: any = await dash.adsDetail();
  if (data?.error) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink p-6">
        <p>오류: {data.error}</p>
      </main>
    );
  }
  return (
    <AdsManager
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
