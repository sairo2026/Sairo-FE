import { isMissing } from "./labels";
import type { BillingPlanListResponse } from "@/lib/api/contracts/billing.schema";

type Plan = BillingPlanListResponse["plans"][number];

/** 인원수에 맞는 구간을 찾아 기본요금 + (인원 - 포함 인원) × 추가금으로 월 금액을 계산한다. */
export function estimateMonthly(plans: readonly Plan[], members: number): number | null {
  if (!Number.isInteger(members) || members < 1) return null;
  for (const plan of plans) {
    for (const tier of plan.tiers) {
      const inRange =
        members >= tier.minMembers && (isMissing(tier.maxMembers) || members <= tier.maxMembers);
      if (!inRange) continue;
      const extra = Math.max(0, members - tier.includedMembers) * (tier.perSeatPrice ?? 0);
      return tier.basePrice + extra;
    }
  }
  return null;
}
