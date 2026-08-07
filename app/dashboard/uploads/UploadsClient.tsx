"use client";

// 통합 업로드 캘린더 (2026-08-07 한나: "업로드는 릴스도 숏폼도 한번에 볼 수 있어야지")
// — 한 달을 한 판으로: 릴스 3계정 + 유튜브 숏/롱이 색으로 구분된 칩으로 날짜 위에 얹힌다.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { UploadEntry, UploadSource, UploadsResponse } from "@/lib/dashboard-api";

const SOURCE_STYLE: Record<UploadSource, { bg: string; fg: string; border?: string }> = {
  한나: { bg: "var(--color-ink)", fg: "var(--color-paper)" },
  가족먹거리: { bg: "#3a7d3a", fg: "#fff" },
  혜린: { bg: "#7c5cbf", fg: "#fff" },
  YT숏: { bg: "#cc0000", fg: "#fff" },
  YT롱: { bg: "transparent", fg: "#cc0000", border: "1.5px solid #cc0000" },
};
const SOURCE_ORDER: UploadSource[] = ["한나", "가족먹거리", "혜린", "YT숏", "YT롱"];

function fmtViews(n: number | null): string {
  if (typeof n !== "number") return "·";
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function UploadsClient({
  data,
}: {
  data: UploadsResponse | { error: string };
}) {
  const router = useRouter();
  const isError = "error" in data;
  const uploads = isError ? [] : (data as UploadsResponse).uploads;

  const now = new Date();
  const [month, setMonth] = useState(ym(now)); // YYYY-MM

  const { byDate, monthCounts, monthList } = useMemo(() => {
    const byDate = new Map<string, UploadEntry[]>();
    const monthsSet = new Set<string>();
    for (const u of uploads) {
      monthsSet.add(u.date.slice(0, 7));
      const arr = byDate.get(u.date) ?? [];
      arr.push(u);
      byDate.set(u.date, arr);
    }
    for (const arr of byDate.values())
      arr.sort((a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source));
    const counts = new Map<UploadSource, number>();
    for (const u of uploads.filter((u) => u.date.startsWith(month)))
      counts.set(u.source, (counts.get(u.source) ?? 0) + 1);
    return { byDate, monthCounts: counts, monthList: [...monthsSet].sort() };
  }, [uploads, month]);

  const shift = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(ym(new Date(y, m - 1 + delta, 1)));
  };
  const canPrev = monthList.length > 0 && month > monthList[0];
  const canNext = month < ym(now);
  const monthTotal = [...monthCounts.values()].reduce((s, n) => s + n, 0);

  if (isError) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
          업로드 데이터를 불러오지 못했어요: {(data as { error: string }).error}
        </p>
      </main>
    );
  }

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const leadBlank = (new Date(y, m - 1, 1).getDay() + 6) % 7; // 월요일 시작
  const todayStr = `${ym(now)}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-6 pb-4">
        <div>
          <h1 className="text-xl font-semibold">업로드 캘린더</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            릴스 3계정 + 유튜브 숏·롱을 한 판에 · 칩 숫자는 현재 조회수
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

      {/* 월 이동 + 월 합계 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={!canPrev}
            className="w-8 h-8 rounded-lg text-[14px]"
            style={{ border: "1px solid var(--color-rule)", opacity: canPrev ? 1 : 0.3 }}
            aria-label="이전 달"
          >
            ◀
          </button>
          <span className="text-[15px] font-semibold tabular-nums w-28 text-center">
            {y}년 {m}월
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            disabled={!canNext}
            className="w-8 h-8 rounded-lg text-[14px]"
            style={{ border: "1px solid var(--color-rule)", opacity: canNext ? 1 : 0.3 }}
            aria-label="다음 달"
          >
            ▶
          </button>
          {month !== ym(now) && (
            <button
              type="button"
              onClick={() => setMonth(ym(now))}
              className="px-2.5 py-1 rounded-lg text-[12px]"
              style={{ border: "1px solid var(--color-rule)", color: "var(--color-muted)" }}
            >
              오늘
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span style={{ color: "var(--color-muted)" }}>이달 {monthTotal}개:</span>
          {SOURCE_ORDER.map((s) => {
            const n = monthCounts.get(s);
            if (!n) return null;
            const st = SOURCE_STYLE[s];
            return (
              <span
                key={s}
                className="px-1.5 py-0.5 rounded tabular-nums"
                style={{ backgroundColor: st.bg, color: st.fg, border: st.border ?? "none" }}
              >
                {s} {n}
              </span>
            );
          })}
        </div>
      </div>

      {/* 캘린더 본판 */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--color-rule)" }}
      >
        <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: "var(--color-rule)" }}>
          {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
            <div
              key={w}
              className="py-1.5 text-center text-[11px] font-medium"
              style={{ backgroundColor: "var(--color-paper)", color: "var(--color-muted)" }}
            >
              {w}
            </div>
          ))}
          {Array.from({ length: leadBlank }, (_, i) => (
            <div key={`b${i}`} style={{ backgroundColor: "var(--color-paper)" }} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const ds = `${month}-${String(i + 1).padStart(2, "0")}`;
            const ups = byDate.get(ds) ?? [];
            const isToday = ds === todayStr;
            return (
              <div
                key={ds}
                className="min-h-[92px] p-1.5 flex flex-col gap-1"
                style={{
                  backgroundColor: isToday
                    ? "color-mix(in srgb, var(--color-ink) 7%, var(--color-paper))"
                    : "var(--color-paper)",
                }}
              >
                <span
                  className="text-[11px] tabular-nums leading-none"
                  style={{
                    color: isToday ? "var(--color-ink)" : "var(--color-muted)",
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {i + 1}
                </span>
                {ups.slice(0, 4).map((u) => {
                  const st = SOURCE_STYLE[u.source];
                  return (
                    <span
                      key={u.key}
                      className="text-[10px] leading-tight px-1 py-0.5 rounded tabular-nums truncate"
                      style={{ backgroundColor: st.bg, color: st.fg, border: st.border ?? "none" }}
                      title={`[${u.source}] ${u.title ?? ""} — ${
                        typeof u.views === "number" ? u.views.toLocaleString("ko-KR") + "회" : "조회수 집계 전"
                      }`}
                    >
                      {fmtViews(u.views)}
                    </span>
                  );
                })}
                {ups.length > 4 && (
                  <span className="text-[9px]" style={{ color: "var(--color-muted)" }}>
                    +{ups.length - 4}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-[11px]" style={{ color: "var(--color-muted)" }}>
        칩에 마우스를 올리면 제목·정확한 조회수 · 색: 한나(검정)·가족먹거리(초록)·혜린(보라)·유튜브 숏(빨강)·롱(빨강 테두리)
      </p>

      {/* 이 달 업로드 목록 (칩 눌러볼 필요 없이 아래서 한 번에) */}
      <section
        className="rounded-xl p-4 mt-4"
        style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
      >
        <h2 className="text-[13px] font-semibold mb-2">{m}월 업로드 상세</h2>
        <ol className="space-y-1.5">
          {uploads
            .filter((u) => u.date.startsWith(month))
            .map((u) => {
              const st = SOURCE_STYLE[u.source];
              return (
                <li key={u.key} className="flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="flex items-baseline gap-1.5 min-w-0">
                    <span className="tabular-nums shrink-0 text-[11px]" style={{ color: "var(--color-muted)" }}>
                      {u.date.slice(8)}일
                    </span>
                    <span
                      className="shrink-0 text-[10px] px-1 rounded"
                      style={{ backgroundColor: st.bg, color: st.fg, border: st.border ?? "none" }}
                    >
                      {u.source}
                    </span>
                    <span className="truncate">{u.title}</span>
                  </span>
                  <span className="tabular-nums shrink-0" style={{ color: "var(--color-muted)" }}>
                    {typeof u.views === "number" ? u.views.toLocaleString("ko-KR") : "-"}
                  </span>
                </li>
              );
            })}
        </ol>
      </section>
    </main>
  );
}
