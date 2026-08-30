"use client";

// 관제탑 — "지금 자동화 다 돌고 있나?"에 3초 안에 답하는 화면.
//
// 판정 근거는 launchd 상태가 아니라 산출물이다. ops_monitor.py 참고:
// /tmp 로그는 3일 뒤 지워지고, 래퍼는 다른 파일에 쓰고, 조건부 잡은 침묵한다.
// 그래서 증거가 없으면 OK로 찍지 않고 "판정 불가"로 남긴다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import FlowGraphView, { type OpsGraph } from "./FlowGraphView";
import Works, { type CodexJob } from "./Works";

export interface OpsJob {
  label: string;
  verdict: "ok" | "late" | "silent" | "down" | "idle" | "stopped" | "unknown";
  reason: string;
  schedule: string;
  loaded: boolean;
  running: boolean;
  last_exit: number | null;
  last_output: string | null;
  evidence: string;
  evidence_path: string | null;
  missed: number;
  next_fire: string | null;
  log_bytes: number | null;
  notes: string[];
}

export interface OpsSurface {
  name: string;
  kind: "web" | "port";
  verdict: "ok" | "down";
  detail: string;
}

export interface FlowNode {
  id: string;
  label: string;
  job: string | null;
  eats: string[];
  makes: string[];
  note: string;
  last_output: string | null;
  state: string;
}

export interface FlowBreak {
  kind: "끊김" | "고아" | "굶음";
  producer: string;
  consumer: string;
  path: string;
  detail: string;
  severity: "high" | "low";
}

export interface RetiredNode {
  id: string;
  label: string;
  why: string;
  last_output: string | null;
}

export interface ChainStep {
  id: string;
  label: string;
  status: "돌음" | "조용" | "멈춤" | "도달";
  manual: boolean;
  last_output: string | null;
  age_hours: number | null;
  is_sink: boolean;
}

export interface Chain {
  name: string;
  purpose: string;
  steps: ChainStep[];
  stalled_at: string | null;
  verdict: "완주" | "멈춤";
}

export interface OpsFlow {
  graph?: OpsGraph;
  chains?: Chain[];
  nodes?: FlowNode[];
  retired?: RetiredNode[];
  edges?: Array<{ from: string; to: string; path: string }>;
  breaks?: FlowBreak[];
  counts?: Record<string, number>;
}

export interface FeedEvent {
  at: string;
  source: string;
  type: string;
  summary: string;
  payload: Record<string, unknown>;
}

export interface OpsCodex {
  jobs?: CodexJob[];
  total?: number;
  active?: number;
  attention?: number;
}

export interface OpsGrowth {
  total_runs?: number;
  grades?: Record<string, string>;
}

export interface OpsResponse {
  feed?: FeedEvent[];
  codex?: OpsCodex;
  growth?: OpsGrowth;
  generated_at?: string;
  counts?: Record<string, number>;
  total?: number;
  attention?: number;
  unverifiable?: number;
  jobs?: OpsJob[];
  surfaces?: OpsSurface[];
  flow?: OpsFlow;
  error?: string;
}

const VERDICT: Record<OpsJob["verdict"], { text: string; bg: string; fg: string }> = {
  down: { text: "죽음", bg: "var(--danger-soft)", fg: "var(--danger-text)" },
  silent: { text: "무산출", bg: "var(--danger-soft)", fg: "var(--danger-text)" },
  late: { text: "지연", bg: "var(--secondary-soft)", fg: "var(--secondary-text)" },
  idle: { text: "노는 중", bg: "var(--secondary-soft)", fg: "var(--secondary-text)" },
  stopped: { text: "꺼둠", bg: "var(--bg-card-soft)", fg: "var(--text-muted-new)" },
  unknown: { text: "판정 불가", bg: "var(--bg-card-soft)", fg: "var(--text-secondary)" },
  ok: { text: "정상", bg: "var(--accent-soft)", fg: "var(--accent-text)" },
};

function shortLabel(label: string): string {
  return label.replace(/^com\.(coolhanna|gimhanna)\./, "");
}

function when(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const mins = Math.round((now - d.getTime()) / 60000);
  if (mins < 0) {
    const ahead = Math.abs(mins);
    if (ahead < 60) return `${ahead}분 뒤`;
    if (ahead < 1440) return `${Math.round(ahead / 60)}시간 뒤`;
    return `${Math.round(ahead / 1440)}일 뒤`;
  }
  if (mins < 60) return `${mins}분 전`;
  if (mins < 1440) return `${Math.round(mins / 60)}시간 전`;
  return `${Math.round(mins / 1440)}일 전`;
}

