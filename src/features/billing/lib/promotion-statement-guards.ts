import type { PromotionPeriod } from "../api/wire";

export function isValidFreePromotionPeriod(period: PromotionPeriod): boolean {
  return (
    Number.isSafeInteger(period.listAmount) &&
    period.listAmount > 0 &&
    period.discountAmount === period.listAmount &&
    period.chargedAmount === 0
  );
}
