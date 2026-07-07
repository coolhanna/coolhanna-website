"use client";

// 릴스 "분석" 대시보드 — 나열이 아니라: 뭐가 왜 터졌나(훅패턴별 성과), 추이(게시일순),
// 개별 심층(구조·바이럴요인·대본·적용포인트). 계정 필터는 모든 집계에 반영됨.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReelItem, ReelsResponse } from "@/lib/dashboard-api";

type AccountFilter = "전체" | "한나" | "혜린";
type SortKey = "latest" | "views" | "engagement";

const SORT_LABEL: Record<SortKey, string> = {
  latest: "최신순",
  views: "조회순",
  engagement: "참여율순",
};

// 성과 판정 칩 색 — 계정 베이스라인 백분위 기반 (reels-monitor v2가 산출)
const VERDICT_STYLE: Record<string, { bg: string; fg: string }> = {
  대박: { bg: "var(--color-ink)", fg: "var(--color-paper)" },
  성공: { bg: "#3a7d3a", fg: "#fff" },
  평타: { bg: "var(--color-rule)", fg: "var(--color-muted)" },
  부진: { bg: "#f3ddda", fg: "#b3261e" },
};

// 콘텐츠 유형 딱지 — 무채색 텍스트만 (한나: 눈에 띌 필요 없음)
const CONTENT_TYPES = new Set(["공구", "광고"]);

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
  avgViews: number;   // 단일 계정 모드: 평균 조회수
  avgMult: number;    // 전체 모드: 자기 계정 평균 대비 배수 (규모가 다른 두 계정을 공정 비교)
  avgEng: number;
}
interface Aggregate {
  n: number;
  avgViews: number;
  avgEng: number;
  hookPerf: HookPerf[];
  best: ReelItem | null;
  acctAvg: Map<string, number>; // 계정별 평균 (전체 모드 KPI 분리 표기용)
  mixed: boolean;
}

function aggregate(items: ReelItem[], mixed: boolean): Aggregate | null {
  const n = items.length;
  if (!n) return null;
  const avgViews = Math.round(items.reduce((s, r) => s + r.views, 0) / n);
  const avgEng = Math.round((items.reduce((s, r) => s + r.engagement_rate, 0) / n) * 100) / 100;

  // 계정별 평균 — 한나/혜린은 규모가 달라 생평균 비교가 거짓말이 됨
  const acctAvg = new Map<string, number>();
  for (const acct of ["한나", "혜린"]) {
    const g = items.filter((r) => r.account === acct);
    if (g.length) acctAvg.set(acct, g.reduce((s, r) => s + r.views, 0) / g.length);
  }
  const mult = (r: ReelItem) => r.views / (acctAvg.get(r.account) || r.views || 1);

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
      avgMult: Math.round((g.reduce((s, r) => s + mult(r), 0) / g.length) * 10) / 10,
      avgEng: Math.round((g.reduce((s, r) => s + r.engagement_rate, 0) / g.length) * 100) / 100,
    }))
    .sort((a, b) => (mixed ? b.avgMult - a.avgMult : b.avgViews - a.avgViews));

  const best = items.reduce((m, r) => (r.views > m.views ? r : m), items[0]);
  return { n, avgViews, avgEng, hookPerf, best, acctAvg, mixed };
}

interface ReelsClientProps {
  data: ReelsResponse | { error: string };
}

