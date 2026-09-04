import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { planningIdeasForDay } from "../app/dashboard/planning/planning-data.ts";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("today's broad-question candidates render even without legacy presentation arrays", () => {
  const [idea] = planningIdeasForDay([
    {
      id: "today-main-1",
      score: 91,
      account: "main",
      accountLabel: "본계정",
      title: "아이의 반응이 오늘 일보다 클 때 무엇부터 볼까?",
      topicLevel: "broad_question",
      topicArea: "관계",
      answerFlow: ["현재 일을 본다", "쌓인 감정을 나눈다", "우리 집 기준을 정한다"],
      sources: ["library", "daily_voice"],
      formats: ["thought", "skit"],
      verdict: "한나의 실제 경험을 먼저 확인한다.",
      situation: "선택 후 실제 장면을 찾는다.",
      conflict: "현재 사건과 쌓인 감정",
      valueLine: "결론은 아직 정하지 않는다.",
      judgment: "한나 확인 뒤 확정한다.",
      references: [["하루기록", "실제 발화"]],
      risk: "결론을 먼저 단정하지 않는다.",
      evidenceCases: [{ format: "생각 설명", firstScene: "실제 대화로 시작" }],
    },
  ]);

  assert.ok(idea);
  assert.equal(idea.primary.length, 2);
  assert.equal(idea.post.length, 2);
  assert.equal(idea.story.length, 2);
  assert.ok(idea.sources.every((source) => ["value", "concern", "trend", "season"].includes(source)));
});

test("product desk explains an unfinished research run instead of presenting zero as a result", () => {
  const board = read("app/dashboard/products/ProductBoard.tsx");
  assert.ok(board.includes("제품 조사가 아직 끝나지 않았어"));
  assert.ok(board.includes("다음 완료 자료가 도착하면 자동으로 바뀌어"));
});

test("every live dashboard room has a visible navigation entry", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  for (const label of ["콘텐츠 진행", "혜린", "매출", "인사이트"]) {
    assert.ok(nav.includes(`label: "${label}"`), `missing dashboard tab: ${label}`);
  }
});

test("slow client dashboards show their room before data finishes loading", () => {
  const curation = read("app/dashboard/curation/CurationBoard.tsx");
  const thoughts = read("app/dashboard/thoughts/ThoughtsBoard.tsx");
  for (const source of [curation, thoughts]) {
    assert.ok(source.includes("자료를 가져오는 중이에요"));
    assert.ok(source.includes("animate-pulse"));
  }
});

test("the default test command includes both TypeScript and module tests", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.test, "node --test tests/*.test.*");
});
