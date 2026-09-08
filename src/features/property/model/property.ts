import type { PropertyDealType } from "../schemas/property.schema";

export const dealTypeLabels: Record<PropertyDealType, string> = {
  MONTHLY: "월세",
  JEONSE: "전세",
  SALE: "매매",
};

export function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
