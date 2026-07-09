"use client";

// 릴스 벤치마크 — 참고하려는 남의 릴스 URL을 붙여넣으면 대본+화면(훅 프레임)+분석을
// 카드로 모아 한눈에 본다. 엔진: reels_analyzer/reel_benchmark.py (Apify+Whisper+claude -p).

import { useCallback, useEffect, useMemo, useState } from "react";
import { callApi } from "@/lib/dashboard-client";

interface Frame {
  t: number;
  img: string; // data:image/jpeg;base64,...
}

interface StructureStep {
  section: string;
  content: string;
  sec: number;
}

interface BenchmarkCard {
  shortcode: string;
  url: string;
  owner: string;
  date: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  duration_sec: number | string;
  caption: string;
  hook: string;
  hook_pattern: string;
  structure: StructureStep[];
  why_viral: string[];
  comment_insight: string;
  steal_formula: string;
  next_hooks: string[];
  warning: string;
  transcript: string;
  frames: Frame[];
}

interface BenchmarkResponse {
  items: BenchmarkCard[];
  total: number;
}

function fmtInt(n: number): string {
  return (n || 0).toLocaleString("ko-KR");
}

function engRate(c: BenchmarkCard): string {
  if (!c.views) return "-";
  return `${(((c.likes + c.comments) / c.views) * 100).toFixed(1)}%`;
}

export default function ReelsBenchmarkBoard() {
  const [cards, setCards] = useState<BenchmarkCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await callApi<BenchmarkResponse>("GET", "reels-benchmark");
      setCards(data.items || []);
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

  async function analyze() {
    const u = url.trim();
    if (!u || busy) return;
    if (!/instagram\.com|youtube\.com|youtu\.be/.test(u)) {
      setNotice("인스타 릴스 또는 유튜브 링크를 붙여넣어줘.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await callApi("POST", "reels-benchmark/analyze", { url: u });
      setUrl("");
      setNotice("분석 중 — 대본 뽑고 화면 캡처하는 중이야. 40초쯤 뒤 카드로 떠(자동 새로고침).");
      [15000, 30000, 50000, 75000].forEach((ms) => setTimeout(refresh, ms));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "분석 요청 실패");
    } finally {
      setBusy(false);
    }
  }

  const sorted = useMemo(
    () => [...cards].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [cards],
  );

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="max-w-5xl mx-auto px-5 pt-3 pb-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">릴스 벤치마크</h1>
            <p className="text-[12px] text-muted mt-0.5">
              참고할 릴스 링크를 넣으면 대본·화면·훔쳐올 공식까지 모아둬 · {cards.length}개
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

        {/* 입력 */}
        <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="릴스·유튜브(쇼츠) 링크 툭 붙여넣기"
              className="flex-1 rounded-lg px-3 py-2 text-[13px]"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
            />
            <button
              onClick={analyze}
              disabled={busy}
              className="px-6 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition"
              style={{ backgroundColor: "var(--accent)", color: "#fff", opacity: busy ? 0.6 : 1 }}
            >
              분석
            </button>
          </div>
          <p className="text-[11px] text-muted mt-2">
            대본(Whisper) · 훅 프레임 캡처 · 왜 터졌나 · <b style={{ fontWeight: 600 }}>한나 채널에 훔쳐올 공식</b>까지 자동
          </p>
          {notice && <p className="text-[12px] mt-2" style={{ color: "var(--accent-text)" }}>{notice}</p>}
        </div>

        {loading && <p className="text-[13px] text-muted text-center py-10">불러오는 중…</p>}
        {error && !loading && (
          <p className="text-[13px] text-center py-10" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {sorted.map((c) => (
              <CardView key={c.shortcode} card={c} expanded={expanded === c.shortcode} onToggle={() => setExpanded(expanded === c.shortcode ? null : c.shortcode)} />
            ))}
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <p className="text-[13px] text-muted text-center py-14">
            아직 없어요. 위에 참고하고 싶은 릴스 링크를 붙여넣어보세요.
          </p>
        )}
      </div>
    </main>
  );
}

function platformOf(url: string): { label: string; bg: string; fg: string } {
  if (/youtube\.com|youtu\.be/.test(url)) return { label: "YT", bg: "#FBEAF0", fg: "#72243E" };
  return { label: "IG", bg: "#E7EFE0", fg: "#2E5B2E" };
}

