import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildHannaDesk } from "../lib/hanna-desk.ts";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const baseInput = {
  recommendation: {
    recommendation: {
      title: "지난 자료 전달",
      deadline: "2026-08-26",
      modified_days_ago: 2,
    },
    d_label: "D+1",
    reason: "마감이 지났어요",
  },
  scheduleV2: {
    today: {
      date: "2026-08-27",
      calendar_events: [
        { summary: "촬영 미팅", time: "14:00", all_day: false },
        { summary: "패키지 받기", time: null, all_day: true },
      ],
      routines: [
        { name: "비즈니스 PT", time: "09:30", location: "평내" },
      ],
      todos: [
        { text: "대본 최종 확인", done: false },
        { text: "완료한 일", done: true },
      ],
      ad_deadlines: [
        { title: "샴푸 광고", audience: "한나", kind: "업로드" },
      ],
      gongu_milestones: [],
      incomplete_yesterday: [{ text: "어제 익일 확인" }],
    },
  },
  incomplete: {
    items: [
      { title: "지난 자료 전달", deadline: "2026-08-26", modified_days_ago: 2 },
    ],
  },
  stuck: {
    items: [
      { title: "오래된 제휴 답장", deadline: null, modified_days_ago: 6 },
    ],
  },
  paymentFollowups: {
    items: [
      {
        title: "여행 광고",
        type: "광고",
        audience: "한나",
        wait_label: "입금 지연 3일",
        days_until_payment: -3,
      },
    ],
  },
  quickTasks: {
    items: [
      { text: "배송지 확인", done: false },
      { text: "이미 처리", done: true },
    ],
  },
};

test("한나 데스크는 마감 누락을 중복 없는 판단 카드로 만든다", () => {
  const view = buildHannaDesk(baseInput, "2026-08-27");

  assert.deepEqual(
    view.decisions.map((item) => item.title),
    ["지난 자료 전달", "오래된 제휴 답장"],
  );
  assert.equal(view.decisions[0]?.urgency, "urgent");
  assert.equal(view.decisions[0]?.source, "할 일");
});

test("오늘 일정과 준비할 일을 한 흐름으로 정렬한다", () => {
  const view = buildHannaDesk(baseInput, "2026-08-27");

  assert.deepEqual(
    view.today.slice(0, 3).map((item) => [item.time, item.title]),
    [
      ["09:30", "비즈니스 PT"],
      ["14:00", "촬영 미팅"],
      [null, "패키지 받기"],
    ],
  );
  assert.ok(view.mustNotMiss.some((item) => item.title === "대본 최종 확인"));
  assert.ok(view.mustNotMiss.some((item) => item.title === "샴푸 광고 · 업로드"));
  assert.ok(view.mustNotMiss.some((item) => item.title === "배송지 확인"));
  assert.ok(!view.mustNotMiss.some((item) => item.title === "완료한 일"));
});

test("상대를 기다리는 일을 따로 보여준다", () => {
  const view = buildHannaDesk(baseInput, "2026-08-27");

  assert.equal(view.waiting.length, 1);
  assert.equal(view.waiting[0]?.title, "여행 광고");
  assert.equal(view.waiting[0]?.detail, "입금 지연 3일");
  assert.equal(view.summary.waiting, 1);
});

test("기다리는 일은 지금 판단함에 중복해서 올리지 않는다", () => {
  const view = buildHannaDesk(
    {
      ...baseInput,
      stuck: {
        items: [
          { title: "여행 광고", type: "광고", deadline: null, modified_days_ago: 12 },
        ],
      },
    },
    "2026-08-27",
  );

  assert.ok(view.waiting.some((item) => item.title === "여행 광고"));
  assert.ok(!view.decisions.some((item) => item.title === "여행 광고"));
});

test("연결이 실패한 소식통은 0건이 아니라 부분 확인으로 표시한다", () => {
  const view = buildHannaDesk(
    {
      ...baseInput,
      paymentFollowups: { error: "API 503" },
      scheduleV2: { error: "calendar unavailable" },
    },
    "2026-08-27",
  );

  assert.deepEqual(view.unavailableSources, ["오늘 일정", "기다리는 일"]);
  assert.equal(view.isPartial, true);
});

test("한나 데스크는 독립 라우트와 대시보드 탭으로 노출된다", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  const page = read("app/dashboard/desk/page.tsx");
  const board = read("app/dashboard/desk/HannaDeskBoard.tsx");

  assert.ok(nav.includes('{ label: "한나 데스크", href: "/dashboard/desk" }'));
  for (const source of ["recommendation", "scheduleV2", "incomplete", "stuck", "paymentFollowups", "quickTasks"]) {
    assert.ok(page.includes(`dash.${source}()`), `missing source: ${source}`);
  }
  for (const copy of ["지금 판단할 것", "놓치면 안 되는 것", "오늘", "기다리는 것"]) {
    assert.ok(board.includes(copy), `missing desk copy: ${copy}`);
  }
});
