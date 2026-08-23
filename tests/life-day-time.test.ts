import assert from "node:assert/strict";
import test from "node:test";

import { formatTimelineBoundary, formatTimelineTime, timelineStartMinutes } from "../lib/life-day-time.ts";

test("formats a single recorder timestamp", () => {
  assert.equal(formatTimelineTime("10:51"), "오전 10:51");
});

test("formats a same-period recorder time range without losing its end", () => {
  assert.equal(formatTimelineTime("10:51~11:25"), "오전 10:51~11:25");
});

test("labels both sides when a range crosses noon", () => {
  assert.equal(formatTimelineTime("11:29~12:19"), "오전 11:29~오후 12:19");
});

test("marks the end as next day when a range crosses midnight", () => {
  assert.equal(formatTimelineTime("23:30~00:20"), "오후 11:30~다음날 오전 12:20");
});

test("uses the range start when sorting timeline entries", () => {
  assert.equal(timelineStartMinutes("13:00~14:34"), 13 * 60);
});

test("uses the requested edge of a range for column labels", () => {
  assert.equal(formatTimelineBoundary("10:51~11:25", "start"), "오전 10:51");
  assert.equal(formatTimelineBoundary("22:19~23:25", "end"), "오후 11:25");
});

test("keeps truly unknown time text explicit", () => {
  assert.equal(formatTimelineTime("수행 안 됨"), "수행 안 됨");
});
