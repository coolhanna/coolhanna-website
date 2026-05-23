import { dash } from "@/lib/dashboard-api";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmtWon(n: number): string {
  if (!n) return "—";
  return new Intl.NumberFormat("ko-KR").format(n) + "원";
}

export default async function RevenuePage() {
  const data: any = await dash.revenueMonthly();
  if (data?.error) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink p-6">
        <p>오류: {data.error}</p>
      </main>
    );
  }
  const months = data?.months || [];
  const grandTotal = months.reduce((s: number, m: any) => s + (m.total || 0), 0);
  const grandAd = months.reduce((s: number, m: any) => s + (m.ad || 0), 0);
  const grandGongu = months.reduce((s: number, m: any) => s + (m.gongu || 0), 0);
  const maxVal = Math.max(1, ...months.map((m: any) => m.total || 0));

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-6 border-b border-rule">
        <Link href="/dashboard" className="text-xs text-muted hover:opacity-70">
          ← 대시보드
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">매출</h1>
        <div className="mt-3">
          <p className="text-xs text-muted">전체 합계</p>
          <p
            className="font-serif text-3xl sm:text-4xl tracking-tight"
            style={{ color: "var(--accent)" }}
          >
            {fmtWon(grandTotal)}
          </p>
        </div>
        <div className="flex gap-6 mt-2 text-sm">
          <span>
            <span className="text-muted">광고 </span>
            <span className="font-medium">{fmtWon(grandAd)}</span>
          </span>
          <span>
            <span className="text-muted">공구 </span>
            <span className="font-medium">{fmtWon(grandGongu)}</span>
          </span>
        </div>
      </header>

      <div className="max-w-page mx-auto px-5 sm:px-8 py-6">
        {months.length === 0 ? (
          <p className="text-sm text-muted">집계 가능한 데이터 없음</p>
        ) : (
          <div className="space-y-3">
            {months.map((m: any) => {
              const ratio = (m.total / maxVal) * 100;
              const adRatio = m.total ? (m.ad / m.total) * 100 : 0;
              return (
                <div
                  key={m.month}
                  className="rounded-lg p-3"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-medium text-base">{m.month}</span>
                    <span
                      className="font-medium text-sm"
                      style={{ color: "var(--accent)" }}
                    >
                      {fmtWon(m.total)}
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden flex"
                    style={{ backgroundColor: "var(--bg-card-soft)", width: `${ratio}%` }}
                  >
                    <div
                      style={{
                        width: `${adRatio}%`,
                        backgroundColor: "var(--accent)",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "var(--secondary)",
                      }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-muted mt-1.5">
                    <span>
                      <span
                        className="inline-block w-2 h-2 rounded mr-1"
                        style={{ backgroundColor: "var(--accent)" }}
                      />
                      광고 {fmtWon(m.ad)}
                    </span>
                    <span>
                      <span
                        className="inline-block w-2 h-2 rounded mr-1"
                        style={{ backgroundColor: "var(--secondary)" }}
                      />
                      공구 {fmtWon(m.gongu)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
