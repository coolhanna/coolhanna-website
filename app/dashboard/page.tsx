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
  ] = await Promise.all([
    dash.today(),
    dash.recommendation(),
    dash.weekProgress(),
    dash.schedule(),
    dash.incomplete(),
    dash.stuck(),
    dash.activeCards(),
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
      }}
    />
  );
}
