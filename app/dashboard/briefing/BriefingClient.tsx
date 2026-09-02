"use client";

// 브리핑 탭 — 새벽 브리핑 아카이브 + 질문 보드 (2026-08-15 한나:
// "질문에 어디다 답해야 할지 모르겠고 지나가 버린다. 대시보드에서 체계적으로 쌓이는 걸 보고 싶다")
// 텔레그램 발송은 유지 — 여기는 같은 브리핑이 쌓이고, 질문에 답하는 자리.

import { useState } from "react";
import Link from "next/link";

interface BoardQuestion {
  id: string;
  date: string;
  question: string;
  status: "open" | "answered";
  answer: string;
  answered_at: string;
  applied: boolean;
}

interface BriefingResponse {
  dates?: string[];
  date?: string;
  content?: string;
  questions?: BoardQuestion[];
  open?: BoardQuestion[];
  answered_recent?: BoardQuestion[];
  error?: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}.${d.getDate()} ${WEEKDAYS[d.getDay()]}`;
}

function daysOpen(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso + "T08:00:00").getTime()) / 86400000));
}

// 브리핑 md 간이 렌더 — 헤딩·볼드·리스트만 (브리핑 형식이 단순해서 충분)
function MdLite({ md }: { md: string }) {
  const bold = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part
    );
  return (
    <div className="text-[13px] leading-[1.8]">
      {md.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return <h2 key={i} className="text-[14px] font-bold mt-5 mb-1.5 pb-1" style={{ borderBottom: "1px solid var(--border)" }}>{bold(line.slice(3))}</h2>;
        }
        if (line.startsWith("### ")) {
          return <h3 key={i} className="text-[12px] font-semibold mt-3 mb-1" style={{ color: "var(--text-secondary)" }}>{bold(line.slice(4))}</h3>;
        }
        if (line.startsWith("# ")) {
          return <h1 key={i} className="text-[16px] font-extrabold mb-2">{bold(line.slice(2))}</h1>;
        }
        if (/^\s*[-•]\s+/.test(line)) {
          return <p key={i} className="pl-4 py-0.5" style={{ textIndent: "-0.8em", paddingLeft: "1.6em" }}>• {bold(line.replace(/^\s*[-•]\s+/, ""))}</p>;
        }
        if (/^\s*\d+\.\s+/.test(line)) {
          return <p key={i} className="pl-4 py-0.5">{bold(line.trim())}</p>;
        }
        if (line.startsWith("> ")) {
          return <p key={i} className="pl-3 py-0.5" style={{ borderLeft: "3px solid var(--border)", color: "var(--text-secondary)" }}>{bold(line.slice(2))}</p>;
        }
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i} className="py-0.5">{bold(line)}</p>;
      })}
    </div>
  );
}

function QuestionCard({
  q,
  value,
  onChange,
}: {
  q: BoardQuestion;
  value?: string;
  onChange?: (id: string, text: string) => void;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg-card, #fff)", border: "1px solid var(--border)" }}>
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: "var(--accent-text)" }}>
          {dayLabel(q.date)}
        </span>
        {q.status === "open" && daysOpen(q.date) >= 1 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#FDE8E4", color: "#9C3A1F" }}>
            {daysOpen(q.date)}일째 열려 있음
          </span>
        )}
      </div>
      <p className="text-[13px] font-medium leading-relaxed mt-1">{q.question}</p>
      {q.status === "answered" ? (
        <div className="mt-2 rounded-lg px-3 py-2 text-[12px] leading-relaxed" style={{ background: "var(--bg-card-soft, #faf9f5)" }}>
          <b className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            내 답변 · {q.answered_at.slice(5, 10).replace("-", "/")}
            {q.applied && " · 반영됨"}
          </b>
          <p className="mt-0.5 whitespace-pre-line">{q.answer}</p>
        </div>
      ) : (
        <textarea
          value={value || ""}
          onChange={(e) => onChange?.(q.id, e.target.value)}
          rows={2}
          placeholder="편하게 답해줘 — 아래 저장 버튼 하나로 한꺼번에 저장돼"
          className="mt-2 w-full resize-y rounded-lg px-3 py-2 text-[12px] outline-none"
          style={{ background: "var(--bg-card-soft, #faf9f5)", border: "1px solid var(--border)" }}
        />
      )}
    </div>
  );
}

export default function BriefingClient({ data }: { data: BriefingResponse }) {
  if (data.error || !data.dates) {
    return <main className="max-w-page mx-auto px-5 sm:px-8 py-8 text-[13px]" style={{ color: "var(--danger, #b3261e)" }}>{data.error || "브리핑 없음"}</main>;
  }
  const open = data.open || [];
  const answered = data.answered_recent || [];
  const [showAnswered, setShowAnswered] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const setAnswer = (id: string, text: string) => setAnswers((cur) => ({ ...cur, [id]: text }));

  async function saveAll() {
    const filled = Object.entries(answers).filter(([, v]) => v.trim());
    if (filled.length === 0) return;
    setSaveState("saving");
    try {
      for (const [id, answer] of filled) {
        const r = await fetch("/api/dashboard/proxy/briefing/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, answer: answer.trim() }),
        });
        if (!r.ok) throw new Error(String(r.status));
      }
      window.location.reload();
    } catch {
      setSaveState("error");
    }
  }

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="max-w-page mx-auto px-5 sm:px-8 py-6">
      {/* 날짜 아카이브 */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
        <span className="text-[10px] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>지난 브리핑</span>
        {data.dates.map((d) => (
          <Link
            key={d}
            href={`/dashboard/briefing?date=${d}`}
            className="shrink-0 rounded-full px-3 py-1.5 text-[11px]"
            style={{
              backgroundColor: d === data.date ? "var(--accent)" : "transparent",
              color: d === data.date ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {dayLabel(d)}
          </Link>
        ))}
      </nav>

      {/* 열린 질문 보드 — 답 안 한 질문은 사라지지 않는다 */}
      {open.length > 0 && (
        <section className="mb-5">
          <h2 className="text-[14px] font-bold mb-2">
            ❓ 열린 질문 {open.length}개
            <span className="font-normal text-[11px] ml-2" style={{ color: "var(--text-secondary)" }}>
              답하면 다음날 새벽에 회수해서 정본·판단에 반영
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {open.map((q) => <QuestionCard key={q.id} q={q} value={answers[q.id]} onChange={setAnswer} />)}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={saveAll}
              disabled={saveState === "saving" || !Object.values(answers).some((v) => v.trim())}
              className="rounded-lg px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: "var(--accent, #4a5c3a)" }}
            >
              {saveState === "saving" ? "저장 중…" : "답변 전체 저장"}
            </button>
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>적은 것만 저장돼 — 나머지는 열려 있음으로 남아</span>
            {saveState === "error" && <span className="text-[11px]" style={{ color: "var(--danger-text, #b3261e)" }}>일부 저장 실패 — 다시 눌러줘</span>}
          </div>
        </section>
      )}

      {/* 그날 브리핑 전문 */}
      <section className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid var(--border)" }}>
        <MdLite md={data.content || ""} />
      </section>

      {/* 답한 질문 — 답하면 화면에서 치운다. 기록은 남기되 접어둔다.
          (2026-09-02 한나: "답변을 남겼으면 사라져야 되는데 밑으로 계속 쌓여") */}
      {answered.length > 0 && (
        <section className="mt-5">
          <button
            type="button"
            onClick={() => setShowAnswered((v) => !v)}
            className="text-[12px] px-3 py-1.5 rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            답한 질문 {answered.length}개 {showAnswered ? "접기 ↑" : "보기 ↓"}
          </button>
          {showAnswered && (
            <div className="flex flex-col gap-2 mt-2">
              {answered.map((q) => <QuestionCard key={q.id} q={q} />)}
            </div>
          )}
        </section>
      )}
      </div>
    </main>
  );
}
