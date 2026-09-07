import type { JournalEntry } from "../../../lib/journal.ts";
import type { IntakeJob } from "../../../lib/intake-types.ts";

export type ScheduleAccount = "main" | "hyerin" | "food" | "life";
export const scheduleAccounts: Record<ScheduleAccount, string> = { main: "본계정", hyerin: "혜린", food: "먹거리", life: "생활" };

/** Presentation only: keep the complete editable record and its evidence intact. */
export function scheduleRow(entry: JournalEntry) {
  const text = entry.text.trim();
  const account: ScheduleAccount = /혜린이?\s*계정/.test(text) ? "hyerin" : /먹거리\s*계정/.test(text) ? "food" : /본계정|쿨한나\s*육아실험실/.test(text) ? "main" : "life";
  const [first, ...rest] = text.split(/\s+[—–]\s+|\n/);
  const label = first.replace(/(?:본계정|혜린이?\s*계정|먹거리\s*계정)(?:에)?\s*/g, "").replace(/[‘’']/g, "").trim() || first;
  // Preserve action status cues; never turn "필요" or "예정" into completion.
  const cues: string[] = rest.join(" · ").match(/자동\s*DM\s*설정\s*필요|장소[^.·]*확인\s*필요|대본\s*(?:미완성|미작성|구상\s*중)|(?:24시간)[^.·]*|이번\s*주|다음\s*주/g) || [];
  const topics = [...rest.join(" ").matchAll(/['‘『「]([^'’』」]{1,50})['’』」]/g)].map(match => match[1]);
  if (topics.length && /(?:영상|대본)\s*(?:2|두)/.test(first)) cues.unshift([...new Set(topics)].join(" · ") + (/주제\s*미정/.test(rest.join(" ")) ? " · 주제 미정" : ""));
  return { account, accountLabel: scheduleAccounts[account], label, cues };
}

export function calendarTasks(entries: JournalEntry[]) {
  return entries.filter(entry => entry.kind === "task" && !entry.reflection && entry.status !== "archived" && entry.confirmation === "confirmed");
}

/** A future commitment is not an overdue task. Saved ideas stay outside this list. */
export function dailyTaskGroups(entries: JournalEntry[], today: string) {
  const tasks = calendarTasks(entries).filter(entry => entry.status === "open" && entry.confirmation === "confirmed");
  return {
    due: tasks.filter(entry => entry.date && entry.date <= today).sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "99:99").localeCompare(b.time || "99:99")),
    upcoming: tasks.filter(entry => entry.date && entry.date > today),
    undated: tasks.filter(entry => !entry.date),
  };
}

export function pendingIntakeQuestions(jobs: IntakeJob[]) {
  return jobs.filter(job => !["undone", "superseded"].includes(job.status)).flatMap(job => job.actions.filter(action => action.status === "needs_input" && action.question).map(action => ({ job, action })));
}
