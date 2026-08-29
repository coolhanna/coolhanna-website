"use client";

import { useMemo, useState } from "react";
import type {
  PlanningDay,
  PlanningProduct,
  PlanningProductFeedbackItem,
  PlanningProductFeedbackResponse,
  PlanningProductRequest,
} from "@/lib/dashboard-api";
import { ingredientEvidenceNeedsReview } from "./product-readiness";
import styles from "./products.module.css";

const reasonLabel: Record<NonNullable<PlanningProduct["recommendation_reasons"]>[number]["category"], string> = {
  trend: "유행",
  ingredients: "원재료",
  taste: "맛",
  value: "돈값",
  convenience: "간편함",
  content: "콘텐츠감",
};

const archiveTags = ["밀키트", "원재료 좋음", "유행", "냉동 간편식", "아이 혼자", "모녀 비교", "한 끼 보완", "재구매 후보"];
const canonicalDiscoveryChannels = new Set([
  "manufacturer", "retailer_new", "retailer_reviews", "social",
  "specialty", "crowdfunding", "editorial",
]);

function isRecentVideo(publishedAt: string, cutoffDate: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(publishedAt) && publishedAt >= cutoffDate;
}

function needsMoreChecking(product: PlanningProduct, cutoffDate: string) {
  const note = product.ingredient_check || "";
  const social = product.social_evidence || [];
  const trendCreators = new Set(social.map((item) => item.creator.trim().toLowerCase()));
  const recentSocial = social.some((item) => isRecentVideo(item.published_at, cutoffDate));
  const ingredientReason = product.recommendation_reasons?.some((item) => item.category === "ingredients");
  const requiresSocialEvidence = product.discovered_from?.channel === "social";
  const canonicalChannel = canonicalDiscoveryChannels.has(product.discovered_from?.channel || "");
  return !product.buy_links?.length || !product.price || !product.reviews || !product.discovered_from
    || !canonicalChannel || !product.product_image || !product.recommendation_reasons?.length
    || ingredientEvidenceNeedsReview(product.ingredient_evidence)
    || (requiresSocialEvidence && !social.length)
    || (requiresSocialEvidence && product.signal === "trend" && trendCreators.size < 2)
    || (requiresSocialEvidence && product.signal === "trend" && !recentSocial)
    || (ingredientReason && product.ingredient_evidence?.status !== "verified")
    || /확인 전|미확인|추가 확인|확인 못|확인 필요/.test(note);
}

