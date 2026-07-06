import { dash } from "@/lib/dashboard-api";
import ReelsClient from "./ReelsClient";

export const dynamic = "force-dynamic";

export default async function ReelsPage() {
  const data = await dash.reels();
  return <ReelsClient data={data} />;
}
