"use client";

// 대시보드 상단 공유 탭 — 운영 / 큐레이션 / 파이프라인. 창 하나로 통일.
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "운영", href: "/dashboard" },
  { label: "큐레이션", href: "/dashboard/curation" },
  { label: "릴스", href: "/dashboard/reels" },
  { label: "벤치마크", href: "/dashboard/reels-benchmark" },
  { label: "생각", href: "/dashboard/thoughts" },
];

const PIPELINE_URL = "https://coolhanna-pipeline.vercel.app";

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
      <a
        href={PIPELINE_URL}
        className="px-3 py-1.5 rounded-lg transition hover:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        진행 ↗
      </a>
    </nav>
  );
}
