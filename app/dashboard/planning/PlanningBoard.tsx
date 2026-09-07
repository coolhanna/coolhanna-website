"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PlanningDecision, PlanningDecisionsResponse, PlanningFeedResponse, PlanningResearch, PlanningSavedResponse } from "@/lib/dashboard-api";
import { planningIdeasForDay, type Account, type Format, type PlanningIdea, type Source } from "./planning-data";
import styles from "./planning.module.css";

type FilterState = { account: "all" | Account; source: "all" | Source; format: "all" | Format };
type RequestType = "new" | "deeper" | "similar";

const accountFilters: Array<[FilterState["account"], string]> = [["all", "전체"], ["main", "본계정"], ["hyerin", "혜린"], ["food", "먹거리"]];
const sourceFilters: Array<[FilterState["source"], string]> = [["all", "모두"], ["value", "가치관"], ["concern", "실제 고민"], ["trend", "유행·시의성"], ["season", "제품·계절"]];
const formatFilters: Array<[FilterState["format"], string]> = [["all", "모두"], ["skit", "상황극"], ["thought", "생각 설명"], ["vlog", "브이로그"], ["review", "비교·리뷰"], ["experiment", "생활실험"]];
// 새 조사는 넓게, 그 사이 날은 한나의 선택을 더 깊게 처리한다.
const loopSteps = ["이틀마다 새 조사", "20개 탐색", "한나 피드백", "다음날 깊이 보기", "AI 인계", "다음 조사 반영"];
const positiveFeedbackReasons = ["주제 맞음", "관점 맞음", "장면 좋음", "내 이야기 있음"];
const negativeFeedbackReasons = ["뻔함", "내 이야기 아님", "상황 없음", "이미 한 주제", "계정 안 맞음"];
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

type ApiFailure = { error: string };
type PlanningView = "feed" | "saved";

