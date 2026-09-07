"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { JournalEntry } from "@/lib/journal";
import { formatDay } from "@/lib/journal";
import { briefingExcerpt, safeDashboardRoute } from "./home-model";
import type { JournalContext } from "./home-model";
import styles from "./diary.module.css";

function plainInline(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`([^`]+)`/g, "$1");
}

function BriefingText({ content }: { content: string }) {
  return <div className={styles.briefingText}>{briefingExcerpt(content).split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
    const heading = paragraph.match(/^#{1,6}\s+([^\n]+)$/);
    if (heading) return <h3 key={index}>{plainInline(heading[1])}</h3>;
    return <p key={index}>{plainInline(paragraph.replace(/^#{1,6}\s+/gm, "").replace(/^[-*]\s+/gm, "· ").replace(/^>\s?/gm, ""))}</p>;
  })}</div>;
}

interface DayContextProps {
  context: JournalContext | null;
  loading: boolean;
  error: string;
  today: string;
  evening: boolean;
  renderEntry: (entry: JournalEntry) => ReactNode;
  onReload: () => void;
}

export default function DayContext({ context, loading, error, today, evening, renderEntry, onReload }: DayContextProps) {
  const [showAllTasks, setShowAllTasks] = useState(false);
  const tasks = context?.open_tasks.entries || [];
  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 5);
  const question = context?.questions.items[0];
  const briefing = context?.briefing;

  return <div className={styles.dailyContext}>
    {error && <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={onReload} disabled={loading}>다시 불러오기</button></div>}
    {!context && loading && <p className={styles.loading} role="status">최근 브리핑과 남아 있는 일을 확인하고 있어요.</p>}
    {!evening && <section className={styles.briefingSection} aria-labelledby="morning-briefing-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>밤사이 준비된 이야기</p><h2 id="morning-briefing-title">아침 브리핑</h2></div>{briefing?.date && <span>{formatDay(briefing.date)} 기준</span>}</div>
      {briefing?.status === "available" && briefing.content ? <>
        {briefing.freshness !== "same_day" && <p className={styles.sourceNote}>{briefing.freshness === "previous_day" ? "아직 오늘 브리핑이 없어 어제 내용을 보여드려요." : "가장 최근 저장된 브리핑이에요. 오늘 상황과 함께 확인해 주세요."}</p>}
        <BriefingText content={briefing.content} />
        <Link className={styles.readMore} href={safeDashboardRoute(briefing.source_route, "/dashboard/briefing")}>분석 전체 읽기 <span aria-hidden="true">↗</span></Link>
      </> : !loading && <p className={styles.emptyState}>{briefing?.status === "unavailable" ? "브리핑을 확인하지 못했어요. 기존 브리핑에서 상태를 확인할 수 있어요." : "아직 연결된 브리핑이 없어요."} <Link href="/dashboard/briefing">브리핑 열기 ↗</Link></p>}
    </section>}

    <section className={styles.openTasksSection} aria-labelledby="open-tasks-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>날짜를 넘겨도 놓치지 않게</p><h2 id="open-tasks-title">{evening ? "남은 일 확인하기" : "기억해둘 일"}</h2></div>{context?.open_tasks.status === "available" && <span>{tasks.length}개</span>}</div>
      {context?.open_tasks.status === "available" ? tasks.length ? <>
        <div className={styles.openTasks}>{visibleTasks.map(entry => <div key={entry.id} className={styles.openTaskRow}><span className={styles.taskDate}>{entry.date ? entry.date === today ? "오늘" : formatDay(entry.date) : "날짜 미정"}</span>{renderEntry(entry)}</div>)}</div>
        {tasks.length > 5 && <button type="button" className={styles.textButton} onClick={() => setShowAllTasks(value => !value)}>{showAllTasks ? "다섯 개만 보기 ↑" : `남은 ${tasks.length - 5}개 더 보기 ↓`}</button>}
      </> : <p className={styles.emptyState}>확정한 할 일이 아직 없어요. 위 메모에 해야 할 일과 날짜를 함께 적으면 여기에 연결해요.</p> : !loading && <p className={styles.emptyState}>남아 있는 일을 확인하지 못했어요. 기록이 없다는 뜻은 아니에요.</p>}
      <p className={styles.sectionFootnote}>하겠다고 정한 일만 보여요. 날짜나 뜻이 애매하면 먼저 물어보고, 보관한 기획은 여기 쌓지 않아요.</p>
    </section>

    {!evening && question && <section className={styles.questionSection} aria-labelledby="briefing-question-title">
      <p className={styles.eyebrow}>한나의 생각을 더 알고 싶어요</p><h2 id="briefing-question-title">브리핑에서 이어갈 질문</h2><p className={styles.questionText}>{question.question}</p>
      <Link className={styles.readMore} href={safeDashboardRoute(question.source_route || context?.questions.source_route, "/dashboard/briefing")}>브리핑에서 답변 이어가기 ↗</Link>
      {context && context.questions.total > 1 && <span className={styles.sectionFootnote}> 다른 질문 {context.questions.total - 1}개도 함께 볼 수 있어요.</span>}
    </section>}
    {!evening && context?.questions.status === "unavailable" && <p className={styles.sourceNote}>브리핑 질문을 확인하지 못했어요. <Link href="/dashboard/briefing">기존 질문 보기 ↗</Link></p>}
  </div>;
}
