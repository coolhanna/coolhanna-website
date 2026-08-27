"use client";

import { useMemo, useState } from "react";
import type { PlanningDecision } from "@/lib/dashboard-api";
import {
  mergeCurrentCandidate,
  type Account,
  type Format,
  type PlanningIdea,
  type Source,
} from "./planning-data";
import styles from "./planning.module.css";

type FilterState = {
  account: "all" | Account;
  source: "all" | Source;
  format: "all" | Format;
};

const accountFilters: Array<[FilterState["account"], string]> = [
  ["all", "전체"], ["main", "본계정"], ["hyerin", "혜린"], ["food", "먹거리"],
];
const sourceFilters: Array<[FilterState["source"], string]> = [
  ["all", "모두"], ["value", "가치관"], ["concern", "실제 고민"], ["trend", "유행·시의성"], ["season", "제품·계절"],
];
const formatFilters: Array<[FilterState["format"], string]> = [
  ["all", "모두"], ["skit", "상황극"], ["thought", "생각 설명"], ["vlog", "브이로그"], ["review", "비교·리뷰"], ["experiment", "생활실험"],
];

const accountClass: Record<Account, string> = {
  main: styles.mainAccount,
  hyerin: styles.hyerinAccount,
  food: styles.foodAccount,
};
const sourceClass: Record<Source, string> = {
  value: styles.valueSource,
  concern: styles.concernSource,
  trend: styles.trendSource,
  season: styles.seasonSource,
};

function kstDate() {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit", day: "2-digit", weekday: "short", timeZone: "Asia/Seoul",
  }).format(new Date());
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`${styles.pill} ${className}`}>{children}</span>;
}

export default function PlanningBoard({ initialCandidate, initialDecisions }: { initialCandidate: any; initialDecisions: any }) {
  const ideas = useMemo(
    () => mergeCurrentCandidate(initialCandidate?.candidate || null),
    [initialCandidate],
  );
  const initialDecisionMap = useMemo(() => {
    const map = new Map<string, PlanningDecision>();
    for (const item of initialDecisions?.decisions || []) map.set(item.candidate_id, item);
    return map;
  }, [initialDecisions]);
  const [filters, setFilters] = useState<FilterState>({ account: "all", source: "all", format: "all" });
  const [progressOnly, setProgressOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(ideas[0]?.id || "");
  const [decisions, setDecisions] = useState(initialDecisionMap);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(
    [...initialDecisionMap].map(([id, item]) => [id, item.feedback || ""]),
  ));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const visible = useMemo(() => ideas.filter((idea) => {
    if (progressOnly && decisions.get(idea.id)?.decision !== "발전") return false;
    if (filters.account !== "all" && idea.account !== filters.account) return false;
    if (filters.source !== "all" && !idea.sources.includes(filters.source)) return false;
    if (filters.format !== "all" && !idea.formats.includes(filters.format)) return false;
    return true;
  }), [decisions, filters, ideas, progressOnly]);

  const effectiveSelectedId = visible.some((idea) => idea.id === selectedId)
    ? selectedId
    : visible[0]?.id || "";
  const selected = ideas.find((idea) => idea.id === effectiveSelectedId) || null;
  const progressCount = ideas.filter((idea) => decisions.get(idea.id)?.decision === "발전").length;

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({ account: "all", source: "all", format: "all" });
    setProgressOnly(false);
  }

  async function saveDecision(idea: PlanningIdea, decision: PlanningDecision["decision"]) {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/dashboard/proxy/planning-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: idea.id,
          decision,
          feedback: drafts[idea.id] || "",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || payload?.error || `저장 실패 ${response.status}`);
      setDecisions((current) => new Map(current).set(idea.id, payload));
      setNotice(`${decision} 저장됨`);
    } catch (error) {
      setNotice(`저장하지 못했어 · ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={`dashboard-root ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>콘텐츠 기획</span>
          <strong>{kstDate()}</strong>
        </div>
        <div className={styles.headerActions}>
          <span>후보 {ideas.length}</span>
          <button
            type="button"
            className={progressOnly ? styles.activeProgress : ""}
            onClick={() => setProgressOnly((value) => !value)}
          >
            발전 중 {progressCount}
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.filters}>
          <FilterGroup title="계정" items={accountFilters} value={filters.account} onChange={(value) => setFilter("account", value as FilterState["account"])} counts={Object.fromEntries(accountFilters.map(([value]) => [value, value === "all" ? ideas.length : ideas.filter((idea) => idea.account === value).length]))} />
          <FilterGroup title="재료" items={sourceFilters} value={filters.source} onChange={(value) => setFilter("source", value as FilterState["source"])} />
          <FilterGroup title="형식" items={formatFilters} value={filters.format} onChange={(value) => setFilter("format", value as FilterState["format"])} />
          <button type="button" className={styles.reset} onClick={resetFilters}>초기화</button>
        </aside>

        <section className={styles.listPane} aria-label="기획 후보">
          <div className={styles.listHeader}><strong>후보</strong><span>{visible.length}개 · 점수 높은 순</span></div>
          <div className={styles.ideaList}>
            {visible.map((idea, index) => {
              const decision = decisions.get(idea.id)?.decision;
              return (
                <button
                  key={idea.id}
                  type="button"
                  className={`${styles.ideaRow} ${idea.id === effectiveSelectedId ? styles.selectedRow : ""} ${decision ? styles.decidedRow : ""}`}
                  onClick={() => setSelectedId(idea.id)}
                >
                  <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.rowBody}>
                    <span className={styles.pills}>
                      <Pill className={accountClass[idea.account]}>{idea.accountLabel}</Pill>
                      <Pill className={sourceClass[idea.sources[0]]}>{idea.sourceLabel}</Pill>
                      <Pill>{idea.formatLabel}</Pill>
                    </span>
                    <strong>{idea.title}</strong>
                    <span className={styles.rowMeta}>{idea.series} · {idea.role}{decision ? ` · ${decision}` : ""}</span>
                  </span>
                  <span className={styles.score}>{idea.score}</span>
                </button>
              );
            })}
            {!visible.length && <p className={styles.empty}>조건에 맞는 후보가 없어.</p>}
          </div>
        </section>

        <section className={styles.detailPane} aria-live="polite">
          {selected ? (
            <IdeaDetail
              idea={selected}
              feedback={drafts[selected.id] || ""}
              decision={decisions.get(selected.id)?.decision}
              saving={saving}
              notice={notice}
              onFeedback={(value) => setDrafts((current) => ({ ...current, [selected.id]: value }))}
              onDecision={(decision) => saveDecision(selected, decision)}
            />
          ) : <p className={styles.empty}>왼쪽 조건을 바꾸면 후보를 다시 볼 수 있어.</p>}
        </section>
      </div>
    </main>
  );
}

