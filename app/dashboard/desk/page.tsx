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
  const [liveState, scheduleV2] = await Promise.all([
    dash.deskLive(),
    dash.scheduleV2(),
  ]);

  const view = buildHannaDesk(
    { liveState, scheduleV2 },
    todayInSeoul(),
  );

  return <HannaDeskBoard view={view} />;
}
