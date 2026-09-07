import assert from "node:assert/strict";
import test from "node:test";
import { planningIdeasForDay } from "../app/dashboard/planning/planning-data.ts";

test("a saved original is readable without a score and keeps its source and account", () => {
  const raw = {
    id: "saved-original", title: "아이의 선택을 어디까지 기다릴까?", account: "main",
    accountLabel: "쿨한나 육아실험실", score: 0, formats: ["thought"],
    formatLabel: "생각 설명", references: [["직접 읽은 원문", "https://example.org/source"]],
    answerFlow: ["내 경험", "생각의 변화"],
  };
  const items = planningIdeasForDay([raw]);
  assert.equal(items.length, 1);
  assert.equal(items[0].accountLabel, raw.accountLabel);
  assert.deepEqual(items[0].references, raw.references);
  assert.deepEqual(items[0].formats, raw.formats);
  assert.deepEqual(items[0].answerFlow, raw.answerFlow);
});

test("source snapshots never acquire evidence from a demo sharing the same topic ID", () => {
  const [idea] = planningIdeasForDay([{ id: "phone-check", title: "보관한 실제 질문", account: "main", score: 81 }]);
  assert.equal(idea.title, "보관한 실제 질문");
  assert.deepEqual(idea.references, [["출처 확인 필요", "선택 후 실제 근거를 연결한다."]]);
  assert.equal(idea.answerFlow.includes("이중구속"), false);
  assert.deepEqual(planningIdeasForDay(undefined), []);
});
