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

function shortDate(iso: string | null): string {
  if (!iso) return "확인 전";
  const [, month, day] = iso.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatViews(views: number | null): string {
  if (views === null) return "조회수 확인 중";
  return `조회 ${new Intl.NumberFormat("ko-KR").format(views)}`;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

function CarryRow({ item, index }: { item: DeskItem; index: number }) {
  return (
    <article className={styles.decisionRow} data-urgency={item.urgency}>
      <div className={styles.decisionIndex}>{String(index + 1).padStart(2, "0")}</div>
      <div className={styles.decisionCopy}>
        <div className={styles.rowMeta}>
          <span>{item.source}</span>
          <span className={styles.metaDot} />
          <span>확인 필요</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.detail}</p>
      </div>
      <Link className={styles.rowAction} href={item.href} aria-label={`${item.title} 근거 보기`}>
        근거 보기
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
              HANNA DESK · 실제 기록 연결
            </div>
            <h1>한나가 안 적어도<br />먼저 보는 곳.</h1>
            <p>생활기록과 실제 계정을 대조해 아직 이어질 일만 보여줘요.</p>
          </div>

          <button className={styles.refresh} type="button" onClick={refresh} disabled={isPending}>
            <span aria-hidden="true">{isPending ? "···" : "↻"}</span>
            {refreshedAt ? `${refreshedAt} 확인` : "새로 확인"}
          </button>
        </header>

        {view.lifeRecord && (
          <Link className={styles.recordStrip} href="/dashboard/day">
            <span>{shortDate(view.lifeRecord.date)} 하루 기록</span>
            <strong>{view.lifeRecord.headline}</strong>
            <p>{view.lifeRecord.summary}</p>
          </Link>
        )}

        {view.isPartial && (
          <div className={styles.partial} role="status">
            <strong>부분 확인</strong>
            <span>{view.unavailableSources.join(" · ")} 소식통은 지금 열리지 않았어요.</span>
          </div>
        )}

        <section className={styles.decisionStage} aria-labelledby="carry-heading">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionNumber}>01</span>
              <h2 id="carry-heading">기록에서 이어볼 것</h2>
            </div>
            <strong className={styles.count}>{view.carryOver.length}</strong>
          </div>

          <div className={styles.decisionList}>
            {view.carryOver.length ? (
              view.carryOver.slice(0, 6).map((item, index) => (
                <CarryRow key={item.id} item={item} index={index} />
              ))
            ) : (
              <EmptyState>최근 생활기록에서 이어볼 일은 없어요.</EmptyState>
            )}
          </div>
        </section>

        <div className={styles.midGrid}>
          <section className={styles.paperPanel} aria-labelledby="today-heading">
            <div className={styles.panelHeading}>
              <span>02</span>
              <h2 id="today-heading">오늘 루틴</h2>
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
                <EmptyState>오늘로 확인된 반복 일정은 없어요.</EmptyState>
              )}
            </div>
          </section>

          <section className={styles.timelinePanel} aria-labelledby="upload-heading">
            <div className={styles.panelHeading}>
              <span>03</span>
              <h2 id="upload-heading">실제 업로드 확인</h2>
              <strong>{view.uploadSummary.weekCount}</strong>
            </div>
            <p className={styles.panelSummary}>
              이번 주 {view.uploadSummary.weekCount}개 · {shortDate(view.uploadSummary.latestDate)} {view.uploadSummary.latestCount}개 확인
            </p>
            <div className={styles.uploadList}>
              {view.recentUploads.length ? (
                view.recentUploads.slice(0, 5).map((upload) => (
                  <Link className={styles.uploadRow} href="/dashboard/uploads" key={upload.id}>
                    <div>
                      <span>{upload.source} · {upload.platform}</span>
                      <strong>{upload.title}</strong>
                    </div>
                    <p>{shortDate(upload.date)} · {formatViews(upload.views)}</p>
                  </Link>
                ))
              ) : (
                <EmptyState>실제 계정에서 확인된 업로드가 없어요.</EmptyState>
              )}
            </div>
          </section>
        </div>

        <section className={styles.waitingPanel} aria-labelledby="resolved-heading">
          <div className={styles.panelHeading}>
            <span>04</span>
            <h2 id="resolved-heading">계정 확인으로 닫힌 것</h2>
            <strong>{view.resolvedByAccounts.length}</strong>
          </div>
          {view.resolvedByAccounts.length ? (
            <div className={styles.waitingGrid}>
              {view.resolvedByAccounts.map((item) => (
                <Link href={item.href} key={item.id}>
                  <span>{item.source}</span>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState>생활기록과 계정에서 같은 일로 확인된 완료 항목은 아직 없어요.</EmptyState>
          )}
        </section>

        <footer className={styles.footer}>
          <div>
            <span className={styles.connectedDot} />
            하루 기록 연결됨
          </div>
          <div>
            <span className={styles.connectedDot} />
            실제 업로드 연결됨
          </div>
          <div className={styles.preparing}>
            <span />
            대화 · 구매내역 연결 준비 중
          </div>
        </footer>
      </div>
    </main>
  );
}
