"use client";

// 유튜브 전용 탭 (2026-08-07 한나: "완전히 분리") — 스튜디오 안 들어가고 여기서 다 본다.
// 구성: 구독자+일별 증감 → 업로드 리듬(주/월) → 업로드 달력 → 성장 연결 → 영상 목록.
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { YouTubeTabResponse, YouTubeUpload } from "@/lib/dashboard-api";

const fmtInt = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString("ko-KR") : "-";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(s: string): Date {
  return new Date(`${s}T00:00:00+09:00`);
}

/** 월요일 시작 주의 첫날 (YYYY-MM-DD) */
function weekStart(d: Date): string {
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getTime() - day * DAY_MS);
  return monday.toISOString().slice(0, 10);
}

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
    const uploads = d.uploads ?? [];

    // 날짜별 업로드 (달력용)
    const byDate = new Map<string, YouTubeUpload[]>();
    for (const u of uploads) {
      const arr = byDate.get(u.upload_date) ?? [];
      arr.push(u);
      byDate.set(u.upload_date, arr);
    }

    // 월별 집계 (최신 월 먼저)
    const byMonth = new Map<string, { 숏폼: number; 롱폼: number }>();
    for (const u of uploads) {
      const m = u.upload_date.slice(0, 7);
      const cnt = byMonth.get(m) ?? { 숏폼: 0, 롱폼: 0 };
      cnt[u.format] += 1;
      byMonth.set(m, cnt);
    }
    const months = [...byMonth.keys()].sort().reverse();

    // 주간 리듬 — 이번 주 / 지난주
    const now = new Date();
    const thisWeek = weekStart(now);
    const lastWeek = weekStart(new Date(now.getTime() - 7 * DAY_MS));
    const countWeek = (ws: string) =>
      uploads.filter((u) => weekStart(toDate(u.upload_date)) === ws).length;

    // 구독자 일별 증감
    const hist = (d.history ?? []).filter((h) => typeof h.followers === "number");
    const subDeltas = hist.slice(1).map((h, i) => ({
      date: h.date,
      delta: h.followers - hist[i].followers,
    }));

    return { uploads, byDate, byMonth, months, thisWeekN: countWeek(thisWeek), lastWeekN: countWeek(lastWeek), subDeltas };
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
  const top5 = [...derived.uploads]
    .filter((u) => typeof u.views === "number")
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20">
      <header className="flex items-end justify-between pt-6 pb-4">
        <div>
          <h1 className="text-xl font-semibold">유튜브</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            {d.display_name} · 지표 {d.date} · 매일 밤 자동 수집
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

      {/* 구독자 + 일별 증감 */}
      <section
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
      >
        <div className="flex items-end gap-2">
          <span className="text-3xl font-semibold tabular-nums leading-none">
            {fmtInt(d.subscribers)}
          </span>
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
            구독자 일별 데이터는 8/3부터 축적 중 — 쌓일수록 "어떤 영상이 구독을 만들었나"가 여기서 보여요
          </p>
        )}
      </section>

      {/* 업로드 리듬 */}
      <section className="grid grid-cols-3 gap-px rounded-xl overflow-hidden mb-4" style={{ backgroundColor: "var(--color-rule)" }}>
        {[
          { label: "이번 주", value: derived.thisWeekN },
          { label: "지난주", value: derived.lastWeekN },
          {
            label: "이번 달",
            value:
              (derived.byMonth.get(new Date().toISOString().slice(0, 7))?.숏폼 ?? 0) +
              (derived.byMonth.get(new Date().toISOString().slice(0, 7))?.롱폼 ?? 0),
          },
        ].map((s) => (
          <div key={s.label} className="p-3 text-center" style={{ backgroundColor: "var(--color-paper)" }}>
            <div className="text-xl font-semibold tabular-nums">{s.value}</div>
            <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>{s.label} 업로드</div>
          </div>
        ))}
      </section>

      <p className="text-[11px] mb-4" style={{ color: "var(--color-muted)" }}>
        업로드 달력은 <a href="/dashboard/uploads" className="underline">업로드 탭</a>에서 — 릴스와 통합해서 한 판으로 보여요
      </p>

      {/* 조회수 TOP 5 */}
      <section
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
      >
        <h2 className="text-[13px] font-semibold mb-2">조회수 TOP 5</h2>
        <ol className="space-y-1.5">
          {top5.map((v, i) => (
            <VideoRow key={v.id} v={v} rank={i + 1} />
          ))}
        </ol>
      </section>

      {/* 전체 업로드 목록 (최신순) */}
      <section
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
      >
        <h2 className="text-[13px] font-semibold mb-2">업로드 기록 <span className="font-normal text-[11px]" style={{ color: "var(--color-muted)" }}>({derived.uploads.length}개, 최신순)</span></h2>
        <ol className="space-y-1.5">
          {derived.uploads.map((v) => (
            <VideoRow key={v.id} v={v} withDate />
          ))}
        </ol>
      </section>
    </main>
  );
}

function FormatDot({ format }: { format: "숏폼" | "롱폼" }) {
  return (
    <span
      className="shrink-0 text-[10px] px-1 rounded"
      style={{
        backgroundColor: format === "숏폼" ? "var(--color-ink)" : "transparent",
        color: format === "숏폼" ? "var(--color-paper)" : "var(--color-muted)",
        border: format === "숏폼" ? "none" : "1px solid var(--color-rule)",
      }}
    >
      {format === "숏폼" ? "숏" : "롱"}
    </span>
  );
}

function VideoRow({ v, rank, withDate }: { v: YouTubeUpload; rank?: number; withDate?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-[12px]">
      <span className="flex items-baseline gap-1.5 min-w-0">
        {rank && <span className="tabular-nums shrink-0" style={{ color: "var(--color-muted)" }}>{rank}.</span>}
        {withDate && (
          <span className="tabular-nums shrink-0 text-[11px]" style={{ color: "var(--color-muted)" }}>
            {v.upload_date.slice(5)}
          </span>
        )}
        <FormatDot format={v.format} />
        <span className="truncate">{v.title}</span>
      </span>
      <span className="tabular-nums shrink-0" style={{ color: "var(--color-muted)" }}>
        {fmtInt(v.views)}
        {typeof v.views_change_1d === "number" && v.views_change_1d > 0 && (
          <span style={{ color: "#3a7d3a" }}> +{fmtInt(v.views_change_1d)}</span>
        )}
      </span>
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
