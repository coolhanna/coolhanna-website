import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "한나 인사이트 현황판 — 쿨한나",
  robots: { index: false, follow: false },
};

export default function InsightsDashboardPage() {
  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-xs text-muted hover:opacity-70">
              ← 운영 대시보드
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">한나 인사이트 현황판</h1>
          </div>
          <a
            href="/dashboard/insights/static/index.html"
            target="_blank"
            className="rounded-md px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            새 창으로 열기
          </a>
        </header>
        <iframe
          title="한나 인사이트 현황판"
          src="/dashboard/insights/static/index.html"
          className="h-[calc(100vh-92px)] w-full rounded-xl border"
          style={{ borderColor: "var(--border)", backgroundColor: "#f7f6f0" }}
        />
      </div>
    </main>
  );
}
