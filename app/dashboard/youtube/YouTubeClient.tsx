"use client";

// 유튜브 탭 v2 (2026-08-07 한나: "업로드 기록만 나열하면 유튜브에 대해 뭐 알겠어") —
// 나열이 아니라 판단: 채널 진단 → 포맷×주제 성적표 → 구독자 → 영상별 판정·배운 것·다음 수.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { YouTubeTabResponse, YouTubeUpload } from "@/lib/dashboard-api";

const fmtInt = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString("ko-KR") : "-";
const fmtShort = (n: number | null | undefined) => {
  if (typeof n !== "number") return "-";
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만`;
  return n.toLocaleString("ko-KR");
};

const VERDICT_STYLE: Record<string, { bg: string; fg: string; border?: string }> = {
  대박: { bg: "var(--color-ink)", fg: "var(--color-paper)" },
  성공: { bg: "#3a7d3a", fg: "#fff" },
  평타: { bg: "var(--color-rule)", fg: "var(--color-muted)" },
  부진: { bg: "#f3ddda", fg: "#b3261e" },
  성장중: { bg: "transparent", fg: "var(--color-muted)", border: "1px dashed var(--color-rule)" },
};

type ListFilter = "전체" | "배운 것만" | "요리" | "교육";

export default function YouTubeClient({
  data,
}: {
  data: YouTubeTabResponse | { error: string };
}) {
  const router = useRouter();
  const isError = "error" in data;
  const [filter, setFilter] = useState<ListFilter>("배운 것만");

  const derived = useMemo(() => {
    if (isError) return null;
    const d = data as YouTubeTabResponse;
    const hist = (d.history ?? []).filter((h) => typeof h.followers === "number");
    const subDeltas = hist.slice(1).map((h, i) => ({
      date: h.date,
      delta: h.followers - hist[i].followers,
    }));
    return { subDeltas };
  }, [data, isError]);

  if (isError || !derived) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
          유튜브 데이터를 불러오지 못했어요: {(data as { error: string }).error}
        </p>
      </main>
    );
  }

  const d = data as YouTubeTabResponse;
  const uploads = d.uploads ?? [];
  const shown = uploads.filter((u) => {
    if (filter === "배운 것만") return !!u.learning;
    if (filter === "요리" || filter === "교육") return u.topic === filter;
    return true;
  });
  const bestCell = d.matrix?.reduce((m, c) => (c.median > (m?.median ?? 0) ? c : m), d.matrix[0]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20">
      <header className="flex items-end justify-between pt-6 pb-4">
        <div>
          <h1 className="text-xl font-semibold">유튜브</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            {d.display_name} · 지표 {d.date} · 매일 밤 자동 수집 · 달력은{" "}
            <a href="/dashboard/uploads" className="underline">업로드 탭</a>
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="px-3 py-1.5 rounded-lg text-[12px]"
          style={{ border: "1px solid var(--color-rule)", color: "var(--color-muted)" }}
        >
          ⟳ 새로고침
        </button>
      </header>

      {/* 🧭 채널 진단 — 이 채널을 한 문단으로 이해 */}
      {d.diagnosis && (
        <section
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          <p className="text-[11px] opacity-70 mb-1">🧭 채널 진단 · {d.diagnosis.updated}</p>
          <p className="text-[14px] font-semibold leading-snug">{d.diagnosis.headline}</p>
          <ul className="mt-2.5 space-y-1 text-[12px] opacity-90">
            {d.diagnosis.points.map((p) => (
              <li key={p} className="flex gap-1.5">
                <span className="shrink-0">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 space-y-1 text-[12px]" style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
            {d.diagnosis.next_moves.map((m) => (
              <p key={m} className="flex gap-1.5">
                <span className="shrink-0">→</span>
                <span>{m}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 포맷×주제 성적표 */}
      {d.matrix && d.matrix.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[13px] font-semibold mb-2">
            포맷 × 주제 성적표{" "}
            <span className="font-normal text-[11px]" style={{ color: "var(--color-muted)" }}>
              — 어디에 힘을 실을지 한 눈에 (중앙값 기준)
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden" style={{ backgroundColor: "var(--color-rule)" }}>
            {(["숏폼", "롱폼"] as const).flatMap((fmt) =>
              (["요리", "교육"] as const).map((tp) => {
                const c = d.matrix.find((m) => m.format === fmt && m.topic === tp);
                const isBest = c && bestCell && c.format === bestCell.format && c.topic === bestCell.topic;
                return (
                  <div
                    key={`${fmt}-${tp}`}
                    className="p-3"
                    style={{
                      backgroundColor: isBest
                        ? "color-mix(in srgb, #3a7d3a 12%, var(--color-paper))"
                        : "var(--color-paper)",
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12px] font-medium">
                        {fmt} · {tp} {isBest && "👑"}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                        {c ? `${c.n}개` : "없음"}
                      </span>
                    </div>
                    {c ? (
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-lg font-semibold tabular-nums">{fmtShort(c.median)}</span>
                        <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                          최고 {fmtShort(c.max)}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px]" style={{ color: "var(--color-muted)" }}>—</p>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </section>
      )}

      {/* 구독자 + 일별 증감 */}
      <section
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
      >
        <div className="flex items-end gap-2">
          <span className="text-3xl font-semibold tabular-nums leading-none">{fmtInt(d.subscribers)}</span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>구독자</span>
          {d.subscribers_change_1d !== 0 && (
            <span
              className="text-[13px] font-medium"
              style={{ color: d.subscribers_change_1d > 0 ? "#3a7d3a" : "#b3261e" }}
            >
              {d.subscribers_change_1d > 0 ? "▲" : "▼"}
              {fmtInt(Math.abs(d.subscribers_change_1d))}
            </span>
          )}
        </div>
        <SubDeltaBars deltas={derived.subDeltas} />
        {derived.subDeltas.length < 7 && (
          <p className="mt-1 text-[10px]" style={{ color: "var(--color-muted)" }}>
            구독자 일별 데이터는 8/3부터 축적 중 — 쌓일수록 "어떤 영상이 구독을 만들었나"가 보여요
          </p>
        )}
      </section>

      {/* 영상별 판정·배운 것 */}
      <section
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-[13px] font-semibold">영상별 판정 · 배운 것</h2>
          <div className="flex gap-1">
            {(["배운 것만", "전체", "요리", "교육"] as ListFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="text-[11px] px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: f === filter ? "var(--color-ink)" : "transparent",
                  color: f === filter ? "var(--color-paper)" : "var(--color-muted)",
                  border: f === filter ? "1px solid var(--color-ink)" : "1px solid var(--color-rule)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <ol className="space-y-3">
          {shown.map((v) => (
            <VideoAnalysisRow key={v.id} v={v} />
          ))}
        </ol>
        {shown.length === 0 && (
          <p className="py-8 text-center text-[12px]" style={{ color: "var(--color-muted)" }}>
            해당하는 영상이 없어요.
          </p>
        )}
      </section>
    </main>
  );
}

function VideoAnalysisRow({ v }: { v: YouTubeUpload }) {
  const vs = v.verdict ? VERDICT_STYLE[v.verdict] : null;
  return (
    <li className="text-[12px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-1.5 min-w-0">
          <span className="tabular-nums shrink-0 text-[11px]" style={{ color: "var(--color-muted)" }}>
            {v.upload_date.slice(5)}
          </span>
          {vs && v.verdict && (
            <span
              className="shrink-0 text-[10px] px-1 rounded font-medium"
              style={{ backgroundColor: vs.bg, color: vs.fg, border: vs.border ?? "none" }}
            >
              {v.verdict}
            </span>
          )}
          <span
            className="shrink-0 text-[10px] px-1 rounded"
            style={{
              backgroundColor: v.format === "숏폼" ? "var(--color-ink)" : "transparent",
              color: v.format === "숏폼" ? "var(--color-paper)" : "var(--color-muted)",
              border: v.format === "숏폼" ? "none" : "1px solid var(--color-rule)",
            }}
          >
            {v.format === "숏폼" ? "숏" : "롱"}
          </span>
          <span className="truncate font-medium">{v.title}</span>
        </span>
        <span className="tabular-nums shrink-0" style={{ color: "var(--color-muted)" }}>
          {fmtInt(v.views)}
          {typeof v.views_change_1d === "number" && v.views_change_1d > 0 && (
            <span style={{ color: "#3a7d3a" }}> +{fmtInt(v.views_change_1d)}</span>
          )}
        </span>
      </div>
      {v.learning && (
        <p className="mt-0.5 pl-9 text-[11px] leading-snug" style={{ color: "var(--color-muted)" }}>
          {v.learning}
          {v.next && (
            <span style={{ color: "var(--color-ink)" }}> → {v.next}</span>
          )}
        </p>
      )}
    </li>
  );
}

function SubDeltaBars({ deltas }: { deltas: Array<{ date: string; delta: number }> }) {
  const recent = deltas.slice(-14);
  if (recent.length < 1) return null;
  const W = 320;
  const H = 64;
  const PAD = 2;
  const maxAbs = Math.max(...recent.map((r) => Math.abs(r.delta)), 1);
  const zeroY = H - 12;
  const barW = (W - PAD * 2) / Math.max(recent.length, 7);
  const last = recent[recent.length - 1];
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-[11px]">
        <span style={{ color: "var(--color-muted)" }}>일별 구독자 증감</span>
        <span
          className="tabular-nums font-medium"
          style={{ color: last.delta >= 0 ? "#3a7d3a" : "#b3261e" }}
        >
          {last.date.slice(5)} · {last.delta >= 0 ? "+" : ""}{fmtInt(last.delta)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" style={{ height: 64 }} role="img"
        aria-label={`일별 구독자 증감, 마지막 ${last.delta >= 0 ? "+" : ""}${last.delta}명`}>
        {recent.map((r, i) => {
          const h = Math.max((Math.abs(r.delta) / maxAbs) * (zeroY - 14), r.delta === 0 ? 1 : 2);
          const up = r.delta >= 0;
          return (
            <rect
              key={r.date}
              x={PAD + i * barW + barW * 0.15}
              y={up ? zeroY - h : zeroY}
              width={barW * 0.7}
              height={h}
              rx={1.5}
              fill={up ? "#3a7d3a" : "#b3261e"}
              opacity={i === recent.length - 1 ? 1 : 0.55}
            >
              <title>{`${r.date.slice(5)} · ${up ? "+" : ""}${r.delta}`}</title>
            </rect>
          );
        })}
        <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="var(--color-rule)" strokeWidth="1" />
      </svg>
    </div>
  );
}
