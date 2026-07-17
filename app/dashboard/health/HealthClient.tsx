"use client";

// 건강 탭 — 애플워치 데이터 (coolhanna-health). 어제 요약 + 핵심 카드 + 이번주 + 이번달.
// 원칙(SPEC §10): 원인(수면·달리기·근력)/결과(심박·HRV) 분리, 평균엔 n 표기,
// 없는 데이터는 회색 대시, 상태색은 경보 조건에만. 상세는 health.coolhanna.com.

type Dict = Record<string, any>;

const Dash = () => <span style={{ color: "var(--color-rule)" }}>—</span>;

const fmt = (v: any, suffix = "") =>
  v === null || v === undefined ? <Dash /> : <>{v}{suffix}</>;

// 수면시간 → 파랑 램프 (순차 단일 색상)
function sleepColor(h: number | null): string {
  if (h === null || h === undefined) return "transparent";
  if (h < 4) return "#eaf1fb";
  if (h < 5) return "#c4d8f5";
  if (h < 6) return "#8fb4e8";
  if (h < 7) return "#5588d4";
  return "#2c5cb8";
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl p-4"
      style={{ background: "#fff", border: "1px solid var(--color-rule)" }}
    >
      <h3 className="text-[11px] font-semibold mb-2" style={{ color: "var(--color-muted)" }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value, goal, tone }: { label: string; value: React.ReactNode; goal: string; tone?: string }) {
  const color = tone === "danger" ? "#b3261e" : tone === "warn" ? "#b06000" : tone === "good" ? "#3a7d3a" : "var(--color-ink)";
  return (
    <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid var(--color-rule)" }}>
      <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>{label}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[11px]" style={{ color: "var(--color-rule)" }}>{goal}</div>
    </div>
  );
}

