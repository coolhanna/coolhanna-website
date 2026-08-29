import type { Metadata } from "next";
import { dash } from "@/lib/dashboard-api";
import ProductBoard from "./ProductBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제품 찾기",
  robots: { index: false, follow: false },
};

export default async function ProductsPage() {
  const [feed, productFeedback] = await Promise.all([
    dash.planningFeed(),
    dash.productFeedback(),
  ]);
  const day = "current" in feed ? feed.current : null;
  const feedback = "items" in productFeedback ? productFeedback : { items: [], requests: [] };
  return <ProductBoard day={day} feedback={feedback} />;
}