function Badge({ verdict }: { verdict: OpsJob["verdict"] }) {
  const v = VERDICT[verdict];
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0"
      style={{ backgroundColor: v.bg, color: v.fg }}
    >
      {v.text}
    </span>
  );
}

/** 문제 있는 잡 — 크게, 이유와 다음 조치까지 */
function ProblemCard({ job }: { job: OpsJob }) {
  return (
    <article
      className="rounded-xl p-3.5 border"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-strong)" }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge verdict={job.verdict} />
        <span className="text-[13.5px] font-bold">{shortLabel(job.label)}</span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed">{job.reason}</p>
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        <div><dt className="inline font-semibold">예정</dt> <dd className="inline">{job.schedule}</dd></div>
        <div><dt className="inline font-semibold">마지막 산출</dt> <dd className="inline">{when(job.last_output)}</dd></div>
        {job.next_fire && (
          <div><dt className="inline font-semibold">다음</dt> <dd className="inline">{when(job.next_fire)}</dd></div>
        )}
        <div><dt className="inline font-semibold">근거</dt> <dd className="inline">{job.evidence}</dd></div>
      </dl>
      {job.notes.length > 0 && (
        <ul className="mt-2 text-[11px] space-y-0.5" style={{ color: "var(--secondary-text)" }}>
          {job.notes.map((n) => <li key={n}>· {n}</li>)}
        </ul>
      )}
    </article>
  );
}

/** 정상·꺼둔 잡 — 조밀하게, 한 줄씩 */
function QuietRow({ job }: { job: OpsJob }) {
  return (
    <li
      className="flex items-baseline gap-2 py-1.5 border-b last:border-b-0"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="text-[12.5px] font-medium shrink-0">{shortLabel(job.label)}</span>
      <span className="text-[11px] truncate" style={{ color: "var(--text-muted-new)" }}>
        {job.schedule}
      </span>
      <span className="ml-auto text-[11px] shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>
        {job.verdict === "stopped" ? "—" : when(job.last_output)}
      </span>
    </li>
  );
}

const STEP_STYLE: Record<ChainStep["status"], { dot: string; hint: string }> = {
  돌음: { dot: "var(--accent)", hint: "최근에 새로 만들었다" },
  조용: { dot: "var(--secondary)", hint: "돌긴 했는데 만들 게 없었다" },
  멈춤: { dot: "var(--danger)", hint: "안 돈다" },
  도달: { dot: "var(--border-strong)", hint: "여기까지 온다" },
};

