"use client";

import { useMemo, useState } from "react";
import type {
  PlanningDay,
  PlanningProduct,
  PlanningProductFeedbackItem,
  PlanningProductFeedbackResponse,
  PlanningProductRequest,
} from "@/lib/dashboard-api";
import styles from "./products.module.css";

const signalLabel: Record<PlanningProduct["signal"], string> = {
  trend: "요즘 유행",
  evergreen: "꾸준히 추천",
  discovery: "직접 발굴",
};

const archiveTags = ["밀키트", "원재료 좋음", "유행", "냉동 간편식", "아이 혼자", "모녀 비교", "한 끼 보완", "재구매 후보"];

function needsMoreChecking(product: PlanningProduct) {
  const note = product.ingredient_check || "";
  return !product.buy_links?.length || !product.price || !product.reviews || !product.discovered_from || /확인 전|미확인|추가 확인|확인 못|확인 필요/.test(note);
}

function checkedLabel(value?: string) {
  return value ? value.replace("T", " ").slice(5, 16) : "확인 시각 없음";
}

function suggestedTags(product: PlanningProduct) {
  const tags: string[] = [];
  const text = `${product.category} ${product.test_format} ${product.why_fit}`;
  if (/밀키트/.test(text)) tags.push("밀키트");
  if (product.signal === "trend") tags.push("유행");
  if (/냉동/.test(text)) tags.push("냉동 간편식");
  if (/혼자|혜린이 직접/.test(text)) tags.push("아이 혼자");
  if (/엄마|모녀|혜린/.test(text)) tags.push("모녀 비교");
  if (/한 끼|보완/.test(text)) tags.push("한 끼 보완");
  return tags.length ? [...new Set(tags)].slice(0, 3) : ["한 끼 보완"];
}

type ArchiveView = "saved" | "try" | "excluded";

function ProductCard({
  product,
  ready,
  feedback,
  selectedTags,
  requests,
  busy,
  onToggleTag,
  onFeedback,
  onRequest,
}: {
  product: PlanningProduct;
  ready: boolean;
  feedback?: PlanningProductFeedbackItem;
  selectedTags: string[];
  requests: PlanningProductRequest[];
  busy: string;
  onToggleTag: (tag: string) => void;
  onFeedback: (action: "save" | "exclude" | "try" | "restore") => void;
  onRequest: (requestType: "similar" | "better_ingredients") => void;
}) {
  const buy = product.buy_links?.[0];
  const similarPending = requests.some((item) => item.product_id === product.id && item.request_type === "similar" && item.status === "pending");
  const ingredientPending = requests.some((item) => item.product_id === product.id && item.request_type === "better_ingredients" && item.status === "pending");
  const isBusy = busy.startsWith(`${product.id}:`);

  return <article className={`${styles.card} ${ready ? styles.buyCard : styles.reviewCard} ${feedback?.status === "excluded" ? styles.excludedCard : ""}`}>
    <div className={styles.cardTop}>
      <span className={`${styles.signal} ${styles[product.signal]}`}>{signalLabel[product.signal]}</span>
      <span className={styles.score}>{product.score}</span>
    </div>
    <p className={styles.brand}>{product.brand} · {product.category}</p>
    <h3>{product.name}</h3>
    {feedback && feedback.status !== "active" && <div className={styles.currentState}>{feedback.status === "saved" ? "보관함" : feedback.status === "try" ? "먹어볼 것" : "제외"}{feedback.tags.length ? ` · ${feedback.tags.join(" · ")}` : ""}</div>}
    <p><b>왜 우리 핏</b><span>{product.why_fit}</span></p>
    <p><b>원재료·영양표</b><span>{product.ingredient_check}</span></p>
    <p><b>가격</b><span>{product.price ? <>{product.price.display}{product.price.quantity ? ` · ${product.price.quantity}` : ""}{product.price.unit_price ? ` · ${product.price.unit_price}` : ""}<small>{product.price.source_label} · {checkedLabel(product.price.checked_at)}</small></> : "가격 확인 전"}</span></p>
    <p><b>후기</b><span>{product.reviews ? <>{product.reviews.rating != null ? `${product.reviews.rating.toFixed(1)}점 · ` : ""}{product.reviews.count.toLocaleString("ko-KR")}개 · {product.reviews.summary}<small>{product.reviews.source_label} · {checkedLabel(product.reviews.checked_at)}</small></> : "후기 수·평점 확인 전"}</span></p>
    <p><b>발견한 곳</b><span>{product.discovered_from ? <><a href={product.discovered_from.url} target="_blank" rel="noreferrer">{product.discovered_from.label}</a> · {product.discovered_from.reason}<small>{checkedLabel(product.discovered_from.checked_at)}</small></> : "발견 경로 확인 전"}</span></p>
    <p><b>먹어볼 방법</b><span>{product.test_format} · {product.test_plan}</span></p>

    <div className={styles.tagBox}>
      <span>보관 분류</span>
      <div>{archiveTags.map((tag) => <button key={tag} type="button" className={selectedTags.includes(tag) ? styles.selectedTag : ""} onClick={() => onToggleTag(tag)}>{tag}</button>)}</div>
    </div>

    <div className={styles.actionGrid}>
      {feedback?.status === "excluded"
        ? <button type="button" disabled={isBusy} onClick={() => onFeedback("restore")}>다시 보기</button>
        : <>
          <button type="button" className={styles.saveAction} disabled={isBusy} onClick={() => onFeedback("save")}>{feedback?.status === "saved" ? "보관 분류 수정" : "보관"}</button>
          <button type="button" className={styles.tryAction} disabled={isBusy} onClick={() => onFeedback("try")}>주문해서 먹어볼래</button>
          <button type="button" className={styles.excludeAction} disabled={isBusy} onClick={() => onFeedback("exclude")}>제외</button>
        </>}
      <button type="button" disabled={isBusy || similarPending} onClick={() => onRequest("similar")}>{similarPending ? "비슷한 제품 요청됨" : "비슷한 거 더 찾아"}</button>
      <button type="button" disabled={isBusy || ingredientPending} onClick={() => onRequest("better_ingredients")}>{ingredientPending ? "성분 제품 요청됨" : "성분 좋은 걸로 더 찾아"}</button>
    </div>

    <footer>
      <span>{product.caution || (ready ? "실제 주문 전 수량만 결정" : "확인할 항목을 먼저 검토")}</span>
      {buy ? <a href={buy.url} target="_blank" rel="noreferrer">구매처 확인 · {buy.label}</a> : <em>구매처 확인 필요</em>}
    </footer>
  </article>;
}

