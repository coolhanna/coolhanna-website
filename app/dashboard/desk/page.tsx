import { dash } from "@/lib/dashboard-api";
import { buildHannaDesk } from "@/lib/hanna-desk";
import HannaDeskBoard from "./HannaDeskBoard";

export const dynamic = "force-dynamic";

function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function HannaDeskPage() {
  const [recommendation, scheduleV2, incomplete, stuck, paymentFollowups, quickTasks] =
    await Promise.all([
      dash.recommendation(),
      dash.scheduleV2(),
      dash.incomplete(),
      dash.stuck(),
      dash.paymentFollowups(),
      dash.quickTasks(),
    ]);

  const view = buildHannaDesk(
    { recommendation, scheduleV2, incomplete, stuck, paymentFollowups, quickTasks },
    todayInSeoul(),
  );

  return <HannaDeskBoard view={view} />;
}
