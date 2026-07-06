"use client";

// 큐레이션 인풋함 — 직접 고른 자료(영상·사진·음성·메모)를 한 선반에서 보고 갈래별로 승격.
// 데이터는 대시보드 백엔드(FastAPI, Vault .md)에서. 폴더에 던지거나 여기 붙여넣으면
// 워처가 claude -p(0원)로 분석해 카드로 저장 → 여기 뜸.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { callApi } from "@/lib/dashboard-client";

type Source = "video" | "photo" | "voice" | "memo";
type Status = "new" | "archived" | "promoted";

interface Branch {
  id: string;
  text: string;
  promoted: boolean;
}

interface Card {
  id: string;
  source: Source;
  kind: Kind;
  status: Status;
  createdAt: string;
  summary: string;
  application: string;
  branches: Branch[];
  whySaved?: string;
  origin?: string;
  rawKind: string;
  rawExcerpt: string;
  file?: string;
}

type Kind = "인사이트" | "영상 참고" | "아이디어" | "생각 흐름" | "분석 요청";

const SOURCE_META: Record<Source, { label: string; bg: string; fg: string }> = {
  video: { label: "영상", bg: "var(--secondary-soft)", fg: "var(--secondary-text)" },
  photo: { label: "사진", bg: "var(--accent-soft)", fg: "var(--accent-text)" },
  voice: { label: "음성", bg: "var(--danger-soft)", fg: "var(--danger-text)" },
  memo: { label: "메모", bg: "var(--bg-card-soft)", fg: "var(--text-secondary)" },
};

const STATUS_LABEL: Record<Status, string> = {
  new: "새로 들어옴",
  archived: "보관함",
  promoted: "승격됨 → 파이프라인",
};

const KIND_META: Record<string, { bg: string; fg: string }> = {
  "인사이트": { bg: "var(--accent-soft)", fg: "var(--accent-text)" },
  "영상 참고": { bg: "var(--secondary-soft)", fg: "var(--secondary-text)" },
  "아이디어": { bg: "#E7EFE0", fg: "var(--accent-dark)" },
  "생각 흐름": { bg: "var(--bg-card-soft)", fg: "var(--text-secondary)" },
  "분석 요청": { bg: "var(--danger-soft)", fg: "var(--danger-text)" },
};

const STATUS_ORDER: Status[] = ["new", "archived", "promoted"];

