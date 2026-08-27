"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DeskItem, HannaDeskView } from "@/lib/hanna-desk";
import styles from "./hanna-desk.module.css";

const KO_WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function dateLabel(iso: string): { date: string; weekday: string; month: string } {
  const [year, month, day] = iso.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return {
    date: String(day),
    weekday: `${KO_WEEKDAY[parsed.getDay()]}요일`,
    month: `${year}년 ${month}월`,
  };
}

function toneLabel(item: DeskItem): string {
  if (item.urgency === "urgent") return "지금 확인";
  if (item.urgency === "attention") return "오늘 판단";
  return "제안";
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

function DecisionRow({ item, index }: { item: DeskItem; index: number }) {
  return (
    <article className={styles.decisionRow} data-urgency={item.urgency}>
      <div className={styles.decisionIndex}>{String(index + 1).padStart(2, "0")}</div>
      <div className={styles.decisionCopy}>
        <div className={styles.rowMeta}>
          <span>{item.source}</span>
          <span className={styles.metaDot} />
          <span>{toneLabel(item)}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.detail}</p>
      </div>
      <Link className={styles.rowAction} href="/dashboard" aria-label={`${item.title} 운영에서 확인`}>
        확인
        <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}

export default function HannaDeskBoard({ view }: { view: HannaDeskView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshedAt, setRefreshedAt] = useState("");
  const day = dateLabel(view.date);

  const refresh = () => {
    startTransition(() => {
      router.refresh();
      setRefreshedAt(
        new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      );
    });
  };

  return (
    <main className={`dashboard-root ${styles.page}`}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.dateBlock} aria-label={`${day.month} ${day.date}일 ${day.weekday}`}>
            <span className={styles.month}>{day.month}</span>
            <strong>{day.date}</strong>
            <span className={styles.weekday}>{day.weekday}</span>
          </div>

          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.liveDot} />
              HANNA DESK · READ ONLY
            </div>
            <h1>오늘 한나가<br />판단할 것만.</h1>
            <p>일정과 할 일을 먼저 연결한 1단계 판단함이에요.</p>
          </div>

          <button className={styles.refresh} type="button" onClick={refresh} disabled={isPending}>
            <span aria-hidden="true">{isPending ? "···" : "↻"}</span>
            {refreshedAt ? `${refreshedAt} 확인` : "새로 확인"}
          </button>
        </header>

        {view.isPartial && (
          <div className={styles.partial} role="status">
            <strong>부분 확인</strong>
            <span>{view.unavailableSources.join(" · ")} 소식통은 지금 열리지 않았어요.</span>
          </div>
        )}

        <section className={styles.decisionStage} aria-labelledby="decision-heading">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionNumber}>01</span>
              <h2 id="decision-heading">지금 판단할 것</h2>
            </div>
            <strong className={styles.count}>{view.summary.decisions}</strong>
          </div>

          <div className={styles.decisionList}>
            {view.decisions.length ? (
              view.decisions.slice(0, 5).map((item, index) => (
                <DecisionRow key={item.id} item={item} index={index} />
              ))
            ) : (
              <EmptyState>지금 바로 판단할 일은 없어요.</EmptyState>
            )}
          </div>
        </section>

        <div className={styles.midGrid}>
          <section className={styles.paperPanel} aria-labelledby="attention-heading">
            <div className={styles.panelHeading}>
              <span>02</span>
              <h2 id="attention-heading">놓치면 안 되는 것</h2>
              <strong>{view.summary.mustNotMiss}</strong>
            </div>
            <div className={styles.compactList}>
              {view.mustNotMiss.length ? (
                view.mustNotMiss.slice(0, 6).map((item) => (
                  <div className={styles.compactRow} key={item.id}>
                    <span className={styles.attentionMark} aria-hidden="true">!</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail} · {item.source}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>오늘 추가로 챙길 일은 없어요.</EmptyState>
              )}
            </div>
          </section>

          <section className={styles.timelinePanel} aria-labelledby="today-heading">
            <div className={styles.panelHeading}>
              <span>03</span>
              <h2 id="today-heading">오늘</h2>
              <strong>{view.today.length}</strong>
            </div>
            <div className={styles.timeline}>
              {view.today.length ? (
                view.today.slice(0, 7).map((item) => (
                  <div className={styles.timelineRow} key={item.id}>
                    <time>{item.time || "종일"}</time>
                    <span className={styles.timelineDot} aria-hidden="true" />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail} · {item.source}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>연결된 오늘 일정이 없어요.</EmptyState>
              )}
            </div>
          </section>
        </div>

        <section className={styles.waitingPanel} aria-labelledby="waiting-heading">
          <div className={styles.panelHeading}>
            <span>04</span>
            <h2 id="waiting-heading">기다리는 것</h2>
            <strong>{view.summary.waiting}</strong>
          </div>
          {view.waiting.length ? (
            <div className={styles.waitingGrid}>
              {view.waiting.slice(0, 4).map((item) => (
                <article key={item.id} data-urgency={item.urgency}>
                  <span>{item.source}</span>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>지금 연결된 데이터에서 기다리는 일은 없어요.</EmptyState>
          )}
        </section>

        <footer className={styles.footer}>
          <div>
            <span className={styles.connectedDot} />
            일정 연결됨
          </div>
          <div>
            <span className={styles.connectedDot} />
            할 일 연결됨
          </div>
          <div className={styles.preparing}>
            <span />
            카톡 · DM 답장함은 다음 단계
          </div>
        </footer>
      </div>
    </main>
  );
}
