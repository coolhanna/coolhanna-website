"use client";

// 건강 탭 v2 — "하루" 중심 갈아엎기 (2026-08-09 한나 지시, 정본 §7-3).
// 1차 소스 = 하루음성기록 원장 + 클로드 해석(실제 먹고 아프고 움직인 하루).
// 워치·날씨는 교차 확인 층. 유추를 사실로 승격하지 않는다.

import { useState } from "react";

interface WatchDay {
  sleep: number | null;
  rhr: number | null;
  hrv: number | null;
  steps: number | null;
  exercise_min: number | null;
  walk_min: number | null;
  walk_night_min: number | null;
  run_min: number | null;
}

interface WeatherDay {
  rain: number | null;
  tmax: number | null;
  app_tmax: number | null;
}

interface LedgerDay {
  has_interp: boolean;
  flags: string[];
  gap: string;
  day_type?: string;
  body?: string;
  carry?: string;
  questions?: string;
}

interface DayRow {
  date: string;
  watch: WatchDay | null;
  weather: WeatherDay | null;
  ledger: LedgerDay | null;
}

interface HealthDaysResponse {
  days?: DayRow[];
  today_comment?: string;
  error?: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

function sleepColor(h: number | null): string {
  if (h === null || h === undefined) return "var(--color-rule)";
  if (h < 5) return "#c4d8f5";
  if (h < 6) return "#8fb4e8";
  if (h < 7) return "#5588d4";
  return "#2c5cb8";
}

const Dash = () => <span style={{ color: "var(--color-rule)" }}>—</span>;

function Num({ v, suffix = "", digits = 0 }: { v: number | null | undefined; suffix?: string; digits?: number }) {
  if (v === null || v === undefined) return <Dash />;
  return <>{digits ? v.toFixed(digits) : Math.round(v).toLocaleString("ko-KR")}{suffix}</>;
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "accent" | "hot" | "rain" | "flag" | "mute" }) {
  const style: React.CSSProperties =
    tone === "accent" ? { backgroundColor: "var(--accent)", color: "#fff" }
    : tone === "hot" ? { backgroundColor: "#FDE8E4", color: "#9C3A1F" }
    : tone === "rain" ? { backgroundColor: "#E5EDFB", color: "#25457F" }
    : tone === "flag" ? { backgroundColor: "#FBEFE0", color: "#8A4B1E" }
    : { backgroundColor: "var(--color-paper, #f4f2ec)", color: "var(--color-muted)" };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={style}>
      {children}
    </span>
  );
}

function WeatherChips({ w }: { w: WeatherDay | null }) {
  if (!w) return null;
  const feel = w.app_tmax ?? w.tmax;
  return (
    <>
      {feel !== null && (
        <Chip tone={feel >= 33 ? "hot" : "mute"}>체감 {Math.round(feel)}°</Chip>
      )}
      {(w.rain ?? 0) >= 1 && <Chip tone="rain">☔ {Math.round(w.rain!)}mm</Chip>}
    </>
  );
}

