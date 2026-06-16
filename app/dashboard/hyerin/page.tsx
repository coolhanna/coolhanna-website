import type { Metadata } from "next";
import {
  dash,
  type HyerinTodayResponse,
  type HyerinWeekResponse,
  type HyerinMonthResponse,
  type HyerinDiaryStateResponse,
} from "@/lib/dashboard-api";
import TrainingsRow from "./TrainingsRow";
import HyerinDiaryClient from "./HyerinDiaryClient";

export const metadata: Metadata = {
  title: "혜린이 다이어리 — 쿨한나",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function isApiError<T>(x: T | { error: string }): x is { error: string } {
  return typeof x === "object" && x !== null && "error" in (x as object);
}

export default async function HyerinPage() {
  const [diary, today, week, month] = await Promise.all([
    dash.hyerinDiaryState(),
    dash.hyerinToday(),
    dash.hyerinWeek(),
    dash.hyerin30Days(),
  ]);

  const errors = [
    isApiError(diary) ? `diary: ${diary.error}` : null,
    isApiError(today) ? `today: ${today.error}` : null,
    isApiError(week) ? `week: ${week.error}` : null,
    isApiError(month) ? `month: ${month.error}` : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <div className="hyerin-page">
      <style>{PAGE_CSS}</style>
      <div className="hyerin-inner">
        {errors.length > 0 && (
          <div className="api-err">
            <strong>일부 API 호출 실패</strong>
            <pre>{errors.join("\n")}</pre>
          </div>
        )}

        {!isApiError(diary) && (
          <HyerinDiaryClient initial={diary as HyerinDiaryStateResponse} />
        )}

        {!isApiError(today) && !isApiError(week) && !isApiError(month) && (
          <YesterdayLearning
            today={today as HyerinTodayResponse}
            week={week as HyerinWeekResponse}
            month={month as HyerinMonthResponse}
          />
        )}
      </div>
    </div>
  );
}

function YesterdayLearning({
  today,
  week,
  month,
}: {
  today: HyerinTodayResponse;
  week: HyerinWeekResponse;
  month: HyerinMonthResponse;
}) {
  if (!today.exists) return null;

  const summary = today.summary;
  const 누적 = today.누적_지표 ?? {};
  void week;

  return (
    <div className="yest-card">
      <div className="yest-head">
        <span className="yest-title">어제 학습 · {today.date}</span>
        <div className="yest-meta">
          {summary && (
            <>
              <span>📝 {summary.글자수_오늘.toLocaleString()}자</span>
              <span>⭐ {summary.평균_점수.toFixed(1)}/10</span>
              <span>🔥 {summary.연속_일수}일 연속</span>
            </>
          )}
        </div>
      </div>

      <TrainingsRow 한줄평={today.한줄평 ?? {}} date={today.date} />

      {today.한나용_코멘트 && (
        <div className="ymom">
          <span className="who-m">👩 엄마</span>
          <p>{today.한나용_코멘트}</p>
        </div>
      )}
      {today.혜린용_코멘트 && (
        <div className="yhy">
          <span className="who-h">💗 혜린</span>
          <p>{today.혜린용_코멘트}</p>
        </div>
      )}

      <details className="ymore">
        <summary>
          ▾ 30일 그래프 · 이번 주 흐름 · 누적 지표
        </summary>
        <div className="ymore-body">
          <Week30Chart days={month.days} />
          <div className="acc-grid">
            {Object.entries(누적).map(([k, v]) => (
              <div key={k} className="acc-item">
                <span className="acc-k">{k}</span>
                <span className="acc-v">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function Week30Chart({ days }: { days: HyerinMonthResponse["days"] }) {
  const allZero = days.every((d) => d.글자수 === 0);
  if (allZero) {
    return <p className="empty-chart">데이터 쌓이는 중...</p>;
  }
  const W = 600;
  const H = 100;
  const PAD = 16;
  const cW = W - PAD * 2;
  const cH = H - PAD * 2;
  const max = Math.max(...days.map((d) => d.글자수), 1);
  const slot = cW / days.length;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "auto", aspectRatio: `${W} / ${H}` }}
      role="img"
      aria-label="최근 30일 글자수 막대"
    >
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#EFE5DA" />
      {days.map((d, i) => {
        const h = (d.글자수 / max) * cH;
        return (
          <rect
            key={d.date}
            x={PAD + i * slot + 0.5}
            y={H - PAD - h}
            width={Math.max(slot - 1, 1)}
            height={Math.max(h, 0)}
            fill="#E89B7C"
            rx="1.5"
          />
        );
      })}
    </svg>
  );
}

const PAGE_CSS = `
  .hyerin-page {
    min-height: 100vh;
    background: #F4F2EC;
    padding: 1rem;
    font-family: ui-sans-serif, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  }
  .hyerin-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }
  .api-err {
    background: #FFF1EC;
    border: 1px solid #E89B7C;
    color: #6B3A1A;
    border-radius: 10px;
    padding: 0.75rem 1rem;
  }
  .api-err pre {
    margin: 0.4rem 0 0;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, monospace;
  }

  /* 어제 학습 카드 */
  .yest-card {
    background: linear-gradient(180deg, #FFFBF1 0%, #FFFFFF 100%);
    border: 1px solid #FAC775;
    border-radius: 14px;
    padding: 0.9rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    box-shadow: 0 1px 3px rgba(186, 117, 23, 0.08);
  }
  .yest-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px dashed #FAC775;
  }
  .yest-title { font-size: 14px; font-weight: 700; color: #633806; display: inline-flex; align-items: center; gap: 6px; }
  .yest-title::before { content: "🕓"; font-size: 16px; }
  .yest-meta {
    display: flex;
    gap: 0.65rem;
    font-size: 11px;
    color: #8B7D75;
    margin-left: auto;
    flex-wrap: wrap;
  }
  .yest-meta span {
    background: #FFFFFF;
    border: 1px solid #FAC775;
    border-radius: 999px;
    padding: 2px 10px;
    color: #633806;
    font-weight: 500;
  }
  .ymom, .yhy {
    display: flex;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.55;
  }
  .ymom { background: #FFF8EC; border-left: 3px solid #D4A04F; color: #633806; }
  .yhy { background: #FBEAF0; border-left: 3px solid #ED93B1; color: #72243E; }
  .ymom .who-m, .yhy .who-h { font-weight: 600; flex-shrink: 0; }
  .ymom .who-m { color: #993C1D; }
  .yhy .who-h { color: #993556; }
  .ymom p, .yhy p { margin: 0; }
  .ymore {
    border-top: 1px dashed #EFE5DA;
    padding-top: 0.5rem;
  }
  .ymore summary {
    cursor: pointer;
    font-size: 11px;
    color: #8B7D75;
    list-style: none;
    padding: 4px 0;
  }
  .ymore summary::-webkit-details-marker { display: none; }
  .ymore-body {
    padding-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .empty-chart {
    text-align: center;
    color: #8B7D75;
    font-size: 11px;
    margin: 0;
    padding: 1rem 0;
  }
  .acc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 6px;
  }
  .acc-item {
    background: #F4F2EC;
    border-radius: 6px;
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }
  .acc-k { color: #8B7D75; }
  .acc-v { color: #3A2F2A; font-weight: 500; }

  /* TrainingsRow 안 스타일은 기존 그대로 (별도 페이지 색) */
  .yest-card .trainings-section {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
    margin: 0 !important;
  }
  .yest-card .section-title { font-size: 12px; margin-bottom: 4px; color: #8B7D75; }
`;
