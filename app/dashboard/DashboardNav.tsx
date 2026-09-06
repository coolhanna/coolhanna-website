"use client";

// 대시보드 상단 공유 탭 — 여기가 유일한 탭 정의(단일 출처).
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "주간 다이어리", href: "/dashboard/diary" },
  { label: "한나 데스크", href: "/dashboard/desk" },
  { label: "운영", href: "/dashboard/operations" },
  { label: "브리핑", href: "/dashboard/briefing" },
  { label: "하루", href: "/dashboard/day" },
  { label: "큐레이션", href: "/dashboard/curation" },
  { label: "기획", href: "/dashboard/planning" },
  { label: "제품", href: "/dashboard/products" },
  { label: "릴스", href: "/dashboard/reels" },
  { label: "벤치마크", href: "/dashboard/reels-benchmark" },
  { label: "유튜브", href: "/dashboard/youtube" },
  { label: "업로드", href: "/dashboard/uploads" },
  { label: "산 것", href: "/dashboard/purchases" },
  { label: "먹은 것", href: "/dashboard/meals" },
  { label: "생각", href: "/dashboard/thoughts" },
  { label: "건강", href: "/dashboard/health" },
  { label: "콘텐츠 진행", href: "/dashboard/pipeline" },
  { label: "혜린", href: "/dashboard/hyerin" },
  { label: "광고", href: "/dashboard/ads" },
  { label: "공구", href: "/dashboard/gongu" },
  { label: "매출", href: "/dashboard/revenue" },
  { label: "인사이트", href: "/dashboard/insights" },
  { label: "관제탑", href: "/dashboard/ops" },
];

export default function DashboardNav() {
  const path = usePathname() || "";
  if (path.startsWith("/dashboard/login")) return null;

  const diary = path === "/dashboard/diary";
  const primary = diary ? TABS.filter(t => ["/dashboard/diary", "/dashboard/desk", "/dashboard/planning"].includes(t.href)) : TABS;

  return (
    <nav className="max-w-page mx-auto px-2 sm:px-5 pt-3 pb-2 flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[11px] sm:text-[12px] whitespace-nowrap">
      {primary.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className="px-1.5 sm:px-2 py-1.5 rounded-lg transition shrink-0"
            style={{
              backgroundColor: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              fontWeight: active ? 600 : 400,
            }}
          >
            {t.label}
          </Link>
        );
      })}
      {diary && (
        <details className="relative ml-auto">
          <summary className="cursor-pointer px-3 py-2 rounded-lg">전체 도구</summary>
          <div className="absolute right-0 top-full z-40 grid grid-cols-2 gap-1 p-3 rounded-xl border border-rule bg-white shadow-lg min-w-64">
            {TABS.filter(t => !primary.includes(t)).map(t => (
              <Link key={t.href} href={t.href} className="px-3 py-2 rounded-lg hover:bg-paper">{t.label}</Link>
            ))}
          </div>
        </details>
      )}
    </nav>
  );
}
