import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("the shared dashboard navigation includes the planning desk", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  assert.ok(nav.includes('{ label: "기획", href: "/dashboard/planning" }'));
  assert.ok(nav.includes('{ label: "제품", href: "/dashboard/products" }'));
});

test("planning is a real dashboard route with the dense decision desk", () => {
  const page = read("app/dashboard/planning/page.tsx");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");
  const styles = read("app/dashboard/planning/planning.module.css");

  assert.ok(page.includes("planningFeed"));
  assert.ok(page.includes("planningDecisions"));
  for (const copy of ["본계정", "혜린", "먹거리", "가치관", "실제 고민", "유행·시의성", "제품·계절", "상황극", "브이로그", "비교·리뷰"]) {
    assert.ok(board.includes(copy), `missing planning filter: ${copy}`);
  }
  for (const copy of ["어디서 온 문제", "한나의 관점", "릴스로 푸는 법", "더 깊게 쓸 것", "반응을 받을 것", "참고한 자료", "한나 의견", "발전", "보류", "제외"]) {
    assert.ok(board.includes(copy), `missing planning detail: ${copy}`);
  }
  assert.ok(styles.includes("grid-template-columns"));
  assert.ok(styles.includes("var(--accent)"));
  assert.ok(!styles.includes("#000"));
});

test("planning makes the nightly research loop, history, and follow-up actions visible", () => {
  const page = read("app/dashboard/planning/page.tsx");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");

  assert.ok(page.includes("planningFeed"));
  for (const copy of [
    "매일 조사", "6개 후보", "한나 판단", "선택 후보 발전", "성과 확인", "다음 조사 반영",
    "지난 후보", "다음 조사", "무엇을 찾았나", "무엇을 알게 됐나", "적합",
    "이 주제 더 깊게", "유사 주제 찾기", "새 주제 더 받기", "AI 인계문 복사",
  ]) {
    assert.ok(board.includes(copy), `missing daily planning loop copy: ${copy}`);
  }
});

test("planning exposes the situation, conflict, value, and final judgment before development", () => {
  const board = read("app/dashboard/planning/PlanningBoard.tsx");
  const data = read("app/dashboard/planning/planning-data.ts");

  for (const field of ["situation", "conflict", "valueLine", "judgment"]) {
    assert.ok(data.includes(`${field}: string`), `missing candidate field: ${field}`);
  }
  for (const copy of ["첫 장면", "충돌", "지키는 가치", "마지막 판정"]) {
    assert.ok(board.includes(copy), `missing visible candidate axis: ${copy}`);
  }
  assert.ok(board.includes("idea.situation"));
  assert.ok(board.includes("idea.conflict"));
  assert.ok(board.includes("idea.valueLine"));
  assert.ok(board.includes("idea.judgment"));
});

test("planning adapts the candidate list to the installed dashboard window", () => {
  const board = read("app/dashboard/planning/PlanningBoard.tsx");
  const styles = read("app/dashboard/planning/planning.module.css");

  assert.ok(board.includes("오늘 할 일"));
  assert.ok(board.includes("한나 판단 중"));
  assert.ok(board.includes(`className={styles.quickFilters}`));
  assert.ok(board.includes(`className={styles.detailActions}`));
  assert.ok(!board.includes(`<aside className={styles.filters}>`));
  assert.ok(board.includes("const pageSize = 10"));
  assert.ok(board.includes("pagedVisible.map"));
  assert.ok(board.includes("이전"));
  assert.ok(board.includes("다음"));
  assert.ok(styles.includes("@media (max-width: 900px)"));
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.workspace\s*\{[^}]*height:\s*auto[^}]*grid-template-columns:\s*1fr[^}]*overflow:\s*visible/s);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.ideaList\s*\{[^}]*overflow:\s*visible/s);
});