export default function PlanningBoard({ initialFeed, initialDecisions, initialSaved, initialView = "feed" }: { initialFeed: PlanningFeedResponse | ApiFailure; initialDecisions: PlanningDecisionsResponse | ApiFailure; initialSaved: PlanningSavedResponse | ApiFailure; initialView?: PlanningView }) {
  const [feed, setFeed] = useState<PlanningFeedResponse>(() => "current" in initialFeed ? initialFeed : { current: null, dates: [], requests: [], status: "missing" });
  const [savedRecords, setSavedRecords] = useState<PlanningDecision[]>(() => "items" in initialSaved ? initialSaved.items : []);
  const savedView = initialView === "saved";
  const currentCandidates = feed.current?.candidates;
  const ideas = useMemo(() => savedView
    ? planningIdeasForDay(savedRecords.flatMap((item) => item.saved && item.candidate ? [item.candidate] : []))
    : planningIdeasForDay(currentCandidates), [currentCandidates, savedRecords, savedView]);
  const initialDecisionMap = useMemo(() => {
    const map = new Map<string, PlanningDecision>();
    for (const item of "decisions" in initialDecisions ? initialDecisions.decisions : []) map.set(item.candidate_id, item);
    return map;
  }, [initialDecisions]);
  const [filters, setFilters] = useState<FilterState>({ account: "all", source: "all", format: "all" });
  const [progressOnly, setProgressOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [candidatePage, setCandidatePage] = useState(0);
  const [selectedId, setSelectedId] = useState(ideas[0]?.id || "");
  const [decisions, setDecisions] = useState(initialDecisionMap);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries([...initialDecisionMap].map(([id, item]) => [id, item.feedback || ""])));
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [failedSave, setFailedSave] = useState<{ idea: PlanningIdea; decision: PlanningDecision["decision"]; batchDate: string; feedback: string } | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [notice, setNotice] = useState("");
  const [researchOpen, setResearchOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("deeper");
  const [requestText, setRequestText] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);

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
  const savedCount = savedRecords.filter((item) => item.saved).length;
  const pendingCount = feed.requests.filter((item) => item.status === "pending").length;
  const filtered = filters.account !== "all" || filters.source !== "all" || filters.format !== "all" || progressOnly;

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
      setFeed(payload); setSelectedId(""); setCandidatePage(0); setDetailOpen(false);
    } catch (error) { setNotice(`불러오지 못했어 · ${(error as Error).message}`); }
    finally { setLoadingDay(false); }
  }

  async function saveDecision(idea: PlanningIdea, decision: PlanningDecision["decision"], retry?: { batchDate: string; feedback: string }) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true); setNotice(""); setFailedSave(null);
    const batchDate = retry?.batchDate ?? (savedView ? decisions.get(idea.id)?.batch_date || "" : feed.current?.date || "");
    const feedback = retry?.feedback ?? drafts[idea.id] ?? "";
    try {
      const response = await fetch("/api/dashboard/proxy/planning-decision", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20_000), body: JSON.stringify({ candidate_id: idea.id, decision, batch_date: batchDate, feedback }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || payload?.error || `저장 실패 ${response.status}`);
      if (payload.ok !== true || payload.candidate_id !== idea.id || typeof payload.decision !== "string" || typeof payload.feedback !== "string" || typeof payload.decided_at !== "string" || (decision === "보관" && (payload.saved !== true || payload.candidate?.id !== idea.id)) || (decision === "보관 해제" && payload.saved !== false)) throw new Error("저장 결과를 확인하지 못했어");
      const record: PlanningDecision = payload;
      setDecisions((current) => new Map(current).set(idea.id, record));
      setSavedRecords((current) => [...current.filter((item) => item.candidate_id !== idea.id), ...(record.saved ? [record] : [])]);
      setNotice(decision === "보관" ? "보관했어. 쓰고 싶을 때 다시 꺼내면 돼." : decision === "보관 해제" ? "보관함에서 꺼냈어. 원래 후보와 의견은 남아 있어." : `${decision} 의견을 저장했어.`);
    } catch (error) { setNotice(`저장 결과를 확인하지 못했어. 다시 시도해 줘. ${error instanceof Error && error.name !== "TimeoutError" ? error.message : "연결 시간이 초과됐어."}`); setFailedSave({ idea, decision, batchDate, feedback }); }
    finally { savingRef.current = false; setSaving(false); }
  }

  async function saveRequest(type: RequestType = requestType) {
    setRequesting(true); setNotice("");
    try {
      const response = await fetch("/api/dashboard/proxy/planning-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_type: type, candidate_id: type === "new" ? "" : selected?.id || "", batch_date: savedView && selected ? decisions.get(selected.id)?.batch_date || "" : feed.current?.date || "", instruction: requestText }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || payload?.error || `요청 실패 ${response.status}`);
      setFeed((current) => ({ ...current, requests: [...current.requests, payload] })); setRequestText("");
      setNotice("AI 조사 요청 저장됨 · 처리 대기 중");
    } catch (error) { setNotice(`요청하지 못했어 · ${(error as Error).message}`); }
    finally { setRequesting(false); }
  }

  async function openGpt() {
    const prompt = selected
      ? `이건 ${selected.accountLabel} 계정의 큰 질문 단계 콘텐츠 후보야. 완성 대본을 쓰지 말고, 아래 답변 흐름을 따라 한나의 실제 경험과 판단을 끌어내는 대화를 이어가줘.\n\n계정: ${selected.accountLabel}\n주제 영역: ${selected.topicArea}\n큰 질문: ${selected.title}\n답변 흐름: ${selected.answerFlow.join(" → ")}\n조사 출발점: ${selected.references[0]?.[0] || "출처 확인 필요"} · ${selected.references[0]?.[1] || ""}\n선택 후 살펴볼 구체 사례: ${selected.situation}\n현재 충돌 가설: ${selected.conflict}\n한나 의견: ${drafts[selected.id] || requestText || "아직 없음"}\n\n먼저 1) 한나에게 실제로 있었던 일, 2) 지금 지키고 싶은 기준, 3) 화면으로 보여줄 장면을 최대 3개 질문으로 확인해줘. 답을 받은 뒤에만 구체 상황과 릴스·게시물 형식을 제안하고, 구조를 고르기 전에는 문장 대본을 쓰지 마.`
      : `한나의 세 계정 운영 기준으로 새 콘텐츠 후보를 찾아줘. 완성 대본보다 계정과 유입·호감·신뢰 역할을 먼저 붙여줘. 추가 요청: ${requestText || "새로운 문제와 욕구를 찾아줘."}`;
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    try { await navigator.clipboard.writeText(prompt); setNotice("후보 맥락을 복사했어 · 열린 GPT 창에 붙여넣으면 돼"); }
    catch { setNotice("GPT는 열었지만 자동 복사는 막혔어. 한나 의견을 직접 붙여줘."); }
  }

  return <main className={`dashboard-root ${styles.page}`}>
    <header className={styles.header}>
      <div className={styles.headerTitle}>
        <span className={styles.eyebrow}>콘텐츠 기획</span>
        <strong>{savedView ? "다시 꺼내 쓸 주제" : feed.current?.batch_label || displayDay(feed.current?.date)}</strong>
        <em className={styles.todayTask}>{savedView ? "마감 없이 남겨둔 재료. 오늘 쓰지 않아도 괜찮아." : "괜찮은 주제는 보관해두고, 오늘 쓸 것은 바로 시작해."}</em>
      </div>
      <div className={styles.headerActions}>
        <nav className={styles.viewTabs} aria-label="기획 보기"><Link prefetch={false} href="/dashboard/planning" aria-current={!savedView ? "page" : undefined}>추천 후보</Link><Link prefetch={false} href="/dashboard/planning?view=saved" aria-current={savedView ? "page" : undefined}>보관함 {"error" in initialSaved ? "" : savedCount}</Link></nav>
        {progressCount > 0 && <button type="button" className={progressOnly ? styles.activeProgress : ""} onClick={toggleProgress}>발전 의견 {progressCount}</button>}
        {!savedView && <label>지난 후보 <select value={feed.current?.date || ""} disabled={loadingDay} onChange={(event) => loadDay(event.target.value)}>{feed.dates.map((item) => <option key={item.date} value={item.date}>{item.date} · {item.candidate_count ?? 0}개</option>)}</select></label>}
      </div>
    </header>

    {("error" in initialDecisions || "error" in initialSaved || (!savedView && "error" in initialFeed)) && <section className={styles.failedRun} role="alert"><b>기획 기록 일부를 불러오지 못했어</b><span>비어 있는 것으로 판단하지 않고, 다시 확인해야 해.</span><button type="button" onClick={() => window.location.reload()}>다시 불러오기</button></section>}
    {!savedView && !feed.current && !("error" in initialFeed) && <section className={styles.failedRun} role="status"><b>오늘 조사가 완료되지 않았어</b><span>지난 후보와 보관함은 계속 볼 수 있어. 완료된 조사만 추천 후보로 보여줘.</span></section>}
    {savedView && "unavailable" in initialSaved && initialSaved.unavailable.length > 0 && <section className={styles.failedRun} role="alert"><b>보관한 주제 {initialSaved.unavailable.length}개의 원문을 확인해야 해</b><span>기록을 지우지 않고 유지했어.</span></section>}
    {(notice || saving) && <div className={styles.globalNotice} role={failedSave ? "alert" : "status"}>{saving ? "저장 중…" : notice}{failedSave && <button type="button" disabled={saving} onClick={() => saveDecision(failedSave.idea, failedSave.decision, failedSave)}>다시 저장</button>}</div>}

    {!savedView && <MetaBar
      research={feed.current?.research}
      open={researchOpen}
      onToggle={() => setResearchOpen((value) => !value)}
      productCount={feed.current?.product_radar?.length || 0}
      nextRun={displayTime(feed.current?.next_run_at)}
      loop={loopSteps}
    />}

    <section className={styles.quickFilters} aria-label="후보 빠른 필터">
      <div className={styles.accountTabs}>{accountFilters.map(([value, label]) => {
        const count = value === "all" ? ideas.length : ideas.filter((idea) => idea.account === value).length;
        return <button key={value} type="button" className={filters.account === value ? styles.activeTab : ""} onClick={() => setFilter("account", value)}>{label}<span>{count}</span></button>;
      })}</div>
      <button type="button" className={filterOpen ? styles.activeRequest : ""} aria-expanded={filterOpen} onClick={() => setFilterOpen((value) => !value)}>재료·형식 필터</button>
      {filterOpen && <>
        <label>재료<select value={filters.source} onChange={(event) => setFilter("source", event.target.value as FilterState["source"])}>{sourceFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>형식<select value={filters.format} onChange={(event) => setFilter("format", event.target.value as FilterState["format"])}>{formatFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </>}
      {filtered && <button type="button" className={styles.reset} onClick={resetFilters}>초기화</button>}
      {pendingCount > 0 && <span className={styles.pending}>조사 대기 {pendingCount}</span>}
      <button type="button" className={styles.moreTopics} aria-expanded={newRequestOpen} onClick={() => { setRequestType("new"); setNewRequestOpen(value => !value); }}>+ 새 주제</button>
    </section>

    {newRequestOpen && <form className={styles.newTopicRequest} onSubmit={event => { event.preventDefault(); void saveRequest("new"); }}>
      <label htmlFor="new-topic-direction">다음에는 어떤 주제를 찾아볼까?</label>
      <div><input id="new-topic-direction" autoFocus value={requestText} disabled={requesting} onChange={event => setRequestText(event.target.value)} placeholder="궁금한 방향을 편하게 적어줘" /><button type="submit" disabled={requesting}>{requesting ? "요청 저장 중…" : "다음 조사에 넣기"}</button></div>
      <p>요청을 저장하면 다음 조사에서 확인해. 지금 바로 새 후보가 생성되는 것은 아니야.</p>
    </form>}

    <div className={`${styles.workspace} ${detailOpen && selected ? styles.showDetail : ""}`}>
      <section className={styles.listPane} aria-label="기획 후보">
        <div className={styles.listHeader}><strong>{savedView ? "보관한 주제" : feed.current?.batch_label || "오늘 조사 후보"}</strong><span>{visible.length}개 · {currentPage + 1}/{pageCount}쪽</span></div>
        <div className={styles.ideaList}>{pagedVisible.map((idea, index) => {
          const decision = decisions.get(idea.id)?.decision;
          const saved = decisions.get(idea.id)?.saved;
          return <button key={idea.id} type="button" className={`${styles.ideaRow} ${accountRowClass[idea.account]} ${idea.id === effectiveSelectedId ? styles.selectedRow : ""} ${decision ? styles.decidedRow : ""}`} onClick={() => { setSelectedId(idea.id); setDetailOpen(true); }}>
            <span className={styles.rank}>{String(currentPage * pageSize + index + 1).padStart(2, "0")}</span>
            <span className={styles.rowBody}>
              <span className={styles.rowAccount}>{idea.topicArea} · 큰 질문{idea.variant ? ` · ${idea.variant}` : ""}</span>
              <strong>{idea.title}</strong>
              <span className={styles.rowMeta}>{idea.answerFlow.slice(0, 3).join(" → ")}</span>
              {saved && <span className={styles.rowState}>보관됨{savedView && decisions.get(idea.id)?.batch_date ? ` · ${decisions.get(idea.id)?.batch_date} 추천` : ""}</span>}
              {decision && decision !== "보관" && decision !== "보관 해제" && <span className={`${styles.rowState} ${decision === "발전" ? styles.rowStateDevelop : ""}`}>{decision === "버림" ? "제외" : decision}</span>}
            </span>
            <span className={styles.score}><small>적합</small>{idea.score}</span>
          </button>;
        })}{!visible.length && <p className={styles.empty}>{savedView && !filtered ? ("error" in initialSaved ? "보관함을 다시 불러와야 해." : "아직 보관한 주제가 없어. 추천 후보에서 마음에 드는 주제를 보관해 줘.") : "조건에 맞는 후보가 없어."}</p>}</div>
        {visible.length > pageSize && <nav className={styles.pagination} aria-label="후보 페이지"><button type="button" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>이전</button>{Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" className={index === currentPage ? styles.currentPage : ""} onClick={() => changePage(index)}>{index + 1}</button>)}<button type="button" disabled={currentPage === pageCount - 1} onClick={() => changePage(currentPage + 1)}>다음</button></nav>}
      </section>

      <section className={styles.detailPane} aria-live="polite">
        <button type="button" className={styles.backToList} onClick={() => setDetailOpen(false)}>← 주제 목록</button>
        {selected ? <IdeaDetail idea={selected} feedback={drafts[selected.id] || ""} decision={decisions.get(selected.id)?.decision} saved={Boolean(decisions.get(selected.id)?.saved)} saving={saving || "error" in initialDecisions || "error" in initialSaved} notice={notice} requestType={requestType} requestText={requestText} requesting={requesting} onFeedback={(value) => setDrafts((current) => ({ ...current, [selected.id]: value }))} onDecision={(decision) => saveDecision(selected, decision)} onRequestType={setRequestType} onRequestText={setRequestText} onRequest={() => void saveRequest()} onOpenGpt={openGpt} /> : <p className={styles.empty}>주제 목록에서 골라줘.</p>}
      </section>
    </div>
  </main>;
}

/** 밤 조사 기록 · 제품 탭 · 다음 조사 예정을 한 줄로 묶은 상태줄. */
function MetaBar({ research, open, onToggle, productCount, nextRun, loop }: { research?: PlanningResearch; open: boolean; onToggle: () => void; productCount: number; nextRun: string; loop: string[] }) {
  const searched = research?.searched || ["아직 기록된 밤 조사가 없어"];
  const learned = research?.learned || ["다음 조사 완료 뒤 여기에 알게 된 점이 쌓여"];
  return <>
    <section className={styles.metaBar} aria-label={loop.join(" → ")}>
      <button type="button" className={styles.researchToggle} aria-expanded={open} onClick={onToggle}>밤 조사 기록 <span>{open ? "접기" : "펼치기"}</span></button>
      <span className={styles.researchLead}>{learned[0]}</span>
      <Link className={styles.productShortcut} href="/dashboard/products"><span>제품 후보 {productCount}</span><em>제품 탭에서 분리해 보기</em><b>→</b></Link>
      <span className={styles.nextRun}><b>매일 자료 도착</b>{nextRun} · 새 조사는 이틀마다</span>
    </section>
    {open && <div className={styles.researchDetails}>
      <section><h2>무엇을 찾았나</h2>{searched.map((item) => <p key={item}>· {item}</p>)}</section>
      <section><h2>무엇을 알게 됐나</h2>{learned.map((item) => <p key={item}>· {item}</p>)}</section>
      <section><h2>참고한 곳</h2>{(research?.sources || []).map((item) => <p key={item.label}>{item.url ? <a href={item.url} target="_blank" rel="noreferrer"><b>{item.label}</b></a> : <b>{item.label}</b>}{item.note}</p>)}</section>
    </div>}
  </>;
}

function IdeaDetail({ idea, feedback, decision, saved, saving, notice, requestType, requestText, requesting, onFeedback, onDecision, onRequestType, onRequestText, onRequest, onOpenGpt }: { idea: PlanningIdea; feedback: string; decision?: PlanningDecision["decision"]; saved: boolean; saving: boolean; notice: string; requestType: RequestType; requestText: string; requesting: boolean; onFeedback: (value: string) => void; onDecision: (decision: PlanningDecision["decision"]) => void; onRequestType: (value: RequestType) => void; onRequestText: (value: string) => void; onRequest: () => void; onOpenGpt: () => void }) {
  return <div className={styles.detailInner}>
    <div className={styles.detailScroll}>
    <div className={styles.detailTop}>
      <span className={styles.pills}><Pill className={accountClass[idea.account]}>{idea.accountLabel}</Pill><Pill>{idea.topicArea}</Pill><Pill>큰 질문</Pill>{idea.sources.map((source) => <Pill key={source} className={sourceClass[source]}>{sourceFilters.find(([value]) => value === source)?.[1]}</Pill>)}</span>
      <span>AI 적합도 {idea.score}/100</span>
    </div>
    <h1>{idea.title}</h1>
    <p className={styles.verdict}><span>이 질문에서 확인할 것</span>{idea.verdict}</p>

    <section className={styles.answerFlow}>
      <div className={styles.answerFlowHead}><span>답변이 이어질 흐름</span><small>아직 대본이 아니라, 한나의 답을 찾는 순서</small></div>
      <ol>{idea.answerFlow.map((step, index) => <li key={`${idea.id}-flow-${index}`}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
    </section>

    <div className={styles.originLine}><span>어디서 온 문제</span><strong>{idea.references[0]?.[0] || "출처 확인 필요"}</strong><p>{idea.references[0]?.[1] || "실제 출처를 더 확인한 뒤 발전한다."}</p></div>

    <details className={styles.moreBox}>
      <summary>선택한 뒤 펼칠 구체 자료 · 사례·관점·첫 장면</summary>
      <ol className={styles.readSteps}>
        <li className={styles.angleCard}>
          <span className={styles.stepHead}><span className={styles.stepNo}>1</span><small>한나의 관점 가설</small></span>
          <strong>충돌</strong><p>{idea.conflict}</p>
          <strong>지키는 가치</strong><p>{idea.valueLine}</p>
          <strong>마지막 판정</strong><p>{idea.judgment}</p>
        </li>
        <li className={styles.sceneCard}>
          <span className={styles.stepHead}><span className={styles.stepNo}>2</span><small>릴스로 푸는 법</small></span>
          <strong>첫 장면</strong><p>{idea.situation}</p>
          <strong>{idea.primary[0]}</strong><p>{idea.primary[1]}</p>
        </li>
      </ol>
      {!!idea.evidenceCases?.length && <section className={styles.evidenceCases}>
        <h2>연결된 조사 사례</h2>
        {idea.evidenceCases?.map((item, index) => <article key={item.id || `${idea.id}-case-${index}`}>
          <span>{item.sourceLabel || "기존 조사"}</span>
          <strong>{item.title}</strong>
          {item.situation && <p>{item.situation}</p>}
        </article>)}
      </section>}
    </details>

    <details className={styles.moreBox}>
      <summary>더 넓히기 · 주의 · 참고한 자료 {idea.references.length}개</summary>
      <div className={styles.expansionStrip}>
        <section><small>더 깊게 쓸 것</small><strong>{idea.post[0]}</strong><p>{idea.post[1]}</p></section>
        <section><small>반응을 받을 것</small><strong>{idea.story[0]}</strong><p>{idea.story[1]}</p></section>
        <section className={styles.risk}><small>주의</small><p>{idea.risk}</p></section>
      </div>
      <div className={styles.references}>
        {idea.references.map(([label, text]) => <div key={`${label}-${text}`}><b>{label}</b><span>{text}</span></div>)}
      </div>
    </details>

    <div className={styles.feedbackBox}>
      <label htmlFor="planning-feedback">한나 의견</label>
      <textarea id="planning-feedback" value={feedback} onChange={(event) => onFeedback(event.target.value)} placeholder="예: 주제는 맞는데 상황극보다 내 생각을 말하는 게 맞아." />
      <div className={styles.feedbackReasons} aria-label="빠른 피드백 이유">
        <span>맞는 이유</span>
        {positiveFeedbackReasons.map((reason) => <button key={reason} type="button" onClick={() => onFeedback(feedback.includes(reason) ? feedback : `${feedback}${feedback ? " · " : ""}${reason}`)}>{reason}</button>)}
        <span>아닌 이유</span>
        {negativeFeedbackReasons.map((reason) => <button key={reason} type="button" onClick={() => onFeedback(feedback.includes(reason) ? feedback : `${feedback}${feedback ? " · " : ""}${reason}`)}>{reason}</button>)}
        {saved && <button type="button" disabled={saving} onClick={() => onDecision("보관")}>보관 이유 저장</button>}
      </div>
      <div className={styles.followUp}>
        <div className={styles.followButtons}>
          <button type="button" className={requestType === "deeper" ? styles.activeRequest : ""} onClick={() => onRequestType("deeper")}>이 주제 더 깊게</button>
          <button type="button" className={requestType === "similar" ? styles.activeRequest : ""} onClick={() => onRequestType("similar")}>유사 주제 찾기</button>
          <button type="button" className={requestType === "new" ? styles.activeRequest : ""} onClick={() => onRequestType("new")}>새 주제 더 받기</button>
        </div>
        <div className={styles.requestRow}>
          <input value={requestText} onChange={(event) => onRequestText(event.target.value)} placeholder="더 찾을 방향이 있으면 한 줄만 적어줘" />
          <button type="button" disabled={requesting} onClick={onRequest}>다음 조사에 넣기</button>
          <button type="button" onClick={onOpenGpt}>AI 인계문 복사 · GPT 열기</button>
        </div>
      </div>
    </div>
    </div>

    <div className={styles.decisionDock}>
      <span className={styles.dockLabel}>{saved ? "보관함에 있어. 쓰고 싶을 때 꺼내면 돼." : "나중에 쓰고 싶은 주제는 보관해 둬."}</span>
      <div className={styles.detailActions}>
        <button type="button" className={styles.develop} aria-pressed={saved} disabled={saving} onClick={() => onDecision(saved ? "보관 해제" : "보관")}>{saved ? "보관 해제" : "보관하기"}</button>
        <details className={styles.otherDecisions}><summary>다른 의견 남기기</summary><div><button type="button" disabled={saving} onClick={() => onDecision("발전")}>발전</button><button type="button" disabled={saving} onClick={() => onDecision("보류")}>보류</button><button type="button" disabled={saving} onClick={() => onDecision("버림")}>제외</button></div></details>
        {decision && decision !== "보관" && decision !== "보관 해제" && <span className={styles.currentState}>남긴 의견: {decision === "버림" ? "제외" : decision}</span>}
      </div>
      <div className={styles.saveState}>{saving || requesting ? "저장 대기 중…" : notice || "보관해도 할 일이나 제작 일정이 생기지 않아."}</div>
    </div>
  </div>;
}
