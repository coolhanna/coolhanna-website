"use client";

import { useState } from "react";
import Link from "next/link";
import type { LifeDayResponse } from "@/lib/dashboard-api";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-semibold tracking-tight mb-3">{title}</h2>
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
  return parsed ? parsed.hour * 60 + parsed.minuteNumber : Number.MAX_SAFE_INTEGER;
}

function hourValue(time: string) {
  return parseTime(time)?.hour ?? 24;
}

function TimelineColumn({ label, items }: { label: string; items: LifeDayResponse["timeline"] }) {
  const safeItems = items || [];
  return (
    <div className="rounded-xl p-3 sm:p-4" style={{ background: "var(--bg-card-soft)", border: "1px solid var(--border)" }}>
      <h3 className="text-[10px] font-semibold mb-3" style={{ color: "var(--accent-text)" }}>{label}</h3>
      {safeItems.map((item, index) => (
        <div key={`${item.time}-${item.title}`} className="grid grid-cols-[66px_12px_1fr] gap-2 min-h-[62px]">
          <span className="text-[10px] text-muted pt-px whitespace-nowrap">{koreanTime(item.time)}</span>
          <span className="relative flex justify-center">
            <span className="z-10 w-2 h-2 rounded-full mt-0.5" style={{ background: "var(--accent)" }} />
            {index < safeItems.length - 1 && <span className="absolute top-2.5 -bottom-0.5 w-px" style={{ background: "var(--border)" }} />}
          </span>
          <div className="pb-3.5"><p className="text-xs font-medium leading-snug">{item.title}</p><p className="text-[11px] text-muted leading-relaxed mt-1">{item.detail}</p></div>
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

  const statusLabel = data.status === "feedback_applied" ? "피드백 반영" : data.status === "feedback_needed" ? "확인 필요" : "분석 기록";
  const timeline = [...(data.timeline || [])].sort((a, b) => timeValue(a.time) - timeValue(b.time));
  const morningTimeline = timeline.filter((item) => hourValue(item.time) < 12);
  const afternoonTimeline = timeline.filter((item) => hourValue(item.time) >= 12);
  const conversations = data.conversations || [];
  const intake = data.intake || [];
  const signals = data.health_signals || [];
  const completed = data.completed || [];
  const pending = data.pending || [];
  const ideas = data.ideas || [];
  const shopping = data.shopping || [];

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="max-w-page mx-auto px-5 sm:px-8 py-6 space-y-4">
        <DayArchive days={days} activeDate={data.date} />

        <section className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--bg-card)", border: "1.5px solid var(--accent)", boxShadow: "0 2px 10px rgba(70,80,60,.04)" }}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted mb-1.5">{data.date} · 생활녹음 {data.recording?.duration}</p>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight leading-relaxed max-w-4xl">{data.headline}</h1>
              <p className="text-[11px] sm:text-xs text-muted leading-relaxed mt-2.5 max-w-4xl">{data.summary}</p>
            </div>
            <span className="text-[11px] px-2.5 py-1.5 rounded-full whitespace-nowrap self-start" style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}>{statusLabel}</span>
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
          <p className="text-[10px] text-muted mt-3">시간은 녹음기 파일의 시작 시각과 녹음 내 위치를 기준으로 계산</p>
        </section>

        <Section title="시간대별 하루">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TimelineColumn label="오전" items={morningTimeline} />
            <TimelineColumn label="오후" items={afternoonTimeline} />
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
          <div className="space-y-3">
            {conversations.map((conversation, index) => {
              const key = `${conversation.person}-${conversation.topic}-${index}`;
              const isOpen = expanded === key;
              return (
                <button key={key} type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : key)} className="w-full rounded-xl p-4 text-left transition" style={{ border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`, background: isOpen ? "var(--accent-soft)" : "var(--bg-card)" }}>
                  <div className="flex flex-wrap items-baseline gap-2"><span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card-soft)", color: "var(--text-secondary)" }}>{conversation.person}</span><strong className="text-sm">{conversation.topic}</strong></div>
                  <p className="text-xs leading-relaxed mt-2.5">{conversation.viewpoint}</p>
                  <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--accent-text)" }}>“{conversation.quote}”</p>
                  <p className="text-[10px] text-muted mt-3">{isOpen ? "접기" : "상황과 관계 맥락 펼치기"}</p>
                  {isOpen && <p className="text-xs leading-relaxed mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>{conversation.detail}</p>}
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
