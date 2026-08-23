import assert from "node:assert/strict";
import test from "node:test";

import { formatTimelineTime, timelineStartMinutes } from "../lib/life-day-time.ts";

test("formats a single recorder timestamp", () => {
  assert.equal(formatTimelineTime("10:51"), "오전 10:51");
});

test("formats a same-period recorder time range without losing its end", () => {
  assert.equal(formatTimelineTime("10:51~11:25"), "오전 10:51~11:25");
});

test("labels both sides when a range crosses noon", () => {
  assert.equal(formatTimelineTime("11:29~12:19"), "오전 11:29~오후 12:19");
});

test("uses the range start when sorting timeline entries", () => {
  assert.equal(timelineStartMinutes("13:00~14:34"), 13 * 60);
});

test("keeps truly unknown time text explicit", () => {
  assert.equal(formatTimelineTime("수행 안 됨"), "수행 안 됨");
});
