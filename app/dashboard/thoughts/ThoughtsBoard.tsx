"use client";

// 생각(사고흐름) — 한나의 음성 생각기록을 시간순으로 쌓고, 키워드로 훑고, 감정 지형으로 본다.
// 유형으로 가두지 않는다(한나 방침). 데이터: Vault 사고흐름/*.md → dashboard_api /thoughts.

import { useCallback, useEffect, useMemo, useState } from "react";
import { callApi } from "@/lib/dashboard-client";

interface Section {
  h: string;
  body: string;
}

interface Thought {
  id: string;
  date: string;
  time: string;
  duration: string;
  title: string;
  summary: string;
  context: string;
  emotion: string;
  importance: number;
  topics: string[];
  keywords: string[];
  sections: Section[];
}

interface KeywordCount {
  word: string;
  count: number;
}

interface EmotionMonth {
  month: string;
  무거움: number;
  중립: number;
  밝음: number;
}

interface ThoughtsResponse {
  items: Thought[];
  total: number;
  keywords: KeywordCount[];
  emotion: EmotionMonth[];
}

interface ThoughtReport {
  kind: string; // 주간 | 월간
  label: string;
  period: string;
  count: string;
  generated: string;
  markdown: string;
}

// 감정 → 색 (무거움=진회청 / 중립=회색 / 밝음=따뜻)
const EMO: Record<string, { bar: string; chip: string; fg: string; label: string }> = {
  무거움: { bar: "#3E4C63", chip: "#E4E8EF", fg: "#3E4C63", label: "무거움" },
  중립: { bar: "#9AA3AE", chip: "#EDEFF1", fg: "#5A626C", label: "중립" },
  밝음: { bar: "#E0A052", chip: "#FBEEDD", fg: "#8A5A1E", label: "밝음" },
};

function emo(e: string) {
  return EMO[e] || EMO["중립"];
}