// 접힌 본문 — 첫 문장만 보여주고 펼치면 전문
function clamp(lines: number): React.CSSProperties {
  return { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" };
}

function DayCard({ day }: { day: DayRow }) {
  const [open, setOpen] = useState(false);
  const { watch, weather, ledger } = day;
  const empty = !watch && !weather && !ledger;

  if (empty) {
    return (
      <div className="rounded-xl px-4 py-2 text-[12px]" style={{ border: "1px dashed var(--color-rule)", color: "var(--color-muted)" }}>
        {dayLabel(day.date)} — 기록 없음
      </div>
    );
  }

  return (
    <article
      className="rounded-xl p-4"
      style={{ background: "#fff", border: "1px solid var(--color-rule)", cursor: ledger?.has_interp ? "pointer" : "default" }}
      onClick={() => ledger?.has_interp && setOpen(!open)}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[13px] font-bold tabular-nums">{dayLabel(day.date)}</span>
        {ledger?.day_type ? (
          <Chip tone="accent">{ledger.day_type.split("(")[0].trim()}</Chip>
        ) : (
          <Chip tone="mute">녹음 없음</Chip>
        )}
        {(ledger?.flags || []).map((f) => <Chip key={f} tone="flag">{f}</Chip>)}
        <span className="ml-auto flex gap-1.5"><WeatherChips w={weather} /></span>
      </div>

      <div className="mt-2 text-[12.5px] tabular-nums flex flex-wrap gap-x-3 gap-y-1" style={{ color: "var(--color-ink)" }}>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: sleepColor(watch?.sleep ?? null) }} />
          잠 <Num v={watch?.sleep} suffix="h" digits={1} />
        </span>
        <span>심박 <Num v={watch?.rhr} /></span>
        <span>HRV <Num v={watch?.hrv} /></span>
        <span>걸음 <Num v={watch?.steps} /></span>
        <span>걷기 <Num v={watch?.walk_min} suffix="분" /></span>
        <span>운동 <Num v={watch?.exercise_min} suffix="분" /></span>
        {(watch?.run_min ?? 0) > 0 && <span>뛰기 <Num v={watch?.run_min} suffix="분" /></span>}
      </div>

      {ledger?.has_interp && ledger.body && (
        <div className="mt-2.5 text-[13px] leading-relaxed" style={{ color: "var(--color-ink)" }}>
          <p style={open ? undefined : clamp(2)} className="whitespace-pre-line">{ledger.body}</p>
          {open && ledger.carry && (
            <div className="mt-3">
              <b className="text-[11px]" style={{ color: "var(--color-muted)" }}>오늘로 이어지는 것</b>
              <p className="whitespace-pre-line mt-1">{ledger.carry}</p>
            </div>
          )}
          {open && ledger.questions && ledger.questions !== "없음" && (
            <div className="mt-3">
              <b className="text-[11px]" style={{ color: "var(--color-muted)" }}>확인하고 싶은 것</b>
              <p className="whitespace-pre-line mt-1">{ledger.questions}</p>
            </div>
          )}
          {ledger.gap && open && (
            <p className="mt-2 text-[11px]" style={{ color: "var(--color-muted)" }}>녹음 공백 {ledger.gap}</p>
          )}
          <p className="mt-1 text-[10.5px]" style={{ color: "var(--color-rule)" }}>
            {open ? "접기 ↑" : "펼치기 — 몸 해석 전문 + 이어지는 것 ↓"}
          </p>
        </div>
      )}
    </article>
  );
}

// 14일 스트립 — 수면 막대 + 원장 유무 점
function Strip({ days }: { days: DayRow[] }) {
  const asc = [...days].reverse();
  return (
    <div className="flex items-end gap-1" style={{ height: 44 }}>
      {asc.map((d) => {
        const h = d.watch?.sleep ?? null;
        const barH = h === null ? 3 : Math.max(6, Math.min(36, (h / 9) * 36));
        return (
          <div key={d.date} className="flex flex-col items-center gap-0.5" title={`${dayLabel(d.date)} 잠 ${h ?? "—"}h`}>
            <div className="rounded-sm" style={{ width: 14, height: barH, backgroundColor: sleepColor(h) }} />
            <div
              className="rounded-full"
              style={{ width: 5, height: 5, backgroundColor: d.ledger ? "var(--accent)" : "var(--color-rule)" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function HealthClient({ data }: { data: HealthDaysResponse }) {
  if (data.error || !data.days) {
    return <main className="max-w-page mx-auto px-5 sm:px-8 py-8 text-[13px]" style={{ color: "var(--danger, #b3261e)" }}>{data.error || "데이터 없음"}</main>;
  }
  const days = data.days;
  const today = days[0];

  return (
    <main className="max-w-page mx-auto px-5 sm:px-8 py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-[17px] font-extrabold">건강 — 하루 중심</h1>
        <a href="https://health.coolhanna.com" target="_blank" rel="noreferrer" className="text-[11px] underline" style={{ color: "var(--color-muted)" }}>
          워치 상세 →
        </a>
      </div>

      {/* 오늘 카드 — 코치 한 줄 + 오늘 날씨 + 14일 잠 스트립 */}
      <section className="rounded-xl p-4 mb-4 text-white" style={{ backgroundColor: "#1c1c1a" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold">오늘 {dayLabel(today.date)}</span>
          <WeatherChips w={today.weather} />
        </div>
        {data.today_comment && (
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#e8e6e0" }}>{data.today_comment}</p>
        )}
        <div className="mt-3"><Strip days={days} /></div>
        <p className="mt-1 text-[10px]" style={{ color: "#8a8880" }}>
          막대 = 잠(14일) · 점 = 하루기록 있는 날. 하루기록(녹음)이 1차, 워치는 교차 확인.
        </p>
      </section>

      {/* 하루 카드 — 원장+해석+워치+날씨 병합, 최신부터 */}
      <div className="flex flex-col gap-2.5">
        {days.map((d) => <DayCard key={d.date} day={d} />)}
      </div>
    </main>
  );
}
