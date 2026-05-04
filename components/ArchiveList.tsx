"use client";

import { useMemo, useState } from "react";
import type { Newsletter } from "@/lib/newsletters";
import { formatKoreanDate } from "@/lib/newsletters";

type Props = {
  items: Newsletter[];
};

export function ArchiveList({ items }: Props) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.excerpt.toLowerCase().includes(q),
        )
      : items;
    return [...base].sort((a, b) => (order === "newest" ? b.id - a.id : a.id - b.id));
  }, [items, query, order]);

  return (
    <div>
      <div className="mx-auto max-w-page px-5 sm:px-8 pb-8 sm:pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <label className="flex-1 group">
            <span className="block text-xs font-mono tracking-widest text-muted uppercase mb-2">
              검색
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목 또는 한 줄에서 찾기"
              className="w-full bg-transparent border-b border-ink py-2 text-lg sm:text-xl placeholder:text-muted/60 focus:outline-none focus:border-ink"
              aria-label="뉴스레터 검색"
            />
          </label>
          <div className="flex items-center gap-1 text-sm" role="group" aria-label="정렬">
            <button
              type="button"
              onClick={() => setOrder("newest")}
              className={`px-3 py-2 border ${order === "newest" ? "bg-ink text-paper border-ink" : "border-rule hover:border-ink"}`}
            >
              최신순
            </button>
            <button
              type="button"
              onClick={() => setOrder("oldest")}
              className={`px-3 py-2 border ${order === "oldest" ? "bg-ink text-paper border-ink" : "border-rule hover:border-ink"}`}
            >
              오래된순
            </button>
          </div>
        </div>
        <p className="mt-4 text-sm font-mono text-muted">
          {filtered.length} / {items.length}편
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-auto max-w-page px-5 sm:px-8 py-20 border-t border-rule">
          <p className="text-xl text-muted">‘{query}’에 해당하는 편지를 찾지 못했습니다.</p>
        </div>
      ) : (
        <ul>
          {filtered.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group block border-t border-rule transition-colors hover:bg-ink hover:text-paper"
              >
                <div className="mx-auto max-w-page px-5 sm:px-8 py-6 sm:py-8 grid grid-cols-12 gap-4 items-baseline">
                  <span className="col-span-2 sm:col-span-1 text-xs font-mono tracking-widest text-muted group-hover:text-paper/70">
                    {String(item.id).padStart(2, "0")}
                  </span>
                  <h3 className="col-span-10 sm:col-span-8 text-xl sm:text-2xl font-semibold tracking-tight text-balance">
                    {item.title}
                  </h3>
                  <span className="hidden sm:block sm:col-span-2 text-sm font-mono text-muted group-hover:text-paper/70 text-right">
                    {formatKoreanDate(item.date)}
                  </span>
                  <span className="hidden sm:flex sm:col-span-1 justify-end text-sm">
                    <span className="opacity-60 group-hover:opacity-100">읽기 →</span>
                  </span>
                  <p className="col-span-12 sm:col-span-10 sm:col-start-2 mt-2 text-sm sm:text-base text-muted group-hover:text-paper/80 leading-relaxed">
                    {item.excerpt}
                  </p>
                  <span className="col-span-12 sm:hidden mt-3 text-xs font-mono text-muted group-hover:text-paper/70">
                    {formatKoreanDate(item.date)}  ·  읽기 →
                  </span>
                </div>
              </a>
            </li>
          ))}
          <li className="border-t border-rule" aria-hidden />
        </ul>
      )}
    </div>
  );
}