function clamp(lines: number): React.CSSProperties {
  return { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" };
}

function CardView({ card, expanded, onToggle }: { card: BenchmarkCard; expanded: boolean; onToggle: () => void }) {
  const cover = card.frames[0]?.img;
  const plat = platformOf(card.url);
  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>
      {/* 커버 (첫 훅 프레임) — 세로 릴스라 훅 텍스트·인물이 보이게 상단 30% 지점 크롭 */}
      <button onClick={onToggle} className="relative block w-full" style={{ height: 168, backgroundColor: "var(--bg-card-soft)" }}>
        {cover && <img src={cover} alt="" className="w-full h-full object-cover" style={{ objectPosition: "50% 28%" }} />}
        <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: plat.bg, color: plat.fg }}>{plat.label}</span>
        <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-semibold tabular-nums" style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>조회 {fmtInt(card.views)}</span>
      </button>

      {/* 본문 (컴팩트) */}
      <div className="px-3 pt-2 pb-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted truncate">@{card.owner}</span>
          <span className="text-[10px] text-muted whitespace-nowrap">❤️{fmtInt(card.likes)} · {engRate(card)}</span>
        </div>
        <button onClick={onToggle} className="text-left">
          <p className="text-[13.5px] font-semibold leading-snug" style={clamp(2)}>{card.title}</p>
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: "var(--secondary-soft)", color: "var(--secondary-text)" }}>{card.hook_pattern || "훅"}</span>
          <p className="text-[11.5px] leading-snug text-muted" style={clamp(1)}>🎣 {card.hook}</p>
        </div>
        {card.steal_formula && (
          <div className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "var(--accent-soft)" }}>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--accent-text)", ...clamp(expanded ? 10 : 2) }}>
              <b style={{ fontWeight: 600 }}>🎯 </b>{card.steal_formula}
            </p>
          </div>
        )}
      </div>

      <button onClick={onToggle} className="text-[11.5px] px-3 py-2 text-left transition hover:opacity-70" style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
        {expanded ? "접기 ▲" : "화면 · 왜터졌나 · 대본 · 변주 훅 ▼"}
      </button>

      {expanded && (
        <div className="px-3 pb-4 flex flex-col gap-3 text-[13px]">
          {/* 🎬 화면 (훅 프레임 전체) — 가로 스크롤 */}
          {card.frames.length > 0 && (
            <div className="flex gap-1 overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
              {card.frames.map((f, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={f.img} alt={`${f.t}s`} className="rounded-md" style={{ height: 150, width: "auto", border: "1px solid var(--border)" }} />
                  <span className="absolute bottom-1 left-1 text-[9px] px-1 rounded" style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}>{f.t}s</span>
                </div>
              ))}
            </div>
          )}

          {card.why_viral.length > 0 && (
            <Section title="🔥 왜 터졌나">
              <ul className="flex flex-col gap-1">
                {card.why_viral.map((w, i) => <li key={i} className="leading-relaxed">· {w}</li>)}
              </ul>
            </Section>
          )}

          {card.structure.length > 0 && (
            <Section title="🏗 구조">
              <div className="flex flex-col gap-1.5">
                {card.structure.map((s, i) => (
                  <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-card-soft)" }}>
                    <span className="text-[11px] text-muted">{i + 1}. {s.section} ({s.sec}초)</span>
                    <p className="leading-relaxed mt-0.5">{s.content}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {card.next_hooks.length > 0 && (
            <Section title="🔁 한나 채널 변주 훅">
              <ul className="flex flex-col gap-1">
                {card.next_hooks.map((h, i) => <li key={i} className="leading-relaxed">· {h}</li>)}
              </ul>
            </Section>
          )}

          {card.comment_insight && (
            <Section title="💬 댓글 반응"><p className="leading-relaxed">{card.comment_insight}</p></Section>
          )}

          {card.warning && (
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--danger-text)" }}>⚠️ {card.warning}</p>
          )}

          {card.transcript && (
            <Section title="🎤 대본 (Whisper)">
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2 max-h-64 overflow-y-auto" style={{ backgroundColor: "var(--bg-page)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{card.transcript}</pre>
            </Section>
          )}

          <a href={card.url} target="_blank" rel="noreferrer" className="text-[12px] underline w-fit" style={{ color: "var(--accent)" }}>
            인스타에서 원본 보기 ↗
          </a>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted mb-1 font-semibold">{title}</p>
      {children}
    </div>
  );
}
