import { loadPublicPricing } from "@/shared/lib/server-public-data";
import { PricingSummary } from "./pricing-summary";

export async function PricingSummaryServer() {
  return <PricingSummary initialData={await loadPublicPricing()} />;
}