function TrendChart({ trend }: { trend: Dict[] }) {
  if (!trend?.length) return <Dash />;
  const W = 640, H = 150, TOP = 8, BOT = 24, L = 28;
  const vals = trend.map((r) => r.rhr7).filter((v) => v !== null);
  const lo = Math.floor(Math.min(...vals, 57) - 1);
  const hi = Math.ceil(Math.max(...vals, 64) + 1);
  const x = (i: number) => L + (i / Math.max(1, trend.length - 1)) * (W - L - 4);
  const y = (v: number) => TOP + (1 - (v - lo) / (hi - lo)) * (H - TOP - BOT);
  const line = trend
    .map((r, i) => (r.rhr7 === null ? null : `${x(i).toFixed(1)},${y(r.rhr7).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="심박 7일 평균 90일 추세">
      {[{ v: 58, c: "#3a7d3a" }, { v: 63, c: "#b3261e" }].map(({ v, c }) => (
        <g key={v}>
          <line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke={c} strokeWidth={1} strokeDasharray="4 3" />
          <text x={0} y={y(v) + 3.5} fontSize={10} fill="var(--color-muted)">{v}</text>
        </g>
      ))}
      <polyline points={line} fill="none" stroke="var(--color-ink)" strokeWidth={1.8}
        strokeLinejoin="round" strokeLinecap="round" />
      {trend.map((r, i) =>
        r.run ? <rect key={i} x={x(i) - 1} y={H - BOT + 8} width={2} height={9} fill="#5588d4" /> : null
      )}
      <text x={L} y={H - 2} fontSize={10} fill="var(--color-muted)">← 90일 전</text>
      <text x={W - 40} y={H - 2} fontSize={10} fill="var(--color-muted)">오늘</text>
    </svg>
  );
}

export default function HealthClient({ data }: { data: Dict }) {
  if (data?.error) {
    return <main className="max-w-page mx-auto px-5 sm:px-8 py-10 text-sm" style={{ color: "var(--color-muted)" }}>
      건강 데이터 연결 실패: {data.error}</main>;
  }
  const t = data?.today ?? {};
  const w = data?.week ?? {};
  const m = data?.month ?? {};
  const c = m.cards ?? {};
  const s = t.sleep ?? {};
  const ins = data?.insights ?? {};

  return (
    <main className="max-w-page mx-auto px-5 sm:px-8 pb-16">
      <div className="flex items-baseline justify-between pt-6 pb-1">
        <h1 className="text-2xl font-bold">건강</h1>
        <a href="https://health.coolhanna.com" target="_blank" rel="noreferrer"
          className="text-[12px] hover:opacity-70" style={{ color: "var(--color-muted)" }}>
          상세 대시보드 ↗
        </a>
      </div>
      <p className="text-[13px] mb-5" style={{ color: "var(--color-muted)" }}>
        애플워치 자동 수집 · 비교 기준은 항상 본인 7일 평균 · 의료기기 아님
      </p>

      {t.sentence && <p className="text-xl font-semibold mb-5" style={{ letterSpacing: "-0.01em" }}>{t.sentence}</p>}

      {/* §6.1 핵심 카드 — 롤링 기준 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Stat label="최근 30일 달리기" value={fmt(c.run30, "일")} goal="하한 4 · 목표 12~14"
          tone={c.run30 < 8 ? "danger" : c.run30 >= 12 ? "good" : undefined} />
        <Stat label="심박 7일 평균" value={<>{fmt(c.rhr7)} <span className="text-[11px] font-normal" style={{ color: "var(--color-muted)" }}>n={c.rhr7_n}</span></>}
          goal="목표 58 이하 · 경보 63"
          tone={c.rhr7 > 63 ? "danger" : c.rhr7 <= 58 ? "good" : undefined} />
        <Stat label="5h 미만 밤 (14일)" value={fmt(c.short14, "일")} goal="목표 0"
          tone={c.short14 > 0 ? "warn" : "good"} />
        <Stat label="근력 (7일)" value={fmt(c.strength7, "회")} goal="목표 2" />
        <Stat label="체지방률" value={fmt(c.body_fat, "%")} goal="체중계 연동 필요" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {/* 어젯밤 수면 (원인) */}
        <Card title={`어젯밤 수면 (${t.night ?? "—"}) — 원인`}>
          <div className="text-3xl font-bold tabular-nums mb-1">
            {fmt(s.hours, "시간")}{" "}
            <span className="text-[12px] font-normal" style={{ color: "var(--color-muted)" }}>
              7일 평균 {fmt(s.avg7)}h · n={s.n7}
            </span>
          </div>
          <div className="text-[13px] tabular-nums mb-2" style={{ color: "var(--color-muted)" }}>
            취침 {fmt(s.bedtime)} → 기상 {fmt(s.waketime)}
          </div>
          {s.hours ? (
            <div className="flex h-3 rounded-full overflow-hidden">
              <div style={{ width: `${((s.deep || 0) / s.hours) * 100}%`, background: "#2c5cb8" }} />
              <div style={{ width: `${((s.core || 0) / s.hours) * 100}%`, background: "#8fb4e8" }} />
              <div style={{ width: `${((s.rem || 0) / s.hours) * 100}%`, background: "#c4d8f5" }} />
              <div className="flex-1" style={{ background: "var(--color-rule)" }} />
            </div>
          ) : null}
        </Card>

        {/* 심박·HRV (결과) */}
        <Card title="안정시 심박 · HRV — 결과">
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "심박", d: t.rhr, unit: "bpm", lowerBetter: true },
              { k: "HRV", d: t.hrv, unit: "ms", lowerBetter: false },
            ].map(({ k, d, unit, lowerBetter }) => {
              const delta = d?.value != null && d?.avg7 != null ? Math.round((d.value - d.avg7) * 10) / 10 : null;
              const good = delta !== null && (lowerBetter ? delta < 0 : delta > 0);
              return (
                <div key={k}>
                  <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>{k}</div>
                  <div className="text-3xl font-bold tabular-nums">
                    {fmt(d?.value)} <span className="text-[12px] font-normal" style={{ color: "var(--color-muted)" }}>{unit}</span>
                  </div>
                  {delta !== null && (
                    <div className="text-[12px] tabular-nums font-semibold"
                      style={{ color: good ? "#3a7d3a" : "#b06000" }}>
                      {delta > 0 ? "+" : ""}{delta} vs 7일 <span className="font-normal" style={{ color: "var(--color-muted)" }}>({d.avg7}, n={d.n7})</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 이번주 */}
      <Card title={`이번주 (${w.start ?? "—"}~) · 막대=수면 · ●달리기 ▲근력 · 숫자=심박`}>
        <div className="grid grid-cols-7 gap-2 text-center mb-3">
          {(w.days ?? []).map((d: Dict) => (
            <div key={d.date}>
              <div className="text-[12px] font-semibold tabular-nums h-5">{d.rhr ?? ""}</div>
              <div className="h-16 flex items-end justify-center">
                <div className="w-4 rounded-t"
                  style={{
                    height: d.sleep ? `${Math.min(64, (d.sleep / 9) * 64)}px` : "3px",
                    background: d.sleep === null ? "var(--color-rule)" : d.sleep < 5 ? "#b06000" : "#5588d4",
                  }} />
              </div>
              <div className="text-[10px] h-4">
                {d.run && <span style={{ color: "#2c5cb8" }}>●</span>}
                {d.strength && <span>▲</span>}
              </div>
              <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>{d.dow}</div>
            </div>
          ))}
        </div>
        {w.totals && (
          <div className="flex gap-5 text-[12px] tabular-nums" style={{ color: "var(--color-muted)" }}>
            <span>달리기 <b style={{ color: "var(--color-ink)" }}>{w.totals.run_days}일</b></span>
            <span>5h 미만 <b style={{ color: w.totals.short_nights > 0 ? "#b06000" : "var(--color-ink)" }}>{w.totals.short_nights}일</b></span>
            <span>근력 <b style={{ color: "var(--color-ink)" }}>{w.totals.strength_days}일</b></span>
            <span>심박 평균 <b style={{ color: "var(--color-ink)" }}>{w.totals.rhr_avg ?? "—"}</b> (n={w.totals.rhr_n})</span>
          </div>
        )}
      </Card>

      <div className="h-3" />

      {/* 이번달 히트맵 + 추세 */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card title={`${m.month ?? ""} · 색=수면시간 · ●달리기 ▲근력`}>
          <div className="grid grid-cols-7 gap-1">
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
              <div key={d} className="text-center text-[10px]" style={{ color: "var(--color-rule)" }}>{d}</div>
            ))}
            {Array.from({ length: m.days?.[0]?.dow ?? 0 }).map((_, i) => <div key={`p${i}`} />)}
            {(m.days ?? []).map((d: Dict) => {
              const darkbg = d.sleep >= 6;
              return (
                <div key={d.date} title={`${d.date} 수면 ${d.sleep ?? "—"}h`}
                  className="aspect-square rounded relative text-[9px]"
                  style={{
                    background: d.future ? "transparent" : sleepColor(d.sleep),
                    border: `1px solid ${d.future ? "var(--color-rule)" : d.sleep == null ? "var(--color-rule)" : "transparent"}`,
                    borderStyle: d.future ? "dashed" : "solid",
                  }}>
                  <span className="absolute top-0 left-1 tabular-nums"
                    style={{ color: darkbg ? "rgba(255,255,255,.8)" : "var(--color-muted)" }}>{d.day}</span>
                  <span className="absolute bottom-0 right-0.5" style={{ color: darkbg ? "#fff" : "#2c5cb8" }}>
                    {d.run ? "●" : ""}{d.strength ? "▲" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="90일 추세 · 선=심박 7일 평균 · 막대=달리기">
          <TrendChart trend={m.trend ?? []} />
        </Card>
      </div>

      <div className="h-3" />

      {/* 오늘 활동 + 식단 (실시간, 매시간 갱신) */}
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Card title="오늘 활동 (매시간 갱신 — 진행 중)">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { k: "걸음", v: ins.activity?.steps?.toLocaleString?.("ko-KR") },
              { k: "운동(분)", v: ins.activity?.exercise_min },
              { k: "햇빛(분)", v: ins.activity?.daylight_min },
              { k: "활동 kcal", v: ins.activity?.active_kcal },
            ].map(({ k, v }) => (
              <div key={k}>
                <div className="text-xl font-bold tabular-nums">{v ?? <Dash />}</div>
                <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>{k}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="오늘 식단 (봇에 사진 보내면 기록됨)">
          {ins.meals?.length ? (
            <ul className="text-[13px] space-y-1">
              {ins.meals.map((meal: Dict) => (
                <li key={meal.ts}>
                  <b>{meal.meal_type}</b>{" "}
                  <span style={{ color: "var(--color-muted)" }}>{meal.summary || "기록됨"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
              아직 기록 없음 — 텔레그램 봇에 음식 사진 + "아침/점심/저녁" 캡션
            </p>
          )}
        </Card>
      </div>

      {/* 한나 실측 인사이트 — 원지표 관계 (합성점수 아님) */}
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Card title="수면 길이 → 다음날 심박 (최근 60일 실측)">
          {(ins.sleep_to_rhr ?? []).map((b: Dict) => {
            const best = b.rhr !== null && b.rhr === Math.min(...(ins.sleep_to_rhr ?? []).filter((x: Dict) => x.rhr !== null).map((x: Dict) => x.rhr));
            return (
              <div key={b.bucket} className="flex items-center gap-2 py-1 text-[13px] tabular-nums">
                <span className="w-12" style={{ color: "var(--color-muted)" }}>{b.bucket}</span>
                <div className="flex-1 h-4 rounded"
                  style={{ background: best ? "#3a7d3a" : "#8fb4e8", opacity: b.n ? 1 : 0.2,
                    width: b.rhr ? `${((b.rhr - 50) / 20) * 100}%` : "2%", maxWidth: "70%" }} />
                <b>{b.rhr ?? "—"}</b>
                <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>n={b.n}</span>
              </div>
            );
          })}
          <p className="text-[11px] mt-1" style={{ color: "var(--color-muted)" }}>
            한나 몸은 6~7시간에서 심박이 가장 낮다. 더 잔다고 더 내려가지 않음.
          </p>
        </Card>
        <Card title={`월 달리기 일수 → 그달 심박 (15개월 실측) · 지금 롤링 30일 = ${ins.run30 ?? "—"}일`}>
          {(ins.run_to_rhr ?? []).map((b: Dict) => {
            const cur = ins.run30 >= 10 ? "10일+" : ins.run30 >= 6 ? "6-9일" : ins.run30 >= 1 ? "1-5일" : "0일";
            const isCur = b.bucket === cur;
            return (
              <div key={b.bucket} className="flex items-center gap-2 py-1 text-[13px] tabular-nums"
                style={{ fontWeight: isCur ? 700 : 400 }}>
                <span className="w-12" style={{ color: isCur ? "var(--color-ink)" : "var(--color-muted)" }}>
                  {b.bucket}{isCur ? " ←" : ""}</span>
                <div className="flex-1 h-4 rounded"
                  style={{ background: b.bucket === "0일" ? "#b3261e" : "#5588d4", opacity: b.n ? 1 : 0.15,
                    width: b.rhr ? `${((b.rhr - 55) / 15) * 100}%` : "2%", maxWidth: "70%" }} />
                <b>{b.rhr ?? "—"}</b>
                <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>n={b.n}</span>
              </div>
            );
          })}
          <p className="text-[11px] mt-1" style={{ color: "var(--color-muted)" }}>
            0일이 되면 두 달 만에 72까지 간 적 있음(2025-12). 하한은 월 4일.
          </p>
        </Card>
      </div>

      {/* 리듬·주기·보조지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="기상시각 흔들림 (14일)" value={fmt(ins.variability?.wake_sd_min, "분")}
          goal={`취침 ${ins.variability?.bed_sd_min ?? "—"}분 · 장기 평균 236분`}
          tone={ins.variability?.wake_sd_min > 120 ? "warn" : ins.variability?.wake_sd_min <= 75 ? "good" : undefined} />
        <Stat label="생리 주기" value={ins.cycle?.dday ? `D+${ins.cycle.dday}` : "—"}
          goal={`중앙값 ${ins.cycle?.median ?? "—"}일 · 최근 ${(ins.cycle?.recent ?? []).join("·") || "—"}`} />
        <Stat label="VO2max" value={fmt(ins.aux?.vo2max?.value)}
          goal={ins.aux?.vo2max?.date ?? "—"} />
        <Stat label="심박 회복(1분)" value={fmt(ins.aux?.hr_recovery?.value)}
          goal={ins.aux?.hr_recovery?.date ?? "—"} />
      </div>
    </main>
  );
}
