"use client";

// 릴스 "분석" 대시보드 — 나열이 아니라: 뭐가 왜 터졌나(훅패턴별 성과), 추이(게시일순),
// 개별 심층(구조·바이럴요인·대본·적용포인트). 계정 필터는 모든 집계에 반영됨.
import { useMemo, useState } from "react";
import type { ReelItem, ReelsResponse } from "@/lib/dashboard-api";

type AccountFilter = "전체" | "한나" | "혜린";
type SortKey = "latest" | "views" | "engagement";

const SORT_LABEL: Record<SortKey, string> = {
  latest: "최신순",
  views: "조회순",
  engagement: "참여율순",
};

function fmtViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString("ko-KR");
}
function fmtInt(n: number): string {
  return n.toLocaleString("ko-KR");
}

interface HookPerf {
  label: string;
  count: number;
  avgViews: number;
  avgEng: number;
}
interface Aggregate {
  n: number;
  avgViews: number;
  avgEng: number;
  hookPerf: HookPerf[];
  best: ReelItem | null;
}

function aggregate(items: ReelItem[]): Aggregate | null {
  const n = items.length;
  if (!n) return null;
  const avgViews = Math.round(items.reduce((s, r) => s + r.views, 0) / n);
  const avgEng = Math.round((items.reduce((s, r) => s + r.engagement_rate, 0) / n) * 100) / 100;

  const buckets = new Map<string, ReelItem[]>();
  for (const r of items) {
    const k = r.hook_pattern_short || "미분류";
    const g = buckets.get(k);
    if (g) g.push(r);
    else buckets.set(k, [r]);
  }
  const hookPerf: HookPerf[] = [...buckets.entries()]
    .map(([label, g]) => ({
      label,
      count: g.length,
      avgViews: Math.round(g.reduce((s, r) => s + r.views, 0) / g.length),
      avgEng: Math.round((g.reduce((s, r) => s + r.engagement_rate, 0) / g.length) * 100) / 100,
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  const best = items.reduce((m, r) => (r.views > m.views ? r : m), items[0]);
  return { n, avgViews, avgEng, hookPerf, best };
}

interface ReelsClientProps {
  data: ReelsResponse | { error: string };
}

export default function ReelsClient({ data }: ReelsClientProps) {
  const isError = "error" in data;
  const all: ReelItem[] = isError ? [] : data.items;
  const [account, setAccount] = useState<AccountFilter>("전체");
  const [sortKey, setSortKey] = useState<SortKey>("latest");

  const filtered = useMemo(
    () => (account === "전체" ? all : all.filter((r) => r.account === account)),
    [account, all],
  );
  const agg = useMemo(() => aggregate(filtered), [filtered]);
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortKey === "views") arr.sort((a, b) => b.views - a.views);
    else if (sortKey === "engagement") arr.sort((a, b) => b.engagement_rate - a.engagement_rate);
    else arr.sort((a, b) => (b.posted_at || "").localeCompare(a.posted_at || ""));
    return arr;
  }, [filtered, sortKey]);

  if (isError) {
    return (
      <main className="max-w-page mx-auto px-5 sm:px-8 py-16">
        <p style={{ color: "var(--color-muted)" }}>릴스 데이터를 불러오지 못했어요 — {data.error}</p>
      </main>
    );
  }

  const accounts: AccountFilter[] = ["전체", "한나", "혜린"];

  return (
    <main className="max-w-page mx-auto px-5 sm:px-8 py-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">릴스 분석</h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-muted)" }}>
            게시된 릴스 {all.length}개를 훅·구조·성과로 분석
          </p>
        </div>
        <div className="flex items-center gap-1 text-[13px]">
          {accounts.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setAccount(f)}
              className="px-3 py-1.5 rounded-lg transition"
              style={{
                backgroundColor: f === account ? "var(--color-ink)" : "transparent",
                color: f === account ? "var(--color-paper)" : "var(--color-muted)",
                fontWeight: f === account ? 600 : 400,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {agg && (
        <>
          <KpiRow agg={agg} />
          <HookPerformance rows={agg.hookPerf} topViews={agg.hookPerf[0]?.avgViews ?? 1} />
          <TrendChart items={filtered} />
        </>
      )}

      {/* 정렬 컨트롤 */}
      <div className="flex items-center gap-2 pt-8 pb-1">
        <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
          정렬
        </span>
        {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSortKey(k)}
            className="text-[12px] px-2.5 py-1 rounded-md transition"
            style={{
              backgroundColor: k === sortKey ? "var(--color-ink)" : "transparent",
              color: k === sortKey ? "var(--color-paper)" : "var(--color-muted)",
              border: k === sortKey ? "1px solid var(--color-ink)" : "1px solid var(--color-rule)",
            }}
          >
            {SORT_LABEL[k]}
          </button>
        ))}
      </div>

      <ol>
        {sorted.map((reel, i) => (
          <ReelRow key={reel.shortcode || i} reel={reel} rank={i + 1} sortKey={sortKey} />
        ))}
      </ol>

      {sorted.length === 0 && (
        <p className="py-16 text-center text-[13px]" style={{ color: "var(--color-muted)" }}>
          표시할 릴스가 없어요.
        </p>
      )}
    </main>
  );
}

