"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlanningDecision, PlanningFeedResponse, PlanningResearch } from "@/lib/dashboard-api";
import { planningIdeasForDay, type Account, type Format, type PlanningIdea, type Source } from "./planning-data";
import styles from "./planning.module.css";

type FilterState = { account: "all" | Account; source: "all" | Source; format: "all" | Format };
type RequestType = "new" | "deeper" | "similar";

const accountFilters: Array<[FilterState["account"], string]> = [["all", "전체"], ["main", "본계정"], ["hyerin", "혜린"], ["food", "먹거리"]];
const sourceFilters: Array<[FilterState["source"], string]> = [["all", "모두"], ["value", "가치관"], ["concern", "실제 고민"], ["trend", "유행·시의성"], ["season", "제품·계절"]];
const formatFilters: Array<[FilterState["format"], string]> = [["all", "모두"], ["skit", "상황극"], ["thought", "생각 설명"], ["vlog", "브이로그"], ["review", "비교·리뷰"], ["experiment", "생활실험"]];
const loopSteps = ["밤 조사", "아침 후보", "한나 판단", "선택 후보 발전", "성과 확인", "다음 밤 반영"];
const accountClass: Record<Account, string> = { main: styles.mainAccount, hyerin: styles.hyerinAccount, food: styles.foodAccount };
const accountRowClass: Record<Account, string> = { main: styles.mainRow, hyerin: styles.hyerinRow, food: styles.foodRow };
const sourceClass: Record<Source, string> = { value: styles.valueSource, concern: styles.concernSource, trend: styles.trendSource, season: styles.seasonSource };
const pageSize = 10;

function displayDay(value = "") {
  if (!value) return "날짜 없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" }).format(new Date(`${value}T12:00:00+09:00`));
}

function displayTime(value = "") {
  if (!value) return "예약 전";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(value));
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`${styles.pill} ${className}`}>{children}</span>;
}

