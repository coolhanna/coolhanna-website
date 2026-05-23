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

export default async function AdsDetailPage() {
  const data: any = await dash.adsDetail();
  if (data?.error) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink p-6">
        <p>오류: {data.error}</p>
      </main>
    );
  }
  const items = data?.items || [];
  const active = items.filter((i: any) => i.state !== "입금완료" && i.state !== "종료");
  const done = items.filter((i: any) => i.state === "입금완료" || i.state === "종료");

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-6 border-b border-rule">
        <Link href="/dashboard" className="text-xs text-muted hover:opacity-70">
          ← 대시보드
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">광고</h1>
        <div className="flex gap-6 mt-2 text-sm">
          <span>
            <span className="text-muted">전체 </span>
            <span className="font-medium">{data.total}건</span>
          </span>
          <span>
            <span className="text-muted">미입금 </span>
            <span
              className="font-medium"
              style={{ color: "var(--danger)" }}
            >
              {fmtWon(data.unpaid_amount_won)} ({data.unpaid_count}건)
            </span>
          </span>
          <span>
            <span className="text-muted">총액 </span>
            <span className="font-medium">{fmtWon(data.total_amount_won)}</span>
          </span>
        </div>
      </header>

      <div className="max-w-page mx-auto px-5 sm:px-8 py-6 space-y-6">
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--accent)" }}>
            진행 중 ({active.length})
          </h2>
          <div className="space-y-2">
            {active.map((it: any) => (
              <AdRow key={it.file} item={it} />
            ))}
            {active.length === 0 && (
              <p className="text-sm text-muted">없음</p>
            )}
          </div>
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 text-muted">
              완료 ({done.length})
            </h2>
            <div className="space-y-2">
              {done.map((it: any) => (
                <AdRow key={it.file} item={it} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function AdRow({ item }: { item: any }) {
  const unpaid = item.state !== "입금완료" && item.amount_won;
  return (
    <div
      className="rounded-lg p-3 flex flex-wrap items-center gap-3"
      style={{ border: "1px solid var(--border)" }}
    >
      <span
        className="text-[11px] px-2 py-0.5 rounded-md font-semibold"
        style={{
          color: item.audience === "한나" ? "var(--accent-text)" : "var(--secondary-text)",
          backgroundColor:
            item.audience === "한나" ? "var(--accent-soft)" : "var(--secondary-soft)",
        }}
      >
        {item.audience}
      </span>
      <span className="font-medium flex-1 min-w-[200px]">{item.label}</span>
      <span className="text-xs text-muted">{item.state}</span>
      <span className="text-xs">업로드 {fmtMonthDay(item.upload_deadline)}</span>
      <span
        className="text-xs"
        style={{ color: unpaid ? "var(--danger)" : "var(--text-secondary)" }}
      >
        입금 {fmtMonthDay(item.payment_date)}
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>
        {fmtWon(item.amount_won)}
      </span>
    </div>
  );
}
