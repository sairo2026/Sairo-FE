import { loadPublicPricing } from "@/shared/lib/server-public-data";
import { PublicPricingScreen } from "./public-pricing-screen";

export async function PublicPricingScreenServer() {
  return <PublicPricingScreen initialData={await loadPublicPricing()} />;
}
