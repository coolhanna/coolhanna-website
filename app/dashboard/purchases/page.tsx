import purchaseData from "@/data/purchases.json";
import { buildPurchaseView } from "@/lib/purchases";
import PurchasesBoard from "./PurchasesBoard";

export const dynamic = "force-dynamic";

export default function PurchasesPage() {
  return <PurchasesBoard view={buildPurchaseView(purchaseData)} />;
}