test("planning keeps candidate hierarchy readable: color, not tiny dense type", () => {
  const board = read("app/dashboard/planning/PlanningBoard.tsx");
  const styles = read("app/dashboard/planning/planning.module.css");

  assert.ok(board.includes("{ideas.length}개 중 발전할 것만 고르기"));
  assert.ok(!board.includes("6개 중 최대 2개만 발전"));

  // 읽을 수 있는 최소 크기 — 한나가 화면에서 글자가 안 들어온다고 한 뒤 정한 바닥값.
  assert.match(styles, /\.page\s*\{[^}]*font-size:\s*15px/s);
  assert.match(styles, /\.rowBody\s*>\s*strong\s*\{[^}]*font-size:\s*16px[^}]*font-weight:\s*600/s);
  assert.match(styles, /\.detailInner h1\s*\{[^}]*font-size:\s*clamp\(22px,[^)]+30px\)[^}]*font-weight:\s*600/s);

  const tooSmall = [...styles.matchAll(/font-size:\s*(\d+)px/g)]
    .map((match) => Number(match[1]))
    .filter((size) => size < 12);
  assert.deepEqual(tooSmall, [], `12px 미만 글자 크기 금지: ${tooSmall.join(", ")}`);

  // 계층은 굵기가 아니라 색으로.
  assert.ok(board.includes("accountRowClass[idea.account]"));
  assert.match(styles, /\.selectedRow\s*\{[^}]*box-shadow:\s*inset 3px 0 var\(--row-accent\)/s);
  assert.match(styles, /\.score\s*\{[^}]*color:\s*var\(--row-accent\)[^}]*font-weight:\s*600/s);
});

test("a failed nightly run never falls back to old built-in recommendations", () => {
  const data = read("app/dashboard/planning/planning-data.ts");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");

  assert.ok(!data.includes("dailyFallbackIds"));
  assert.match(data, /if \(!raw\?\.length\) return \[\]/);
  assert.ok(board.includes("오늘 조사가 완료되지 않았어"));
});

test("products move out of planning into a separate buy-versus-review desk", () => {
  const api = read("lib/dashboard-api.ts");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");
  const page = read("app/dashboard/products/page.tsx");
  const products = read("app/dashboard/products/ProductBoard.tsx");
  const styles = read("app/dashboard/products/products.module.css");

  assert.ok(api.includes("export interface PlanningProduct"));
  assert.ok(api.includes("product_radar?: PlanningProduct[]"));
  assert.ok(page.includes("planningFeed"));
  assert.ok(board.includes("제품 탭에서 분리해 보기"));
  assert.ok(!board.includes("function ProductRadar"));
  for (const copy of [
    "오늘 살 것", "먼저 볼 것", "최근 유행 확인", "유행 근거 오래됨", "유행 근거 없음", "새로 발견",
    "추천 이유", "원재료·영양표", "발견 영상", "먹어볼 방법", "구매처 확인",
  ]) {
    assert.ok(products.includes(copy), `missing product desk copy: ${copy}`);
  }
  assert.ok(products.includes("readyToBuy"));
  assert.ok(products.includes("reviewFirst"));
  assert.ok(styles.includes(".buySection"));
  assert.ok(styles.includes(".reviewSection"));
});

