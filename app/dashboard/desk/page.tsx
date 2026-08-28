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
  const [lifeLatest, scheduleV2, uploads] = await Promise.all([
    dash.lifeLatest(),
    dash.scheduleV2(),
    dash.uploads(),
  ]);

  const view = buildHannaDesk(
    { lifeLatest, scheduleV2, uploads },
    todayInSeoul(),
  );

  return <HannaDeskBoard view={view} />;
}
