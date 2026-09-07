"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { callApi } from "@/lib/dashboard-client";
import { keepNewestVersion } from "@/lib/intake-types";
import { isIntakeCampaign, lastCampaignUpdate } from "./campaign-model";
import type { CampaignEvent, IntakeCampaign } from "./campaign-model";
import styles from "./intake-cases.module.css";

const fields: Record<string, string> = { status: "현재 진행", next_action: "다음 행동", next_actor: "다음 차례", upload_date: "업로드 일정", amount: "금액·정산", script_review: "대본·검수", filming: "촬영", auto_dm: "자동 DM", special_terms: "별도 조건" };
const states = { confirmed: "확인된 합의", proposed: "제안·요청 · 합의 전", unknown: "아직 확인하지 못함", not_applicable: "해당 없음 · 근거 확인" } as const;
const timestamp = (value: string) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Claim({ event }: { event: CampaignEvent }) {
  return <div className={styles.claim}>
    <span className={styles.claimState} data-state={event.state}>{states[event.state]}</span>
    <p>{event.value}</p>
    <details className={styles.source}><summary>근거와 원문 · {event.occurred_at || "발생일 확인 필요"}</summary>
      <p>{event.agreement_quote || event.intake.source_quote}</p>
      <Link href={`/dashboard/diary?entry=${encodeURIComponent(event.intake.source_id)}`}>남긴 메모 읽기 ↗</Link>
      {event.intake.recorded_at && Number.isFinite(Date.parse(event.intake.recorded_at)) && <span>기록에 연결한 시각 {timestamp(event.intake.recorded_at)}</span>}
    </details>
  </div>;
}

export default function IntakeCases({ selectedCaseId }: { selectedCaseId?: string }) {
  const [cases, setCases] = useState<IntakeCampaign[]>([]);
  const [selectedId, setSelectedId] = useState(selectedCaseId || "");
  const [selected, setSelected] = useState<IntakeCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const listSequence = useRef(0);
  const detailSequence = useRef(0);
  const invalidateList = useCallback(() => { ++listSequence.current; }, []);
  const invalidateDetail = useCallback(() => { ++detailSequence.current; }, []);

  const load = useCallback(async () => {
    const sequence = ++listSequence.current;
    try {
      const data: unknown = await callApi("GET", "intake/campaigns");
      if (!data || typeof data !== "object" || !("cases" in data) || !Array.isArray(data.cases) || !data.cases.every(isIntakeCampaign)) throw new Error("Invalid campaign list");
      if (sequence !== listSequence.current) return;
      const next = data.cases;
      setCases(next); setError("");
      setSelectedId(current => current || next[0]?.id || "");
      setSelected(current => current ? next.find(item => item.id === current.id && item.version >= current.version) || current : current);
    } catch { if (sequence === listSequence.current) setError("메모에서 연결한 협업을 불러오지 못했어요. 기존 광고 카드와 별도로 다시 확인해 주세요."); }
    finally { if (sequence === listSequence.current) setLoading(false); }
  }, []);

  const loadDetail = useCallback(async () => {
    if (!selectedId) return;
    const sequence = ++detailSequence.current;
    setDetailLoading(true); setDetailError(""); setSelected(current => current?.id === selectedId ? current : null);
    try {
      const data: unknown = await callApi("GET", `intake/campaigns/${encodeURIComponent(selectedId)}`);
      if (!data || typeof data !== "object" || !("case" in data) || !isIntakeCampaign(data.case) || data.case.id !== selectedId) throw new Error("Invalid campaign detail");
      if (sequence === detailSequence.current) { const incoming = data.case; setSelected(current => keepNewestVersion(current, incoming)); }
    } catch { if (sequence === detailSequence.current) setDetailError("이 협업의 현재 내용을 확인하지 못했어요. 기록이 없다는 뜻은 아니에요."); }
    finally { if (sequence === detailSequence.current) setDetailLoading(false); }
  }, [selectedId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refresh, 20_000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { active = false; invalidateList(); window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [invalidateList, load]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadDetail(); });
    return () => { active = false; invalidateDetail(); };
  }, [invalidateDetail, loadDetail]);
  useEffect(() => { if (selectedCaseId) queueMicrotask(() => setSelectedId(selectedCaseId)); }, [selectedCaseId]);

  const lastUpdate = selected ? lastCampaignUpdate(selected) : null;
  const currentFields = selected ? [...new Set(["status", "next_action", "next_actor", ...Object.keys(selected.fields)])].sort((a, b) => Object.keys(fields).indexOf(a) - Object.keys(fields).indexOf(b)) : [];

  return <section className={styles.section} aria-labelledby="intake-campaign-title">
    <div className={styles.heading}><div><p className={styles.eyebrow}>대화와 조건을 이어서</p><h2 id="intake-campaign-title">메모에서 이어진 협업</h2></div><button type="button" onClick={() => { void load(); void loadDetail(); }}>새로고침</button></div>
    <p className={styles.description}>새 요청과 확인된 합의를 함께 보며, 누가 무엇을 기다리는지 확인해요.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading && <p className={styles.empty} role="status">연결된 협업을 불러오고 있어요.</p>}
    {!loading && !error && cases.length === 0 && !selectedCaseId && <p className={styles.empty}>아직 메모에서 연결된 협업이 없어요. 브랜드와 회차, 달라진 조건을 <Link href="/dashboard/diary">오늘 메모</Link>에 남기면 이곳에서 이어서 볼 수 있어요.</p>}
    {cases.length > 0 && <nav className={styles.caseList} aria-label="메모에서 연결한 협업 선택">{cases.map(item => <button key={item.id} type="button" aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}><strong>{item.brand}</strong><span>{item.period} · {item.account}</span></button>)}</nav>}
    {detailError && <div className={styles.error} role="alert"><p>{detailError}</p><button type="button" onClick={() => void loadDetail()}>이 협업 다시 불러오기</button></div>}
    {detailLoading && !selected && <p className={styles.empty} role="status">조건과 원문을 확인하고 있어요.</p>}
    {selected && <article className={styles.caseDetail}>
      <div className={styles.caseHeading}><div><p>{selected.brand} · {selected.account} · {selected.period}</p><h3>{selected.title}</h3></div>{lastUpdate && <span>마지막 기록 {timestamp(lastUpdate)}</span>}</div>
      <div className={styles.fields}>{currentFields.map(field => {
        const claim = selected.fields[field];
        return <section key={field}><h4>{fields[field] || field}</h4><div>{claim ? <>{claim.agreement && <Claim event={claim.agreement} />}{claim.proposal && <Claim event={claim.proposal} />}{claim.unknown && <Claim event={claim.unknown} />}</> : <p className={styles.description}>아직 연결된 기록에서 확인하지 못했어요.</p>}</div></section>;
      })}</div>
      <details className={styles.timeline}><summary>대화·조건이 바뀐 기록 · {selected.events.length}개</summary>{[...selected.events].reverse().map(event => <section key={event.id}><h4>{fields[event.field] || event.field} · {event.occurred_at}</h4><Claim event={event} /></section>)}</details>
      <Link className={styles.addMemo} href="/dashboard/diary">새 대화나 바뀐 조건 남기기 ↗</Link>
    </article>}
    <p className={styles.footnote}>아래 기존 광고 카드의 금액·건수 집계와는 별도로, 새 메모의 근거를 연결한 진행 기록이에요.</p>
  </section>;
}
