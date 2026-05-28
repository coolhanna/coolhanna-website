import type { Metadata } from "next";
import Link from "next/link";
import {
  dash,
  type HyerinMonthResponse,
  type HyerinTodayResponse,
  type HyerinWeekResponse,
} from "@/lib/dashboard-api";
import TrainingsRow from "./TrainingsRow";

export const metadata: Metadata = {
  title: "혜린의 작은 작가방 — 쿨한나",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type HyerinDashboardPageProps = {
  searchParams?: Promise<{ week?: string }> | { week?: string };
};

const TRAINING_ORDER = [
  "기술훈련",
  "사고훈련",
  "음성일지",
  "작품작업_에샤",
  "작품작업_리스트",
];

const TRAINING_LABELS: Record<string, string> = {
  기술훈련: "기술훈련",
  사고훈련: "사고훈련",
  음성일지: "음성훈련",
  작품작업_에샤: "에샤",
  작품작업_리스트: "리스트",
};

function isApiError<T>(x: T | { error: string }): x is { error: string } {
  return typeof x === "object" && x !== null && "error" in (x as object);
}

function clampWeekOffset(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-12, Math.min(0, value));
}

function hyerinWeekHref(offset: number) {
  return offset === 0 ? "/dashboard/hyerin" : `/dashboard/hyerin?week=${offset}`;
}

