import type { Metadata } from "next";
import {
  dash,
  type HyerinTodayResponse,
  type HyerinWeekResponse,
  type HyerinMonthResponse,
} from "@/lib/dashboard-api";
import TrainingsRow from "./TrainingsRow";

export const metadata: Metadata = {
  title: "혜린의 학습 일지 — 쿨한나",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function isApiError<T>(x: T | { error: string }): x is { error: string } {
  return typeof x === "object" && x !== null && "error" in (x as object);
}

export default async function HyerinDashboardPage() {
  const [today, week, month] = await Promise.all([
    dash.hyerinToday(),
    dash.hyerinWeek(),
    dash.hyerin30Days(),
  ]);

  const errors = [
    isApiError(today) ? today.error : null,
    isApiError(week) ? week.error : null,
    isApiError(month) ? month.error : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <div className="hyerin-dashboard">
      <style>{HYERIN_CSS}</style>
      <div className="hyerin-inner">
        {errors.length > 0 ? (
          <ErrorState errors={errors} />
        ) : (
          <HyerinContent
            today={today as HyerinTodayResponse}
            week={week as HyerinWeekResponse}
            month={month as HyerinMonthResponse}
          />
        )}
      </div>
    </div>
  );
}

function HyerinContent({
  today,
  week,
  month,
}: {
  today: HyerinTodayResponse;
  week: HyerinWeekResponse;
  month: HyerinMonthResponse;
}) {
  if (!today.exists) {
    return (
      <>
        <Header date={today.date} weekday={today.요일} />
        <EmptyState message={today.message} />
        <WeekStrip days={week.days} 표시일={week.표시일} />
        <MonthChart days={month.days} />
      </>
    );
  }

  return (
    <>
      <Header date={today.date} weekday={today.요일} />
      <SummaryStrip summary={today.summary!} />
      <TrainingsRow 한줄평={today.한줄평 ?? {}} date={today.date} />
      <CommentBlock
        title="👩 엄마가 보는 이번 주"
        text={today.한나용_코멘트 ?? ""}
        tone="mom"
      />
      <CommentBlock
        title="✍ 혜린이에게"
        text={today.혜린용_코멘트 ?? ""}
        tone="hyerin"
      />
      <WeekStrip days={week.days} 표시일={week.표시일} />
      <MetricsRow 누적={today.누적_지표 ?? {}} />
      <MonthChart days={month.days} />
    </>
  );
}

function Header({ date, weekday }: { date: string; weekday?: string }) {
  const d = new Date(`${date}T00:00:00`);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const wd = weekday ?? ["월", "화", "수", "목", "금", "토", "일"][(d.getDay() + 6) % 7];
  return (
    <header className="hyerin-header">
      <h1>혜린의 학습 일지 ✍</h1>
      <p>
        {month}월 {day}일 ({wd}) · 어제까지의 기록
      </p>
    </header>
  );
}

function SummaryStrip({
  summary,
}: {
  summary: NonNullable<HyerinTodayResponse["summary"]>;
}) {
  const cells: Array<{ label: string; value: string; unit: string }> = [
    {
      label: "글자수",
      value: summary.글자수_오늘.toLocaleString(),
      unit: "자",
    },
    { label: "평균 점수", value: summary.평균_점수.toFixed(1), unit: "/10" },
    {
      label: "훈련 완료",
      value: `${summary.훈련_완료}/${summary.훈련_전체}`,
      unit: "",
    },
    { label: "연속", value: summary.연속_일수.toString(), unit: "일" },
  ];
  return (
    <section className="summary-strip">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`summary-cell ${i < cells.length - 1 ? "with-divider" : ""}`}
        >
          <div className="cell-label">{c.label}</div>
          <div className="cell-value">
            <strong>{c.value}</strong>
            {c.unit && <span>{c.unit}</span>}
          </div>
        </div>
      ))}
    </section>
  );
}

function CommentBlock({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "mom" | "hyerin";
}) {
  if (!text.trim()) return null;
  return (
    <section className={`comment-block tone-${tone}`}>
      <div className="comment-title">{title}</div>
      <p className="comment-text">{text}</p>
    </section>
  );
}