function age(h: number | null): string {
  if (h === null) return "";
  if (h < 1) return "방금";
  if (h < 24) return `${Math.round(h)}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

/** 사슬 하나 — 처음부터 끝까지 오늘 갔는지 한 줄로 */
function ChainRow({ chain }: { chain: Chain }) {
  const done = chain.verdict === "완주";
  return (
    <article
      className="rounded-xl p-3.5 border"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: done ? "var(--border)" : "var(--danger)",
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[13.5px] font-bold">{chain.name}</span>
        <span
          className="px-1.5 py-0.5 rounded text-[10.5px] font-bold"
          style={{
            backgroundColor: done ? "var(--accent-soft)" : "var(--danger-soft)",
            color: done ? "var(--accent-text)" : "var(--danger-text)",
          }}
        >
          {chain.verdict}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-muted-new)" }}>
          {chain.purpose}
        </span>
      </div>

      <ol className="mt-2.5 flex flex-wrap items-stretch gap-y-2">
        {chain.steps.map((step, i) => (
          <li key={step.id} className="flex items-stretch">
            {i > 0 && (
              <span
                aria-hidden
                className="self-center px-1.5 text-[12px]"
                style={{ color: "var(--border-strong)" }}
              >
                →
              </span>
            )}
            <div className="flex flex-col gap-0.5 min-w-0" title={STEP_STYLE[step.status].hint}>
              <span className="flex items-center gap-1.5 text-[12px] leading-tight">
                <span
                  aria-hidden
                  className="inline-block rounded-full shrink-0"
                  style={{
                    width: 7, height: 7,
                    backgroundColor: STEP_STYLE[step.status].dot,
                  }}
                />
                <span
                  className="truncate"
                  style={{
                    fontWeight: step.status === "멈춤" ? 700 : 500,
                    color: step.status === "멈춤" ? "var(--danger)" : "var(--text-main)",
                  }}
                >
                  {step.label}
                </span>
              </span>
              <span className="text-[10.5px] pl-[13px]" style={{ color: "var(--text-muted-new)" }}>
                {step.is_sink ? "표시" : age(step.age_hours) || "기록 없음"}
                {step.manual && !step.is_sink && " · 손"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

const KIND_HINT: Record<FlowBreak["kind"], string> = {
  끊김: "낸 걸 아무도 안 먹는다",
  고아: "아무도 안 읽는 산출물",
  굶음: "먹을 게 없다",
};

/** 흐름이 끊긴 지점 — 시너지가 죽은 자리 */
function BreakCard({ item }: { item: FlowBreak }) {
  const loud = item.severity === "high";
  return (
    <article
      className="rounded-xl p-3.5 border"
      style={{
        backgroundColor: loud ? "var(--bg-card)" : "var(--bg-card-soft)",
        borderColor: loud ? "var(--border-strong)" : "var(--border)",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0"
          style={{
            backgroundColor: loud ? "var(--danger-soft)" : "var(--bg-card-soft)",
            color: loud ? "var(--danger-text)" : "var(--text-secondary)",
          }}
        >
          {item.kind}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-muted-new)" }}>
          {KIND_HINT[item.kind]}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed">{item.detail}</p>
      {item.path && (
        <p className="mt-1 text-[11px] font-mono truncate" style={{ color: "var(--text-muted-new)" }}>
          {item.path}
        </p>
      )}
    </article>
  );
}

/** 활동 피드 — 자동화들이 서로에게 남긴 말. 파일 상태가 아니라 "발화"다. */
function ActivityFeed({ feed }: { feed: FeedEvent[] }) {
  if (feed.length === 0) {
    return (
      <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
        최근 사흘간 아무 자동화도 말을 안 걸었다 — 전부 조용했거나 다 멈췄다.
      </p>
    );
  }
  return (
    <ol className="flex flex-col">
      {feed.map((e, i) => (
        <li
          key={`${e.at}-${e.source}-${i}`}
          className="flex items-baseline gap-2.5 py-1.5 border-b last:border-b-0"
          style={{ borderColor: "var(--border)" }}
        >
          <time
            className="text-[10.5px] tabular-nums shrink-0 w-[74px]"
            style={{ color: "var(--text-muted-new)" }}
          >
            {e.at.slice(5, 16).replace("T", " ")}
          </time>
          <span
            className="text-[11px] font-semibold shrink-0 w-[120px] truncate"
            style={{ color: "var(--accent-text)" }}
          >
            {e.source}
          </span>
          <span className="text-[12px] min-w-0 flex-1">{e.summary || e.type}</span>
        </li>
      ))}
    </ol>
  );
}

function Section({
  title,
  count,
  hint,
  children,
  open: initialOpen = false,
}: {
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  if (count === 0) return null;
  return (
    <section className="mt-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline gap-2 text-left py-1 group"
        aria-expanded={open}
      >
        <h2 className="text-[13px] font-bold">{title}</h2>
        <span className="text-[12px] tabular-nums" style={{ color: "var(--text-muted-new)" }}>
          {count}
        </span>
        {hint && (
          <span className="text-[11px] truncate" style={{ color: "var(--text-muted-new)" }}>
            {hint}
          </span>
        )}
        <span
          className="ml-auto text-[11px] shrink-0 transition-transform"
          style={{ color: "var(--text-secondary)", transform: open ? "rotate(90deg)" : "none" }}
          aria-hidden
        >
          ▸
        </span>
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </section>
  );
}

export default function OpsClient({ data }: { data: OpsResponse }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  if (data?.error) {
    return (
      <main className="dashboard-root min-h-screen bg-paper text-ink">
        <div className="max-w-page mx-auto px-5 sm:px-8 py-8 text-[13px]" style={{ color: "var(--danger, #A85A35)" }}>
          관제탑을 못 읽었어요 — {data.error}
        </div>
      </main>
    );
  }

  const jobs = data.jobs ?? [];
  const surfaces = data.surfaces ?? [];
  const attention = data.attention ?? 0;

  const problems = jobs.filter((j) => ["down", "silent", "late", "idle"].includes(j.verdict));
  const unknowns = jobs.filter((j) => j.verdict === "unknown");
  const stopped = jobs.filter((j) => j.verdict === "stopped");
  const healthy = jobs.filter((j) => j.verdict === "ok");
  const surfacesDown = surfaces.filter((s) => s.verdict === "down");

  const flow = data.flow ?? {};
  const breaks = flow.breaks ?? [];
  const chains = flow.chains ?? [];
  const stalledChains = chains.filter((c) => c.verdict === "멈춤");
  const manualSteps = chains.flatMap((c) =>
    c.steps.filter((st) => st.manual && !st.is_sink).map((st) => ({ chain: c.name, step: st })),
  );
  const feed = data.feed ?? [];
  const codexJobs = data.codex?.jobs ?? [];
  const retired = flow.retired ?? [];
  const loudBreaks = breaks.filter((b) => b.severity === "high");
  const quietBreaks = breaks.filter((b) => b.severity !== "high");

  // "다 돌고 있다"는 잡이 살아있다는 뜻일 뿐이다. 서로 이어져야 자비스다.
  const allClear = attention === 0 && loudBreaks.length === 0 && stalledChains.length === 0;

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    // router.refresh()는 완료 신호를 안 준다 — 서버 왕복 여유만 주고 되돌린다.
    setTimeout(() => setRefreshing(false), 2500);
  };

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
    <div className="max-w-page mx-auto px-5 sm:px-8 py-6">
      {/* 새벽 길드 — 이 화면의 본론. 페이지 폭을 넘어 화면 전체를 쓴다. */}
      {flow.graph && (
        <section className="relative left-1/2 -ml-[50vw] w-screen mb-6 px-3 sm:px-6">
          <h2 className="text-[13px] font-bold mb-1.5">
            새벽 공방{" "}
            <span className="font-normal text-[11px]" style={{ color: "var(--text-muted-new)" }}>
              여덟 갈래로 나눠 산다 · 꺼둔 것은 창고 · 짐꾼이 오간다
            </span>
          </h2>
          <Works graph={flow.graph} feed={feed} codex={codexJobs} growth={data.growth}
                 chains={(flow.chains ?? []).map((c) => ({ name: c.name, steps: c.steps }))} />
        </section>
      )}

      {/* 한 줄 판정 — 이 화면의 전부 */}
      <section
        className="rounded-2xl p-5 text-white"
        style={{ backgroundColor: allClear ? "#2C342C" : "#5A2E1A" }}
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-[26px] sm:text-[32px] font-extrabold leading-none tracking-tight">
            {stalledChains.length > 0
              ? `${stalledChains.length}개 사슬이 멈췄다`
              : loudBreaks.length > 0
                ? `연결 ${loudBreaks.length}곳이 끊겼다`
                : allClear
                  ? `${chains.length}개 사슬 다 완주`
                  : `${attention}개 손봐야 한다`}
          </h1>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="ml-auto text-[12px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "#fff", color: "#1c1c1a" }}
          >
            {refreshing ? "확인 중…" : "다시 확인"}
          </button>
        </div>
        <p className="mt-2.5 text-[13px]" style={{ color: "#d8d6cf" }}>
          처음부터 끝까지 이어져야 의미가 생기는 길 {chains.length}개 · 자동화 {data.total ?? 0}개 ·
          {" "}손이 필요한 자리 {manualSteps.length}곳
        </p>

        {/* 표면 신호등 — 웹·포트는 잡과 별개로 죽을 수 있다 */}
        <ul className="mt-3.5 flex flex-wrap gap-1.5">
          {surfaces.map((s) => (
            <li
              key={s.name}
              title={s.detail}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{
                backgroundColor: s.verdict === "ok" ? "rgba(255,255,255,.13)" : "#A85A35",
                color: "#fff",
              }}
            >
              {s.verdict === "ok" ? "●" : "▲"} {s.name}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[10.5px]" style={{ color: "#9a978e" }}>
          {data.generated_at
            ? `${new Date(data.generated_at).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })} 기준 · `
            : ""}
          판정 근거는 launchd 로그가 아니라 실제 산출물이다 — 증거가 없으면 정상으로 찍지 않는다.
        </p>
      </section>

      {/* 죽은 표면 — 잡보다 위 */}
      {surfacesDown.length > 0 && (
        <section className="mt-4 flex flex-col gap-2">
          {surfacesDown.map((s) => (
            <article
              key={s.name}
              className="rounded-xl p-3.5 border"
              style={{ backgroundColor: "var(--danger-soft)", borderColor: "var(--danger)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                  style={{ backgroundColor: "var(--danger)", color: "#fff" }}
                >
                  응답 없음
                </span>
                <span className="text-[13.5px] font-bold">{s.name}</span>
              </div>
              <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--danger-text)" }}>{s.detail}</p>
            </article>
          ))}
        </section>
      )}

      {/* 사슬 — 이 화면의 본론. "잘 돌고 있나"는 여기서 답한다. */}
      {chains.length > 0 && (
        <section className="mt-4 flex flex-col gap-2.5">
          {chains.map((c) => <ChainRow key={c.name} chain={c} />)}
        </section>
      )}

      {/* 활동 피드 — 서로 말을 걸고 있다는 증거. 사슬 바로 밑, 펼친 채로. */}
      <section
        className="mt-4 rounded-xl p-3.5 border"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-[13px] font-bold mb-1">
          자동화가 한 말{" "}
          <span className="font-normal text-[11px]" style={{ color: "var(--text-muted-new)" }}>
            최근 사흘 · 공용 이벤트 버스
          </span>
        </h2>
        <ActivityFeed feed={feed} />
      </section>

      {/* 손이 필요한 자리 — 자동화 사슬에 사람이 끼어 있는 지점 */}
      {manualSteps.length > 0 && (
        <section
          className="mt-4 rounded-xl p-3.5 border"
          style={{ backgroundColor: "var(--secondary-soft)", borderColor: "var(--secondary)" }}
        >
          <h2 className="text-[13px] font-bold" style={{ color: "var(--secondary-text)" }}>
            손이 필요한 자리 {manualSteps.length}곳
          </h2>
          <p className="mt-1 text-[11.5px]" style={{ color: "var(--secondary-text)" }}>
            네가 안 하면 그날 사슬이 거기서 끊긴다.
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            {manualSteps.map(({ chain, step }) => (
              <li key={`${chain}-${step.id}`}>
                <span className="font-semibold">{step.label}</span>
                <span style={{ color: "var(--secondary-text)" }}> · {chain} · {age(step.age_hours)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 끊긴 연결 — 자비스가 안 되는 진짜 이유. 잡 고장보다 위에 둔다. */}
      {loudBreaks.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[13px] font-bold mb-1.5">
            끊긴 연결{" "}
            <span className="font-normal text-[11px]" style={{ color: "var(--text-muted-new)" }}>
              생산자는 도는데 받아먹을 놈이 멈춰 있다
            </span>
          </h2>
          <div className="flex flex-col gap-2.5">
            {loudBreaks.map((b, i) => <BreakCard key={`${b.kind}-${b.consumer}-${i}`} item={b} />)}
          </div>
        </section>
      )}

      {/* 문제 있는 잡 — 펼친 채로 */}
      {problems.length > 0 && (
        <section className="mt-5 flex flex-col gap-2.5">
          <h2 className="text-[13px] font-bold">고장난 자동화</h2>
          {problems.map((j) => <ProblemCard key={j.label} job={j} />)}
        </section>
      )}

      <Section
        title="판정 불가"
        count={unknowns.length}
        hint="증거 경로를 등록해야 확인된다"
        open={unknowns.length > 0 && problems.length === 0}
      >
        <div className="flex flex-col gap-2.5">
          {unknowns.map((j) => <ProblemCard key={j.label} job={j} />)}
        </div>
      </Section>

      <Section
        title="가벼운 흐름 문제"
        count={quietBreaks.length}
        hint="당장은 아니지만 봐둘 것"
      >
        <div className="flex flex-col gap-2">
          {quietBreaks.map((b, i) => <BreakCard key={`q-${b.kind}-${i}`} item={b} />)}
        </div>
      </Section>

      <Section
        title="은퇴한 자동화"
        count={retired.length}
        hint="대체물이 있어서 끈 것 — 끊김으로 세지 않는다"
      >
        <ul
          className="rounded-xl px-3.5 py-2 border flex flex-col gap-2"
          style={{ backgroundColor: "var(--bg-card-soft)", borderColor: "var(--border)" }}
        >
          {retired.map((r) => (
            <li key={r.id}>
              <span className="text-[12.5px] font-semibold">{r.label}</span>
              <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {r.why}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="흐름 도표"
        count={flow.graph?.links?.length ?? 0}
        hint="원자료 → 가공 → 네가 보는 것, 방향으로 보고 싶을 때"
      >
        {flow.graph && <FlowGraphView graph={flow.graph} />}
      </Section>

      <Section title="정상" count={healthy.length}>
        <ul
          className="rounded-xl px-3.5 py-1 border"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {healthy.map((j) => <QuietRow key={j.label} job={j} />)}
        </ul>
      </Section>

      <Section title="꺼둔 것" count={stopped.length} hint="의도한 것인지 확인">
        <ul
          className="rounded-xl px-3.5 py-1 border"
          style={{ backgroundColor: "var(--bg-card-soft)", borderColor: "var(--border)" }}
        >
          {stopped.map((j) => <QuietRow key={j.label} job={j} />)}
        </ul>
      </Section>
    </div>
    </main>
  );
}