export default async function HyerinDashboardPage({ searchParams }: HyerinDashboardPageProps) {
  const params = await searchParams;
  const weekOffset = clampWeekOffset(Number.parseInt(params?.week ?? "0", 10));
  const [today, week, month] = await Promise.all([
    dash.hyerinToday(),
    dash.hyerinWeek(weekOffset),
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
      <div className="hyerin-shell">
        {errors.length > 0 ? (
          <ErrorState errors={errors} />
        ) : (
          <HyerinContent
            today={today as HyerinTodayResponse}
            week={week as HyerinWeekResponse}
            month={month as HyerinMonthResponse}
            weekOffset={weekOffset}
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
  weekOffset,
}: {
  today: HyerinTodayResponse;
  week: HyerinWeekResponse;
  month: HyerinMonthResponse;
  weekOffset: number;
}) {
  if (!today.exists) {
    return (
      <>
        <Header date={today.date} weekday={today.요일} status="기록 대기" />
        <EmptyState message={today.message} />
        <WeekStrip days={week.days} 표시일={week.표시일} weekOffset={weekOffset} />
        <MonthChart days={month.days} />
      </>
    );
  }

  const summary = today.summary!;
  const status = today.data_status;
  const lineMap = today.한줄평 ?? {};
  const completed = TRAINING_ORDER.filter((key) => lineMap[key] && lineMap[key] !== "안 함");
  const missed = TRAINING_ORDER.filter((key) => !lineMap[key] || lineMap[key] === "안 함");

  return (
    <>
      <Header
        date={today.date}
        weekday={today.요일}
        status={status?.source === "live" ? "원본 기준" : "스냅샷 기준"}
      />
      <section className="command-grid">
        <TodayStatus summary={summary} completed={completed.length} missed={missed.length} />
        <NextAction
          summary={summary}
          completed={completed}
          missed={missed}
          누적={today.누적_지표 ?? {}}
        />
      </section>
      <TrainingsRow 한줄평={lineMap} date={today.date} />
      <section className="lower-grid">
        <WeekStrip days={week.days} 표시일={week.표시일} weekOffset={weekOffset} />
        <MetricsPanel 누적={today.누적_지표 ?? {}} />
      </section>
      <CoachPanel
        mom={today.한나용_코멘트 ?? ""}
        hyerin={today.혜린용_코멘트 ?? ""}
      />
      <TrainingTrendPanel days={month.days} />
      <PastCommentsPanel days={month.days} />
      <MonthChart days={month.days} />
    </>
  );
}

function Header({
  date,
  weekday,
  status,
}: {
  date: string;
  weekday?: string;
  status: string;
}) {
  const d = new Date(`${date}T00:00:00`);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const wd = weekday ?? ["월", "화", "수", "목", "금", "토", "일"][(d.getDay() + 6) % 7];
  return (
    <header className="hyerin-header">
      <div>
        <p className="eyebrow">HYERIN WRITING ROOM</p>
        <h1>혜린의 작은 작가방</h1>
        <p className="header-sub">
          {month}월 {day}일 ({wd}) 기록 · {status}
        </p>
        <div className="header-charms" aria-label="작가방 분위기">
          <span>작가 노트</span>
          <span>오늘도 한 장면</span>
          <span>반짝 저장</span>
        </div>
      </div>
      <div className="date-badge">
        <strong>{day}</strong>
        <span>{wd}</span>
      </div>
    </header>
  );
}

function TodayStatus({
  summary,
  completed,
  missed,
}: {
  summary: NonNullable<HyerinTodayResponse["summary"]>;
  completed: number;
  missed: number;
}) {
  const completionRate = Math.round((completed / Math.max(summary.훈련_전체, 1)) * 100);
  return (
    <section className="status-panel">
      <div className="status-top">
        <span>오늘의 반짝</span>
        <strong>{completionRate}%</strong>
      </div>
      <div className="hero-metric">
        <strong>{summary.글자수_오늘.toLocaleString()}</strong>
        <span>자</span>
      </div>
      <div className="kpi-grid">
        <Metric label="훈련" value={`${summary.훈련_완료}/${summary.훈련_전체}`} />
        <Metric label="연속" value={`${summary.연속_일수}일`} />
        <Metric label="점수" value={summary.평균_점수 ? summary.평균_점수.toFixed(1) : "-"} />
        <Metric label="공백" value={`${missed}개`} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NextAction({
  summary,
  completed,
  missed,
  누적,
}: {
  summary: NonNullable<HyerinTodayResponse["summary"]>;
  completed: string[];
  missed: string[];
  누적: Record<string, string>;
}) {
  const weakest = 누적["가장 약한 훈련"] ?? missed[0] ?? "작품작업_리스트";
  const priority = missed.includes("작품작업_리스트")
    ? "작품작업_리스트"
    : missed.includes("음성일지")
      ? "음성일지"
      : weakest;
  const priorityLabel = TRAINING_LABELS[priority] ?? priority;
  const action =
    summary.훈련_완료 === 0
      ? `${priorityLabel} 하나만 열고 10분짜리 기록을 남기기`
      : `${priorityLabel} 한 칸만 살짝 채워보기`;
  const completedText =
    completed.length > 0
      ? completed.map((key) => TRAINING_LABELS[key] ?? key).join(", ")
      : "아직 없음";

  return (
    <section className="action-panel">
      <div className="panel-label">다음 작은 발걸음</div>
      <h2>{action}</h2>
      <p>
        오늘 모은 조각은 {completedText}. 지금은 양보다 공백을 줄이는 쪽이 더 중요합니다.
      </p>
    </section>
  );
}

function WeekStrip({
  days,
  표시일,
  weekOffset,
}: {
  days: HyerinWeekResponse["days"];
  표시일: string;
  weekOffset: number;
}) {
  const maxChars = Math.max(...days.map((d) => d.글자수), 1);
  const weekLabel =
    weekOffset === 0
      ? "이번 주"
      : weekOffset === -1
        ? "저번 주"
        : `${Math.abs(weekOffset)}주 전`;
  return (
    <section className="week-strip">
      <div className="section-head">
        <h3>{weekLabel} 흐름</h3>
        <div className="week-nav">
          <Link href={hyerinWeekHref(weekOffset - 1)} aria-label="이전 주 보기">
            ‹
          </Link>
          {weekOffset < 0 && (
            <Link href={hyerinWeekHref(weekOffset + 1)} aria-label="다음 주 보기">
              ›
            </Link>
          )}
        </div>
      </div>
      <div className="week-grid">
        {days.map((d) => {
          const isFocus = d.date === 표시일;
          const heightPct = Math.round((d.글자수 / maxChars) * 100);
          const tooltip = d.exists
            ? `${d.date}\n${d.글자수.toLocaleString()}자 · 훈련 ${d.훈련완료}/5\n${
                d.source === "live" ? "원본 카드 기준" : "스냅샷 기준"
              }`
            : `${d.date}\n아직 기록 없음`;
          return (
            <div
              key={d.date}
              className={`week-cell ${isFocus ? "is-focus" : ""} ${d.exists ? "" : "is-empty"} ${d.source === "live" ? "is-live" : ""}`}
              data-tooltip={tooltip}
            >
              <div className="weekday">{d.요일}</div>
              <div className="bar-wrap">
                <div
                  className="bar"
                  style={{ height: `${Math.max(heightPct, d.exists ? 5 : 0)}%` }}
                />
              </div>
              <div className="chars">
                {d.exists && d.글자수 > 0 ? d.글자수.toLocaleString() : "-"}
              </div>
              <div className="completed">{d.exists ? `${d.훈련완료}/5` : ""}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricsPanel({ 누적 }: { 누적: Record<string, string> }) {
  const rows = [
    ["이번 달 총 글자수", 누적["이번 달 총 글자수"]],
    ["이번 달 훈련 완료", 누적["이번 달 훈련 완료"]],
    ["가장 약한 훈련", 누적["가장 약한 훈련"]],
    ["리스트", 누적["작품 진도 (리스트)"]],
    ["에샤", 누적["작품 진도 (에샤)"]],
  ].filter(([, value]) => Boolean(value));

  return (
    <section className="metrics-panel">
      <div className="section-head">
        <h3>월간 누적</h3>
        <span>진도</span>
      </div>
      <div className="metric-list">
        {rows.map(([label, value]) => (
          <div key={label} className="metric-line">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoachPanel({
  mom,
  hyerin,
}: {
  mom: string;
  hyerin: string;
}) {
  if (!mom.trim() && !hyerin.trim()) return null;
  return (
    <section className="coach-grid">
      {mom.trim() && <CommentBlock title="한나가 볼 것" text={mom} />}
      {hyerin.trim() && <CommentBlock title="혜린이에게" text={hyerin} />}
    </section>
  );
}

function CommentBlock({ title, text }: { title: string; text: string }) {
  return (
    <article className="comment-block">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function TrainingTrendPanel({ days }: { days: HyerinMonthResponse["days"] }) {
  const maxChars = Math.max(
    ...TRAINING_ORDER.flatMap((folder) => days.map((day) => day.훈련별?.[folder]?.글자수 ?? 0)),
    1,
  );

  return (
    <section className="training-trend-panel">
      <div className="section-head">
        <h3>훈련별 증가 흐름</h3>
        <span>최근 30일</span>
      </div>
      <div className="trend-rows">
        {TRAINING_ORDER.map((folder) => (
          <div key={folder} className="trend-row">
            <div className="trend-label">{TRAINING_LABELS[folder]}</div>
            <div className="trend-bars" aria-label={`${TRAINING_LABELS[folder]} 최근 30일 추이`}>
              {days.map((day) => {
                const metric = day.훈련별?.[folder];
                const chars = metric?.글자수 ?? 0;
                const cards = metric?.카드수 ?? 0;
                const height = Math.max((chars / maxChars) * 100, chars > 0 ? 8 : 0);
                return (
                  <div
                    key={`${folder}-${day.date}`}
                    className={`trend-bar ${chars > 0 ? "has-data" : ""}`}
                    style={{ height: `${height}%` }}
                    data-tooltip={`${day.date}\n${TRAINING_LABELS[folder]} · ${chars.toLocaleString()}자\n카드 ${cards}개 · ${metric?.완료 ? "완료" : "미완료"}`}
                    aria-label={`${day.date} ${TRAINING_LABELS[folder]} ${chars.toLocaleString()}자 카드 ${cards}개`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PastCommentsPanel({ days }: { days: HyerinMonthResponse["days"] }) {
  const commentDays = [...days]
    .reverse()
    .filter((day) => day.코멘트?.한나?.trim() || day.코멘트?.혜린?.trim())
    .slice(0, 8);

  if (commentDays.length === 0) return null;

  return (
    <section className="past-comments-panel">
      <div className="section-head">
        <h3>지난 코멘트</h3>
        <span>최근 기록</span>
      </div>
      <div className="past-comment-list">
        {commentDays.map((day) => (
          <article key={day.date} className="past-comment-card">
            <div className="past-comment-head">
              <strong>{formatShortDate(day.date)}</strong>
              <span>
                {day.글자수.toLocaleString()}자 · {day.훈련완료}/5
              </span>
            </div>
            {day.코멘트.한나.trim() && (
              <p>
                <b>한나</b>
                {day.코멘트.한나}
              </p>
            )}
            {day.코멘트.혜린.trim() && (
              <p>
                <b>혜린</b>
                {day.코멘트.혜린}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatShortDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function MonthChart({ days }: { days: HyerinMonthResponse["days"] }) {
  const allZero = days.every((d) => d.글자수 === 0);
  if (allZero) {
    return (
      <section className="month-chart">
        <div className="section-head">
          <h3>최근 30일</h3>
          <span>대기</span>
        </div>
        <p className="month-empty">데이터 쌓이는 중</p>
      </section>
    );
  }

  const width = 600;
  const height = 150;
  const pad = 20;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;
  const maxChars = Math.max(...days.map((d) => d.글자수), 1);
  const slot = chartW / days.length;

  return (
    <section className="month-chart">
      <div className="section-head">
        <h3>최근 30일</h3>
        <span>글자수와 점수</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="month-svg"
        preserveAspectRatio="none"
        role="img"
        aria-label="최근 30일 글자수 막대와 평균 점수 점"
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={pad}
            y1={height - pad - chartH * g}
            x2={width - pad}
            y2={height - pad - chartH * g}
            stroke="var(--line)"
            strokeDasharray="2 5"
          />
        ))}
        {days.map((d, i) => {
          const h = (d.글자수 / maxChars) * chartH;
          const x = pad + i * slot;
          const y = height - pad - h;
          return (
            <g key={d.date}>
              <rect
                x={x + 1.5}
                y={y}
                width={Math.max(slot - 3, 1)}
                height={Math.max(h, 0)}
                fill="var(--ink)"
                opacity={d.글자수 > 0 ? 0.82 : 0.12}
                rx="2"
                aria-label={`${d.date} · ${d.글자수.toLocaleString()}자 · 훈련 ${d.훈련완료}/5`}
              />
              {d.평균점수 > 0 && (
                <circle
                  cx={x + slot / 2}
                  cy={height - pad - (d.평균점수 / 10) * chartH}
                  r="2.8"
                  fill="var(--mint)"
                  aria-label={`${d.date} · 평균 점수 ${d.평균점수.toFixed(1)}`}
                />
              )}
            </g>
          );
        })}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--line)" />
      </svg>
      <div className="month-legend">
        <span>글자수</span>
        <span>평균 점수</span>
      </div>
    </section>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <section className="empty-state">
      <h2>아직 표시할 학습 기록이 없습니다.</h2>
      <p>{message ?? "오늘 학습 데이터가 아직 정리되지 않았어요."}</p>
    </section>
  );
}

function ErrorState({ errors }: { errors: string[] }) {
  return (
    <div className="hyerin-error">
      <strong>대시보드 API 호출 실패</strong>
      <pre>{errors.join("\n")}</pre>
      <p>
        Vercel 환경변수 <code>DASHBOARD_API_URL</code>, <code>DASHBOARD_API_KEY</code> 확인.
      </p>
    </div>
  );
}

const HYERIN_CSS = `
  .hyerin-dashboard {
    --paper: #F8F1E7;
    --surface: #FFFDF8;
    --surface-strong: #2B2B24;
    --ink: #292923;
    --muted: #746E64;
    --line: #E6D8C7;
    --amber: #DD9550;
    --amber-soft: #FFE8BE;
    --mint: #6C987E;
    --mint-soft: #E3F1E8;
    --peach: #EFA79E;
    --peach-soft: #FFE5DE;
    --blue-soft: #E7EFFB;
    --lilac-soft: #EFE6FA;
    --butter: #FFF3C9;
    --danger: #B65E43;

    min-height: 100vh;
    background:
      linear-gradient(rgba(255, 255, 255, 0.44) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.38) 1px, transparent 1px),
      linear-gradient(135deg, #F8F1E7 0%, #F7E8DE 48%, #EEF4E9 100%);
    background-size: 28px 28px, 28px 28px, auto;
    color: var(--ink);
    font-family: ui-sans-serif, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
    padding: 1.25rem;
  }
  .hyerin-dashboard * { box-sizing: border-box; }
  .hyerin-shell {
    position: relative;
    width: min(1120px, 100%);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .hyerin-shell::before {
    content: "✦";
    position: absolute;
    top: 0.35rem;
    right: 6.2rem;
    color: var(--peach);
    font-size: 1.25rem;
    font-weight: 900;
    transform: rotate(10deg);
    pointer-events: none;
  }
  .hyerin-header {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    padding: 0.35rem 0 0.65rem;
  }
  .eyebrow {
    margin: 0 0 0.35rem;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: var(--mint);
    font-weight: 800;
  }
  .hyerin-header h1 {
    margin: 0;
    font-size: clamp(1.55rem, 3.2vw, 2.55rem);
    line-height: 0.98;
    letter-spacing: 0;
    font-weight: 850;
  }
  .header-sub {
    margin: 0.45rem 0 0;
    color: var(--muted);
    font-size: 0.92rem;
  }
  .header-charms {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.65rem;
  }
  .header-charms span {
    border: 1px solid #E7CDBB;
    background: rgba(255, 253, 248, 0.72);
    border-radius: 0.35rem;
    color: #75574B;
    font-size: 0.74rem;
    font-weight: 800;
    padding: 0.28rem 0.58rem;
  }
  .header-charms span:nth-child(2) {
    border-color: #D7C7E8;
    color: #625177;
    background: rgba(239, 230, 250, 0.72);
  }
  .header-charms span:nth-child(3) {
    border-color: #C9DFC8;
    color: #4F735D;
    background: rgba(227, 241, 232, 0.78);
  }
  .date-badge {
    width: 3.7rem;
    aspect-ratio: 1;
    background: #2C2B24;
    color: #FFF8E8;
    display: grid;
    place-items: center;
    align-content: center;
    border-radius: 0.45rem;
    border: 2px solid #F0B6AC;
    box-shadow: 5px 5px 0 #F4D4BC;
  }
  .date-badge strong { font-size: 1.55rem; line-height: 1; }
  .date-badge span { font-size: 0.75rem; color: #F1DACB; }

  .command-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.25fr);
    gap: 0.75rem;
  }
  .status-panel,
  .action-panel,
  .trainings-section,
  .week-strip,
  .metrics-panel,
  .coach-panel,
  .comment-block,
  .training-trend-panel,
  .past-comments-panel,
  .month-chart,
  .empty-state {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    box-shadow: 0 1px 0 rgba(86, 73, 55, 0.05);
  }
  .status-panel {
    position: relative;
    overflow: hidden;
    padding: 1rem;
    background:
      linear-gradient(135deg, rgba(255, 243, 201, 0.12) 0 25%, transparent 25% 50%, rgba(255, 243, 201, 0.12) 50% 75%, transparent 75%),
      var(--surface-strong);
    background-size: 18px 18px, auto;
    color: var(--surface);
    border-color: #38372F;
  }
  .status-panel::after {
    content: "작가력";
    position: absolute;
    top: 0.72rem;
    right: 4.8rem;
    color: #332F27;
    background: var(--butter);
    border: 1px solid #E2C978;
    border-radius: 0.32rem;
    padding: 0.18rem 0.42rem;
    font-size: 0.68rem;
    font-weight: 900;
    transform: rotate(3deg);
  }
  .status-top {
    display: flex;
    justify-content: space-between;
    color: #D9D4C8;
    font-size: 0.82rem;
  }
  .status-top strong { color: var(--amber-soft); }
  .hero-metric {
    margin: 0.5rem 0 0.9rem;
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
  }
  .hero-metric strong {
    font-size: clamp(2.25rem, 6.2vw, 4rem);
    line-height: 0.92;
    letter-spacing: 0;
  }
  .hero-metric span { color: #D9D4C8; font-weight: 700; }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.45rem;
  }
  .metric-box {
    min-width: 0;
    background: rgba(255, 253, 248, 0.1);
    border: 1px solid rgba(255, 253, 248, 0.18);
    border-radius: 0.4rem;
    padding: 0.55rem 0.45rem;
  }
  .metric-box span {
    display: block;
    color: #C9C3B8;
    font-size: 0.68rem;
  }
  .metric-box strong {
    display: block;
    margin-top: 0.18rem;
    font-size: 0.95rem;
    color: var(--surface);
  }

  .action-panel {
    position: relative;
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background:
      linear-gradient(90deg, rgba(239, 167, 158, 0.18), transparent 38%),
      var(--surface);
    border-color: #E8C8B7;
  }
  .action-panel::before {
    content: "✎";
    position: absolute;
    right: 1rem;
    top: 0.8rem;
    color: var(--peach);
    font-size: 1.1rem;
    font-weight: 900;
  }
  .panel-label {
    color: #B16E5E;
    font-size: 0.75rem;
    font-weight: 800;
    margin-bottom: 0.45rem;
  }
  .action-panel h2 {
    margin: 0;
    font-size: clamp(1.05rem, 2.1vw, 1.55rem);
    line-height: 1.15;
    letter-spacing: 0;
  }
  .action-panel p,
  .coach-panel p {
    margin: 0.65rem 0 0;
    color: var(--muted);
    line-height: 1.55;
    font-size: 0.84rem;
  }
  .trainings-section {
    padding: 0.9rem;
    background:
      linear-gradient(180deg, rgba(255, 243, 201, 0.2), transparent 38%),
      var(--surface);
  }
  .section-title,
  .section-head h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: 0;
  }
  .section-title { margin-bottom: 0.65rem; }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.7rem;
  }
  .section-head span {
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 700;
  }
  .week-nav {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
  }
  .week-nav a {
    width: 1.65rem;
    height: 1.65rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line);
    border-radius: 0.35rem;
    background: var(--surface);
    color: var(--ink);
    font-size: 1rem;
    font-weight: 900;
    line-height: 1;
    text-decoration: none;
  }
  .week-nav a:hover {
    border-color: var(--mint);
    background: var(--mint-soft);
  }
  .trainings-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.55rem;
    align-items: start;
  }
  .training-card {
    position: relative;
    min-height: 7.1rem;
    border: 1px solid var(--line);
    border-radius: 0.45rem;
    padding: 0.7rem;
    background: #FAF2E8;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .training-card::before {
    content: "";
    position: absolute;
    top: -1px;
    left: 0.7rem;
    width: 2.1rem;
    height: 0.35rem;
    background: rgba(239, 167, 158, 0.58);
    border-radius: 0 0 0.25rem 0.25rem;
  }
  .training-card.done {
    background: var(--mint-soft);
    border-color: #AFC9BA;
  }
  .training-card.done:nth-child(2) {
    background: var(--mint-soft);
  }
  .training-card.done:nth-child(3) {
    background: var(--blue-soft);
    border-color: #BFD0E8;
  }
  .training-card.done:nth-child(4) {
    background: var(--peach-soft);
    border-color: #E9B9AD;
  }
  .training-card.done:nth-child(5) {
    background: var(--lilac-soft);
    border-color: #D2C2E6;
  }
  .training-card.empty {
    background: #F5EFE5;
    color: var(--muted);
    opacity: 0.78;
  }
  .training-card.open { grid-column: 1 / -1; }
  .training-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .training-name {
    font-size: 0.76rem;
    font-weight: 850;
  }
  .check {
    color: #7B5C3F;
    background: rgba(255, 253, 248, 0.65);
    border: 1px solid rgba(123, 92, 63, 0.18);
    border-radius: 0.35rem;
    display: inline-grid;
    place-items: center;
    width: 1.2rem;
    height: 1.2rem;
    font-weight: 900;
  }
  .training-line {
    color: var(--ink);
    font-size: 0.74rem;
    line-height: 1.48;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .detail-btn {
    align-self: flex-start;
    margin-top: auto;
    border: 1px solid var(--line);
    background: #FFF8ED;
    color: var(--ink);
    border-radius: 0.35rem;
    padding: 0.35rem 0.55rem;
    font-size: 0.75rem;
    font-weight: 800;
    cursor: pointer;
    font-family: inherit;
  }
  .detail-btn:hover:not(:disabled) {
    border-color: var(--peach);
    background: #FFF1E8;
  }
  .detail-btn:disabled { opacity: 0.6; cursor: wait; }
  .training-detail {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    max-height: 24rem;
    overflow-y: auto;
  }
  .detail-card { display: flex; flex-direction: column; gap: 0.35rem; }
  .detail-filename {
    color: var(--muted);
    font-size: 0.72rem;
    font-family: ui-monospace, monospace;
  }
  .detail-content {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--ink);
    font: inherit;
    font-size: 0.82rem;
    line-height: 1.6;
  }
  .detail-error {
    color: var(--danger);
    background: #FFF1EA;
    border: 1px solid #E0A28F;
    border-radius: 0.35rem;
    padding: 0.45rem 0.6rem;
    font-size: 0.8rem;
  }
  .detail-empty { color: var(--muted); font-size: 0.8rem; }

  .lower-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
    gap: 0.75rem;
  }
  .week-strip,
  .metrics-panel,
  .month-chart,
  .training-trend-panel,
  .past-comments-panel,
  .coach-panel {
    padding: 0.9rem;
  }
  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.35rem;
  }
  .week-cell {
    position: relative;
    min-width: 0;
    min-height: 6.3rem;
    border: 1px solid transparent;
    background: #F8F1E8;
    border-radius: 0.38rem;
    padding: 0.45rem 0.3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  .week-cell.is-focus {
    border-color: #8D7152;
    background: var(--butter);
    box-shadow: inset 0 0 0 2px rgba(255, 253, 248, 0.6);
  }
  .week-cell.is-live {
    box-shadow: inset 0 -3px 0 var(--mint);
  }
  .week-cell.is-focus.is-live {
    box-shadow:
      inset 0 0 0 2px rgba(255, 253, 248, 0.6),
      inset 0 -3px 0 var(--mint);
  }
  .week-cell.is-empty { opacity: 0.48; }
  .weekday {
    color: var(--muted);
    font-size: 0.74rem;
    font-weight: 800;
  }
  .bar-wrap {
    width: 100%;
    height: 2rem;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .bar {
    width: 58%;
    background: linear-gradient(180deg, var(--peach), var(--amber));
    border-radius: 2px 2px 0 0;
  }
  .chars {
    font-size: 0.78rem;
    font-weight: 850;
  }
  .completed {
    color: var(--muted);
    min-height: 0.85rem;
    font-size: 0.68rem;
  }
  .metric-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .metric-line {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.45rem;
    font-size: 0.86rem;
  }
  .metric-line:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .metric-line span { color: var(--muted); }
  .metric-line strong {
    text-align: right;
    color: var(--ink);
  }
  .coach-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .comment-block {
    background:
      linear-gradient(180deg, rgba(255, 243, 201, 0.18), transparent 45%),
      var(--surface);
    padding: 0.9rem;
    border-left: 4px solid var(--mint);
  }
  .comment-block:nth-child(2) {
    border-left-color: var(--peach);
    background:
      linear-gradient(180deg, rgba(255, 229, 222, 0.42), transparent 55%),
      var(--surface);
  }
  .comment-block h3 {
    margin: 0 0 0.45rem;
    font-size: 0.95rem;
  }
  .comment-block p {
    margin: 0;
    color: var(--ink);
    line-height: 1.58;
    white-space: pre-wrap;
    font-size: 0.9rem;
  }
  .training-trend-panel {
    padding: 0.9rem;
  }
  .trend-rows {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .trend-row {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr);
    align-items: center;
    gap: 0.75rem;
  }
  .trend-label {
    color: var(--ink);
    font-size: 0.78rem;
    font-weight: 800;
  }
  .trend-bars {
    height: 2.2rem;
    display: grid;
    grid-template-columns: repeat(30, minmax(2px, 1fr));
    align-items: end;
    gap: 0.13rem;
    border-bottom: 1px solid var(--line);
  }
  .trend-bar {
    position: relative;
    min-height: 2px;
    background: #E8E0D3;
    border-radius: 2px 2px 0 0;
  }
  .trend-bar.has-data {
    background: linear-gradient(180deg, var(--mint), #86B493);
  }
  .week-cell[data-tooltip]:hover::after,
  .trend-bar[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    z-index: 30;
    left: 50%;
    bottom: calc(100% + 0.5rem);
    transform: translateX(-50%);
    width: max-content;
    max-width: 13rem;
    padding: 0.45rem 0.55rem;
    border-radius: 0.34rem;
    background: #20231F;
    color: #FFFDF8;
    box-shadow: 0 10px 24px rgba(32, 35, 31, 0.2);
    font-size: 0.72rem;
    font-weight: 750;
    line-height: 1.42;
    text-align: left;
    white-space: pre-line;
    pointer-events: none;
  }
  .week-cell[data-tooltip]:hover::before,
  .trend-bar[data-tooltip]:hover::before {
    content: "";
    position: absolute;
    z-index: 31;
    left: 50%;
    bottom: calc(100% + 0.18rem);
    transform: translateX(-50%);
    border: 0.34rem solid transparent;
    border-top-color: #20231F;
    pointer-events: none;
  }
  .past-comments-panel {
    padding: 0.9rem;
  }
  .past-comment-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
    max-height: 24rem;
    overflow-y: auto;
    padding-right: 0.2rem;
  }
  .past-comment-card {
    position: relative;
    background: #FFF9EF;
    border: 1px solid var(--line);
    border-radius: 0.42rem;
    padding: 0.7rem;
  }
  .past-comment-card::before {
    content: "";
    position: absolute;
    top: -1px;
    right: 0.8rem;
    width: 1.6rem;
    height: 0.3rem;
    background: rgba(227, 196, 128, 0.68);
    border-radius: 0 0 0.2rem 0.2rem;
  }
  .past-comment-head {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    align-items: baseline;
    margin-bottom: 0.45rem;
  }
  .past-comment-head strong {
    font-size: 0.82rem;
  }
  .past-comment-head span {
    color: var(--muted);
    font-size: 0.7rem;
    text-align: right;
  }
  .past-comment-card p {
    margin: 0.45rem 0 0;
    color: var(--ink);
    font-size: 0.78rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  .past-comment-card b {
    display: inline-block;
    margin-right: 0.4rem;
    color: var(--mint);
    font-size: 0.72rem;
  }
  .month-svg {
    width: 100%;
    height: 150px;
    display: block;
  }
  .month-legend {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 0.45rem;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .month-chart rect {
    fill: #2B2B24;
  }
  .month-chart circle {
    fill: var(--peach);
  }
  .month-empty {
    margin: 0;
    color: var(--muted);
    text-align: center;
    padding: 1.5rem 0;
  }
  .empty-state {
    padding: 1.4rem;
  }
  .empty-state h2 {
    margin: 0 0 0.45rem;
    font-size: 1.2rem;
  }
  .empty-state p {
    margin: 0;
    color: var(--muted);
  }
  .hyerin-error {
    background: #FFF1EA;
    border: 1px solid #E0A28F;
    color: #6B311F;
    border-radius: 0.5rem;
    padding: 1rem;
  }
  .hyerin-error strong { display: block; margin-bottom: 0.45rem; }
  .hyerin-error pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.8rem;
  }
  .hyerin-error p {
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
  }
  .hyerin-error code {
    background: #FFE2D7;
    border-radius: 0.25rem;
    padding: 0.1rem 0.3rem;
  }

  @media (max-width: 900px) {
    .command-grid,
    .lower-grid,
    .coach-grid,
    .past-comment-list {
      grid-template-columns: 1fr;
    }
    .trainings-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 640px) {
    .hyerin-dashboard { padding: 0.85rem; }
    .hyerin-header { align-items: flex-start; }
    .date-badge { width: 3.5rem; }
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .trainings-grid { grid-template-columns: 1fr; }
    .week-grid { gap: 0.22rem; }
    .week-cell { min-height: 5.7rem; padding-inline: 0.15rem; }
    .chars { font-size: 0.68rem; }
    .trend-row { grid-template-columns: 1fr; gap: 0.35rem; }
  }
`;
