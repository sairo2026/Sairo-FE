import { formatKrw } from "@/shared/lib/format";
import type { PublicPricing } from "../api/wire";

export type PricingTier = PublicPricing["plans"][number];

export function tierRange(tier: PricingTier): string {
  if (tier.maxMembers === null) return `${tier.minMembers}인 이상`;
  if (tier.minMembers === tier.maxMembers) return `${tier.minMembers}인`;
  return `${tier.minMembers}~${tier.maxMembers}인`;
}

export function tierFormula(tier: PricingTier): string {
  if (tier.perSeatAmount === null || tier.perSeatAmount === undefined) {
    return `월 ${formatKrw(tier.baseAmount)}`;
  }
  return `월 ${formatKrw(tier.baseAmount)} + (인원 - ${tier.includedMembers}) × ${formatKrw(tier.perSeatAmount)}`;
}