function WeekStrip({
  days,
  표시일,
}: {
  days: HyerinWeekResponse["days"];
  표시일: string;
}) {
  const maxChars = Math.max(...days.map((d) => d.글자수), 1);
  return (
    <section className="week-strip">
      <h3 className="section-title">이번 주</h3>
      <div className="week-grid">
        {days.map((d) => {
          const isFocus = d.date === 표시일;
          const heightPct = Math.round((d.글자수 / maxChars) * 100);
          return (
            <div
              key={d.date}
              className={`week-cell ${isFocus ? "is-focus" : ""} ${d.exists ? "" : "is-empty"}`}
            >
              <div className="weekday">{d.요일}</div>
              <div className="bar-wrap">
                <div
                  className="bar"
                  style={{ height: `${Math.max(heightPct, d.exists ? 4 : 0)}%` }}
                />
              </div>
              <div className="chars">
                {d.exists && d.글자수 > 0 ? d.글자수.toLocaleString() : "—"}
              </div>
              <div className="completed">
                {d.exists ? `${d.훈련완료}/5` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricsRow({ 누적 }: { 누적: Record<string, string> }) {
  const chars = 누적["이번 달 총 글자수"];
  const done = 누적["이번 달 훈련 완료"];
  const weak = 누적["가장 약한 훈련"];
  const list = 누적["작품 진도 (리스트)"];
  const esha = 누적["작품 진도 (에샤)"];

  const parts: React.ReactNode[] = [];
  if (chars) parts.push(<span key="c">이번 달 <strong>{chars}자</strong></span>);
  if (done) parts.push(<span key="d"><strong>{done}</strong></span>);
  if (weak) parts.push(<span key="w">약한 훈련: <strong>{weak}</strong></span>);
  if (list) parts.push(<span key="l">리스트 <strong>{list}</strong></span>);
  if (esha) parts.push(<span key="e">에샤 <strong>{esha}</strong></span>);

  if (parts.length === 0) return null;

  return (
    <section className="metrics-row">
      {parts.map((p, i) => (
        <span key={i} className="metric-item">
          {p}
          {i < parts.length - 1 && <span className="dot"> · </span>}
        </span>
      ))}
    </section>
  );
}

function MonthChart({ days }: { days: HyerinMonthResponse["days"] }) {
  const allZero = days.every((d) => d.글자수 === 0);
  if (allZero) {
    return (
      <section className="month-chart">
        <h3 className="section-title">최근 30일</h3>
        <p className="month-empty">데이터 쌓이는 중...</p>
      </section>
    );
  }

  const W = 600;
  const H = 140;
  const PAD = 20;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;
  const maxChars = Math.max(...days.map((d) => d.글자수), 1);
  const slot = chartW / days.length;

  return (
    <section className="month-chart">
      <h3 className="section-title">최근 30일</h3>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="month-svg"
        preserveAspectRatio="none"
        role="img"
        aria-label="최근 30일 글자수 막대와 평균 점수 점"
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={PAD}
            y1={H - PAD - chartH * g}
            x2={W - PAD}
            y2={H - PAD - chartH * g}
            stroke="var(--hyerin-border)"
            strokeDasharray="2 4"
          />
        ))}
        {days.map((d, i) => {
          const h = (d.글자수 / maxChars) * chartH;
          const x = PAD + i * slot;
          const y = H - PAD - h;
          return (
            <g key={d.date}>
              <rect
                x={x + 1.5}
                y={y}
                width={Math.max(slot - 3, 1)}
                height={Math.max(h, 0)}
                fill="var(--hyerin-accent)"
                rx="1.5"
              />
              {d.평균점수 > 0 && (
                <circle
                  cx={x + slot / 2}
                  cy={H - PAD - (d.평균점수 / 10) * chartH}
                  r="2.5"
                  fill="var(--hyerin-secondary)"
                />
              )}
            </g>
          );
        })}
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="var(--hyerin-border)"
        />
      </svg>
      <div className="month-legend">
        <span>
          <i style={{ background: "var(--hyerin-accent)" }} /> 글자수
        </span>
        <span>
          <i
            style={{
              background: "var(--hyerin-secondary)",
              borderRadius: "50%",
            }}
          />{" "}
          평균 점수
        </span>
      </div>
    </section>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <section className="empty-state">
      <p>
        {message ??
          "오늘 학습 데이터가 아직 정리되지 않았어요."}
      </p>
      <p className="empty-hint">매일 밤 11시 50분에 정리됩니다.</p>
    </section>
  );
}

function ErrorState({ errors }: { errors: string[] }) {
  return (
    <div className="hyerin-error">
      <strong>대시보드 API 호출 실패</strong>
      <pre>{errors.join("\n")}</pre>
      <p className="hyerin-error-hint">
        Vercel 환경변수 <code>DASHBOARD_API_URL</code>,{" "}
        <code>DASHBOARD_API_KEY</code> 확인.
      </p>
    </div>
  );
}

const HYERIN_CSS = `
  .hyerin-dashboard {
    --hyerin-bg-page: #FAF6F0;
    --hyerin-bg-card: #FFFFFF;
    --hyerin-bg-soft: #F7F0E5;
    --hyerin-accent: #E89B7C;
    --hyerin-accent-soft: #FFF0E8;
    --hyerin-secondary: #D4A04F;
    --hyerin-secondary-soft: #FFF8EC;
    --hyerin-success: #8FBC8F;
    --hyerin-text-main: #3A2F2A;
    --hyerin-text-sub: #8B7D75;
    --hyerin-border: #EFE5DA;

    min-height: 100vh;
    background: var(--hyerin-bg-page);
    color: var(--hyerin-text-main);
    font-family: ui-sans-serif, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
    padding: 1.25rem;
    box-sizing: border-box;
  }
  .hyerin-dashboard * { box-sizing: border-box; }
  .hyerin-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Header */
  .hyerin-header { margin: 0; }
  .hyerin-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--hyerin-text-main);
    margin: 0 0 0.2rem;
    letter-spacing: -0.02em;
  }
  .hyerin-header p {
    color: var(--hyerin-text-sub);
    margin: 0;
    font-size: 0.875rem;
  }

  /* SummaryStrip */
  .summary-strip {
    background: var(--hyerin-bg-card);
    border: 1px solid var(--hyerin-border);
    border-top: 2px solid var(--hyerin-secondary);
    border-radius: 0.625rem;
    padding: 0.875rem 1.25rem;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem 0;
    box-shadow: 0 1px 2px rgba(58,47,42,0.06);
  }
  @media (min-width: 640px) {
    .summary-strip { grid-template-columns: repeat(4, 1fr); }
  }
  .summary-cell { display: flex; flex-direction: column; gap: 0.2rem; padding: 0 1rem; }
  .summary-cell:first-child { padding-left: 0; }
  @media (min-width: 640px) {
    .summary-cell.with-divider { border-right: 1px solid var(--hyerin-border); }
  }
  .cell-label { color: var(--hyerin-text-sub); font-size: 0.75rem; font-weight: 500; }
  .cell-value strong {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--hyerin-accent);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .cell-value span { color: var(--hyerin-text-sub); font-size: 0.8125rem; margin-left: 0.2rem; }

  /* TrainingsRow */
  .trainings-section {
    background: var(--hyerin-bg-card);
    border: 1px solid var(--hyerin-border);
    border-radius: 0.625rem;
    padding: 0.875rem 1rem;
    box-shadow: 0 1px 2px rgba(58,47,42,0.06);
  }
  .section-title {
    margin: 0 0 0.625rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--hyerin-text-main);
    letter-spacing: -0.01em;
  }
  .trainings-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  @media (min-width: 768px) {
    .trainings-grid { grid-template-columns: repeat(5, 1fr); align-items: start; }
  }
  .training-card {
    background: var(--hyerin-bg-soft);
    border: 1px solid var(--hyerin-border);
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-height: 0;
  }
  .training-card.done {
    background: var(--hyerin-accent-soft);
    border-color: var(--hyerin-accent);
  }
  .training-card.empty { opacity: 0.6; }
  .training-card.open {
    grid-column: 1 / -1;
  }
  .training-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  .training-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--hyerin-text-main);
  }
  .check { color: var(--hyerin-success); font-weight: 700; font-size: 0.875rem; }
  .training-line {
    font-size: 0.75rem;
    color: var(--hyerin-text-main);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .detail-btn {
    align-self: flex-start;
    background: transparent;
    border: none;
    padding: 0;
    margin-top: 0.1rem;
    color: var(--hyerin-accent);
    font-size: 0.6875rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .detail-btn:hover:not(:disabled) { text-decoration: underline; }
  .detail-btn:disabled { opacity: 0.6; cursor: wait; }
  .training-detail {
    margin-top: 0.5rem;
    padding: 0.625rem;
    background: var(--hyerin-bg-card);
    border: 1px solid var(--hyerin-border);
    border-radius: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 24rem;
    overflow-y: auto;
  }
  .detail-card { display: flex; flex-direction: column; gap: 0.3rem; }
  .detail-filename {
    font-size: 0.6875rem;
    color: var(--hyerin-text-sub);
    font-family: ui-monospace, monospace;
  }
  .detail-content {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.55;
    color: var(--hyerin-text-main);
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
  }
  .detail-error {
    font-size: 0.75rem;
    color: #6B3A1A;
    background: #FFF1EC;
    border: 1px solid var(--hyerin-accent);
    border-radius: 0.3rem;
    padding: 0.4rem 0.6rem;
  }
  .detail-empty { font-size: 0.75rem; color: var(--hyerin-text-sub); }

  /* CommentBlock */
  .comment-block {
    border-radius: 0.625rem;
    padding: 0.625rem 1rem;
    border-left: 3px solid;
  }
  .comment-block.tone-mom {
    background: var(--hyerin-secondary-soft);
    border-left-color: var(--hyerin-secondary);
  }
  .comment-block.tone-hyerin {
    background: var(--hyerin-accent-soft);
    border-left-color: var(--hyerin-accent);
  }
  .comment-title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--hyerin-text-main);
    margin-bottom: 0.25rem;
  }
  .comment-text {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.55;
    color: var(--hyerin-text-main);
    white-space: pre-wrap;
  }

  /* WeekStrip */
  .week-strip {
    background: var(--hyerin-bg-card);
    border: 1px solid var(--hyerin-border);
    border-radius: 0.625rem;
    padding: 0.75rem 1rem;
    box-shadow: 0 1px 2px rgba(58,47,42,0.06);
  }
  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
  }
  .week-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.5rem 0.25rem;
    border-radius: 0.4rem;
    border: 1px solid transparent;
    background: var(--hyerin-bg-soft);
  }
  .week-cell.is-focus {
    border-color: var(--hyerin-accent);
    background: var(--hyerin-accent-soft);
  }
  .week-cell.is-empty { opacity: 0.55; }
  .weekday { font-size: 0.75rem; color: var(--hyerin-text-sub); font-weight: 500; }
  .bar-wrap {
    width: 100%;
    height: 30px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .bar {
    width: 55%;
    background: var(--hyerin-accent);
    border-radius: 2px 2px 0 0;
  }
  .week-cell.is-empty .bar { background: var(--hyerin-border); }
  .chars { font-size: 0.8125rem; color: var(--hyerin-text-main); font-weight: 600; line-height: 1.1; }
  .completed { font-size: 0.6875rem; color: var(--hyerin-text-sub); min-height: 0.7rem; }

  /* MetricsRow */
  .metrics-row {
    background: var(--hyerin-bg-card);
    border: 1px solid var(--hyerin-border);
    border-radius: 0.625rem;
    padding: 0.625rem 1rem;
    font-size: 0.8125rem;
    color: var(--hyerin-text-sub);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.1rem;
  }
  .metrics-row strong { color: var(--hyerin-accent); font-weight: 700; }
  .metrics-row .dot { color: var(--hyerin-border); margin: 0 0.15rem; }
  .metric-item { display: inline-flex; align-items: center; }

  /* MonthChart */
  .month-chart {
    background: var(--hyerin-bg-card);
    border: 1px solid var(--hyerin-border);
    border-radius: 0.625rem;
    padding: 0.75rem 1rem;
    box-shadow: 0 1px 2px rgba(58,47,42,0.06);
  }
  .month-svg {
    width: 100%;
    height: 140px;
    display: block;
  }
  .month-legend {
    display: flex;
    gap: 1rem;
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: var(--hyerin-text-sub);
  }
  .month-legend span { display: inline-flex; align-items: center; }
  .month-legend i {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    margin-right: 0.4rem;
  }
  .month-empty {
    text-align: center;
    color: var(--hyerin-text-sub);
    padding: 1rem 0;
    margin: 0;
    font-size: 0.875rem;
  }

  /* EmptyState */
  .empty-state {
    background: var(--hyerin-bg-card);
    border: 1px dashed var(--hyerin-border);
    border-radius: 0.625rem;
    padding: 1.5rem;
    text-align: center;
    color: var(--hyerin-text-sub);
  }
  .empty-state p { margin: 0; font-size: 0.9375rem; }
  .empty-state .empty-hint { font-size: 0.8125rem; margin-top: 0.4rem; }

  /* ErrorState */
  .hyerin-error {
    background: #FFF1EC;
    border: 1px solid var(--hyerin-accent);
    color: #6B3A1A;
    border-radius: 0.625rem;
    padding: 1rem 1.25rem;
  }
  .hyerin-error strong { display: block; margin-bottom: 0.4rem; }
  .hyerin-error pre {
    margin: 0;
    font-size: 0.8rem;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, "SF Mono", monospace;
  }
  .hyerin-error-hint { margin: 0.5rem 0 0; font-size: 0.8rem; color: #8B5A35; }
  .hyerin-error-hint code {
    background: #FFE3D4;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
`;
