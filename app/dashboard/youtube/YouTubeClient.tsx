"use client";

// 유튜브 탭 v3 (2026-08-07 한나: "숏폼만, 릴스 포맷으로 제대로") —
// 숏폼(7월 요리 전환 이후)만 다룬다. 영상마다 심층 분석(판정·인스타 대비·제목·변주 훅)을 펼쳐 본다.
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

export default function YouTubeClient({
  data,
}: {
  data: YouTubeTabResponse | { error: string };
}) {
  const router = useRouter();
  const isError = "error" in data;

  const derived = useMemo(() => {
    if (isError) return null;
    const d = data as YouTubeTabResponse;
    const hist = (d.history ?? []).filter((h) => typeof h.followers === "number");
    const subDeltas = hist.slice(1).map((h, i) => ({
      date: h.date,
      delta: h.followers - hist[i].followers,
    }));
    const cohort = d.matrix?.find((m) => m.format === "숏폼" && m.topic === "요리") ?? null;
    return { subDeltas, cohort };
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

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20">
      <header className="flex items-end justify-between pt-6 pb-4">
        <div>
          <h1 className="text-xl font-semibold">유튜브 — 요리 숏폼·미드폼</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            {d.display_name} · 지표 {d.date} · 달력은{" "}
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

      {/* 🧭 채널 진단 */}
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
          <div
            className="mt-3 pt-2 space-y-1 text-[12px]"
            style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}
          >
            {d.diagnosis.next_moves.map((m) => (
              <p key={m} className="flex gap-1.5">
                <span className="shrink-0">→</span>
                <span>{m}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 구독자 + 코호트 기준 */}
      <section
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
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
          {derived.cohort && (
            <p className="text-[11px] tabular-nums" style={{ color: "var(--color-muted)" }}>
              판정 기준: 요리 숏폼 {derived.cohort.n}개 · 중앙값 {fmtShort(derived.cohort.median)} · 최고{" "}
              {fmtShort(derived.cohort.max)}
            </p>
          )}
        </div>
        <SubDeltaBars deltas={derived.subDeltas} />
        {derived.subDeltas.length < 7 && (
          <p className="mt-1 text-[10px]" style={{ color: "var(--color-muted)" }}>
            구독자 일별 데이터는 8/3부터 축적 중
          </p>
        )}
      </section>

      {/* 영상별 심층 분석 */}
      <section>
        <h2 className="text-[13px] font-semibold mb-2">
          영상별 분석{" "}
          <span className="font-normal text-[11px]" style={{ color: "var(--color-muted)" }}>
            ({uploads.length}개 · 최신순 · 눌러서 펼치기)
          </span>
        </h2>
        <ol className="space-y-2">
          {uploads.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </ol>
      </section>
    </main>
  );
}

function VideoCard({ v }: { v: YouTubeUpload }) {
  const [open, setOpen] = useState(false);
  const vs = v.verdict ? VERDICT_STYLE[v.verdict] : null;
  const a = v.analysis;
  return (
    <li
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-3"
        aria-expanded={open}
      >
        <div className="flex items-baseline justify-between gap-3 text-[12px]">
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
            {v.format === "미드폼" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white shrink-0" style={{ backgroundColor: "#7A5AC0" }}>
                미드폼
              </span>
            )}
            <span className="truncate font-medium">{v.title}</span>
          </span>
          <span className="tabular-nums shrink-0" style={{ color: "var(--color-muted)" }}>
            {fmtInt(v.views)}
            {typeof v.views_change_1d === "number" && v.views_change_1d > 0 && (
              <span style={{ color: "#3a7d3a" }}> +{fmtInt(v.views_change_1d)}</span>
            )}
            <span className="ml-1.5">{open ? "▾" : "▸"}</span>
          </span>
        </div>
        {!open && v.learning && (
          <p className="mt-1 text-[11px] leading-snug truncate" style={{ color: "var(--color-muted)" }}>
            {v.learning}
          </p>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 text-[12px]" style={{ borderTop: "1px solid var(--color-rule)" }}>
          {a?.verdict_line && (
            <Block h="🧭 판정">{a.verdict_line}</Block>
          )}
          {a?.ig_compare && (
            <Block h="🆚 인스타 대비 (같은 영상, 다른 플랫폼)">{a.ig_compare}</Block>
          )}
          {a?.title_review && <Block h="✍️ 제목 (유튜브의 훅)">{a.title_review}</Block>}
          {a && a.good.length > 0 && (
            <Block h="✅ 좋았던 것">
              {a.good.map((g) => (
                <p key={g}>• {g}</p>
              ))}
            </Block>
          )}
          {a && a.bad.length > 0 && (
            <Block h="❌ 아쉬운 것">
              {a.bad.map((b) => (
                <p key={b}>• {b}</p>
              ))}
            </Block>
          )}
          {a && a.next_hooks.length > 0 && (
            <Block h="🔁 다음 변주 훅">
              {a.next_hooks.map((hk) => (
                <p key={hk}>• {hk}</p>
              ))}
            </Block>
          )}
          {(v.learning || v.next) && (
            <Block h="💡 배운 것 → 다음 수">
              {v.learning}
              {v.next && <span style={{ color: "var(--color-ink)", fontWeight: 500 }}> → {v.next}</span>}
            </Block>
          )}
          {!a && (
            <p className="pt-2 text-[11px]" style={{ color: "var(--color-muted)" }}>
              심층 분석 생성 중 — 분석이 끝나면 여기 채워져요.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Block({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <p className="text-[11px] font-semibold mb-0.5">{h}</p>
      <div className="leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {children}
      </div>
    </div>
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
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 w-full"
        style={{ height: 64 }}
        role="img"
        aria-label={`일별 구독자 증감, 마지막 ${last.delta >= 0 ? "+" : ""}${last.delta}명`}
      >
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
