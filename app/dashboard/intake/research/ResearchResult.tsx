"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { callApi } from "@/lib/dashboard-client";
import { isIntakeResearchResult, safeResearchUrl } from "./research-model";
import type { IntakeResearchResult } from "./research-model";
import styles from "./research.module.css";

export default function ResearchResult({ id }: { id: string }) {
  const [result, setResult] = useState<IntakeResearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const invalidate = useCallback(() => { ++sequence.current; }, []);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const response: unknown = await callApi("GET", `intake/research/${encodeURIComponent(id)}`);
      if (!response || typeof response !== "object" || !("research" in response) || !isIntakeResearchResult(response.research) || response.research.id !== id) throw new Error("Invalid research result");
      if (request === sequence.current) { setResult(response.research); setError(""); }
    } catch { if (request === sequence.current) setError("조사 결과를 불러오지 못했어요. 원문은 다이어리에 남아 있어요. 잠시 뒤 다시 확인해 주세요."); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [id]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { active = false; invalidate(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [invalidate, load]);

  return <main className={`dashboard-root ${styles.page}`}>
    <header className={styles.header}><Link href="/dashboard/diary">← 오늘, 한나</Link><button type="button" disabled={loading} onClick={() => void load()}>{loading ? "확인 중…" : "결과 새로고침"}</button></header>
    {error && <div className={styles.error} role="alert"><p>{error}</p><button type="button" disabled={loading} onClick={() => void load()}>다시 불러오기</button></div>}
    {!result && loading && <p className={styles.empty} role="status">메모에서 이어진 조사와 출처를 불러오고 있어요.</p>}
    {result && <>
      <p className={styles.eyebrow}>{result.status === "archived" ? "이전 질문에 대한 보관된 조사" : "한나의 질문에서 이어진 조사"}</p>
      <h1>{result.source.quote}</h1>
      <p className={styles.date}>{new Date(result.generated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}에 정리</p>
      {result.status === "archived" && <div className={styles.archived} role="status"><strong>현재 판단으로 사용하지 않는 이전 결과예요.</strong><p>{result.archive?.reason}</p><p>원문 변경이나 되돌리기 이전 내용을 보존했어요. 최신 질문과 처리 결과를 다이어리에서 확인해 주세요.</p></div>}
      <p className={styles.summary}>{result.summary}</p>
      <section className={styles.section}><h2>왜 지금 살펴봤나</h2><p>{result.why_now}</p></section>
      <section className={styles.section}><h2>한 번 더 생각해 볼 관점</h2><p>{result.perspective}</p></section>
      <section className={styles.application}><h2>{result.status === "archived" ? "당시 제안했던 활용" : "이렇게 활용해 볼 수 있어요"}</h2><p>{result.application}</p></section>
      <section className={styles.section}><h2>참고한 자료</h2><p className={styles.note}>각 링크를 어디까지 확인했는지 구분했어요. 출처에서 읽은 내용과 한나에게 적용한 관점은 함께 살펴봐 주세요.</p><ol className={styles.sources}>{result.sources.map(source => <li key={source.url}><span>{source.evidence.read_level === "page_fetch" ? "페이지 읽기 확인" : "검색 결과 확인"}</span><h3><a href={safeResearchUrl(source.url) || undefined} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></h3><p>{source.claim}</p></li>)}</ol></section>
      <section className={styles.section}><h2>이어갈 질문</h2><p>{result.open_question}</p><Link className={styles.sourceLink} href={`/dashboard/diary?entry=${encodeURIComponent(result.source.id)}`}>질문을 남긴 메모로 돌아가기 ↗</Link></section>
    </>}
  </main>;
}