function FilterGroup({ title, items, value, onChange, counts }: {
  title: string;
  items: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <section className={styles.filterGroup}>
      <h2>{title}</h2>
      {items.map(([itemValue, label]) => (
        <button key={itemValue} type="button" className={itemValue === value ? styles.activeFilter : ""} onClick={() => onChange(itemValue)}>
          {label}{counts && <span>{counts[itemValue]}</span>}
        </button>
      ))}
    </section>
  );
}

function IdeaDetail({ idea, feedback, decision, saving, notice, onFeedback, onDecision }: {
  idea: PlanningIdea;
  feedback: string;
  decision?: PlanningDecision["decision"];
  saving: boolean;
  notice: string;
  onFeedback: (value: string) => void;
  onDecision: (decision: PlanningDecision["decision"]) => void;
}) {
  return (
    <div className={styles.detailInner}>
      <div className={styles.detailTop}>
        <span className={styles.pills}>
          <Pill className={accountClass[idea.account]}>{idea.accountLabel}</Pill>
          {idea.sources.map((source) => <Pill key={source} className={sourceClass[source]}>{sourceFilters.find(([value]) => value === source)?.[1]}</Pill>)}
          <Pill>{idea.formatLabel}</Pill><Pill>{idea.role}</Pill>
        </span>
        <span>AI 적합도 {idea.score}/100</span>
      </div>
      <h1>{idea.title}</h1>
      <p className={styles.verdict}>{idea.verdict}</p>

      <div className={styles.routes}>
        <Route label="우선 형식" value={idea.primary} primary />
        <Route label="깊이 확장" value={idea.post} />
        <Route label="반응 수집" value={idea.story} />
      </div>

      <div className={styles.detailGrid}>
        <section><h2>왜 이 형식인가</h2><p><b>{idea.why[0]}</b>{idea.why[1]}</p><p><b>시리즈</b>{idea.series}</p><p><b>역할</b>{idea.role}</p></section>
        <section><h2>A/B 구조</h2>{idea.ab.map(([label, text]) => <p key={label}><b>{label}</b>{text}</p>)}<p className={styles.risk}><b>주의</b>{idea.risk}</p></section>
        <section className={styles.references}><h2>참고한 자료</h2>{idea.references.map(([label, text]) => <div key={`${label}-${text}`}><b>{label}</b><span>{text}</span></div>)}</section>
      </div>

      <div className={styles.feedbackBox}>
        <label htmlFor="planning-feedback">한나 의견</label>
        <textarea id="planning-feedback" value={feedback} onChange={(event) => onFeedback(event.target.value)} placeholder="예: 주제는 맞는데 상황극보다 내 생각을 말하는 게 맞아." />
        <div className={styles.decisionBar}>
          <button type="button" className={styles.develop} disabled={saving} onClick={() => onDecision("발전")}>발전</button>
          <button type="button" disabled={saving} onClick={() => onDecision("형식 변경")}>형식 변경</button>
          <button type="button" disabled={saving} onClick={() => onDecision("스토리 먼저")}>스토리 먼저</button>
          <span />
          <button type="button" disabled={saving} onClick={() => onDecision("보류")}>보류</button>
          <button type="button" disabled={saving} onClick={() => onDecision("버림")}>버림</button>
        </div>
        <div className={styles.saveState}>{saving ? "저장 중…" : notice || (decision ? `${decision} 저장됨` : "")}</div>
      </div>
    </div>
  );
}

function Route({ label, value, primary = false }: { label: string; value: [string, string]; primary?: boolean }) {
  return <div className={primary ? styles.primaryRoute : ""}><small>{label}</small><strong>{value[0]}</strong><p>{value[1]}</p></div>;
}