export default function ProductBoard({ day, feedback: initialFeedback }: { day: PlanningDay | null; feedback: PlanningProductFeedbackResponse }) {
  const products = day?.product_radar || [];
  const [feedback, setFeedback] = useState<PlanningProductFeedbackResponse>(initialFeedback);
  const [archiveView, setArchiveView] = useState<ArchiveView>("saved");
  const [tagFilter, setTagFilter] = useState("전체");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [tagDrafts, setTagDrafts] = useState<Record<string, string[]>>(() => Object.fromEntries(products.map((product) => {
    const saved = initialFeedback.items.find((item) => item.product_id === product.id);
    return [product.id, saved?.tags.length ? saved.tags : suggestedTags(product)];
  })));

  const feedbackByProduct = useMemo(() => new Map(feedback.items.map((item) => [item.product_id, item])), [feedback.items]);
  const activeProducts = products.filter((product) => feedbackByProduct.get(product.id)?.status !== "excluded");
  const readyToBuy = activeProducts.filter((product) => !needsMoreChecking(product));
  const reviewFirst = activeProducts.filter(needsMoreChecking);
  const archiveItems = feedback.items.filter((item) => item.status === archiveView && (tagFilter === "전체" || item.tags.includes(tagFilter)));
  const counts = {
    saved: feedback.items.filter((item) => item.status === "saved").length,
    try: feedback.items.filter((item) => item.status === "try").length,
    excluded: feedback.items.filter((item) => item.status === "excluded").length,
  };
  const pendingCount = feedback.requests.filter((item) => item.status === "pending").length;

  function applyResponse(payload: any) {
    if (!payload?.items || !payload?.requests) throw new Error(payload?.detail || payload?.error || "피드백 저장 실패");
    setFeedback({ items: payload.items, requests: payload.requests, events: payload.events });
  }

  async function saveFeedback(product: PlanningProduct, action: "save" | "exclude" | "try" | "restore") {
    setBusy(`${product.id}:${action}`); setNotice("");
    try {
      const response = await fetch("/api/dashboard/proxy/planning-product-feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, action, tags: tagDrafts[product.id] || [], note: "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || payload?.error || "피드백 저장 실패");
      applyResponse(payload);
      const label = action === "save" ? "보관함에 저장했어" : action === "try" ? "먹어볼 것으로 저장했어 · 구매처에서 주문은 한나가 결정해" : action === "exclude" ? "제외했어 · 다음 추천에서 우선 빼" : "다시 추천 목록에 넣었어";
      setNotice(`${product.name} · ${label}`);
    } catch (error) { setNotice(`저장하지 못했어 · ${(error as Error).message}`); }
    finally { setBusy(""); }
  }

  async function requestMore(product: PlanningProduct, requestType: "similar" | "better_ingredients") {
    setBusy(`${product.id}:${requestType}`); setNotice("");
    try {
      const response = await fetch("/api/dashboard/proxy/planning-product-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, request_type: requestType, instruction: "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || payload?.error || "조사 요청 저장 실패");
      applyResponse(payload);
      setNotice(`${product.name} · ${requestType === "similar" ? "비슷한 제품" : "성분이 더 좋은 제품"}을 다음 조사에서 먼저 찾게 했어`);
    } catch (error) { setNotice(`요청하지 못했어 · ${(error as Error).message}`); }
    finally { setBusy(""); }
  }

  function toggleTag(product: PlanningProduct, tag: string) {
    setTagDrafts((current) => {
      const tags = current[product.id] || [];
      return { ...current, [product.id]: tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag] };
    });
  }

  function renderCard(product: PlanningProduct, ready: boolean) {
    return <ProductCard
      key={product.id} product={product} ready={ready} feedback={feedbackByProduct.get(product.id)}
      selectedTags={tagDrafts[product.id] || []} requests={feedback.requests} busy={busy}
      onToggleTag={(tag) => toggleTag(product, tag)} onFeedback={(action) => saveFeedback(product, action)}
      onRequest={(requestType) => requestMore(product, requestType)}
    />;
  }

  return <main className={`dashboard-root ${styles.page}`}>
    <header className={styles.header}>
      <div><span>먹거리 제품 찾기</span><h1>고르면 다음 추천이 달라져.</h1></div>
      <p>{day?.date || "오늘"} · 추천 {products.length}개 · 조사 요청 {pendingCount}</p>
    </header>

    <section className={styles.feedbackShelf}>
      <div className={styles.shelfTop}><div><span>FEEDBACK</span><h2>내 제품 보관함</h2><p>여기서 누른 판단을 다음 새벽 조사 AI가 먼저 읽어.</p></div>{notice && <strong>{notice}</strong>}</div>
      <div className={styles.archiveTabs}>
        <button type="button" className={archiveView === "saved" ? styles.activeArchive : ""} onClick={() => setArchiveView("saved")}>보관함 {counts.saved}</button>
        <button type="button" className={archiveView === "try" ? styles.activeArchive : ""} onClick={() => setArchiveView("try")}>먹어볼 것 {counts.try}</button>
        <button type="button" className={archiveView === "excluded" ? styles.activeArchive : ""} onClick={() => setArchiveView("excluded")}>제외 {counts.excluded}</button>
      </div>
      <div className={styles.archiveFilters}>{["전체", ...archiveTags].map((tag) => <button key={tag} type="button" className={tagFilter === tag ? styles.activeFilter : ""} onClick={() => setTagFilter(tag)}>{tag}</button>)}</div>
      <div className={styles.archiveList}>{archiveItems.map((item) => <article key={item.product_id}><span>{item.status === "saved" ? "보관" : item.status === "try" ? "먹어볼 것" : "제외"}</span><b>{item.product.brand} · {item.product.name}</b><em>{item.tags.join(" · ") || "분류 없음"}</em></article>)}{!archiveItems.length && <p>이 분류에 저장한 제품이 아직 없어.</p>}</div>
    </section>

    <section className={`${styles.section} ${styles.buySection}`}>
      <div className={styles.sectionTitle}>
        <div><span>ORDER</span><h2>오늘 살 것</h2></div>
        <p>원재료·영양표와 구매처를 확인한 주문 후보 · 마지막 주문은 한나</p>
        <em>{readyToBuy.length}</em>
      </div>
      <div className={styles.cardGrid}>{readyToBuy.map((product) => renderCard(product, true))}{!readyToBuy.length && <p className={styles.empty}>오늘 바로 주문할 만큼 확인된 제품은 아직 없어.</p>}</div>
    </section>

    <section className={`${styles.section} ${styles.reviewSection}`}>
      <div className={styles.sectionTitle}>
        <div><span>REVIEW</span><h2>먼저 볼 것</h2></div>
        <p>유행과 추천 신호는 있지만 성분·가격·구매처를 더 확인할 제품</p>
        <em>{reviewFirst.length}</em>
      </div>
      <div className={styles.cardGrid}>{reviewFirst.map((product) => renderCard(product, false))}{!reviewFirst.length && <p className={styles.empty}>추가 확인이 필요한 제품이 없어.</p>}</div>
    </section>
  </main>;
}