function fmtDay(iso: string): string {
  const parts = (iso || "").split("-");
  if (parts.length < 3) return iso;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

interface CurationResponse {
  items: Card[];
  total: number;
}

export default function CurationBoard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRawId, setShowRawId] = useState<string | null>(null);

  const [pasteText, setPasteText] = useState("");
  const [whySaved, setWhySaved] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [srcFilter, setSrcFilter] = useState<Source | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const refresh = useCallback(async () => {
    try {
      const data = await callApi<CurationResponse>("GET", "curation");
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

  const filtered = useMemo(
    () =>
      cards.filter((c) => {
        if (srcFilter !== "all" && c.source !== srcFilter) return false;
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        return true;
      }),
    [cards, srcFilter, statusFilter],
  );

  const grouped = useMemo(() => {
    const by: Record<Status, Card[]> = { new: [], archived: [], promoted: [] };
    filtered.forEach((c) => by[c.status].push(c));
    return by;
  }, [filtered]);

  async function capture() {
    const text = pasteText.trim();
    if (!text || capturing) return;
    setCapturing(true);
    setNotice(null);
    try {
      await callApi("POST", "curation/capture", { text, why: whySaved.trim() });
      setPasteText("");
      setWhySaved("");
      setNotice("넣었어! 분석되면 잠시 후 카드로 떠 — 곧 자동으로 새로고침돼.");
      // 워처(약 1분 주기) 처리 대기 → 몇 번 폴링
      [8000, 20000, 40000, 65000].forEach((ms) => setTimeout(refresh, ms));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "넣기 실패");
    } finally {
      setCapturing(false);
    }
  }

  async function promoteBranch(cardId: string, branchIndex: number) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status: "promoted",
              branches: c.branches.map((b, i) => (i === branchIndex ? { ...b, promoted: true } : b)),
            }
          : c,
      ),
    );
    try {
      await callApi("PATCH", `curation/${cardId}/promote/${branchIndex}`);
    } catch {
      refresh();
    }
  }

  async function archiveCard(cardId: string) {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: "archived" } : c)));
    try {
      await callApi("PATCH", `curation/${cardId}/status`, { status: "archived" });
    } catch {
      refresh();
    }
  }

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="mb-2">
          <Link href="/dashboard" className="text-xs text-muted hover:underline">
            ← 대시보드
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-5">큐레이션 인풋함</h1>

        {/* 입력 입구 */}
        <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={2}
            placeholder="유튜브 링크나 메모를 툭 붙여넣기"
            className="w-full rounded-lg px-3 py-2 text-sm mb-2"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={whySaved}
              onChange={(e) => setWhySaved(e.target.value)}
              placeholder="왜 저장? (선택 — 한 마디면 분석이 정확해져요)"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
            />
            <button
              onClick={capture}
              disabled={capturing}
              className="px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition"
              style={{ backgroundColor: "var(--accent)", color: "#fff", opacity: capturing ? 0.6 : 1 }}
            >
              {capturing ? "넣는 중…" : "넣기"}
            </button>
          </div>
          <p className="text-[11px] text-muted mt-2">사진·음성은 폴더에 던지면 자동으로 들어와요.</p>
          {notice && (
            <p className="text-[12px] mt-2" style={{ color: "var(--accent-text)" }}>
              {notice}
            </p>
          )}
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          <FilterChip active={srcFilter === "all" && statusFilter === "all"} onClick={() => { setSrcFilter("all"); setStatusFilter("all"); }}>
            전체
          </FilterChip>
          {(Object.keys(SOURCE_META) as Source[]).map((s) => (
            <FilterChip key={s} active={srcFilter === s} onClick={() => setSrcFilter(srcFilter === s ? "all" : s)}>
              {SOURCE_META[s].label}
            </FilterChip>
          ))}
          <span className="w-px my-1 mx-1" style={{ backgroundColor: "var(--border)" }} />
          {STATUS_ORDER.map((st) => (
            <FilterChip key={st} active={statusFilter === st} onClick={() => setStatusFilter(statusFilter === st ? "all" : st)}>
              {STATUS_LABEL[st]}
            </FilterChip>
          ))}
        </div>

        {loading && <p className="text-sm text-muted text-center py-10">불러오는 중…</p>}
        {error && !loading && (
          <p className="text-sm text-center py-10" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {!loading && !error && STATUS_ORDER.map((st) => {
          const group = grouped[st];
          if (group.length === 0) return null;
          return (
            <section key={st} className="mb-7">
              <p className="text-[11px] text-muted mb-2 tracking-wide">
                {STATUS_LABEL[st]} · {group.length}
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {group.map((card, i) => (
                  <Row
                    key={card.id}
                    card={card}
                    first={i === 0}
                    expanded={expandedId === card.id}
                    showRaw={showRawId === card.id}
                    onToggle={() => setExpandedId(expandedId === card.id ? null : card.id)}
                    onToggleRaw={() => setShowRawId(showRawId === card.id ? null : card.id)}
                    onPromote={(idx) => promoteBranch(card.id, idx)}
                    onArchive={() => archiveCard(card.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-muted text-center py-10">
            아직 없어요. 위에 링크·메모를 넣거나 <code>~/curation_input</code> 폴더에 사진을 던져보세요.
          </p>
        )}
      </div>
    </main>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1 rounded-full font-medium transition"
      style={{
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function SourceBadge({ source }: { source: Source }) {
  const m = SOURCE_META[source];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap" style={{ backgroundColor: m.bg, color: m.fg }}>
      {m.label}
    </span>
  );
}

interface RowProps {
  card: Card;
  first: boolean;
  expanded: boolean;
  showRaw: boolean;
  onToggle: () => void;
  onToggleRaw: () => void;
  onPromote: (branchIndex: number) => void;
  onArchive: () => void;
}

function Row({ card, first, expanded, showRaw, onToggle, onToggleRaw, onPromote, onArchive }: RowProps) {
  const kindMeta = KIND_META[card.kind] || KIND_META["생각 흐름"];
  return (
    <div
      style={{
        borderTop: first ? "none" : "1px solid var(--border)",
        backgroundColor: card.status === "new" ? "var(--bg-card)" : "var(--bg-page)",
      }}
    >
      <button onClick={onToggle} className="w-full text-left flex items-center gap-2.5 px-4 py-3">
        <SourceBadge source={card.source} />
        <span className="flex-1 text-sm leading-snug" style={{ color: card.status === "new" ? "var(--text-main)" : "var(--text-secondary)" }}>
          {card.summary}
        </span>
        {card.status === "promoted" && <span className="text-[10px]" style={{ color: "var(--success)" }}>승격됨 →</span>}
        <span className="text-[11px] text-muted whitespace-nowrap">{fmtDay(card.createdAt)}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-3 text-[11px]">
            <span className="px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: kindMeta.bg, color: kindMeta.fg }}>
              {card.kind}
            </span>
            {card.whySaved && <span className="text-muted">{card.whySaved}</span>}
            {card.origin && <span className="text-muted">· {card.origin}</span>}
          </div>

          <p className="text-[11px] text-muted mb-1.5">인사이트 · 갈래별로 승격</p>
          <div className="flex flex-col gap-1.5 mb-4">
            {card.branches.map((b, i) => (
              <div key={b.id} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-card-soft)" }}>
                <span className="flex-1 text-[13px] leading-relaxed" style={{ color: "var(--text-main)" }}>
                  {b.text}
                </span>
                {b.promoted ? (
                  <span className="text-[10px] whitespace-nowrap mt-0.5" style={{ color: "var(--success)" }}>★ 승격됨</span>
                ) : (
                  <button
                    onClick={() => onPromote(i)}
                    className="text-[11px] px-2 py-0.5 rounded-md whitespace-nowrap mt-0.5 transition"
                    style={{ border: "1px solid var(--accent)", color: "var(--accent-text)", backgroundColor: "var(--accent-soft)" }}
                  >
                    ★ 승격
                  </button>
                )}
              </div>
            ))}
          </div>

          {card.application && (
            <div className="rounded-lg px-3 py-2.5 mb-4" style={{ backgroundColor: "var(--accent-soft)" }}>
              <p className="text-[11px] mb-1" style={{ color: "var(--accent-text)", fontWeight: 600 }}>어떻게 쓸지</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--accent-text)" }}>{card.application}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {card.status === "new" && (
              <button onClick={onArchive} className="text-xs px-3 py-1.5 rounded-lg transition" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
                보관함으로
              </button>
            )}
            {card.rawExcerpt && (
              <button onClick={onToggleRaw} className="text-xs px-3 py-1.5 rounded-lg transition" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
                {showRaw ? "원본 접기" : `원본 보기 (${card.rawKind})`}
              </button>
            )}
          </div>

          {showRaw && card.rawExcerpt && (
            <div className="mt-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--bg-page)", border: "1px solid var(--border)" }}>
              <p className="text-[13px] leading-relaxed text-muted whitespace-pre-wrap">{card.rawExcerpt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
