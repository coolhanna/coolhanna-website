import { dash } from "@/lib/dashboard-api";
import GonguManager from "./GonguManager";

export const dynamic = "force-dynamic";

export default async function GonguDetailPage() {
  const data: any = await dash.gonguDetail();
  if (data?.error) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink p-6">
        <p>오류: {data.error}</p>
      </main>
    );
  }
  return (
    <GonguManager
      initial={{
        items: data?.items || [],
        total: data?.total || 0,
        total_sales_won: data?.total_sales_won || 0,
      }}
    />
  );
}
