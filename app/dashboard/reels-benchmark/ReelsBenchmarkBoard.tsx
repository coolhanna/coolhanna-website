"use client";

// 릴스 벤치마크 — 참고하려는 릴스/게시물 링크를 붙여넣으면 화면(고화질 프레임)+비주얼 분석+대본을
// 카드로 모아 한눈에 본다. 저장한 이유는 메모로 적는다.
// 엔진: reels_analyzer/reel_benchmark.py (Apify+Whisper+claude -p vision).

import { useCallback, useEffect, useMemo, useState } from "react";
import { callApi } from "@/lib/dashboard-client";

interface Frame {
  t: number;
  file: string; // shortcode_NN.jpg — /reels-benchmark/frame/{file} 로 로드
}

interface Block {
  h: string;
  items: string[];
}

type Category = "레퍼런스" | "요리" | "레시피" | "AI";

interface BenchmarkCard {
  shortcode: string;
  url: string;
  owner: string;
  date: string;
  category: Category;
  mode: string;
  is_image_post?: boolean;
  memo?: string;
  title: string;
  summary: string;
  blocks: Block[];
  views: number;
  likes: number;
  comments: number;
  duration_sec: number | string;
  caption: string;
  transcript: string;
  frames: Frame[];
}

interface BenchmarkResponse {
  items: BenchmarkCard[];
  total: number;
}