test("the product desk uses colored status hierarchy without heavy bold", () => {
  const styles = read("app/dashboard/products/products.module.css");

  assert.match(styles, /\.sectionTitle h2\s*\{[^}]*font-weight:\s*600/s);
  assert.match(styles, /\.card h3\s*\{[^}]*font-weight:\s*600/s);
  assert.match(styles, /\.card p b\s*\{[^}]*color:\s*var\(--product-accent\)[^}]*font-weight:\s*500/s);
  assert.match(styles, /\.buyCard\s*\{[^}]*--product-accent:\s*#[0-9A-Fa-f]{6}/s);
  assert.match(styles, /\.reviewCard\s*\{[^}]*--product-accent:\s*#[0-9A-Fa-f]{6}/s);
});

test("product recommendations can be classified, saved, excluded, tried, and expanded by feedback", () => {
  const api = read("lib/dashboard-api.ts");
  const page = read("app/dashboard/products/page.tsx");
  const products = read("app/dashboard/products/ProductBoard.tsx");

  assert.ok(page.includes("productFeedback"));
  assert.ok(api.includes("PlanningProductFeedbackResponse"));
  assert.ok(products.includes('/api/dashboard/proxy/planning-product-feedback'));
  assert.ok(products.includes('/api/dashboard/proxy/planning-product-request'));
  for (const copy of [
    "보관함", "먹어볼 것", "제외", "밀키트", "원재료 좋음", "유행",
    "보관", "주문해서 먹어볼래", "비슷한 거 더 찾아", "성분 좋은 걸로 더 찾아",
  ]) {
    assert.ok(products.includes(copy), `missing product feedback action: ${copy}`);
  }
  assert.ok(products.includes("product.id"));
  assert.ok(products.includes("request_type"));
});

test("product recommendations show verified price, review, and discovery source", () => {
  const products = read("app/dashboard/products/ProductBoard.tsx");
  const api = read("lib/dashboard-api.ts");
  for (const copy of ["가격", "후기", "발견한 곳", "확인 전"]) {
    assert.ok(products.includes(copy), `missing product evidence label: ${copy}`);
  }
  for (const field of ["price", "reviews", "discovered_from"]) {
    assert.ok(api.includes(field), `missing product evidence field: ${field}`);
  }
});

test("product recommendations show the product appearance, social proof, and categorized reasons", () => {
  const products = read("app/dashboard/products/ProductBoard.tsx");
  const api = read("lib/dashboard-api.ts");

  for (const copy of ["제품 사진", "YouTube", "Instagram", "추천 이유", "성분 근거 확인"]) {
    assert.ok(products.includes(copy), `missing social product evidence copy: ${copy}`);
  }
  for (const field of ["product_image", "social_evidence", "recommendation_reasons", "ingredient_evidence"]) {
    assert.ok(api.includes(field), `missing social product evidence field: ${field}`);
  }
  assert.ok(products.includes("product.social_evidence"));
  assert.ok(products.includes("product.recommendation_reasons"));
  assert.ok(products.includes("product.product_image"));
});

test("product research makes watched-video depth and six-month freshness visible", () => {
  const products = read("app/dashboard/products/ProductBoard.tsx");
  const api = read("lib/dashboard-api.ts");

  for (const copy of ["이번 조사에서 실제로 본 영상", "자막·내용 확인", "근거로 연결", "최근 6개월", "6개월 초과"]) {
    assert.ok(products.includes(copy), `missing video audit copy: ${copy}`);
  }
  for (const field of ["video_audit", "evidence_total", "content_checked_total", "recent_6m_total", "cutoff_date"]) {
    assert.ok(api.includes(field), `missing video audit field: ${field}`);
  }
  assert.ok(products.includes("product.signal === \"trend\" && !recentSocial"));
});

test("planning decisions use the authenticated dashboard API", () => {
  const api = read("lib/dashboard-api.ts");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");

  assert.ok(api.includes("planningCandidate"));
  assert.ok(api.includes("planningDecisions"));
  assert.ok(api.includes("planningFeed"));
  assert.ok(board.includes('/api/dashboard/proxy/planning-decision'));
  assert.ok(board.includes('/api/dashboard/proxy/planning-request'));
  assert.ok(board.includes('method: "POST"'));
});

test("planning treats each two-day teen batch as a research-to-AI handoff desk", () => {
  const api = read("lib/dashboard-api.ts");
  const board = read("app/dashboard/planning/PlanningBoard.tsx");

  for (const field of ["batch_label?: string", "cycle_days?: number", "target_account?: string"]) {
    assert.ok(api.includes(field), `missing planning batch metadata: ${field}`);
  }
  for (const copy of [
    "매일 6개",
    "어디서 온 문제",
    "한나의 관점",
    "릴스로 푸는 법",
    "발전",
    "보류",
    "제외",
    "AI 인계문 복사",
    "완성 대본을 쓰지 말고",
  ]) {
    assert.ok(board.includes(copy), `missing teen batch handoff copy: ${copy}`);
  }
  assert.ok(board.includes("idea.references[0]"));
  assert.ok(board.includes("idea.judgment"));
  assert.ok(board.includes("idea.primary[1]"));
  assert.ok(board.includes("research?.sources"));
  assert.ok(board.includes("item.url"));
});
