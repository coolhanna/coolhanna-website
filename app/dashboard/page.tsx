import { dash } from "@/lib/dashboard-api";

export const dynamic = "force-dynamic";

const TONE = {
  schedule: "#5D7EE0",
  deadline: "#D85A30",
  done: "#2D7A4F",
  warn: "#B8553A",
} as const;

// ───── 공통 카드 ─────
function Card({
  title,
  children,
  accent,
}: {
  title?: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section
      className="bg-white border border-rule rounded-2xl p-5"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      {title && (
        <h2 className="text-sm font-semibold text-muted mb-3 tracking-tight">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-block text-[11px] px-1.5 py-0.5 rounded font-medium border"
      style={
        color
          ? { color, borderColor: color + "44", backgroundColor: color + "0a" }
          : { color: "#6b6b6b", borderColor: "#e5e5e0", backgroundColor: "#fafaf7" }
      }
    >
      {children}
    </span>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p className="text-xs text-[#B8553A] bg-[#B8553A]0a px-2 py-1 rounded">{msg}</p>
  );
}

// ───── [0] 오늘 안 하면 큰일 ─────
function TodayDday({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const items = data?.items || [];
  if (items.length === 0) {
    return (
      <p className="text-lg text-[#2D7A4F] font-medium">오늘 마감 없음. 여유 있음 ✓</p>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((it: any, i: number) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border border-[#D85A30]/30 bg-[#D85A30]/5"
        >
          <div className="flex items-center gap-2">
            <Pill color={TONE.deadline}>{it.type}</Pill>
            {it.audience && it.audience !== "한나" && <Pill>혜린</Pill>}
            <span className="text-base font-semibold text-ink">{it.title}</span>
            {it.deadline_kind && (
              <span className="text-xs text-muted">({it.deadline_kind})</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ───── [1] 봇 추천 ─────
function BotRecommendation({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const rec = data?.recommendation;
  if (!rec) {
    return <p className="text-sm text-muted">{data?.reason || "진행 중 할 일 없음"}</p>;
  }
  return (
    <div>
      <p className="text-xs text-muted mb-1">
        {data.reason} ·{" "}
        {data.condition != null
          ? `컨디션 ${data.condition}/10`
          : "컨디션 미보고"}
        {data.next_event_minutes != null &&
          ` · 다음 일정 ${data.next_event_minutes}분 후`}
      </p>
      <div className="flex items-center justify-between p-3 rounded-lg border border-rule">
        <div className="flex items-center gap-2">
          <Pill color={TONE.schedule}>{rec.type}</Pill>
          <span className="text-base font-semibold text-ink">{rec.title}</span>
          {rec.related && (
            <span className="text-xs text-muted">[{rec.related}]</span>
          )}
        </div>
        <span className="text-sm font-medium" style={{ color: TONE.deadline }}>
          {data.d_label}
        </span>
      </div>
    </div>
  );
}

// ───── [2] 이번 주 진행률 ─────
function WeekProgress({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const reels = data?.contents?.reels;
  const shorts = data?.contents?.shorts;
  return (
    <div className="space-y-2 text-sm">
      <p>
        <span className="text-muted">오늘:</span>{" "}
        <span className="font-medium">{data?.weekday}요일</span>
      </p>
      {reels && (
        <div className="flex items-center gap-3">
          <span className="text-muted w-16">릴스</span>
          <ProgressBar done={reels.done} goal={reels.goal} color={TONE.schedule} />
        </div>
      )}
      {shorts && (
        <div className="flex items-center gap-3">
          <span className="text-muted w-16">숏클립</span>
          <ProgressBar
            done={shorts.done}
            goal={shorts.goal}
            color={TONE.schedule}
          />
        </div>
      )}
      {data?.gongu_this_week?.length > 0 && (
        <div className="text-xs text-muted mt-2">
          이번 주 공구:{" "}
          {data.gongu_this_week
            .map((g: any) => `${g.label} (${g.오픈D != null ? `오픈D${g.오픈D}` : ""}${g.마감D != null ? `마감D${g.마감D}` : ""})`)
            .join(", ")}
        </div>
      )}
      <p className="text-xs text-muted">뉴스레터: {data?.newsletter || "?"}</p>
    </div>
  );
}

function ProgressBar({
  done,
  goal,
  color,
}: {
  done: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0;
  return (
    <div className="flex-1 flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-rule rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-muted whitespace-nowrap">
        {done}/{goal}
      </span>
    </div>
  );
}

// ───── [3a] 오늘 일정 ─────
function TodaySchedule({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const events = data?.events || [];
  if (events.length === 0) return <p className="text-sm text-muted">오늘 일정 없음</p>;
  return (
    <div className="space-y-1.5 text-sm">
      {data?.next_event_minutes != null && data?.next_event_summary && (
        <p className="text-xs mb-1" style={{ color: TONE.schedule }}>
          다음: {data.next_event_summary} · {data.next_event_minutes}분 후
        </p>
      )}
      {events.map((ev: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted w-12 font-mono">
            {ev.time_label}
          </span>
          <span className="text-ink">{ev.summary}</span>
        </div>
      ))}
    </div>
  );
}

// ───── [3b] 어제 미완료 ─────
function YesterdayIncomplete({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const items = data?.items || [];
  if (items.length === 0) {
    return <p className="text-sm text-[#2D7A4F]">미완료 없음 ✓</p>;
  }
  return (
    <div className="space-y-1.5 text-sm">
      {items.map((it: any, i: number) => {
        const overdue = it.deadline
          ? Math.floor(
              (Date.now() - new Date(it.deadline).getTime()) / (86400000)
            )
          : null;
        return (
          <div key={i} className="flex items-center gap-2">
            <Pill>{it.type}</Pill>
            <span className="text-ink">{it.title}</span>
            {overdue != null && overdue > 0 && (
              <span className="text-xs" style={{ color: TONE.deadline }}>
                D+{overdue}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ───── [4] 막힌 거 ─────
function StuckItems({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const items = data?.items || [];
  if (items.length === 0) {
    return <p className="text-sm text-[#2D7A4F]">막힌 거 없음 ✓</p>;
  }
  return (
    <div className="space-y-1.5 text-sm">
      {items.slice(0, 8).map((it: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <Pill color={TONE.warn}>{it.type}</Pill>
          <span className="text-ink">{it.title}</span>
          <span className="text-xs text-muted">
            {it.state} · {it.modified_days_ago}일째
          </span>
        </div>
      ))}
    </div>
  );
}

// ───── [5] 진행중 카드 ─────
function ActiveCards({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const items = data?.items || [];
  const byType = data?.by_type || {};
  return (
    <div>
      <div className="text-xs text-muted mb-3">
        총 {data?.total}건 · 할일 {byType.할일 || 0} · 광고 {byType.광고 || 0} · 공구 {byType.공구 || 0}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.slice(0, 12).map((it: any, i: number) => (
          <div
            key={i}
            className="border border-rule rounded-lg p-3 hover:border-ink transition"
          >
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Pill>{it.audience}</Pill>
              <Pill
                color={
                  it.type === "광고"
                    ? TONE.deadline
                    : it.type === "공구"
                    ? TONE.schedule
                    : undefined
                }
              >
                {it.type}
              </Pill>
            </div>
            <p className="text-sm font-medium text-ink leading-snug">
              {it.title}
            </p>
            <p className="text-xs text-muted mt-1">{it.state}</p>
            {(it.reels || it.shorts) && (
              <p className="text-xs text-muted mt-0.5">
                {it.reels && `릴스 ${it.reels}`}
                {it.reels && it.shorts && " · "}
                {it.shorts && `숏 ${it.shorts}`}
              </p>
            )}
            {it.deadline && (
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: TONE.deadline }}
              >
                {it.deadline}
              </p>
            )}
          </div>
        ))}
      </div>
      {items.length > 12 && (
        <p className="text-xs text-muted mt-3">
          ...외 {items.length - 12}건 (전체 보기 페이지 준비 중)
        </p>
      )}
    </div>
  );
}

// ───── [6] 돈 흐름 ─────
function WeekCashflow({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const fmt = (n: number | null) =>
    n == null ? "?" : new Intl.NumberFormat("ko-KR").format(n) + "원";
  return (
    <div className="text-sm space-y-2">
      <div>
        <p className="text-xs text-muted">들어옴</p>
        {data?.incoming?.length ? (
          <ul className="space-y-0.5">
            {data.incoming.map((i: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between">
                <span>
                  [{i.audience}] {i.label} <span className="text-xs text-muted">({i.date})</span>
                </span>
                <span className="font-medium" style={{ color: TONE.done }}>
                  {fmt(i.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">없음</p>
        )}
      </div>
      <div className="pt-2 border-t border-rule">
        <p className="text-xs text-muted">나감</p>
        {data?.outgoing?.length ? (
          <ul className="space-y-0.5">
            {data.outgoing.map((o: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between">
                <span>{o.name} <span className="text-xs text-muted">({o.date})</span></span>
                <span className="font-medium" style={{ color: TONE.deadline }}>
                  {fmt(o.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">없음</p>
        )}
      </div>
      <div className="pt-2 border-t border-rule flex items-center justify-between">
        <span className="text-xs text-muted">순 흐름</span>
        <span
          className="font-semibold text-base"
          style={{ color: (data?.net ?? 0) >= 0 ? TONE.done : TONE.deadline }}
        >
          {fmt(data?.net)}
        </span>
      </div>
    </div>
  );
}

// ───── [7] 컨디션 트렌드 ─────
function HealthTrend({ data }: { data: any }) {
  if (data?.error) return <ErrorBox msg={data.error} />;
  const avg = data?.averages || {};
  const days = data?.days || [];
  const sleepHm = (m: number | null) =>
    m == null ? "?" : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  return (
    <div className="text-sm space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted">7일 평균 수면</p>
          <p className="text-lg font-medium">{sleepHm(avg.sleep_min)}</p>
        </div>
        <div>
          <p className="text-muted">7일 평균 컨디션</p>
          <p className="text-lg font-medium">
            {avg.condition ?? "?"}{avg.condition != null ? "/10" : ""}
          </p>
        </div>
        <div>
          <p className="text-muted">7일 평균 걸음</p>
          <p className="text-lg font-medium">
            {avg.steps != null ? new Intl.NumberFormat("ko-KR").format(avg.steps) : "?"}
          </p>
        </div>
        <div>
          <p className="text-muted">평균 수면점수</p>
          <p className="text-lg font-medium">{avg.sleep_score ?? "?"}</p>
        </div>
      </div>
      <div className="pt-2 border-t border-rule">
        <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-muted">
          {days.map((d: any) => (
            <div key={d.date}>
              <div>{d.weekday}</div>
              <div className="font-medium text-ink">
                {d.condition ?? "·"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───── 메인 페이지 ─────
export default async function DashboardPage() {
  const [today, rec, week, schedule, incomplete, stuck, active, cashflow, health] =
    await Promise.all([
      dash.today(),
      dash.recommendation(),
      dash.weekProgress(),
      dash.schedule(),
      dash.incomplete(),
      dash.stuck(),
      dash.activeCards(),
      dash.cashflow(),
      dash.healthTrend(),
    ]);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-6 border-b border-rule">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">한나 운영 대시보드</h1>
          <a href="/" className="text-xs text-muted hover:text-ink">
            ← coolhanna.com
          </a>
        </div>
        <p className="text-xs text-muted mt-1">
          {new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
        </p>
      </header>

      <div className="max-w-page mx-auto px-5 sm:px-8 py-6 space-y-4">
        {/* [0] 오늘 안 하면 큰일 */}
        <Card title="오늘 안 하면 큰일" accent={TONE.deadline}>
          <TodayDday data={today} />
        </Card>

        {/* [1] 봇 추천 */}
        <Card title="지금 뭐부터? (봇 추천)" accent={TONE.schedule}>
          <BotRecommendation data={rec} />
        </Card>

        {/* [2] 이번 주 진행률 */}
        <Card title="이번 주 진행률">
          <WeekProgress data={week} />
        </Card>

        {/* [3] 오늘 일정 + 어제 미완료 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="오늘 일정">
            <TodaySchedule data={schedule} />
          </Card>
          <Card title="어제까지 미완료">
            <YesterdayIncomplete data={incomplete} />
          </Card>
        </div>

        {/* [4] 막힌 거 */}
        <Card title="막힌 거 (3일+ 정체)" accent={TONE.warn}>
          <StuckItems data={stuck} />
        </Card>

        {/* [5] 진행중 카드 */}
        <Card title="진행중 (광고 / 공구 / 할일)">
          <ActiveCards data={active} />
        </Card>

        {/* [6] 돈 흐름 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="이번 주 돈 흐름" accent={TONE.done}>
            <WeekCashflow data={cashflow} />
          </Card>
          <Card title="한나 컨디션 (7일)">
            <HealthTrend data={health} />
          </Card>
        </div>

        <p className="text-[11px] text-muted text-center pt-4">
          데이터는 1분마다 자동 갱신. 옵시디언 카드 수정 즉시 다음 fetch에 반영.
        </p>
      </div>
    </main>
  );
}
