import type { PurchaseItem, PurchaseView } from "@/lib/purchases";
import styles from "./purchases.module.css";

function checkedLabel(value: string | null): string {
  if (!value) return "아직 확인 전";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  })} ${parsed.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  })} 확인`;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

function PurchaseCard({ item, emphasis = false }: { item: PurchaseItem; emphasis?: boolean }) {
  return (
    <article className={styles.purchaseCard} data-emphasis={emphasis ? "true" : "false"}>
      <div className={styles.cardMeta}>
        <span>{item.source}</span>
        {item.orderedAt && <time>{item.orderedAt}</time>}
      </div>
      <h3>{item.name}</h3>
      {item.action && <p className={styles.action}>{item.action}</p>}
      {item.arrivalLabel && <p>{item.arrivalLabel}</p>}
      {item.linkedTo && <p className={styles.linked}>연결 · {item.linkedTo}</p>}
    </article>
  );
}

export default function PurchasesBoard({ view }: { view: PurchaseView }) {
  return (
    <main className={`dashboard-root ${styles.page}`}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>PURCHASES</span>
            <h1>산 것</h1>
            <p>{checkedLabel(view.checkedAt)}</p>
          </div>
          <div className={styles.connection} data-connected={view.isConnected ? "true" : "false"}>
            <span />
            {view.isConnected ? "구매내역 연결됨" : "구매내역 연결 전"}
          </div>
        </header>

        <section className={styles.actionSection} aria-labelledby="action-heading">
          <div className={styles.sectionHeading}>
            <div>
              <span>01</span>
              <h2 id="action-heading">먼저 볼 것</h2>
            </div>
            <strong>{view.actionNeeded.length}</strong>
          </div>
          <div className={styles.actionGrid}>
            {view.actionNeeded.length ? (
              view.actionNeeded.map((item) => <PurchaseCard item={item} emphasis key={item.id} />)
            ) : (
              <Empty>아직 구매내역을 읽지 않았어요. 연결되면 촬영·사용·반품처럼 행동이 필요한 것만 여기에 올라옵니다.</Empty>
            )}
          </div>
        </section>

        <div className={styles.middleGrid}>
          <section className={styles.panel} aria-labelledby="arrival-heading">
            <div className={styles.panelHeading}>
              <span>02</span>
              <h2 id="arrival-heading">오늘·곧 도착</h2>
              <strong>{view.arriving.length}</strong>
            </div>
            <div className={styles.cardList}>
              {view.arriving.length ? view.arriving.map((item) => (
                <PurchaseCard item={item} key={item.id} />
              )) : <Empty>도착 예정 정보를 확인하지 않았어요.</Empty>}
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="linked-heading">
            <div className={styles.panelHeading}>
              <span>03</span>
              <h2 id="linked-heading">촬영·일정과 연결</h2>
              <strong>{view.linked.length}</strong>
            </div>
            <div className={styles.cardList}>
              {view.linked.length ? view.linked.map((item) => (
                <PurchaseCard item={item} key={item.id} />
              )) : <Empty>연결된 촬영이나 일정이 아직 없어요.</Empty>}
            </div>
          </section>
        </div>

        <section className={styles.routineSection} aria-labelledby="routine-heading">
          <div className={styles.panelHeading}>
            <span>04</span>
            <h2 id="routine-heading">그냥 생활 구매</h2>
            <strong>{view.routine.length}</strong>
          </div>
          <div className={styles.routineGrid}>
            {view.routine.length ? view.routine.map((item) => (
              <PurchaseCard item={item} key={item.id} />
            )) : <Empty>일반 구매는 알림 없이 여기에만 정리됩니다.</Empty>}
          </div>
        </section>

        <section className={styles.sourceSection} aria-labelledby="source-heading">
          <div className={styles.panelHeading}>
            <span>05</span>
            <h2 id="source-heading">읽기 연결</h2>
          </div>
          <div className={styles.sourceGrid}>
            {view.sources.map((source) => (
              <article className={styles.sourceCard} data-state={source.state} key={source.id}>
                <div>
                  <span className={styles.sourceDot} />
                  <h3>{source.name}</h3>
                </div>
                <strong>{source.stateLabel}</strong>
                <p>{source.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          가격·배송 주소·결제수단은 기본 화면에 표시하지 않습니다.
        </footer>
      </div>
    </main>
  );
}
