import { dash } from "@/lib/dashboard-api";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    today,
    recommendation,
    weekProgress,
    schedule,
    incomplete,
    stuck,
    active,
    paymentFollowups,
    cashflow,
    health,
    calendar,
    choresTodo,
    choresShop,
    quickTasks,
    ideasRecent,
    scheduleV2,
    weeklyTodos,
    todayMe,
    memosRecent,
    activeTodos,
    thinkingTracks,
  ] = await Promise.all([
    dash.today(),
    dash.recommendation(),
    dash.weekProgress(),
    dash.schedule(),
    dash.incomplete(),
    dash.stuck(),
    dash.activeCards(),
    dash.paymentFollowups(),
    dash.cashflow(),
    dash.healthTrend(),
    dash.calendar(),
    dash.choresTodo(),
    dash.choresShop(),
    dash.quickTasks(),
    dash.ideasRecent(),
    dash.scheduleV2(),
    dash.weeklyTodos(),
    dash.todayMe(),
    dash.memosRecent(),
    dash.activeTodos(),
    dash.thinkingTracks(),
  ]);

  return (
    <DashboardClient
      initial={{
        today,
        recommendation,
        weekProgress,
        schedule,
        incomplete,
        stuck,
        active,
        paymentFollowups,
        cashflow,
        health,
        calendar,
        choresTodo,
        choresShop,
        quickTasks,
        ideasRecent,
        scheduleV2,
        weeklyTodos,
        todayMe,
        memosRecent,
        activeTodos,
        thinkingTracks,
      }}
    />
  );
}