export default function ThoughtsBoard() {
  const [data, setData] = useState<ThoughtsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const [kw, setKw] = useState<string | null>(null);
  const [emoFilter, setEmoFilter] = useState<string | null>(null);
  const [reports, setReports] = useState<ThoughtReport[]>([]);
  const [openReport, setOpenReport] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        callApi<ThoughtsResponse>("GET", "thoughts"),
        callApi<{ items: ThoughtReport[] }>("GET", "thoughts/reports").catch(() => ({ items: [] })),
      ]);
      setData(d);
      setReports(r.items || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const items = data?.items || [];
  const filtered = useMemo(
    () =>
      items.filter(
        (t) =>
          (!kw || t.keywords.includes(kw) || t.topics.includes(kw)) &&
          (!emoFilter || t.emotion === emoFilter),
      ),
    [items, kw, emoFilter],
  );

  const maxMonth = useMemo(() => {
    const e = data?.emotion || [];
    return Math.max(1, ...e.map((m) => m.무거움 + m.중립 + m.밝음));
  }, [data]);

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="max-w-5xl mx-auto px-5 pt-3 pb-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">생각</h1>
            <p className="text-[12px] text-muted mt-0.5">
              음성으로 남긴 생각들 · 시간순으로 쌓고 키워드로 훑어봐 · {items.length}개
            </p>
          </div>
          <button
            onClick={refresh}
            title="새로고침"
            className="inline-flex items-center justify-center rounded-md transition hover:opacity-70"
            style={{ width: 30, height: 30, border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--accent)", fontSize: 16 }}
          >
            ⟳
          </button>
        </div>

        {loading && <p className="text-[13px] text-muted text-center py-10">불러오는 중…</p>}
        {error && !loading && (
          <p className="text-[13px] text-center py-10" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        {data && !loading && (
          <>
            {/* 회고 리포트 (주간/월간 자동) */}
            {reports.length > 0 && (
              <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-[12px] font-semibold mb-2">회고 리포트 <span className="text-muted font-normal">· 매주·매월 자동</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {reports.map((r) => {
                    const on = openReport === r.label;
                    return (
                      <button
                        key={r.label}
                        onClick={() => setOpenReport(on ? null : r.label)}
                        className="text-[11.5px] px-2.5 py-1 rounded-lg transition"
                        style={{
                          border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                          backgroundColor: on ? "var(--accent)" : "transparent",
                          color: on ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {r.kind} · {r.label} <span style={{ opacity: 0.6 }}>{r.count}개</span>
                      </button>
                    );
                  })}
                </div>
                {openReport && (() => {
                  const r = reports.find((x) => x.label === openReport);
                  if (!r) return null;
                  return (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <p className="text-[13px] font-semibold mb-1">{r.kind} 리포트 · {r.period}</p>
                      <MarkdownLite md={r.markdown} />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 상단: 감정 지형 + 키워드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {/* 감정 지형 */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-[12px] font-semibold mb-3">감정 지형 <span className="text-muted font-normal">· 월별</span></p>
                <div className="flex items-end gap-3" style={{ height: 96 }}>
                  {data.emotion.map((m) => {
                    const total = m.무거움 + m.중립 + m.밝음;
                    const barPx = Math.max(4, (total / maxMonth) * 78);
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center">
                        <span className="text-[10px] text-muted tabular-nums mb-1">{total}</span>
                        <div className="w-full flex flex-col-reverse rounded-md overflow-hidden" style={{ height: barPx }}>
                          <div style={{ flexGrow: m.밝음, backgroundColor: EMO.밝음.bar }} />
                          <div style={{ flexGrow: m.중립, backgroundColor: EMO.중립.bar }} />
                          <div style={{ flexGrow: m.무거움, backgroundColor: EMO.무거움.bar }} />
                        </div>
                        <span className="text-[10px] text-muted tabular-nums mt-1">{m.month.slice(3)}월</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-2">
                  {(["무거움", "중립", "밝음"] as const).map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoFilter(emoFilter === e ? null : e)}
                      className="flex items-center gap-1 text-[11px] transition"
                      style={{ opacity: emoFilter && emoFilter !== e ? 0.4 : 1, fontWeight: emoFilter === e ? 700 : 400 }}
                    >
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: EMO[e].bar }} />
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* 키워드 */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-[12px] font-semibold mb-3">자주 나오는 키워드</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.keywords.slice(0, 18).map((k) => {
                    const on = kw === k.word;
                    return (
                      <button
                        key={k.word}
                        onClick={() => setKw(on ? null : k.word)}
                        className="text-[11.5px] px-2 py-0.5 rounded-full transition"
                        style={{
                          border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                          backgroundColor: on ? "var(--accent)" : "transparent",
                          color: on ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {k.word} <span style={{ opacity: 0.6 }}>{k.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 활성 필터 */}
            {(kw || emoFilter) && (
              <div className="flex items-center gap-2 mb-3 text-[12px]">
                <span className="text-muted">필터:</span>
                {kw && <Chip label={`# ${kw}`} onClear={() => setKw(null)} />}
                {emoFilter && <Chip label={emoFilter} onClear={() => setEmoFilter(null)} />}
                <span className="text-muted">· {filtered.length}개</span>
              </div>
            )}

            {/* 카드 리스트 (시간순) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
              {filtered.map((t) => (
                <ThoughtCard key={t.id} t={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} onKeyword={setKw} />
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="text-[13px] text-muted text-center py-14">해당하는 생각이 없어요.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// 리포트 마크다운 라이트 렌더 — ## 헤딩 / - 목록 / [[링크]]→텍스트만
function MarkdownLite({ md }: { md: string }) {
  const blocks = md.split("\n").map((line, i) => {
    const clean = line.replace(/\[\[([^\]]+)\]\]/g, "$1");
    if (/^##+\s/.test(clean)) {
      return (
        <p key={i} className="text-[12.5px] font-semibold mt-3 mb-1" style={{ color: "var(--accent-text)" }}>
          {clean.replace(/^##+\s/, "")}
        </p>
      );
    }
    if (/^-\s/.test(clean)) {
      return (
        <p key={i} className="text-[12.5px] leading-relaxed pl-2" style={{ color: "var(--text-secondary)" }}>
          · {clean.replace(/^-\s/, "")}
        </p>
      );
    }
    if (clean.trim() === "" || clean.trim() === "---") return <div key={i} style={{ height: 4 }} />;
    return (
      <p key={i} className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {clean}
      </p>
    );
  });
  return <div className="max-h-[26rem] overflow-y-auto pr-1">{blocks}</div>;
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px]"
      style={{ backgroundColor: "var(--accent)", color: "#fff" }}
    >
      {label} <span style={{ opacity: 0.7 }}>✕</span>
    </button>
  );
}

function ThoughtCard({
  t,
  open,
  onToggle,
  onKeyword,
}: {
  t: Thought;
  open: boolean;
  onToggle: () => void;
  onKeyword: (w: string) => void;
}) {
  const e = emo(t.emotion);
  const [raw, setRaw] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [rawLoading, setRawLoading] = useState(false);

  async function toggleRaw() {
    if (rawOpen) {
      setRawOpen(false);
      return;
    }
    setRawOpen(true);
    if (raw === null && !rawLoading) {
      setRawLoading(true);
      try {
        const r = await callApi<{ raw: string }>("GET", `thoughts/${encodeURIComponent(t.id)}/raw`);
        setRaw(r.raw || "(원본 없음)");
      } catch {
        setRaw("원본을 불러오지 못했어.");
      } finally {
        setRawLoading(false);
      }
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", borderLeft: `3px solid ${e.bar}` }}
    >
      <button onClick={onToggle} className="text-left px-3.5 pt-3 pb-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted tabular-nums">{t.date}{t.time ? ` · ${t.time}` : ""}</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: e.chip, color: e.fg }}>{e.label}</span>
            {t.importance > 0 && <span className="text-[10px]" style={{ color: "#E0A052" }}>{"★".repeat(t.importance)}</span>}
          </span>
        </div>
        <p className="text-[14px] font-semibold leading-snug">{t.title}</p>
        {/* 한 줄 요약 — 카드 맨 위 핵심 */}
        {t.summary && (
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-primary)" }}>{t.summary}</p>
        )}
        {/* 녹음정황 — 그때 어디서/언제 (빈 값/"[]" 은 숨김) */}
        {t.context && t.context.trim() !== "[]" && (
          <p className="text-[11px] italic" style={{ color: "var(--text-secondary)" }}>🎙 {t.context}</p>
        )}
      </button>

      <button onClick={onToggle} className="text-[11.5px] px-3.5 py-2 text-left transition hover:opacity-70" style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
        {open ? "접기 ▲" : "마음 · 내 말 · 원본 ▼"}
      </button>

      {open && (
        <div className="px-3.5 pb-4 flex flex-col gap-3 text-[13px]">
          {t.sections.map((s, i) => (
            <div key={i}>
              <p className="text-[11px] mb-1 font-semibold" style={{ color: e.fg }}>{s.h}</p>
              <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{s.body}</div>
            </div>
          ))}

          {t.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {t.keywords.map((k, i) => (
                <button
                  key={i}
                  onClick={() => onKeyword(k)}
                  className="text-[10.5px] px-1.5 py-0.5 rounded-full transition hover:opacity-70"
                  style={{ backgroundColor: "var(--bg-page)", color: "var(--accent-text)", border: "1px solid var(--border)" }}
                >
                  # {k}
                </button>
              ))}
            </div>
          )}

          {/* 원본(날것) 전사 — 접었다 폈다 */}
          <div className="pt-1">
            <button onClick={toggleRaw} className="text-[11.5px] transition hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
              {rawOpen ? "원본(날것) 접기 ▲" : "원본(날것) 전사 보기 ▼"}
            </button>
            {rawOpen && (
              <pre className="mt-2 text-[11px] leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2 max-h-72 overflow-y-auto" style={{ backgroundColor: "var(--bg-page)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {rawLoading ? "불러오는 중…" : raw}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
