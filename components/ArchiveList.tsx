"use client";

import { useMemo, useState } from "react";
import type { Newsletter } from "@/lib/newsletters";
import { NewsletterCard } from "@/components/NewsletterCard";

type Props = {
  items: Newsletter[];
};

export function ArchiveList({ items }: Props) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter((i) => i.title.toLowerCase().includes(q))
      : items;
    return order === "newest" ? base : [...base].reverse();
  }, [items, query, order]);

  return (
    <div>
      <div className="mx-auto max-w-page px-5 sm:px-8 pb-10 sm:pb-14">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <label className="flex-1 group">
            <span className="block text-xs font-mono tracking-widest text-muted uppercase mb-2">
              검색
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목으로 찾기"
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
        <ul className="mx-auto max-w-page px-5 sm:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 sm:gap-y-14">
          {filtered.map((item) => (
            <li key={item.illustration}>
              <NewsletterCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