function KpiRow({ agg }: { agg: Aggregate }) {
  const cells = [
    { label: "릴스", value: fmtInt(agg.n), sub: "개" },
    { label: "평균 조회수", value: fmtViews(agg.avgViews), sub: "" },
    { label: "평균 참여율", value: `${agg.avgEng}%`, sub: "좋아요+댓글÷조회" },
    { label: "최고 조회", value: agg.best ? fmtViews(agg.best.views) : "-", sub: agg.best?.title ?? "" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl overflow-hidden" style={{ backgroundColor: "var(--color-rule)" }}>
      {cells.map((c) => (
        <div key={c.label} className="p-4" style={{ backgroundColor: "var(--color-paper)" }}>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
            {c.label}
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{c.value}</div>
          {c.sub && (
            <div className="mt-0.5 text-[11px] truncate" style={{ color: "var(--color-muted)" }}>
              {c.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HookPerformance({ rows, topViews }: { rows: HookPerf[]; topViews: number }) {
  // 표본 2개 이상만 = 의미있는 인사이트 (단발 대박 제외)
  const meaningful = rows.filter((r) => r.count >= 2).slice(0, 6);
  if (meaningful.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">훅 패턴별 평균 성과</h2>
        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
          어떤 훅이 잘 먹히나 (표본 2개↑)
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {meaningful.map((r, i) => (
          <div key={r.label} className="flex items-center gap-3">
            <div className="w-28 sm:w-36 shrink-0 text-[13px] truncate" title={r.label}>
              {r.label}
              <span className="ml-1 text-[11px]" style={{ color: "var(--color-muted)" }}>
                ·{r.count}
              </span>
            </div>
            <div className="flex-1 h-6 rounded" style={{ backgroundColor: "var(--color-rule)" }}>
              <div
                className="h-6 rounded flex items-center justify-end pr-2 text-[11px] font-medium tabular-nums"
                style={{
                  width: `${Math.max(12, (r.avgViews / topViews) * 100)}%`,
                  backgroundColor: i === 0 ? "var(--color-ink)" : "#c9c9c2",
                  color: i === 0 ? "var(--color-paper)" : "var(--color-ink)",
                }}
              >
                {fmtViews(r.avgViews)}
              </div>
            </div>
            <div className="w-12 shrink-0 text-right text-[11px] tabular-nums" style={{ color: "var(--color-muted)" }}>
              {r.avgEng}%
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendChart({ items }: { items: ReelItem[] }) {
  const series = useMemo(
    () =>
      [...items]
        .filter((r) => r.posted_at)
        .sort((a, b) => (a.posted_at || "").localeCompare(b.posted_at || "")),
    [items],
  );
  if (series.length < 4) return null;

  const maxViews = Math.max(...series.map((r) => r.views), 1);
  const W = 100;
  const H = 34;
  const gap = 0.6;
  const bw = (W - gap * (series.length - 1)) / series.length;
  // 편차가 커서(7천~126만) sqrt 스케일로 작은 릴스도 보이게
  const scale = (v: number) => Math.sqrt(v / maxViews) * H;

  // 최근/이전 참여율(나이에 안 휘둘리는 지표) 비교
  const win = Math.min(10, Math.floor(series.length / 2));
  const recent = series.slice(-win);
  const prev = series.slice(-2 * win, -win);
  const avg = (arr: ReelItem[]) => (arr.length ? arr.reduce((s, r) => s + r.engagement_rate, 0) / arr.length : 0);
  const rEng = avg(recent);
  const pEng = prev.length ? avg(prev) : rEng;
  const engDelta = Math.round((rEng - pEng) * 100) / 100;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">게시일순 추이</h2>
        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
          최근 {win}개 참여율 {engDelta >= 0 ? "▲" : "▼"} {Math.abs(engDelta)}%p vs 이전
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-3 w-full h-24" role="img" aria-label="게시일순 조회수 추이">
        {series.map((r, i) => {
          const h = scale(r.views);
          return (
            <rect
              key={r.shortcode || i}
              x={i * (bw + gap)}
              y={H - h}
              width={bw}
              height={h}
              fill={r.account === "혜린" ? "#b58a5e" : "var(--color-ink)"}
              opacity={0.85}
            >
              <title>{`${r.posted_date} · ${r.account} · ${fmtViews(r.views)}회 · 참여 ${r.engagement_rate}%\n${r.title}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px]" style={{ color: "var(--color-muted)" }}>
        <span>{series[0].posted_date}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: "var(--color-ink)" }} /> 한나
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: "#b58a5e" }} /> 혜린
          </span>
        </span>
        <span>{series[series.length - 1].posted_date}</span>
      </div>
    </section>
  );
}

function ReelRow({ reel, rank, sortKey }: { reel: ReelItem; rank: number; sortKey: SortKey }) {
  const [open, setOpen] = useState(false);
  const failed = reel.transcription_status === "failed";

  return (
    <li className="border-b" style={{ borderColor: "var(--color-rule)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 sm:gap-x-6 py-4"
      >
        <div className="text-right tabular-nums">
          <div className="text-xl sm:text-2xl font-semibold tracking-tight leading-none">
            {fmtViews(reel.views)}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: "var(--color-muted)" }}>
            참여 {reel.engagement_rate}%
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: "var(--color-rule)", color: "var(--color-muted)" }}
            >
              {reel.account}
            </span>
            <h3 className="font-medium truncate">{reel.title}</h3>
          </div>
          {reel.hook && (
            <p className="mt-1 text-[13px] leading-snug line-clamp-2">“{reel.hook}”</p>
          )}
          <div
            className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]"
            style={{ color: "var(--color-muted)" }}
          >
            <span>{reel.posted_date || "-"}</span>
            {reel.hook_pattern_short && <span>훅 · {reel.hook_pattern_short}</span>}
            {reel.has_transcript && <span>대본 있음</span>}
            {failed && <span style={{ color: "#b3261e" }}>⚠️ 전사실패</span>}
          </div>
        </div>

        <div className="text-[12px] whitespace-nowrap self-center" style={{ color: "var(--color-muted)" }}>
          {open ? "닫기 ▲" : "분석 ▾"}
        </div>
      </button>

      {open && <ReelDetail reel={reel} />}
    </li>
  );
}

function ReelDetail({ reel }: { reel: ReelItem }) {
  return (
    <div className="pb-6 pl-0 sm:pl-[4.5rem] grid gap-5 text-[13px] leading-relaxed">
      {/* 지표 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]" style={{ color: "var(--color-muted)" }}>
        <span>조회 {fmtInt(reel.views)}</span>
        <span>♥ {fmtInt(reel.likes)}</span>
        <span>💬 {fmtInt(reel.comments)}</span>
        <span>참여율 {reel.engagement_rate}%</span>
        {reel.url && (
          <a href={reel.url} target="_blank" rel="noreferrer" className="underline-grow" style={{ color: "var(--color-ink)" }}>
            인스타에서 보기 ↗
          </a>
        )}
      </div>

      {/* 구조 */}
      {reel.structure.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">구조</h4>
          <ol className="space-y-2">
            {reel.structure.map((s, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr] gap-3">
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded h-fit whitespace-nowrap"
                  style={{ backgroundColor: "var(--color-rule)" }}
                >
                  {s.section} · {s.duration}초
                </span>
                <span>{s.content}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 바이럴 요인 */}
      {reel.viral_factors.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">🔥 왜 터졌나 (바이럴 요인)</h4>
          <ul className="space-y-1.5 list-disc pl-5">
            {reel.viral_factors.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 한나 적용 포인트 */}
      {reel.applicable && (
        <div>
          <h4 className="font-semibold mb-1">💡 내 채널 적용 포인트</h4>
          <p>{reel.applicable}</p>
        </div>
      )}

      {/* 주의점 */}
      {reel.warning && (
        <div>
          <h4 className="font-semibold mb-1">⚠️ 주의점</h4>
          <p style={{ color: "var(--color-muted)" }}>{reel.warning}</p>
        </div>
      )}

      {/* 대본 */}
      {reel.has_transcript ? (
        <div>
          <h4 className="font-semibold mb-1">🎤 대본 (Whisper 전사)</h4>
          <p className="whitespace-pre-wrap p-3 rounded-lg text-[12.5px]" style={{ backgroundColor: "var(--color-rule)" }}>
            {reel.transcript}
          </p>
        </div>
      ) : (
        <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
          대본 없음 {reel.transcription_status === "failed" ? "(전사 실패 — 재분석 필요)" : "(음악/무음성 영상이거나 옛 분석)"}
        </p>
      )}
    </div>
  );
}
