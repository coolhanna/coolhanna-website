"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { DeskWorkItem, HannaDeskView } from "@/lib/hanna-desk";
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

function timeLabel(value: string | null): string {
  if (!value) return "오늘 확인 중";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  })} 확인`;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

function WorkCard({ item }: { item: DeskWorkItem }) {
  return (
    <article className={styles.workCard} data-state={item.state}>
      <div className={styles.cardMeta}>
        <span>{item.source}</span>
        <strong>{item.stateLabel}</strong>
      </div>
      <h3>{item.title}</h3>
      <p>{item.detail}</p>
    </article>
  );
}

export default function HannaDeskBoard({ view }: { view: HannaDeskView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshedAt, setRefreshedAt] = useState("");
  const day = dateLabel(view.date);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setRefreshedAt(
        new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      );
    });
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(refresh, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

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
            <span className={styles.eyebrow}>HANNA DESK</span>
            <h1>오늘</h1>
            <p>{refreshedAt ? `${refreshedAt} 화면 새로고침` : timeLabel(view.checkedAt)}</p>
          </div>
          <button className={styles.refresh} type="button" onClick={refresh} disabled={isPending}>
            <span aria-hidden="true">{isPending ? "···" : "↻"}</span>
            새로 확인
          </button>
        </header>

        {view.isPartial && (
          <div className={styles.partial} role="status">
            <strong>아직 연결 중</strong>
            <span>{view.unavailableSources.join(" · ")} 정보는 지금 확인할 수 없어요.</span>
          </div>
        )}

        <section className={styles.primarySection} aria-labelledby="work-heading">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionNumber}>01</span>
              <h2 id="work-heading">지금 진행 중</h2>
            </div>
            <strong className={styles.count}>{view.currentWork.length}</strong>
          </div>
          <div className={styles.workGrid}>
            {view.currentWork.length ? (
              view.currentWork.map((item) => <WorkCard key={item.id} item={item} />)
            ) : (
              <EmptyState>오늘 진행 중인 작업을 확인하고 있어요.</EmptyState>
            )}
          </div>
        </section>

        <section className={styles.attentionSection} aria-labelledby="attention-heading">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionNumber}>02</span>
              <h2 id="attention-heading">내 답이 필요한 것</h2>
            </div>
            <strong className={styles.count}>{view.needsAttention.length}</strong>
          </div>
          <div className={styles.attentionList}>
            {view.needsAttention.length ? (
              view.needsAttention.map((item) => <WorkCard key={item.id} item={item} />)
            ) : (
              <EmptyState>지금 바로 답해야 할 일은 없어요.</EmptyState>
            )}
          </div>
        </section>

        <div className={styles.lowerGrid}>
          <section className={styles.paperPanel} aria-labelledby="today-heading">
            <div className={styles.panelHeading}>
              <span>03</span>
              <h2 id="today-heading">오늘 일정</h2>
              <strong>{view.today.length}</strong>
            </div>
            <div className={styles.timeline}>
              {view.today.length ? (
                view.today.slice(0, 7).map((item) => (
                  <div className={styles.timelineRow} key={item.id}>
                    <time>{item.time || "오늘"}</time>
                    <span className={styles.timelineDot} aria-hidden="true" />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail} · {item.source}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>오늘로 확인된 일정은 없어요.</EmptyState>
              )}
            </div>
          </section>

          <section className={styles.sourcePanel} aria-labelledby="source-heading">
            <div className={styles.panelHeading}>
              <span>04</span>
              <h2 id="source-heading">메시지 확인 상태</h2>
            </div>
            <div className={styles.sourceList}>
              {view.sources.map((source) => (
                <div className={styles.sourceRow} data-state={source.state} key={source.id}>
                  <span className={styles.sourceDot} />
                  <div>
                    <strong>{source.title}</strong>
                    <p>{source.detail}</p>
                  </div>
                  <em>{source.stateLabel}</em>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <span>매분 자동으로 변경을 확인합니다. 해결된 일은 자동으로 사라져요.</span>
          <Link href="/dashboard/purchases">산 것 보기 <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </main>
  );
}
