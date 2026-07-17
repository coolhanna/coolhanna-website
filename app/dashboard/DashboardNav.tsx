"use client";

// 대시보드 상단 공유 탭 — 여기가 유일한 탭 정의(단일 출처).
// 진행(파이프라인)은 원래 별도 앱이라 탭이 따로 놀고 주소창까지 떴는데,
// 2026-07-17에 /dashboard/pipeline 으로 합쳐서 여기 한 곳만 고치면 전부 반영된다.
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "운영", href: "/dashboard" },
  { label: "큐레이션", href: "/dashboard/curation" },
  { label: "릴스", href: "/dashboard/reels" },
  { label: "벤치마크", href: "/dashboard/reels-benchmark" },
  { label: "생각", href: "/dashboard/thoughts" },
  { label: "건강", href: "/dashboard/health" },
  { label: "진행", href: "/dashboard/pipeline" },
];

export default function DashboardNav() {
  const path = usePathname() || "";
  if (path.startsWith("/dashboard/login")) return null;

  return (
    <nav className="max-w-page mx-auto px-5 sm:px-8 pt-3 pb-1 flex items-center gap-1 text-[13px]">
      {TABS.map((t) => {
        const active =
          t.href === "/dashboard"
            ? path === "/dashboard"
            : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className="px-3 py-1.5 rounded-lg transition"
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