export default function ReelsClient({ data }: ReelsClientProps) {
  const isError = "error" in data;
  const all: ReelItem[] = isError ? [] : data.items;
  const router = useRouter();
  const [account, setAccount] = useState<AccountFilter>("전체");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [visualOnly, setVisualOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1500);
  };

  const visualCount = useMemo(() => all.filter((r) => r.has_visual).length, [all]);
  const filtered = useMemo(() => {
    let rows = account === "전체" ? all : all.filter((r) => r.account === account);
    if (visualOnly) rows = rows.filter((r) => r.has_visual);
    return rows;
  }, [account, visualOnly, all]);
  const agg = useMemo(() => aggregate(filtered, account === "전체"), [filtered, account]);
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
            {visualCount > 0 && ` · 🎬 장면분석 ${visualCount}개`}
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
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-2 px-3 py-1.5 rounded-lg transition"
            style={{
              border: "1px solid var(--color-rule)",
              color: "var(--color-muted)",
              opacity: refreshing ? 0.5 : 1,
            }}
            title="최신 데이터 다시 불러오기"
          >
            {refreshing ? "⟳ 갱신 중…" : "⟳ 새로고침"}
          </button>
        </div>
      </header>

      {agg && (
        <>
          <KpiRow agg={agg} />
          <HookPerformance
            rows={agg.hookPerf}
            mixed={agg.mixed}
            top={agg.mixed ? agg.hookPerf[0]?.avgMult ?? 1 : agg.hookPerf[0]?.avgViews ?? 1}
          />
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
        {visualCount > 0 && (
          <button
            type="button"
            onClick={() => setVisualOnly((v) => !v)}
            className="ml-auto text-[12px] px-2.5 py-1 rounded-md transition"
            style={{
              backgroundColor: visualOnly ? "var(--color-ink)" : "transparent",
              color: visualOnly ? "var(--color-paper)" : "var(--color-muted)",
              border: visualOnly ? "1px solid var(--color-ink)" : "1px solid var(--color-rule)",
            }}
          >
            🎬 장면분석만
          </button>
        )}
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
  // 전체 모드에선 두 계정 규모가 달라 생평균이 거짓말 → 계정별로 쪼개 표기
  const hanna = agg.acctAvg.get("한나");
  const hyerin = agg.acctAvg.get("혜린");
  const avgCell =
    agg.mixed && hanna && hyerin
      ? { label: "평균 조회수 (계정별)", value: `${fmtViews(Math.round(hanna))} · ${fmtViews(Math.round(hyerin))}`, sub: "한나 · 혜린 — 계정 규모가 달라 분리 표기" }
      : { label: "평균 조회수", value: fmtViews(agg.avgViews), sub: "" };
  const cells = [
    { label: "릴스", value: fmtInt(agg.n), sub: "개" },
    avgCell,
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

function HookPerformance({ rows, mixed, top }: { rows: HookPerf[]; mixed: boolean; top: number }) {
  // 표본 2개 이상만 = 의미있는 인사이트 (단발 대박 제외)
  const meaningful = rows.filter((r) => r.count >= 2).slice(0, 6);
  if (meaningful.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">훅 패턴별 평균 성과</h2>
        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
          {mixed
            ? "자기 계정 평균 대비 배수 — 두 계정 규모가 달라 배수로 비교 (표본 2개↑)"
            : "어떤 훅이 잘 먹히나 (표본 2개↑)"}
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {meaningful.map((r, i) => {
          const value = mixed ? r.avgMult : r.avgViews;
          return (
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
                    width: `${Math.max(12, (value / top) * 100)}%`,
                    backgroundColor: i === 0 ? "var(--color-ink)" : "#c9c9c2",
                    color: i === 0 ? "var(--color-paper)" : "var(--color-ink)",
                  }}
                >
                  {mixed ? `×${r.avgMult}` : fmtViews(r.avgViews)}
                </div>
              </div>
              <div className="w-12 shrink-0 text-right text-[11px] tabular-nums" style={{ color: "var(--color-muted)" }}>
                {r.avgEng}%
              </div>
            </div>
          );
        })}
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
            {reel.shares != null ? `공유 ${fmtInt(reel.shares)}` : `참여 ${reel.engagement_rate}%`}
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
            {reel.verdict && VERDICT_STYLE[reel.verdict] && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded shrink-0 font-semibold"
                style={{
                  backgroundColor: VERDICT_STYLE[reel.verdict].bg,
                  color: VERDICT_STYLE[reel.verdict].fg,
                }}
              >
                {reel.verdict}
              </span>
            )}
            {CONTENT_TYPES.has(reel.content_type) && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded shrink-0"
                style={{ border: "1px solid var(--color-rule)", color: "var(--color-muted)" }}
              >
                {reel.content_type}
              </span>
            )}
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
            {reel.has_visual && <span style={{ color: "var(--color-ink)", fontWeight: 500 }}>🎬 장면분석</span>}
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
      {/* 조회수 추이 + 공유 — 제일 중요한 두 지표라 크게 (한나 지침) */}
      <div
        className="rounded-xl px-4 py-3 flex flex-wrap items-end gap-x-6 gap-y-2"
        style={{ border: "1.5px solid var(--color-ink)" }}
      >
        <TrajectoryCell label="D+1" value={reel.views_d1} />
        <span className="pb-1" style={{ color: "var(--color-muted)" }}>→</span>
        <TrajectoryCell label="D+3" value={reel.views_d3} />
        <span className="pb-1" style={{ color: "var(--color-muted)" }}>→</span>
        <TrajectoryCell label="D+7" value={reel.views_d7} />
        <span className="pb-1" style={{ color: "var(--color-muted)" }}>·</span>
        <TrajectoryCell label="지금" value={reel.views} />
        <div className="ml-auto text-right">
          <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>공유 / 저장</div>
          <div className="text-xl font-semibold tabular-nums leading-tight">
            {reel.shares != null ? fmtInt(reel.shares) : "—"}
            <span className="text-[13px] font-normal" style={{ color: "var(--color-muted)" }}>
              {" / "}{reel.saves != null ? fmtInt(reel.saves) : "—"}
            </span>
          </div>
          {reel.shares == null && (
            <div className="text-[10px]" style={{ color: "var(--color-muted)" }}>인사이트 수집 대기</div>
          )}
        </div>
      </div>

      {/* 보조 지표 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]" style={{ color: "var(--color-muted)" }}>
        <span>♥ {fmtInt(reel.likes)}</span>
        <span>💬 {fmtInt(reel.comments)}</span>
        <span title="(좋아요+댓글)÷조회수 — 공유·저장은 인스타 비공개라 미포함">
          참여율 {reel.engagement_rate}% (♥+💬÷조회)
        </span>
        {reel.duration_sec > 0 && <span>{reel.duration_sec}초</span>}
        {reel.music && <span>♪ {reel.music}</span>}
        {reel.url && (
          <a href={reel.url} target="_blank" rel="noreferrer" className="underline-grow" style={{ color: "var(--color-ink)" }}>
            인스타에서 보기 ↗
          </a>
        )}
      </div>

      {/* 🧭 성과 판정 (v2) */}
      {reel.verdict_reason && (
        <div>
          <h4 className="font-semibold mb-1">
            🧭 성과 판정{reel.verdict ? `: ${reel.verdict}` : ""}
          </h4>
          <p>{reel.verdict_reason}</p>
        </div>
      )}

      {/* 🎯 주제 평가 (v2.2) — 소재 자체가 통했나 */}
      {reel.topic_verdict && (
        <div>
          <h4 className="font-semibold mb-1">🎯 주제 평가{reel.topic ? `: ${reel.topic}` : ""}</h4>
          <p>{reel.topic_verdict}</p>
        </div>
      )}

      {/* 🔁 다음 변주 훅 — 이 대시보드의 존재 이유 (v2) */}
      {reel.next_hooks.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
          <h4 className="font-semibold mb-2">🔁 다음 영상용 변주 훅</h4>
          <ol className="space-y-1.5 list-decimal pl-5">
            {reel.next_hooks.map((h, i) => (
              <li key={i}>“{h}”</li>
            ))}
          </ol>
          {reel.formula && (
            <p className="mt-3 text-[12px] opacity-80">공식: {reel.formula}</p>
          )}
        </div>
      )}

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

      {/* ✅/❌ 좋았던 것 · 아쉬운 것 (v2.2) */}
      {(reel.good.length > 0 || reel.bad.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {reel.good.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">✅ 좋았던 것</h4>
              <ul className="space-y-1.5 list-disc pl-5">
                {reel.good.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {reel.bad.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">❌ 아쉬운 것</h4>
              <ul className="space-y-1.5 list-disc pl-5">
                {reel.bad.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 성과 요인 (구버전 노트) */}
      {reel.good.length === 0 && reel.bad.length === 0 && reel.viral_factors.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">🔥 성과 요인 — 왜 이 결과가 나왔나</h4>
          <ul className="space-y-1.5 list-disc pl-5">
            {reel.viral_factors.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 🎬 Codex 장면(비주얼) 분석 — 릴스는 비주얼이 절반이라 성과요인 바로 옆에 */}
      {reel.visual && reel.visual.sections.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "#f3f0e9", border: "1px solid var(--color-rule)" }}>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-semibold">🎬 장면 분석</h4>
            <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
              {reel.visual.author}
            </span>
            <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
              프레임 캡처 기반 화면 분석
            </span>
          </div>
          <div className="grid gap-4">
            {reel.visual.sections.map((s, i) => (
              <div key={i}>
                <h5 className="text-[13px] font-semibold mb-1">{s.title}</h5>
                <VisualContent text={s.content} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💬 댓글 반응 (v2) */}
      {reel.comment_insight && (
        <div>
          <h4 className="font-semibold mb-1">💬 댓글이 말해주는 것</h4>
          <VisualContent text={reel.comment_insight} />
        </div>
      )}

      {/* 📈 트렌드 적합도 (v2) */}
      {reel.trend_fit && (
        <div>
          <h4 className="font-semibold mb-1">📈 트렌드 적합도</h4>
          <p>{reel.trend_fit}</p>
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

      {/* 📝 내 메모 — 한나의 피드백 창구. 사이드카 저장이라 재분석에도 안 날아감 */}
      <MemoBox shortcode={reel.shortcode} initial={reel.memo} />
    </div>
  );
}

function TrajectoryCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>{label}</div>
      <div className="text-xl font-semibold tabular-nums leading-tight">
        {value != null ? fmtViews(value) : "—"}
      </div>
    </div>
  );
}

function MemoBox({ shortcode, initial }: { shortcode: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    setStatus("saving");
    try {
      const r = await fetch("/api/dashboard/proxy/reels/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortcode, memo: text }),
      });
      setStatus(r.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div>
      <h4 className="font-semibold mb-1">📝 내 메모</h4>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="이 릴스에 대한 내 생각, 다음에 해볼 것…"
        rows={3}
        className="w-full rounded-lg p-3 text-[13px] resize-y"
        style={{ border: "1px solid var(--color-rule)", backgroundColor: "var(--color-paper)" }}
      />
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="text-[12px] px-3 py-1.5 rounded-lg font-medium transition"
          style={{
            backgroundColor: "var(--color-ink)",
            color: "var(--color-paper)",
            opacity: status === "saving" ? 0.4 : 1,
          }}
        >
          {status === "saving" ? "저장 중…" : "메모 저장"}
        </button>
        {status === "saved" && <span className="text-[12px]" style={{ color: "#3a7d3a" }}>✓ 저장됨</span>}
        {status === "error" && <span className="text-[12px]" style={{ color: "#b3261e" }}>저장 실패 — 다시 시도</span>}
      </div>
    </div>
  );
}

// 비주얼 노트 섹션 본문 렌더 — 마크다운 파이프 표는 실제 표로, 나머지는 문단으로.
function VisualContent({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="grid gap-2 text-[12.5px] leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const isTable =
          lines.length >= 2 &&
          lines.every((l) => l.includes("|")) &&
          /^[\s|:-]+$/.test(lines[1]);
        if (isTable) {
          const rows = lines
            .filter((l, idx) => idx !== 1)
            .map((l) => l.split("|").map((c) => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === "") && !(idx === arr.length - 1 && c === "")));
          const [head, ...body] = rows;
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr>
                    {head.map((c, ci) => (
                      <th key={ci} className="text-left font-semibold py-1 pr-3 border-b" style={{ borderColor: "var(--color-rule)" }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td key={ci} className="align-top py-1 pr-3 border-b" style={{ borderColor: "var(--color-rule)" }}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        // 불릿 리스트
        if (lines.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((l, li) => (
                <li key={li}>{l.replace(/^\s*-\s*/, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}
