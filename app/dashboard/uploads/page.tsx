import { dash } from "@/lib/dashboard-api";
import UploadsClient from "./UploadsClient";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const data = await dash.uploads();
  return <UploadsClient data={data} />;
}
