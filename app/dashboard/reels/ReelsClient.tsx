"use client";

// 릴스 분석 대시보드 — 조회수순 리스트 + 계정 필터 + 전사상태 배지.
// 에디토리얼 톤(잉크/페이퍼/룰 라인) 유지. 메모(Step 2)는 이후 추가.
import { useMemo, useState } from "react";
import type {
  ReelItem,
  ReelsResponse,
  TranscriptionStatus,
} from "@/lib/dashboard-api";

type AccountFilter = "전체" | "한나" | "혜린";

const STATUS_META: Record<TranscriptionStatus, { label: string; tone: string }> = {
  ok: { label: "자막", tone: "#3a7d3a" },
  no_speech: { label: "말소리없음", tone: "#8a6d1a" },
  no_audio: { label: "오디오없음", tone: "#8a6d1a" },
  failed: { label: "전사실패", tone: "#b3261e" },
  unknown: { label: "미표기", tone: "#9a9a94" },
};

function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString("ko-KR");
}

function shorten(text: string, max = 22): string {
  const head = (text.split(" (")[0] || text).trim();
  return head.length > max ? `${head.slice(0, max)}…` : head;
}

interface ReelsClientProps {
  data: ReelsResponse | { error: string };
}

export default function ReelsClient({ data }: ReelsClientProps) {
  const isError = "error" in data;
  const all: ReelItem[] = isError ? [] : data.items;
  const [account, setAccount] = useState<AccountFilter>("전체");

  const filtered = useMemo(
    () => (account === "전체" ? all : all.filter((r) => r.account === account)),
    [account, all],
  );

  if (isError) {
    return (
      <main className="max-w-page mx-auto px-5 sm:px-8 py-16">
        <p style={{ color: "var(--color-muted)" }}>
          릴스 데이터를 불러오지 못했어요 — {data.error}
        </p>
      </main>
    );
  }

  const health = data.transcription_health;
  const failedCount = health.failed ?? 0;
  const filters: AccountFilter[] = ["전체", "한나", "혜린"];

  return (
    <main className="max-w-page mx-auto px-5 sm:px-8 py-8 sm:py-12">
      {/* 헤더 */}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            릴스 분석
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-muted)" }}>
            전체 {data.total}개 · 한나 {data.by_account.한나} · 혜린 {data.by_account.혜린}
          </p>
        </div>

        {/* 계정 필터 */}
        <div className="flex items-center gap-1 text-[13px]">
          {filters.map((f) => {
            const active = f === account;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setAccount(f)}
                className="px-3 py-1.5 rounded-lg transition"
                style={{
                  backgroundColor: active ? "var(--color-ink)" : "transparent",
                  color: active ? "var(--color-paper)" : "var(--color-muted)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </header>

      {/* 전사 상태 요약 */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[12px] border-y"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)" }}
      >
        <span>자막 상태</span>
        {(Object.keys(STATUS_META) as TranscriptionStatus[])
          .filter((s) => (health[s] ?? 0) > 0)
          .map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: STATUS_META[s].tone }}
              />
              {STATUS_META[s].label} {health[s]}
            </span>
          ))}
        {failedCount > 0 && (
          <span style={{ color: "#b3261e", fontWeight: 600 }}>
            ⚠️ 전사실패 {failedCount}개 — 재분석 필요
          </span>
        )}
      </div>

      {/* 리스트 */}
      <ol>
        {filtered.map((reel, i) => (
          <ReelRow key={reel.shortcode || reel.filename} reel={reel} rank={i + 1} />
        ))}
      </ol>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-[13px]" style={{ color: "var(--color-muted)" }}>
          표시할 릴스가 없어요.
        </p>
      )}
    </main>
  );
}

function ReelRow({ reel, rank }: { reel: ReelItem; rank: number }) {
  const status = STATUS_META[reel.transcription_status] ?? STATUS_META.unknown;

  return (
    <li
      className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 sm:gap-x-6 py-5 border-b"
      style={{ borderColor: "var(--color-rule)" }}
    >
      {/* 조회수 (스케일 대비의 주역) */}
      <div className="text-right tabular-nums">
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight leading-none">
          {formatViews(reel.views)}
        </div>
        <div className="mt-1 text-[11px]" style={{ color: "var(--color-muted)" }}>
          #{rank}
        </div>
      </div>

      {/* 본문 */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "var(--color-rule)", color: "var(--color-muted)" }}
          >
            {reel.account}
          </span>
          <h2 className="font-medium truncate">{reel.title}</h2>
        </div>

        {reel.hook && (
          <p
            className="mt-1.5 text-[14px] leading-snug line-clamp-2"
            style={{ color: "var(--color-ink)" }}
          >
            “{reel.hook}”
          </p>
        )}

        <div
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          {reel.hook_pattern && <span>훅 · {shorten(reel.hook_pattern)}</span>}
          {reel.cta_type && <span>CTA · {shorten(reel.cta_type)}</span>}
          <span>♥ {reel.likes.toLocaleString("ko-KR")}</span>
          <span>💬 {reel.comments.toLocaleString("ko-KR")}</span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: status.tone }}
            />
            {status.label}
          </span>
        </div>
      </div>

      {/* 링크 */}
      <div className="text-[13px] whitespace-nowrap">
        {reel.url && (
          <a
            href={reel.url}
            target="_blank"
            rel="noreferrer"
            className="underline-grow"
            style={{ color: "var(--color-muted)" }}
          >
            인스타 ↗
          </a>
        )}
      </div>
    </li>
  );
}
