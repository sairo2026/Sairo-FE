import type { PropertyListResponse } from "@/lib/api/contracts/property.schema";
import { DEAL_TYPE_LABEL, isDealType } from "./labels";

/** 원 단위 금액을 "1억 2,000만원"처럼 읽기 쉽게 표시한다. */
export function formatWonCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "-";
  const sign = amount < 0 ? "-" : "";
  const abs = Math.trunc(Math.abs(amount));
  if (abs === 0) return "0원";
  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const rest = abs % 10_000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (rest > 0) parts.push(rest.toLocaleString("ko-KR"));
  return `${sign}${parts.join(" ")}원`;
}

export type OfferPrice = {
  dealType: string;
  salePrice: number | null;
  depositAmount: number | null;
  monthlyRentAmount: number | null;
};

export function formatOfferPrice(offer: OfferPrice): string {
  if (offer.dealType === "SALE") return formatWonCompact(offer.salePrice);
  if (offer.dealType === "JEONSE") return formatWonCompact(offer.depositAmount);
  if (offer.dealType === "MONTHLY") {
    return `${formatWonCompact(offer.depositAmount)} / ${formatWonCompact(offer.monthlyRentAmount)}`;
  }
  return "-";
}

export function dealTypeLabel(value: string): string {
  return isDealType(value) ? DEAL_TYPE_LABEL[value] : value;
}

type ListItem = PropertyListResponse["items"][number];

export function summarizeOffers(item: ListItem): string[] {
  return item.activeOfferSummary.map(
    (offer) => `${dealTypeLabel(offer.dealType)} ${formatOfferPrice(offer)}`,
  );
}

function seoulToday(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}

/** 서울 기준 오늘부터 만기일까지 남은 일수. 날짜가 없거나 잘못되면 null이다. */
export function daysUntil(date: string | null | undefined, now: Date): number | null {
  if (!date) return null;
  const target = Date.parse(`${date}T00:00:00Z`);
  const today = Date.parse(`${seoulToday(now)}T00:00:00Z`);
  if (Number.isNaN(target) || Number.isNaN(today)) return null;
  return Math.round((target - today) / 86_400_000);
}

export function joinNames(names: readonly string[]): string {
  return names.length === 0 ? "-" : names.join(", ");
}
