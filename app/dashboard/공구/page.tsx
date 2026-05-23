import { dash } from "@/lib/dashboard-api";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmtWon(n: number | null | undefined): string {
  if (!n) return "—";
  return new Intl.NumberFormat("ko-KR").format(n) + "원";
}

function fmtMonthDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export default async function GonguDetailPage() {
  const data: any = await dash.gonguDetail();
  if (data?.error) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink p-6">
        <p>오류: {data.error}</p>
      </main>
    );
  }
  const items = data?.items || [];

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-6 border-b border-rule">
        <Link href="/dashboard" className="text-xs text-muted hover:opacity-70">
          ← 대시보드
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">공구</h1>
        <div className="flex gap-6 mt-2 text-sm">
          <span>
            <span className="text-muted">진행 </span>
            <span className="font-medium">{data.total}건</span>
          </span>
          <span>
            <span className="text-muted">총 매출 </span>
            <span
              className="font-medium"
              style={{ color: "var(--accent)" }}
            >
              {fmtWon(data.total_sales_won)}
            </span>
          </span>
        </div>
      </header>

      <div className="max-w-page mx-auto px-5 sm:px-8 py-6 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted">진행 중 공구 없음</p>
        ) : (
          items.map((it: any) => (
            <div
              key={it.file}
              className="rounded-lg p-4"
              style={{ border: "1px solid var(--border)" }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className="text-[11px] px-2 py-0.5 rounded-md font-semibold"
                  style={{
                    color:
                      it.audience === "한나"
                        ? "var(--accent-text)"
                        : "var(--secondary-text)",
                    backgroundColor:
                      it.audience === "한나"
                        ? "var(--accent-soft)"
                        : "var(--secondary-soft)",
                  }}
                >
                  {it.audience}
                </span>
                <span className="font-medium text-base">{it.brand}</span>
                <span className="text-xs text-muted">{it.state}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted">오픈</p>
                  <p className="font-medium">{fmtMonthDay(it.open_date)}</p>
                </div>
                <div>
                  <p className="text-muted">마감</p>
                  <p className="font-medium">{fmtMonthDay(it.close_date)}</p>
                </div>
                <div>
                  <p className="text-muted">콘텐츠</p>
                  <p className="font-medium">
                    릴스 {it.reels} · 숏 {it.shorts}
                  </p>
                </div>
                <div>
                  <p className="text-muted">실 매출</p>
                  <p
                    className="font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    {fmtWon(it.실_매출_원) || it.실_매출 || "—"}
                  </p>
                </div>
              </div>
              {it.수수료_퍼센트 && (
                <p className="text-xs text-muted mt-2">
                  수수료 {it.수수료_퍼센트} · 공구가 {it.공구가 || "—"}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
