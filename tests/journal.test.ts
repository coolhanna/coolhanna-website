import assert from "node:assert/strict";
import test from "node:test";
import { addDays, journalToday, monthDates, shiftMonth, startOfWeek, weekDates } from "../lib/journal.ts";

test("일요일에도 월요일부터 시작하는 같은 주를 보여준다", () => {
  assert.equal(startOfWeek("2026-09-06"), "2026-08-31");
  assert.deepEqual(weekDates("2026-09-06"), ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"]);
  assert.equal(startOfWeek("2026-09-07"), "2026-09-07");
});

test("연말과 윤년을 넘겨도 날짜가 건너뛰거나 겹치지 않는다", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftMonth("2026-01-31", 1), "2026-02-28");
  assert.equal(shiftMonth("2026-12-31", 1), "2027-01-31");
});

test("월간 달력은 해당 월의 모든 날짜와 앞뒤 주의 날짜를 포함한다", () => {
  const days = monthDates("2026-08-15");
  assert.equal(days.length, 42);
  assert.equal(days[0], "2026-07-27");
  assert.equal(days.at(-1), "2026-09-06");
  assert.equal(new Set(days).size, days.length);
  assert.equal(days.filter(day => day.startsWith("2026-08")).length, 31);
});

test("오늘은 기기 시간대와 관계없이 한국 날짜이며 잘못된 날짜를 보정하지 않는다", () => {
  assert.equal(journalToday(new Date("2026-09-06T15:01:00Z")), "2026-09-07");
  assert.throws(() => addDays("2026-02-30", 1), RangeError);
  assert.throws(() => weekDates("2026-9-1"), RangeError);
});
