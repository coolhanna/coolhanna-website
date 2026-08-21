"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LifeDayResponse } from "@/lib/dashboard-api";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-3 sm:p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-semibold tracking-tight mb-2.5">{title}</h2>
      {children}
    </section>
  );
}

function parseTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const [, hourText, minute] = match;
  const hour = Number(hourText);
  const minuteNumber = Number(minute);
  if (hour < 0 || hour > 23 || minuteNumber < 0 || minuteNumber > 59) return null;
  return { hour, minute, minuteNumber };
}

function koreanTime(time: string) {
  const parsed = parseTime(time);
  if (!parsed) return "시간 미상";
  const { hour, minute } = parsed;
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;
  return `${period} ${displayHour}:${minute}`;
}

function timeValue(time: string) {
  const parsed = parseTime(time);
  if (!parsed) return Number.MAX_SAFE_INTEGER;
  return parsed.hour * 60 + parsed.minuteNumber;
}

function relativeTimeValue(time: string, dayStartTime: string) {
  const value = timeValue(time);
  const startValue = timeValue(dayStartTime);
  if (value === Number.MAX_SAFE_INTEGER || startValue === Number.MAX_SAFE_INTEGER) return value;
  return value < startValue ? value + 24 * 60 : value;
}

function timelineRangeLabel(items: LifeDayResponse["timeline"], fallback: string, dayStartTime: string) {
  if (!items?.length) return fallback;
  const first = items[0];
  const last = items[items.length - 1];
  const firstLabel = relativeTimeValue(first.time, dayStartTime) >= 24 * 60 ? `다음날 ${koreanTime(first.time)}` : koreanTime(first.time);
  const lastLabel = relativeTimeValue(last.time, dayStartTime) >= 24 * 60 ? `다음날 ${koreanTime(last.time)}` : koreanTime(last.time);
  return `${firstLabel}~${lastLabel}`;
}

function TimelineColumn({ label, items }: { label: string; items: LifeDayResponse["timeline"] }) {
  const safeItems = items || [];
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg-card-soft)", border: "1px solid var(--border)" }}>
      <h3 className="text-[10px] font-semibold mb-2.5" style={{ color: "var(--accent-text)" }}>{label}</h3>
      {safeItems.map((item, index) => (
        <div key={`${item.time}-${item.title}`} className="grid grid-cols-[66px_12px_1fr] gap-2 min-h-[52px]">
          <span className="text-[10px] text-muted pt-px whitespace-nowrap">{koreanTime(item.time)}</span>
          <span className="relative flex justify-center">
            <span className="z-10 w-2 h-2 rounded-full mt-0.5" style={{ background: "var(--accent)" }} />
            {index < safeItems.length - 1 && <span className="absolute top-2.5 -bottom-0.5 w-px" style={{ background: "var(--border)" }} />}
          </span>
          <div className="pb-2.5"><p className="text-xs font-medium leading-snug">{item.title}</p><p className="text-[11px] text-muted leading-relaxed mt-1">{item.detail}</p></div>
        </div>
      ))}
    </div>
  );
}

function shortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return `${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

function DayArchive({ days, activeDate }: { days: Array<{ date: string; headline: string; duration: string }>; activeDate?: string }) {
  if (days.length === 0) return null;
  return (
    <nav aria-label="지난 하루 기록" className="rounded-2xl px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[10px] text-muted whitespace-nowrap mr-1">지난 기록</span>
        {days.map((day) => {
          const active = day.date === activeDate;
          return (
            <Link key={day.date} href={`/dashboard/day?date=${encodeURIComponent(day.date)}`} title={day.headline} aria-current={active ? "page" : undefined} className="shrink-0 rounded-full px-3 py-1.5 text-[11px] transition" style={{ background: active ? "var(--accent)" : "var(--bg-card-soft)", color: active ? "white" : "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {shortDate(day.date)}{day.duration ? ` · ${day.duration}` : ""}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function LifeDayClient({ data, days }: { data: LifeDayResponse | { error: string }; days: Array<{ date: string; headline: string; duration: string }> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbackState, setFeedbackState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const processingStatus = "error" in data ? "idle" : data.feedback_processing?.status || "idle";
  const processingDate = "error" in data ? "" : data.date;

  useEffect(() => {
    if (!processingDate || !["pending", "processing"].includes(processingStatus)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/dashboard/proxy/life-day/${encodeURIComponent(processingDate)}`, { cache: "no-store" });
        if (!response.ok) return;
        const latest = (await response.json()) as LifeDayResponse;
        const latestStatus = latest.feedback_processing?.status || "idle";
        if (latestStatus === "complete" || latestStatus === "failed") window.location.reload();
      } catch {
        // 일시적인 연결 오류는 다음 폴링에서 다시 확인한다.
      }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [processingDate, processingStatus]);

  if ("error" in data) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink">
        <div className="max-w-page mx-auto px-5 sm:px-8 py-10 space-y-4">
          <DayArchive days={days} />
          <Section title="하루 기록을 불러오지 못했어요">
            <p className="text-sm text-muted">대시보드 API 연결을 확인한 뒤 페이지를 새로고침해 주세요.</p>
          </Section>
        </div>
      </main>
    );
  }

  if (!data.available) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink">
        <div className="max-w-page mx-auto px-5 sm:px-8 py-10 space-y-4">
          <DayArchive days={days} activeDate={data.date} />
          <Section title="하루 기록"><p className="text-sm text-muted">{shortDate(data.date)} 생활녹음 기록이 없습니다.</p></Section>
        </div>
      </main>
    );
  }

  const statusLabel = processingStatus === "pending" || processingStatus === "processing"
    ? "답변 반영 중"
    : processingStatus === "complete"
      ? "반영 완료"
      : processingStatus === "failed"
        ? "반영 확인 필요"
        : data.status === "feedback_applied"
          ? "피드백 저장"
          : data.status === "feedback_needed"
            ? "확인 필요"
            : "분석 기록";
  const timelineStartTime = data.timeline?.[0]?.time || "00:00";
  const timeline = [...(data.timeline || [])].sort((a, b) => relativeTimeValue(a.time, timelineStartTime) - relativeTimeValue(b.time, timelineStartTime));
  const timelineSplit = Math.ceil(timeline.length / 2);
  const firstTimeline = timeline.slice(0, timelineSplit);
  const secondTimeline = timeline.slice(timelineSplit);
  const conversations = data.conversations || [];
  const verbatimQuotes = data.verbatim_quotes || [];
  const speakerOrder = ["한나", "혜린", "남편", "타인", "화자 확인 필요"];
  const quoteGroups = Object.entries(Object.groupBy(verbatimQuotes, (item) => item.speaker || "화자 확인 필요"))
    .sort(([left], [right]) => {
      const leftIndex = speakerOrder.indexOf(left);
      const rightIndex = speakerOrder.indexOf(right);
      return (leftIndex < 0 ? speakerOrder.length : leftIndex) - (rightIndex < 0 ? speakerOrder.length : rightIndex);
    });
  const intake = data.intake || [];
  const signals = data.health_signals || [];
  const completed = data.completed || [];
  const pending = data.pending || [];
  const ideas = data.ideas || [];
  const shopping = data.shopping || [];
  const questions = (data.questions || []).filter((question) => question.status !== "answered");
  const weather = data.weather;
  const activeDate = data.date;

  async function saveFeedback() {
    const submitted = Object.fromEntries(Object.entries(answers).filter(([, value]) => value.trim()));
    if (Object.keys(submitted).length === 0) return;
    setFeedbackState("saving");
    try {
      const response = await fetch(`/api/dashboard/proxy/life-day/${encodeURIComponent(activeDate)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: submitted }),
      });
      if (!response.ok) throw new Error(`feedback ${response.status}`);
      const result = (await response.json()) as { note_synced?: boolean; processing_status?: string };
      if (result.processing_status !== "pending") throw new Error("feedback recomposition was not queued");
      setFeedbackState("saved");
      window.location.reload();
    } catch {
      setFeedbackState("error");
    }
  }

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="max-w-page mx-auto px-5 sm:px-8 py-5 space-y-3">
        <DayArchive days={days} activeDate={data.date} />

        {(processingStatus === "pending" || processingStatus === "processing" || processingStatus === "complete" || processingStatus === "failed") && (
          <div className="rounded-xl px-3 py-2.5 text-[11px]" style={{ background: processingStatus === "failed" ? "var(--danger-soft)" : "var(--accent-soft)", color: processingStatus === "failed" ? "var(--danger-text)" : "var(--accent-text)", border: "1px solid var(--border)" }}>
            {processingStatus === "pending" && "답변을 저장했어요. 전체 기록 재구성을 기다리고 있어요."}
            {processingStatus === "processing" && "답변을 바탕으로 요약·시간표·식사·완료 목록을 다시 구성하고 있어요."}
            {processingStatus === "complete" && "답변이 전체 기록에 반영됐어요."}
            {processingStatus === "failed" && "답변은 안전하게 저장됐지만 전체 기록 반영을 마치지 못했어요. 새벽 분석에서 다시 반영하고, 문제가 계속되면 알려드릴게요."}
          </div>
        )}

        <section className="rounded-2xl p-3.5 sm:p-4" style={{ background: "var(--bg-card)", border: "1.5px solid var(--accent)", boxShadow: "0 2px 10px rgba(70,80,60,.04)" }}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-muted">{data.date} · 생활녹음 {data.recording?.duration}</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={() => window.location.reload()} aria-label="최신 기록 새로고침" className="text-[11px] px-2.5 py-1.5 rounded-full whitespace-nowrap" style={{ background: "var(--secondary-soft)", color: "var(--secondary-text)", border: "1px solid var(--border)" }}>↻ 새로고침</button>
                {data.source_note && <a href={`obsidian://open?vault=${encodeURIComponent("Obsidian Vault")}&file=${encodeURIComponent(data.source_note)}`} className="text-[11px] px-2.5 py-1.5 rounded-full whitespace-nowrap" style={{ background: "var(--bg-card-soft)", color: "var(--accent-text)", border: "1px solid var(--border)" }}>원본 기록 열기</a>}
                <span className="text-[11px] px-2.5 py-1.5 rounded-full whitespace-nowrap" style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}>{statusLabel}</span>
              </div>
            </div>
            <div className="max-w-5xl mx-auto mt-3">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight leading-relaxed text-balance">{data.headline}</h1>
              <p className="text-[11px] sm:text-xs text-muted leading-[1.85] mt-2.5 max-w-4xl">{data.summary}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
            {[
              ["녹음 구간", data.recording?.ranges?.join(" · ") || "─"],
              ["녹음 공백", data.recording?.gap || "없음"],
              ["함께한 사람", (data.people || []).join(" · ") || "─"],
              ["주요 장소", (data.places || []).join(" · ") || "─"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl p-2.5" style={{ background: "var(--bg-card-soft)", border: "1px solid var(--border)" }}>
                <p className="text-[10px] text-muted mb-1">{label}</p><p className="text-[11px] sm:text-xs font-medium leading-relaxed">{value}</p>
              </div>
            ))}
          </div>
          {weather?.summary && (
            <div className="mt-2.5 rounded-xl px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
              <span className="text-[10px] font-semibold" style={{ color: "var(--accent-text)" }}>오늘의 환경</span>
              <span className="text-[11px] font-medium">{weather.summary}</span>
              {weather.location && <span className="text-[10px] text-muted">{weather.location}</span>}
            </div>
          )}
          <p className="text-[10px] text-muted mt-3">시간은 녹음기 파일의 시작 시각과 녹음 내 위치를 기준으로 계산</p>
        </section>

        {questions.length > 0 && (
          <Section title="한나 확인">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-xl p-3" style={{ background: index % 3 === 1 ? "var(--secondary-soft)" : index % 3 === 2 ? "var(--danger-soft)" : "var(--bg-card-soft)", border: "1px solid var(--border)" }}>
                  <p className="text-[10px] font-semibold" style={{ color: index % 3 === 1 ? "var(--secondary-text)" : index % 3 === 2 ? "var(--danger-text)" : "var(--accent-text)" }}>{index + 1} · {question.category}</p>
                  <p className="text-xs font-medium mt-1">{question.question}</p>
                  {question.status === "answered" ? (
                    <p className="text-[11px] leading-relaxed mt-2" style={{ color: "var(--accent-text)" }}>한나 답변 · {question.answer}</p>
                  ) : (
                    <textarea value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} rows={2} placeholder="편하게 답해주세요" className="mt-2 w-full resize-y rounded-lg px-3 py-2 text-[11px] outline-none" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                  )}
                </div>
              ))}
            </div>
            {questions.some((question) => question.status !== "answered") && (
              <div className="mt-3 flex items-center gap-3">
                <button type="button" onClick={saveFeedback} disabled={feedbackState === "saving" || !Object.values(answers).some((value) => value.trim())} className="rounded-lg px-3 py-2 text-[11px] font-medium disabled:opacity-40" style={{ background: "var(--accent)", color: "white" }}>{feedbackState === "saving" ? "저장 중" : "답변 반영"}</button>
                {feedbackState === "error" && <span className="text-[10px]" style={{ color: "var(--danger-text)" }}>저장하지 못했어요. 다시 시도해 주세요.</span>}
              </div>
            )}
          </Section>
        )}

        {verbatimQuotes.length > 0 && (
          <Section title="그날 실제로 나온 말">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {quoteGroups.map(([speaker, items], groupIndex) => (
                <div key={speaker} className="rounded-xl p-3" style={{ background: groupIndex % 3 === 1 ? "var(--secondary-soft)" : groupIndex % 3 === 2 ? "var(--danger-soft)" : "var(--bg-card-soft)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between gap-2 pb-1.5"><h3 className="text-xs font-semibold">{speaker}</h3><span className="text-[10px] text-muted">{items?.length || 0}문장</span></div>
                  {(items || []).sort((left, right) => relativeTimeValue(left.time, timelineStartTime) - relativeTimeValue(right.time, timelineStartTime)).map((item, index) => (
                    <article key={`${item.time}-${index}`} className="grid grid-cols-[64px_1fr] gap-2.5 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <p className="text-[10px] text-muted">{koreanTime(item.time)}</p>
                      <blockquote className="text-xs font-medium leading-relaxed">“{item.quote}”</blockquote>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="시간대별 하루">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TimelineColumn label={timelineRangeLabel(firstTimeline, "앞 시간대", timelineStartTime)} items={firstTimeline} />
            <TimelineColumn label={timelineRangeLabel(secondTimeline, "뒤 시간대", timelineStartTime)} items={secondTimeline} />
          </div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-[.9fr_1.1fr] gap-4">
          <Section title="몸·식사·음료">
            <div className="grid grid-cols-2 gap-2">
              {intake.map((item) => <div key={`${item.label}-${item.value}`} className="rounded-xl p-3" style={{ background: "var(--bg-card-soft)" }}><p className="text-[10px] text-muted mb-1">{item.label}</p><p className="text-xs font-medium leading-relaxed">{item.value}</p></div>)}
            </div>
            <div className="mt-3 space-y-2">
              {signals.map((signal) => <div key={signal.title} className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: signal.level === "warning" ? "var(--danger-soft)" : "var(--accent-soft)", color: signal.level === "warning" ? "var(--danger-text)" : "var(--accent-text)" }}><strong>{signal.title}</strong><p className="mt-1">{signal.detail}</p></div>)}
            </div>
          </Section>
          <Section title="실행한 일과 남은 일">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div><h3 className="text-xs font-semibold mb-2" style={{ color: "var(--success)" }}>오늘 한 일</h3>{completed.map((item) => <p key={item} className="text-xs py-1.5">✓ {item}</p>)}</div>
              <div><h3 className="text-xs font-semibold mb-2">남은 일</h3>{pending.map((item) => <p key={item} className="text-xs py-1.5">□ {item}</p>)}</div>
            </div>
          </Section>
        </div>

        <Section title="사람별 대화 · 맥락 · 한나의 관점">
          <div className="space-y-2">
            {conversations.map((conversation, index) => {
              const key = `${conversation.person}-${conversation.topic}-${index}`;
              const isOpen = expanded === key;
              return (
                <button key={key} type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : key)} className="w-full rounded-xl p-3 text-left transition" style={{ border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`, background: isOpen ? "var(--accent-soft)" : "var(--bg-card)" }}>
                  <div className="flex flex-wrap items-baseline gap-2"><span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card-soft)", color: "var(--text-secondary)" }}>{conversation.person}</span><strong className="text-sm">{conversation.topic}</strong></div>
                  <p className="text-xs leading-relaxed mt-2.5">{conversation.viewpoint}</p>
                  <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--accent-text)" }}>“{conversation.quote}”</p>
                  <p className="text-[10px] text-muted mt-3">{isOpen ? "접기" : "상황과 관계 맥락 펼치기"}</p>
                  {isOpen && <p className="text-xs leading-6 whitespace-pre-line mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>{conversation.detail}</p>}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="일·사업·콘텐츠에서 나온 생각">
          <div className="space-y-2">{ideas.map((idea, index) => <div key={idea} className="flex gap-3 rounded-xl p-3" style={{ background: "var(--bg-card-soft)" }}><span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>{String(index + 1).padStart(2, "0")}</span><p className="text-xs leading-relaxed">{idea}</p></div>)}</div>
          <p className="text-[10px] text-muted mt-3">아이디어는 운영 일정으로 자동 승격하지 않으며, 한나가 확정한 뒤에만 할 일·캘린더로 이동</p>
        </Section>

        <Section title="마트 장보기 · 품목별 기록">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shopping.map((item) => <div key={item.item} className="flex items-start justify-between gap-3 rounded-xl p-3" style={{ background: "var(--bg-card-soft)" }}><span className="text-xs">{item.item}</span><span className="text-[10px] text-muted whitespace-nowrap">{item.state}</span></div>)}
          </div>
          <p className="text-[10px] text-muted mt-3">영수증이 없는 날은 녹음에서 들리는 품목을 기록하고, 최종 구매·구매 가능성·검토만 한 상품을 구분</p>
        </Section>
      </div>
    </main>
  );
}
