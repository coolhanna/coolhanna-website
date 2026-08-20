"use client";

// 건강 탭 v2.1 — "하루" 중심 (정본 §7-3).
// 한나 피드백(2026-08-09): 막대 스트립 제거(빡빡), 이어지는 것·확인 질문 제거(건강 아님),
// 먹은 것 표시, 해석(내 의견)은 감추지 말고 다 보여주기, 라벨 열로 구분감, 워치 상세 버튼.

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
  spo2: number | null;
  wrist_temp: number | null;
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
  meals: string;
  day_type?: string;
  body?: string;
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
  today_comment_date?: string;
  error?: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}.${d.getDate()} ${WEEKDAYS[d.getDay()]}`;
}

const Dash = () => <span style={{ color: "var(--color-rule)" }}>—</span>;

function Num({ v, suffix = "", digits = 0 }: { v: number | null | undefined; suffix?: string; digits?: number }) {
  if (v === null || v === undefined) return <Dash />;
  return <>{digits ? v.toFixed(digits) : Math.round(v).toLocaleString("ko-KR")}{suffix}</>;
}

function WeatherChip({ w }: { w: WeatherDay | null }) {
  if (!w) return null;
  const feel = w.app_tmax ?? w.tmax;
  if (feel === null) return null;
  const hot = feel >= 33;
  const rain = (w.rain ?? 0) >= 1;
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
      style={hot ? { backgroundColor: "#FDE8E4", color: "#9C3A1F" } : { backgroundColor: "#EEF1F6", color: "#4A5568" }}
    >
      {rain ? `☔ ${Math.round(w.rain!)}mm · ` : ""}체감 {Math.round(feel)}°
    </span>
  );
}

// 라벨 열 행 — 스카우트 카드의 "왜 보나/훔칠 것" 그리드와 같은 구분 방식
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 py-1.5" style={{ gridTemplateColumns: "52px 1fr" }}>
      <b className="text-[10.5px] pt-0.5 tracking-wide" style={{ color: "var(--color-muted)" }}>{label}</b>
      <div className="text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

function DayCard({ day, defaultOpen }: { day: DayRow; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { watch, weather, ledger } = day;
  if (!watch && !weather && !ledger) {
    return (
      <div className="rounded-xl px-4 py-2 text-[12px]" style={{ border: "1px dashed var(--color-rule)", color: "var(--color-muted)" }}>
        {dayLabel(day.date)} — 기록 없음
      </div>
    );
  }

  const bodyText = ledger?.has_interp ? ledger.body || "" : "";
  const preview = bodyText.split("\n").filter(Boolean)[0] || "";

  return (
    <article className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--color-rule)" }}>
      {/* 헤더 — 날짜 크게 + 하루 유형 + 날씨 */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 flex-wrap"
        style={{ borderBottom: "1px solid var(--color-rule)", backgroundColor: "var(--color-paper, #faf9f5)" }}
      >
        <span className="text-[16px] font-extrabold tabular-nums tracking-tight">{dayLabel(day.date)}</span>
        {ledger?.day_type ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>
            {ledger.day_type.split("(")[0].trim()}
          </span>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EFEDE6", color: "var(--color-muted)" }}>
            녹음 없음
          </span>
        )}
        <span className="ml-auto"><WeatherChip w={weather} /></span>
      </div>

      <div className="px-4 py-2.5" style={{ display: "grid", rowGap: 2 }}>
        {ledger && ledger.flags.length > 0 && (
          <Row label="몸 신호">
            <span className="font-semibold" style={{ color: "#9C3A1F" }}>{ledger.flags.join(" · ")}</span>
          </Row>
        )}
        {ledger?.meals && (
          <Row label="먹은 것">{ledger.meals}</Row>
        )}
        <Row label="워치">
          <span className="tabular-nums flex flex-wrap gap-x-3 gap-y-0.5">
            <span>밤잠 <Num v={watch?.sleep} suffix="h" digits={1} /></span>
            <span>심박 <Num v={watch?.rhr} /></span>
            <span>HRV <Num v={watch?.hrv} /></span>
            <span>걸음 <Num v={watch?.steps} /></span>
            <span>걷기 <Num v={watch?.walk_min} suffix="분" /></span>
            <span>운동 <Num v={watch?.exercise_min} suffix="분" /></span>
            {(watch?.run_min ?? 0) > 0 && <span>뛰기 <Num v={watch?.run_min} suffix="분" /></span>}
            {watch?.spo2 != null && <span>산소 <Num v={watch?.spo2} suffix="%" /></span>}
            {watch?.wrist_temp != null && <span>손목 <Num v={watch?.wrist_temp} suffix="°" digits={1} /></span>}
          </span>
        </Row>
      </div>

      {/* 내 의견 — 해석 전문. 최신 날은 펼침이 기본 */}
      {bodyText && (
        <div className="px-4 pb-4 pt-2.5" style={{ borderTop: "1px dashed var(--color-rule)" }}>
          <div className="flex items-baseline justify-between">
            <b className="text-[10.5px] tracking-wide" style={{ color: "var(--accent-text, var(--accent))" }}>내 의견</b>
            {ledger?.gap && <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>녹음 공백 {ledger.gap}</span>}
          </div>
          {open ? (
            <p className="mt-1.5 text-[13.5px] leading-[1.75] whitespace-pre-line">{bodyText}</p>
          ) : (
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--color-muted)" }}>{preview}</p>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="mt-2 text-[11px] px-2.5 py-1 rounded-lg"
            style={{ border: "1px solid var(--color-rule)", color: "var(--color-muted)" }}
          >
            {open ? "접기 ↑" : "전문 보기 ↓"}
          </button>
        </div>
      )}
    </article>
  );
}

export default function HealthClient({ data }: { data: HealthDaysResponse }) {
  if (data.error || !data.days) {
    return (
      <main className="max-w-page mx-auto px-5 sm:px-8 py-8 text-[13px]" style={{ color: "var(--danger, #b3261e)" }}>
        {data.error || "데이터 없음"}
      </main>
    );
  }
  const days = data.days;
  const today = days[0];
  // 오늘은 아직 진행 중(녹음 미업로드) — 목록에는 어제부터. 오늘은 위 검정 카드가 담당.
  const pastDays = days.slice(1);
  const firstLedgerDate = pastDays.find((d) => d.ledger?.has_interp)?.date;

  return (
    <main className="max-w-page mx-auto px-5 sm:px-8 py-6">
      {/* 오늘 카드 — 코치 한 줄 + 워치 상세 버튼 */}
      <section className="rounded-2xl p-4 mb-4 text-white" style={{ backgroundColor: "#1c1c1a" }}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[15px] font-extrabold">오늘 {dayLabel(today.date)}</span>
          <WeatherChip w={today.weather} />
          <a
            href="https://health.coolhanna.com"
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[12px] font-bold px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: "#fff", color: "#1c1c1a" }}
          >
            워치 상세 열기 →
          </a>
        </div>
        {data.today_comment && (
          <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: "#e8e6e0" }}>{data.today_comment}</p>
        )}
        <p className="mt-2 text-[10.5px]" style={{ color: "#8a8880" }}>
          {data.today_comment_date ? `코치 한 줄은 ${data.today_comment_date.slice(5).replace("-", "/")} 아침 기준 · ` : ""}
          밤잠 = 그 날짜의 밤(다음날 아침 기상) · — = 워치에서 아직 안 넘어옴 · 새벽 5시 어제 하루가 카드로 쌓임.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {pastDays.map((d) => (
          <DayCard key={d.date} day={d} defaultOpen={d.date === firstLedgerDate} />
        ))}
      </div>
    </main>
  );
}