function frameUrl(file: string): string {
  return `/api/dashboard/proxy/reels-benchmark/frame/${file}`;
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
  const [cat, setCat] = useState<Category | "전체">("전체");
  const [mode, setMode] = useState<string>("benchmark");

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
      setNotice("인스타 릴스/게시물 또는 유튜브 링크를 붙여넣어줘.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await callApi("POST", "reels-benchmark/analyze", { url: u, mode });
      setUrl("");
      setNotice("분석 중 — 화면 캡처하고 claude가 눈으로 뜯어보는 중이야. 1분쯤 뒤 카드로 떠(자동 새로고침).");
      [20000, 40000, 65000, 95000].forEach((ms) => setTimeout(refresh, ms));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "분석 요청 실패");
    } finally {
      setBusy(false);
    }
  }

  const cats = useMemo(() => {
    const order: Category[] = ["레퍼런스", "요리", "레시피", "AI"];
    const present = new Set(cards.map((c) => c.category));
    return order.filter((c) => present.has(c));
  }, [cards]);

  const sorted = useMemo(
    () =>
      cards
        .filter((c) => cat === "전체" || c.category === cat)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [cards, cat],
  );

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="max-w-5xl mx-auto px-5 pt-3 pb-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">릴스 벤치마크</h1>
            <p className="text-[12px] text-muted mt-0.5">
              링크를 넣으면 화면·비주얼 분석·대본까지 모아둬 · 저장한 이유는 메모로 · {cards.length}개
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
              placeholder="릴스·게시물·유튜브(쇼츠) 링크 툭 붙여넣기"
              className="flex-1 rounded-lg px-3 py-2 text-[13px]"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="rounded-lg px-2 py-2 text-[13px]"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
            >
              <option value="benchmark">레퍼런스</option>
              <option value="recipe">요리 (분석)</option>
              <option value="recipe_only">레시피 (레시피만)</option>
              <option value="info">AI 정보 (글 게시물)</option>
            </select>
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
            화면 캡처 · <b style={{ fontWeight: 600 }}>claude가 프레임을 직접 보고 비주얼 분석</b> · 대본(Whisper) · 훔쳐올 공식까지 자동
          </p>
          {notice && <p className="text-[12px] mt-2" style={{ color: "var(--accent-text)" }}>{notice}</p>}
        </div>

        {cats.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4">
            {(["전체", ...cats] as (Category | "전체")[]).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className="text-[12px] px-3 py-1 rounded-full font-medium transition"
                style={{
                  border: `1px solid ${cat === c ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor: cat === c ? "var(--accent)" : "transparent",
                  color: cat === c ? "#fff" : "var(--text-secondary)",
                }}
              >
                {c}
                {c !== "전체" && ` ${cards.filter((x) => x.category === c).length}`}
              </button>
            ))}
          </div>
        )}

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
            아직 없어요. 위에 참고하고 싶은 릴스/게시물 링크를 붙여넣어보세요.
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

const CAT_STYLE: Record<string, { bg: string; fg: string }> = {
  "레퍼런스": { bg: "#E7EFE0", fg: "#2E5B2E" },
  "요리": { bg: "#FBEFE0", fg: "#8A4B1E" },
  "레시피": { bg: "#FCEBEB", fg: "#9B2C2C" },
  "AI": { bg: "#E5EDFB", fg: "#25457F" },
};

function CardView({ card, expanded, onToggle }: { card: BenchmarkCard; expanded: boolean; onToggle: () => void }) {
  const cover = card.frames[0]?.file;
  const plat = platformOf(card.url);
  const catS = CAT_STYLE[card.category] || CAT_STYLE["레퍼런스"];
  const isImagePost = !!card.is_image_post;

  // 저장한 이유 메모 — 로컬 편집 상태
  const [memo, setMemo] = useState(card.memo || "");
  const [savingMemo, setSavingMemo] = useState(false);
  const [savedMemo, setSavedMemo] = useState(card.memo || "");

  async function saveMemo() {
    if (savingMemo) return;
    setSavingMemo(true);
    try {
      await callApi("POST", `reels-benchmark/${card.shortcode}/memo`, { memo });
      setSavedMemo(memo);
    } catch {
      // 실패 시 조용히 — 다시 저장 누르면 됨
    } finally {
      setSavingMemo(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>
      {/* 커버 (첫 프레임) — 작은 박스에 세로 이미지를 꽉 채우지 않고(contain) 안에. 양옆 여백 남게. */}
      <button onClick={onToggle} className="relative block w-full" style={{ height: 210, backgroundColor: "var(--bg-card-soft)" }}>
        {cover && (
          <img
            src={frameUrl(cover)}
            alt=""
            className="w-full h-full"
            style={{ objectFit: "contain", objectPosition: "center" }}
          />
        )}
        <span className="absolute top-2 left-2 flex gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: catS.bg, color: catS.fg }}>{card.category}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: plat.bg, color: plat.fg }}>{plat.label}</span>
        </span>
        {card.views > 0 && (
          <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-semibold tabular-nums" style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>조회 {fmtInt(card.views)}</span>
        )}
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
        {card.summary && (
          <p className="text-[11.5px] leading-snug text-muted" style={clamp(expanded ? 20 : 2)}>{card.summary}</p>
        )}
        {/* 저장한 이유 메모 — 접힌 상태에서도 한눈에 */}
        {savedMemo && !expanded && (
          <p className="text-[11.5px] leading-snug rounded-md px-2 py-1" style={{ backgroundColor: "var(--bg-page)", color: "var(--accent-text)", border: "1px solid var(--border)" }}>
            📝 {savedMemo}
          </p>
        )}
      </div>

      <button onClick={onToggle} className="text-[11.5px] px-3 py-2 text-left transition hover:opacity-70" style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
        {expanded ? "접기 ▲" : "화면 · 분석 · 메모 ▼"}
      </button>

      {expanded && (
        <div className="px-3 pb-4 flex flex-col gap-3 text-[13px]">
          {/* 📝 저장한 이유 메모 (편집) */}
          <div>
            <p className="text-[11px] text-muted mb-1 font-semibold">📝 저장한 이유 (내 메모)</p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="왜 저장했는지 — 이 화면/색감/편집이 좋아서 등"
              rows={2}
              className="w-full rounded-lg px-2.5 py-2 text-[12.5px] leading-relaxed"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)", resize: "vertical" }}
            />
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={saveMemo}
                disabled={savingMemo || memo === savedMemo}
                className="text-[11.5px] px-3 py-1 rounded-md font-medium transition"
                style={{ backgroundColor: "var(--accent)", color: "#fff", opacity: savingMemo || memo === savedMemo ? 0.5 : 1 }}
              >
                {savingMemo ? "저장 중…" : memo === savedMemo ? "저장됨" : "메모 저장"}
              </button>
              {memo !== savedMemo && <span className="text-[11px] text-muted">저장 안 됨</span>}
            </div>
          </div>

          {/* 🎬 화면 (프레임 전체) — 가로 스크롤, 고화질 */}
          {card.frames.length > 0 && (
            <div>
              <p className="text-[11px] text-muted mb-1 font-semibold">{isImagePost ? "🖼 카드 이미지" : "🎬 화면"}</p>
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
                {card.frames.map((f, i) => (
                  <div key={i} className="relative shrink-0">
                    <img src={frameUrl(f.file)} alt={`${f.t}`} className="rounded-md" style={{ height: 210, width: "auto", border: "1px solid var(--border)" }} />
                    {!isImagePost && (
                      <span className="absolute bottom-1 left-1 text-[9px] px-1 rounded" style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}>{f.t}s</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 모드별 분석 blocks */}
          {card.blocks?.map((b, i) => (
            <div key={i}>
              <p className="text-[11px] text-muted mb-1 font-semibold">{b.h}</p>
              <ul className="flex flex-col gap-1">
                {b.items.map((it, j) => <li key={j} className="leading-relaxed">· {it}</li>)}
              </ul>
            </div>
          ))}

          {card.transcript && (
            <div>
              <p className="text-[11px] text-muted mb-1 font-semibold">🎤 대본 (Whisper)</p>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2 max-h-64 overflow-y-auto" style={{ backgroundColor: "var(--bg-page)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{card.transcript}</pre>
            </div>
          )}

          <a href={card.url} target="_blank" rel="noreferrer" className="text-[12px] underline w-fit" style={{ color: "var(--accent)" }}>
            원본 보기 ↗
          </a>
        </div>
      )}
    </div>
  );
}
