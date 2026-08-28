import type { PlanningDay, PlanningProduct } from "@/lib/dashboard-api";
import styles from "./products.module.css";

const signalLabel: Record<PlanningProduct["signal"], string> = {
  trend: "요즘 유행",
  evergreen: "꾸준히 추천",
  discovery: "직접 발굴",
};

function needsMoreChecking(product: PlanningProduct) {
  const note = product.ingredient_check || "";
  return !product.buy_links?.length || /확인 전|미확인|추가 확인|확인 못|확인 필요/.test(note);
}

function ProductCard({ product, ready }: { product: PlanningProduct; ready: boolean }) {
  const buy = product.buy_links?.[0];
  return <article className={`${styles.card} ${ready ? styles.buyCard : styles.reviewCard}`}>
    <div className={styles.cardTop}>
      <span className={`${styles.signal} ${styles[product.signal]}`}>{signalLabel[product.signal]}</span>
      <span className={styles.score}>{product.score}</span>
    </div>
    <p className={styles.brand}>{product.brand} · {product.category}</p>
    <h3>{product.name}</h3>
    <p><b>왜 우리 핏</b><span>{product.why_fit}</span></p>
    <p><b>원재료·영양표</b><span>{product.ingredient_check}</span></p>
    <p><b>먹어볼 방법</b><span>{product.test_format} · {product.test_plan}</span></p>
    <footer>
      <span>{product.caution || (ready ? "실제 주문 전 수량만 결정" : "확인할 항목을 먼저 검토")}</span>
      {buy ? <a href={buy.url} target="_blank" rel="noreferrer">구매처 확인</a> : <em>구매처 확인 필요</em>}
    </footer>
  </article>;
}

export default function ProductBoard({ day }: { day: PlanningDay | null }) {
  const products = day?.product_radar || [];
  const readyToBuy = products.filter((product) => !needsMoreChecking(product));
  const reviewFirst = products.filter(needsMoreChecking);

  return <main className={`dashboard-root ${styles.page}`}>
    <header className={styles.header}>
      <div><span>먹거리 제품 찾기</span><h1>살 것과 볼 것을 나눴어.</h1></div>
      <p>{day?.date || "오늘"} · 전체 {products.length}개</p>
    </header>

    <section className={`${styles.section} ${styles.buySection}`}>
      <div className={styles.sectionTitle}>
        <div><span>ORDER</span><h2>오늘 살 것</h2></div>
        <p>원재료·영양표와 구매처를 확인한 주문 후보 · 마지막 선택은 한나</p>
        <em>{readyToBuy.length}</em>
      </div>
      <div className={styles.cardGrid}>{readyToBuy.map((product) => <ProductCard key={product.id} product={product} ready />)}{!readyToBuy.length && <p className={styles.empty}>오늘 바로 주문할 만큼 확인된 제품은 아직 없어.</p>}</div>
    </section>

    <section className={`${styles.section} ${styles.reviewSection}`}>
      <div className={styles.sectionTitle}>
        <div><span>REVIEW</span><h2>먼저 볼 것</h2></div>
        <p>유행과 추천 신호는 있지만 성분·가격·구매처를 더 확인할 제품</p>
        <em>{reviewFirst.length}</em>
      </div>
      <div className={styles.cardGrid}>{reviewFirst.map((product) => <ProductCard key={product.id} product={product} ready={false} />)}{!reviewFirst.length && <p className={styles.empty}>추가 확인이 필요한 제품이 없어.</p>}</div>
    </section>
  </main>;
}