export default function PlanningBoard({ initialFeed, initialDecisions }: { initialFeed: any; initialDecisions: any }) {
  const [feed, setFeed] = useState<PlanningFeedResponse>(() => initialFeed || { current: null, dates: [], requests: [], status: "missing" });
  const ideas = useMemo(() => planningIdeasForDay(feed.current?.candidates), [feed.current]);
  const initialDecisionMap = useMemo(() => {
    const map = new Map<string, PlanningDecision>();
    for (const item of initialDecisions?.decisions || []) map.set(item.candidate_id, item);
    return map;
  }, [initialDecisions]);
  const [filters, setFilters] = useState<FilterState>({ account: "all", source: "all", format: "all" });
  const [progressOnly, setProgressOnly] = useState(false);
  const [candidatePage, setCandidatePage] = useState(0);
  const [selectedId, setSelectedId] = useState(ideas[0]?.id || "");
  const [decisions, setDecisions] = useState(initialDecisionMap);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries([...initialDecisionMap].map(([id, item]) => [id, item.feedback || ""])));
  const [saving, setSaving] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [notice, setNotice] = useState("");
  const [researchOpen, setResearchOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("deeper");
  const [requestText, setRequestText] = useState("");
  const [requesting, setRequesting] = useState(false);

  const visible = useMemo(() => ideas.filter((idea) => {
    if (progressOnly && decisions.get(idea.id)?.decision !== "발전") return false;
    if (filters.account !== "all" && idea.account !== filters.account) return false;
    if (filters.source !== "all" && !idea.sources.includes(filters.source)) return false;
    if (filters.format !== "all" && !idea.formats.includes(filters.format)) return false;
    return true;
  }), [decisions, filters, ideas, progressOnly]);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(candidatePage, pageCount - 1);
  const pagedVisible = visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const effectiveSelectedId = pagedVisible.some((idea) => idea.id === selectedId) ? selectedId : pagedVisible[0]?.id || "";
  const selected = ideas.find((idea) => idea.id === effectiveSelectedId) || null;
  const progressCount = ideas.filter((idea) => decisions.get(idea.id)?.decision === "발전").length;
  const pendingCount = feed.requests.filter((item) => item.status === "pending").length;

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) { setFilters((current) => ({ ...current, [key]: value })); setCandidatePage(0); }
  function resetFilters() { setFilters({ account: "all", source: "all", format: "all" }); setProgressOnly(false); setCandidatePage(0); }
  function toggleProgress() { setProgressOnly((value) => !value); setCandidatePage(0); }
  function changePage(nextPage: number) {
    const safePage = Math.max(0, Math.min(nextPage, pageCount - 1));
    setCandidatePage(safePage);
    setSelectedId(visible[safePage * pageSize]?.id || "");
  }

  async function loadDay(date: string) {
    setLoadingDay(true); setNotice("");
    try {
      const response = await fetch(`/api/dashboard/proxy/planning-feed?date=${encodeURIComponent(date)}`);
      const payload = await response.json();
      if (!response.ok || !payload.current) throw new Error(payload?.detail || "해당 날짜 후보 없음");
      setFeed(payload); setSelectedId("");
    } catch (error) { setNotice(`불러오지 못했어 · ${(error as Error).message}`); }
    finally { setLoadingDay(false); }
  }

  async function saveDecision(idea: PlanningIdea, decision: PlanningDecision["decision"]) {
    setSaving(true); setNotice("");
    try {
      const response = await fetch("/api/dashboard/proxy/planning-decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidate_id: idea.id, decision, feedback: drafts[idea.id] || "" }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || payload?.error || `저장 실패 ${response.status}`);
      setDecisions((current) => new Map(current).set(idea.id, payload)); setNotice(`${decision} 저장됨 · 다음 조사에 반영`);
    } catch (error) { setNotice(`저장하지 못했어 · ${(error as Error).message}`); }
    finally { setSaving(false); }
  }

  async function saveRequest() {
    setRequesting(true); setNotice("");
    try {
      const response = await fetch("/api/dashboard/proxy/planning-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_type: requestType, candidate_id: requestType === "new" ? "" : selected?.id || "", batch_date: feed.current?.date || "", instruction: requestText }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || payload?.error || `요청 실패 ${response.status}`);
      setFeed((current) => ({ ...current, requests: [...current.requests, payload] })); setRequestText("");
      setNotice("AI 조사 요청 저장됨 · 다음 밤 조사에서 먼저 확인해");
    } catch (error) { setNotice(`요청하지 못했어 · ${(error as Error).message}`); }
    finally { setRequesting(false); }
  }

  async function openGpt() {
    const prompt = selected
      ? `이건 한나 본계정의 청소년 실제 문제 주제 후보야. 완성 대본을 쓰지 말고, 먼저 한나의 실제 경험과 판단을 끌어내는 대화를 이어가줘.\n\n주제: ${selected.title}\n어디서 온 문제: ${selected.references[0]?.[0] || "출처 확인 필요"} · ${selected.references[0]?.[1] || ""}\n첫 장면: ${selected.situation}\n충돌: ${selected.conflict}\n한나의 관점: ${selected.valueLine}\n현재 판정: ${selected.judgment}\n릴스로 푸는 법: ${selected.primary[1]}\n한나 의견: ${drafts[selected.id] || requestText || "아직 없음"}\n\n1) 실제로 한나나 혜린에게 있었던 일인지, 2) 한나가 책임지고 말할 결론은 무엇인지, 3) 화면으로 보여줄 장면이 있는지를 최대 3개 질문으로 먼저 확인해줘. 답을 받은 뒤에만 릴스와 캐러셀 중 맞는 형식을 제안해줘.`
      : `한나의 세 계정 운영 기준으로 새 콘텐츠 후보를 찾아줘. 완성 대본보다 계정과 유입·호감·신뢰 역할을 먼저 붙여줘. 추가 요청: ${requestText || "새로운 문제와 욕구를 찾아줘."}`;
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    try { await navigator.clipboard.writeText(prompt); setNotice("후보 맥락을 복사했어 · 열린 GPT 창에 붙여넣으면 돼"); }
    catch { setNotice("GPT는 열었지만 자동 복사는 막혔어. 한나 의견을 직접 붙여줘."); }
  }

  return <main className={`dashboard-root ${styles.page}`}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>콘텐츠 기획</span><strong>{feed.current?.batch_label || displayDay(feed.current?.date)}</strong></div>
      <div className={styles.headerActions}>
        <label>지난 후보 <select value={feed.current?.date || ""} disabled={loadingDay} onChange={(event) => loadDay(event.target.value)}>{feed.dates.map((item) => <option key={item.date} value={item.date}>{item.date} · {item.candidate_count || 6}개</option>)}</select></label>
        <span>후보 {ideas.length}</span><button type="button" className={progressOnly ? styles.activeProgress : ""} onClick={toggleProgress}>발전 중 {progressCount}</button>
      </div>
    </header>

    {!feed.current && <section className={styles.failedRun} role="status"><b>오늘 조사가 완료되지 않았어</b><span>예전 추천으로 채우지 않았어. 새 조사와 검증이 끝나면 여기에 오늘 후보만 보여줄게.</span></section>}

    <section className={styles.cycleStatus} aria-label={loopSteps.join(" → ")}>
      <div className={styles.todayTask}><small>오늘 할 일</small><b>한나 판단 중</b><span>{ideas.length}개 중 발전할 것만 고르기</span></div>
      <div className={styles.cycleTrail}><span>이틀 조사</span><span>20개 후보</span><strong>한나 판단</strong><span>선택 후보 발전</span><span>성과 확인</span><span>다음 조사 반영</span></div>
      <div className={styles.nextRun}><b>다음 조사</b>{displayTime(feed.current?.next_run_at)} · 이틀마다 20개 · 지난 묶음 보존</div>
    </section>
    <ResearchStrip research={feed.current?.research} open={researchOpen} onToggle={() => setResearchOpen((value) => !value)} />
    <Link className={styles.productShortcut} href="/dashboard/products"><span>제품 후보 {feed.current?.product_radar?.length || 0}</span><em>오늘 살 것과 먼저 볼 것은 제품 탭에서 분리해 보기</em><b>제품 보기 →</b></Link>

    <section className={styles.quickFilters} aria-label="후보 빠른 필터">
      <div className={styles.accountTabs}>{accountFilters.map(([value, label]) => {
        const count = value === "all" ? ideas.length : ideas.filter((idea) => idea.account === value).length;
        return <button key={value} type="button" className={filters.account === value ? styles.activeTab : ""} onClick={() => setFilter("account", value)}>{label}<span>{count}</span></button>;
      })}</div>
      <label>재료<select value={filters.source} onChange={(event) => setFilter("source", event.target.value as FilterState["source"])}>{sourceFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>형식<select value={filters.format} onChange={(event) => setFilter("format", event.target.value as FilterState["format"])}>{formatFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="button" className={progressOnly ? styles.activeProgress : ""} onClick={toggleProgress}>발전 중 {progressCount}</button>
      <button type="button" className={styles.moreTopics} onClick={() => setRequestType("new")}>+ 새 주제</button>
      {(filters.account !== "all" || filters.source !== "all" || filters.format !== "all" || progressOnly) && <button type="button" className={styles.reset} onClick={resetFilters}>초기화</button>}
      {pendingCount > 0 && <span className={styles.pending}>조사 대기 {pendingCount}</span>}
    </section>

    <div className={styles.workspace}>
      <section className={styles.listPane} aria-label="기획 후보">
        <div className={styles.listHeader}><strong>청소년 실제 문제</strong><span>{visible.length}개 · {currentPage + 1}/{pageCount}쪽</span></div>
        <div className={styles.ideaList}>{pagedVisible.map((idea, index) => {
          const decision = decisions.get(idea.id)?.decision;
          return <button key={idea.id} type="button" className={`${styles.ideaRow} ${accountRowClass[idea.account]} ${idea.id === effectiveSelectedId ? styles.selectedRow : ""} ${decision ? styles.decidedRow : ""}`} onClick={() => setSelectedId(idea.id)}>
            <span className={styles.rank}><small>순서</small>{String(currentPage * pageSize + index + 1).padStart(2, "0")}</span>
            <span className={styles.rowBody}><span className={styles.pills}>{idea.variant && <Pill>{idea.variant}</Pill>}<Pill className={accountClass[idea.account]}>{idea.accountLabel}</Pill><Pill className={sourceClass[idea.sources[0]]}>{idea.sourceLabel}</Pill><Pill>{idea.formatLabel}</Pill></span><strong>{idea.title}</strong><span className={styles.rowMeta}>{idea.role} · {idea.situation}{decision ? ` · ${decision}` : ""}</span></span>
            <span className={styles.score}><small>적합</small>{idea.score}</span>
          </button>;
        })}{!visible.length && <p className={styles.empty}>조건에 맞는 후보가 없어.</p>}</div>
        {visible.length > pageSize && <nav className={styles.pagination} aria-label="후보 페이지"><button type="button" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>이전</button>{Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" className={index === currentPage ? styles.currentPage : ""} onClick={() => changePage(index)}>{index + 1}</button>)}<button type="button" disabled={currentPage === pageCount - 1} onClick={() => changePage(currentPage + 1)}>다음</button></nav>}
      </section>

      <section className={styles.detailPane} aria-live="polite">
        {selected ? <IdeaDetail idea={selected} feedback={drafts[selected.id] || ""} decision={decisions.get(selected.id)?.decision} saving={saving} notice={notice} requestType={requestType} requestText={requestText} requesting={requesting} onFeedback={(value) => setDrafts((current) => ({ ...current, [selected.id]: value }))} onDecision={(decision) => saveDecision(selected, decision)} onRequestType={setRequestType} onRequestText={setRequestText} onRequest={saveRequest} onOpenGpt={openGpt} /> : <p className={styles.empty}>왼쪽 조건을 바꾸면 후보를 다시 볼 수 있어.</p>}
      </section>
    </div>
  </main>;
}

function ResearchStrip({ research, open, onToggle }: { research?: PlanningResearch; open: boolean; onToggle: () => void }) {
  const searched = research?.searched || ["아직 기록된 밤 조사가 없어"];
  const learned = research?.learned || ["다음 조사 완료 뒤 여기에 알게 된 점이 쌓여"];
  return <section className={`${styles.researchStrip} ${open ? styles.researchOpen : ""}`}>
    <button type="button" className={styles.researchToggle} onClick={onToggle}><b>밤 조사 기록</b><span>{open ? "접기" : "펼치기"}</span></button>
    <div className={styles.researchSummary}><span><b>무엇을 찾았나</b>{searched[0]}</span><span><b>무엇을 알게 됐나</b>{learned[0]}</span></div>
    {open && <div className={styles.researchDetails}><section><h2>검색·확인</h2>{searched.map((item) => <p key={item}>· {item}</p>)}</section><section><h2>새로 알게 된 것</h2>{learned.map((item) => <p key={item}>· {item}</p>)}</section><section><h2>참고한 곳</h2>{(research?.sources || []).map((item) => <p key={item.label}>{item.url ? <a href={item.url} target="_blank" rel="noreferrer"><b>{item.label}</b></a> : <b>{item.label}</b>}{item.note}</p>)}</section></div>}
  </section>;
}

function IdeaDetail({ idea, feedback, decision, saving, notice, requestType, requestText, requesting, onFeedback, onDecision, onRequestType, onRequestText, onRequest, onOpenGpt }: { idea: PlanningIdea; feedback: string; decision?: PlanningDecision["decision"]; saving: boolean; notice: string; requestType: RequestType; requestText: string; requesting: boolean; onFeedback: (value: string) => void; onDecision: (decision: PlanningDecision["decision"]) => void; onRequestType: (value: RequestType) => void; onRequestText: (value: string) => void; onRequest: () => void; onOpenGpt: () => void }) {
  return <div className={styles.detailInner}>
    <div className={styles.detailTop}><span className={styles.pills}><Pill className={accountClass[idea.account]}>{idea.accountLabel}</Pill>{idea.sources.map((source) => <Pill key={source} className={sourceClass[source]}>{sourceFilters.find(([value]) => value === source)?.[1]}</Pill>)}<Pill>{idea.formatLabel}</Pill><Pill>{idea.role}</Pill></span><span>AI 적합도 {idea.score}/100</span></div>
    <h1>{idea.title}</h1><p className={styles.verdict}>{idea.verdict}</p>
    <div className={styles.handoffGrid}>
      <section className={styles.originCard}><small>어디서 온 문제</small><strong>{idea.references[0]?.[0] || "출처 확인 필요"}</strong><p>{idea.references[0]?.[1] || "실제 출처를 더 확인한 뒤 발전한다."}</p></section>
      <section className={styles.angleCard}><small>한나의 관점</small><strong>충돌</strong><p>{idea.conflict}</p><strong>지키는 가치</strong><p>{idea.valueLine}</p><strong>마지막 판정</strong><p>{idea.judgment}</p></section>
      <section className={styles.sceneCard}><small>릴스로 푸는 법</small><strong>첫 장면</strong><p>{idea.situation}</p><strong>{idea.primary[0]}</strong><p>{idea.primary[1]}</p></section>
    </div>
    <div className={styles.expansionStrip}><section><small>더 깊게 쓸 것</small><strong>{idea.post[0]}</strong><p>{idea.post[1]}</p></section><section><small>반응을 받을 것</small><strong>{idea.story[0]}</strong><p>{idea.story[1]}</p></section><section><small>주의</small><p>{idea.risk}</p></section></div>
    <details className={styles.references}><summary>참고한 자료 {idea.references.length}개</summary>{idea.references.map(([label, text]) => <div key={`${label}-${text}`}><b>{label}</b><span>{text}</span></div>)}</details>
    <div className={styles.feedbackBox}>
      <label htmlFor="planning-feedback">한나 의견</label><textarea id="planning-feedback" value={feedback} onChange={(event) => onFeedback(event.target.value)} placeholder="예: 주제는 맞는데 상황극보다 내 생각을 말하는 게 맞아." />
      <div className={styles.detailActions}><button type="button" className={styles.develop} disabled={saving} onClick={() => onDecision("발전")}>발전</button><button type="button" disabled={saving} onClick={() => onDecision("보류")}>보류</button><button type="button" disabled={saving} onClick={() => onDecision("버림")}>제외</button><span>{decision ? `현재: ${decision === "버림" ? "제외" : decision}` : "아직 판정 전"}</span></div>
      <div className={styles.followUp}><div className={styles.followButtons}><button type="button" className={requestType === "deeper" ? styles.activeRequest : ""} onClick={() => onRequestType("deeper")}>이 주제 더 깊게</button><button type="button" className={requestType === "similar" ? styles.activeRequest : ""} onClick={() => onRequestType("similar")}>유사 주제 찾기</button><button type="button" className={requestType === "new" ? styles.activeRequest : ""} onClick={() => onRequestType("new")}>새 주제 더 받기</button></div><div className={styles.requestRow}><input value={requestText} onChange={(event) => onRequestText(event.target.value)} placeholder="더 찾을 방향이 있으면 한 줄만 적어줘" /><button type="button" disabled={requesting} onClick={onRequest}>다음 조사에 넣기</button><button type="button" onClick={onOpenGpt}>AI 인계문 복사 · GPT 열기</button></div></div>
      <div className={styles.saveState}>{saving || requesting ? "저장 중…" : notice || (decision ? `${decision} 저장됨` : "")}</div>
    </div>
  </div>;
}