function productSignalLabel(product: PlanningProduct, cutoffDate: string) {
  const social = product.social_evidence || [];
  const recentSocial = social.some((item) => isRecentVideo(item.published_at, cutoffDate));
  if (!canonicalDiscoveryChannels.has(product.discovered_from?.channel || "")) return "발굴 채널 재검증";
  const requiresSocial = product.discovered_from?.channel === "social";
  if (!requiresSocial && product.signal === "trend") return "현재 신호 확인";
  if (product.signal === "trend") {
    const independent = new Set(social.map((item) => item.creator.trim().toLowerCase())).size >= 2;
    if (!independent) return "유행 근거 없음";
    if (product.signal === "trend" && !recentSocial) return "유행 근거 오래됨";
    return "최근 유행 확인";
  }
  if (product.signal === "evergreen") return requiresSocial ? (social.length ? "꾸준히 언급" : "SNS 근거 없음") : "현재 신호 확인";
  return "새로 발견";
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
  recentCutoff,
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
  recentCutoff: string;
}) {
  const buy = product.buy_links?.[0];
  const similarPending = requests.some((item) => item.product_id === product.id && item.request_type === "similar" && item.status === "pending");
  const ingredientPending = requests.some((item) => item.product_id === product.id && item.request_type === "better_ingredients" && item.status === "pending");
  const isBusy = busy.startsWith(`${product.id}:`);
  const socialEvidence = product.social_evidence || [];
  const recommendationReasons = product.recommendation_reasons || [];

  return <article className={`${styles.card} ${ready ? styles.buyCard : styles.reviewCard} ${feedback?.status === "excluded" ? styles.excludedCard : ""}`}>
    <div className={styles.cardTop}>
      <span className={`${styles.signal} ${styles[product.signal]}`}>{productSignalLabel(product, recentCutoff)}</span>
      <span className={styles.score}>{product.score}</span>
    </div>
    <div className={styles.productIntro}>
      {product.product_image
        ? <a className={styles.productImage} href={product.product_image.source_url} target="_blank" rel="noreferrer"><img src={product.product_image.url} alt={product.product_image.alt} loading="lazy" /><small>제품 사진 · {product.product_image.source_label}</small></a>
        : <div className={`${styles.productImage} ${styles.imageMissing}`}><span>제품 사진</span><small>사진 확인 전</small></div>}
      <div><p className={styles.brand}>{product.brand} · {product.category}</p><h3>{product.name}</h3></div>
    </div>
    {feedback && feedback.status !== "active" && <div className={styles.currentState}>{feedback.status === "saved" ? "보관함" : feedback.status === "try" ? "먹어볼 것" : "제외"}{feedback.tags.length ? ` · ${feedback.tags.join(" · ")}` : ""}</div>}
    <div className={styles.reasonBox}>
      <b>추천 이유</b>
      {recommendationReasons.length
        ? <div>{recommendationReasons.map((reason, index) => <span key={`${reason.category}-${index}`}><em>{reasonLabel[reason.category]}</em>{reason.summary}</span>)}</div>
        : <p>추천 이유 분류 확인 전 · 기존 한줄 설명: {product.why_fit}</p>}
    </div>
    <div className={styles.socialBox}>
      <b>발견 영상</b>
      {socialEvidence.length ? <div>{socialEvidence.map((source) => {
        const recent = isRecentVideo(source.published_at, recentCutoff);
        return <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><em>{source.platform === "youtube" ? "YouTube" : "Instagram"}</em><span>{source.creator} · {source.title}</span><small><i className={recent ? styles.recentVideo : styles.oldVideo}>{recent ? "최근 6개월" : "6개월 초과"}</i>{source.reason} · 게시 {source.published_at}</small></a>;
      })}</div> : <p>{product.discovered_from?.channel === "social" ? "YouTube·Instagram 발견 근거 없음" : "영상 근거는 social 발굴 제품에만 적용"}</p>}
    </div>
    <p><b>원재료·영양표</b><span>{product.ingredient_check}</span></p>
    <p><b>성분 근거 확인</b><span>{product.ingredient_evidence ? <><a href={product.ingredient_evidence.source_url} target="_blank" rel="noreferrer">{product.ingredient_evidence.status === "verified" ? "공식 표시 확인" : product.ingredient_evidence.status === "partial" ? "일부 확인" : "미확인"} · {product.ingredient_evidence.summary}</a><small>{product.ingredient_evidence.source_label} · {checkedLabel(product.ingredient_evidence.checked_at)}</small></> : "성분 근거 확인 전"}</span></p>
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
  const videoAudit = day?.research?.video_audit;
  const recentCutoff = videoAudit?.cutoff_date || "9999-12-31";
  const screenedTotal = videoAudit?.screened_total ?? videoAudit?.evidence_total ?? 0;
  const videoAuditReady = screenedTotal >= 30 && (videoAudit?.recent_6m_total || 0) >= 24;
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
  const readyToBuy = activeProducts.filter((product) => !needsMoreChecking(product, recentCutoff));
  const reviewFirst = activeProducts.filter((product) => needsMoreChecking(product, recentCutoff));
  const comparisonGroups = Array.from(activeProducts.reduce((groups, product) => {
    const label = product.comparison_group || "비교 묶음 확인 필요";
    groups.set(label, [...(groups.get(label) || []), product]);
    return groups;
  }, new Map<string, PlanningProduct[]>()).entries());
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
      onRequest={(requestType) => requestMore(product, requestType)} recentCutoff={recentCutoff}
    />;
  }

  return <main className={`dashboard-root ${styles.page}`}>
    <header className={styles.header}>
      <div><span>먹거리 제품 찾기</span><h1>고르면 다음 추천이 달라져.</h1></div>
      <p>{day?.date || "오늘"} · 추천 {products.length}개 · 조사 요청 {pendingCount}</p>
    </header>

    <section className={styles.evidenceRule}>
      <b>추천이 만들어지는 순서</b>
      <span>1. 7개 발굴 채널 중 서로 다른 4종 이상 확인</span>
      <span>2. social만 YouTube·Instagram 영상 30개 확인</span>
      <span>3. 유통사 3곳 이상에서 사진·가격·후기 확인</span>
      <span>4. 원재료 추천은 전체 원재료명·1회 영양표까지 검증</span>
    </section>

    <section className={styles.videoAudit}>
      <div><span>VIDEO CHECK</span><h2>매일 영상 30개 확인</h2></div>
      <p className={videoAuditReady ? styles.auditGood : styles.auditWeak}><b>{screenedTotal}<small>/30</small></b><span>확인한 영상</span></p>
      <p className={(videoAudit?.recent_6m_total || 0) >= 24 ? styles.auditGood : styles.auditWeak}><b>{videoAudit?.recent_6m_total ?? 0}</b><span>최근 6개월 · 기준 {videoAudit?.cutoff_date || "기록 없음"}</span></p>
      <p><b>{videoAudit?.repeated_product_total ?? 0}</b><span>반복 발견 제품</span></p>
      <p><b>{videoAudit?.important_total ?? videoAudit?.content_checked_total ?? 0}</b><span>중요 영상 · 자막·내용 {videoAudit?.content_checked_total ?? 0}</span></p>
    </section>

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

    <section className={`${styles.section} ${styles.comparisonSection}`}>
      <div className={styles.sectionTitle}>
        <div><span>COMPARE</span><h2>오늘 비교 묶음</h2></div>
        <p>세 제품씩 바로 비교 · 오늘 살 것 {readyToBuy.length}개 · 성분표를 먼저 볼 것 {reviewFirst.length}개</p>
        <em>{comparisonGroups.length}</em>
      </div>
      <div className={styles.comparisonList}>{comparisonGroups.map(([label, groupProducts], index) => {
        const groupReady = groupProducts.filter((product) => !needsMoreChecking(product, recentCutoff)).length;
        return <section className={styles.comparisonGroup} key={label}>
          <div className={styles.comparisonGroupHeader}>
            <div><span>{String(index + 1).padStart(2, "0")}</span><h3>{label}</h3></div>
            <p>{groupReady ? `성분·구매 확인 ${groupReady}개` : "전체 성분표 확인 대기"}</p>
            <em>{groupProducts.length === 3 ? "3개 비교" : `${groupProducts.length}개 비교`}</em>
          </div>
          <div className={styles.comparisonGrid}>{groupProducts.map((product) => renderCard(product, !needsMoreChecking(product, recentCutoff)))}</div>
        </section>;
      })}{!comparisonGroups.length && <p className={styles.empty}>오늘 비교할 제품이 아직 없어.</p>}</div>
    </section>
  </main>;
}
