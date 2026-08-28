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
  liveState: {
    date: "2026-08-28",
    checked_at: "2026-08-28T10:53:00+09:00",
    current_work: [
      {
        id: "tiktok",
        title: "TikTok 업로드 자동화",
        detail: "예약 승인 대기",
        source: "TikTok 운영 작업",
        state: "working",
        state_label: "진행 중",
      },
      {
        id: "reels-cover",
        title: "릴스 표지 자동화",
        detail: "진행률 연결 전",
        source: "한나 확인",
        state: "working",
        state_label: "진행 중·연결 필요",
      },
    ],
    needs_attention: [
      {
        id: "tiktok-approval",
        title: "16시 강남 브이로그 최종 예약",
        detail: "한나 승인 필요",
        source: "TikTok",
        state: "needs_decision",
        state_label: "승인 필요",
      },
    ],
    sources: [
      {
        id: "gmail",
        title: "메일",
        detail: "09시·18시 요약",
        state: "scheduled",
        state_label: "일 2회",
      },
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
};

test("오늘 실제 진행 중인 작업과 한나 확인이 필요한 일을 분리한다", () => {
  const view = buildHannaDesk(baseInput, "2026-08-28");

  assert.deepEqual(view.currentWork.map((item) => item.title), [
    "TikTok 업로드 자동화",
    "릴스 표지 자동화",
  ]);
  assert.deepEqual(view.needsAttention.map((item) => item.title), [
    "16시 강남 브이로그 최종 예약",
  ]);
  assert.equal(view.checkedAt, "2026-08-28T10:53:00+09:00");
});

test("오늘 일정은 루틴과 미완료 항목만 보여준다", () => {
  const view = buildHannaDesk(baseInput, "2026-08-28");

  assert.deepEqual(view.today.map((item) => item.title), ["뉴스레터 작성", "대본 최종 확인"]);
  assert.ok(!view.today.some((item) => item.title.includes("광고") || item.title.includes("공구")));
});

test("어제 작업 상태는 오늘 화면에 섞지 않는다", () => {
  const view = buildHannaDesk(
    { ...baseInput, liveState: { ...baseInput.liveState, date: "2026-08-27" } },
    "2026-08-28",
  );

  assert.deepEqual(view.currentWork, []);
  assert.deepEqual(view.needsAttention, []);
  assert.deepEqual(view.sources, []);
  assert.deepEqual(view.unavailableSources, ["오늘 작업 상태"]);
});

test("일정 API가 실패하면 현재 작업은 유지하고 부분 확인으로 표시한다", () => {
  const view = buildHannaDesk(
    { liveState: baseInput.liveState, scheduleV2: { error: "schedule unavailable" } },
    "2026-08-28",
  );

  assert.equal(view.currentWork.length, 2);
  assert.deepEqual(view.today, []);
  assert.deepEqual(view.unavailableSources, ["오늘 일정"]);
  assert.equal(view.isPartial, true);
});

test("한나 데스크는 고정 JSON 대신 실시간 API 상태를 사용한다", () => {
  const page = read("app/dashboard/desk/page.tsx");
  const board = read("app/dashboard/desk/HannaDeskBoard.tsx");

  assert.ok(!page.includes("hanna-desk-today.json"));
  assert.ok(page.includes("dash.deskLive()"));
  assert.ok(page.includes("dash.scheduleV2()"));
  for (const removedSource of ["dash.lifeLatest()", "dash.uploads()"])
    assert.ok(!page.includes(removedSource), `removed source remains: ${removedSource}`);
  for (const copy of ["지금 진행 중", "내 답이 필요한 것", "오늘 일정", "메시지 확인 상태"])
    assert.ok(board.includes(copy), `missing desk copy: ${copy}`);
  for (const staleCopy of ["한나가 안 적어도", "기록에서 이어볼 것", "실제 업로드 확인", "계정 확인으로 닫힌 것"])
    assert.ok(!board.includes(staleCopy), `stale desk copy remains: ${staleCopy}`);
  assert.ok(board.includes("60 * 1000"), "한나 데스크는 1분마다 실시간 상태를 다시 읽어야 한다");
  assert.ok(board.includes("매분 자동으로"));
});

test("더 이상 쓰지 않는 진행 카테고리는 대시보드 탭에 노출하지 않는다", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");

  assert.ok(!nav.includes('{ label: "진행", href: "/dashboard/pipeline" }'));
});
