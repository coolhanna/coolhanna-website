import { dash } from "@/lib/dashboard-api";
import YouTubeClient from "./YouTubeClient";

export const dynamic = "force-dynamic";

export default async function YouTubePage() {
  const data = await dash.youtube();
  return <YouTubeClient data={data} />;
}
