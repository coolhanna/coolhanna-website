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
  lifeLatest: {
    available: true,
    date: "2026-08-27",
    headline: "콘텐츠 시스템 설계·망고 비교 촬영·편집",
    summary: "망고 비교를 촬영하고 세 계정 콘텐츠 흐름을 점검했다.",
    pending: [
      "3계정 콘텐츠 루프 반복 검증",
      "망고 영상 최종 게시 재확인",
      "릴스 표지 자동화",
      "자비스형 알림·일정 시스템",
    ],
  },
  scheduleV2: {
    today: {
      date: "2026-08-28",
      routines: [{ name: "뉴스레터 작성", time: "19:00", location: "" }],
      todos: [
        { text: "대본 최종 확인", done: false },
        { text: "이미 완료", done: true },
      ],
      ad_deadlines: [{ title: "끝난 광고", audience: "한나", kind: "업로드" }],
      gongu_milestones: [{ title: "끝난 공구", audience: "한나", kind: "마감" }],
    },
  },
  uploads: {
    uploads: [
      { date: "2026-08-27", platform: "릴스", source: "가족먹거리", title: "제주 애플망고 시식 비교", views: 15737, key: "ig-mango" },
      { date: "2026-08-27", platform: "릴스", source: "한나", title: "아이 용돈 개입 기준", views: 159843, key: "ig-hanna" },
      { date: "2026-08-27", platform: "릴스", source: "혜린", title: "질투 지우는 알약 이야기", views: 14534, key: "ig-hyerin" },
      { date: "2026-08-27", platform: "유튜브", source: "YT숏", title: "망고 2종 먹어보기", views: 2600, key: "yt-mango" },
      { date: "2026-08-25", platform: "릴스", source: "가족먹거리", title: "첫 미역국 도전", views: 27463, key: "ig-soup" },
      { date: "2026-08-22", platform: "릴스", source: "혜린", title: "지난주 영상", views: 68490, key: "ig-old" },
    ],
  },
};

test("생활기록의 이어질 일만 보여주고 실제 게시가 확인된 망고는 자동으로 닫는다", () => {
  const view = buildHannaDesk(baseInput, "2026-08-28");

  assert.deepEqual(
    view.carryOver.map((item) => item.title),
    ["3계정 콘텐츠 루프 반복 검증", "릴스 표지 자동화", "자비스형 알림·일정 시스템"],
  );
  assert.deepEqual(view.resolvedByAccounts.map((item) => item.title), ["망고 영상 최종 게시 재확인"]);
  assert.match(view.resolvedByAccounts[0]?.detail || "", /가족먹거리|YT숏/);
});

test("오늘은 캘린더 광고가 아니라 실제 루틴과 미완료 기록만 보여준다", () => {
  const view = buildHannaDesk(baseInput, "2026-08-28");

  assert.deepEqual(
    view.today.map((item) => item.title),
    ["뉴스레터 작성", "대본 최종 확인"],
  );
  assert.ok(!view.today.some((item) => item.title.includes("광고") || item.title.includes("공구")));
});

test("실제 계정 업로드를 이번 주와 최근 게시 기준으로 집계한다", () => {
  const view = buildHannaDesk(baseInput, "2026-08-28");

  assert.equal(view.uploadSummary.weekCount, 5);
  assert.equal(view.uploadSummary.latestDate, "2026-08-27");
  assert.equal(view.uploadSummary.latestCount, 4);
  assert.deepEqual(view.recentUploads.slice(0, 2).map((item) => item.title), [
    "제주 애플망고 시식 비교",
    "아이 용돈 개입 기준",
  ]);
});

test("실제 소식통이 실패하면 빈 화면이 아니라 부분 확인으로 표시한다", () => {
  const view = buildHannaDesk(
    {
      lifeLatest: { error: "life unavailable" },
      scheduleV2: { error: "routine unavailable" },
      uploads: { error: "uploads unavailable" },
    },
    "2026-08-28",
  );

  assert.deepEqual(view.unavailableSources, ["하루 기록", "오늘 루틴", "실제 업로드"]);
  assert.equal(view.isPartial, true);
});

test("한나 데스크는 생활기록·오늘 루틴·실제 업로드만 연결한다", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  const page = read("app/dashboard/desk/page.tsx");
  const board = read("app/dashboard/desk/HannaDeskBoard.tsx");

  assert.ok(nav.includes('{ label: "한나 데스크", href: "/dashboard/desk" }'));
  for (const source of ["lifeLatest", "scheduleV2", "uploads"]) {
    assert.ok(page.includes(`dash.${source}()`), `missing source: ${source}`);
  }
  for (const legacy of ["recommendation", "incomplete", "stuck", "paymentFollowups", "quickTasks"]) {
    assert.ok(!page.includes(`dash.${legacy}()`), `legacy source remains: ${legacy}`);
  }
  for (const copy of ["기록에서 이어볼 것", "오늘 루틴", "실제 업로드 확인", "계정 확인으로 닫힌 것"]) {
    assert.ok(board.includes(copy), `missing desk copy: ${copy}`);
  }
  for (const staleCopy of ["지금 판단할 것", "기다리는 것", "미디언스", "메타 캠페인"]) {
    assert.ok(!board.includes(staleCopy), `stale desk copy remains: ${staleCopy}`);
  }
});

test("더 이상 쓰지 않는 진행 카테고리는 대시보드 탭에 노출하지 않는다", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");

  assert.ok(!nav.includes('{ label: "진행", href: "/dashboard/pipeline" }'));
});
