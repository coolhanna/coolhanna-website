"use client";

// 대시보드 상단 공유 탭 — 여기가 유일한 탭 정의(단일 출처).
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "한나 데스크", href: "/dashboard/desk" },
  { label: "운영", href: "/dashboard" },
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
];

export default function DashboardNav() {
  const path = usePathname() || "";
  if (path.startsWith("/dashboard/login")) return null;

  return (
    <nav className="max-w-page mx-auto px-2 sm:px-5 pt-3 pb-2 flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[11px] sm:text-[12px] whitespace-nowrap">
      {TABS.map((t) => {
        const active =
          t.href === "/dashboard"
            ? path === "/dashboard"
            : path === t.href || path.startsWith(t.href + "/");
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
    </nav>
  );
}
