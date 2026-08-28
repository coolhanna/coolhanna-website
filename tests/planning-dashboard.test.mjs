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
  for (const copy of ["우선 형식", "깊이 확장", "반응 수집", "A/B 구조", "참고한 자료", "한나 의견", "발전", "형식 변경", "스토리 먼저", "보류", "버림"]) {
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
    "밤 조사", "아침 후보", "한나 판단", "선택 후보 발전", "성과 확인", "다음 밤 반영",
    "지난 후보", "다음 조사", "무엇을 찾았나", "무엇을 알게 됐나", "적합",
    "이 주제 더 깊게", "유사 주제 찾기", "새 주제 더 받기", "복사하고 GPT 열기",
  ]) {
    assert.ok(board.includes(copy), `missing daily planning loop copy: ${copy}`);
  }
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

test("planning uses color rather than heavy bold for candidate hierarchy", () => {
  const board = read("app/dashboard/planning/PlanningBoard.tsx");
  const styles = read("app/dashboard/planning/planning.module.css");

  assert.ok(board.includes("{ideas.length}개 중 최대 2개만 발전"));
  assert.ok(!board.includes("6개 중 최대 2개만 발전"));
  assert.match(styles, /\.page\s*\{[^}]*font-size:\s*12px/s);
  assert.ok(board.includes("accountRowClass[idea.account]"));
  assert.match(styles, /\.rowBody\s*>\s*strong\s*\{[^}]*font-size:\s*13px[^}]*font-weight:\s*600/s);
  assert.match(styles, /\.detailInner h1\s*\{[^}]*font-size:\s*clamp\(18px,[^)]+24px\)[^}]*font-weight:\s*600/s);
  assert.match(styles, /\.selectedRow\s*\{[^}]*box-shadow:\s*inset 3px 0 var\(--row-accent\)/s);
  assert.match(styles, /\.score\s*\{[^}]*color:\s*var\(--row-accent\)[^}]*font-weight:\s*600/s);
  assert.ok(!styles.includes(".accountTabs .activeTab, .quickFilters > .activeProgress { background: var(--accent-soft)"));
});

test("the default Hyerin and food ideas are specific character incidents, not generic writer or product cards", () => {
  const data = read("app/dashboard/planning/planning-data.ts");

  for (const stale of ["hyerin-writer", "hyerin-book", "solo-meal", "mango"]) {
    assert.ok(!data.includes(`id: "${stale}"`), `stale generic seed remains: ${stale}`);
  }
  for (const fresh of ["hyerin-retro-playlist", "hyerin-lp-no-skip", "pizza-crust-truce", "first-bite-retrial"]) {
    assert.ok(data.includes(`id: "${fresh}"`), `missing specific seed: ${fresh}`);
  }
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
    "오늘 살 것", "먼저 볼 것", "요즘 유행", "꾸준히 추천", "직접 발굴",
    "왜 우리 핏", "원재료·영양표", "먹어볼 방법", "구매처 확인",
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
