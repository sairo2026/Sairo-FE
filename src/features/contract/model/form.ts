import type {
  ContractCreateRequest,
  ContractDetailResponse,
  ContractDraftCreateRequest,
  ContractDraftUpdateRequest,
  ContractRenewRequest,
} from "@/lib/api/contracts/contract.schema";
import { TEXT_LIMITS, countCodePoints } from "@/shared/lib/format";
import { isLease } from "./labels";
import type { ContractCorrectionRequest } from "../api/contract.api";

export type PartyInput = {
  key: string;
  partyId: number | null;
  name: string;
  phone: string;
  customerId: string;
};

export type ContractFormValues = {
  dealType: string;
  managingMembershipId: string;
  signedDate: string;
  sellerParties: PartyInput[];
  buyerParties: PartyInput[];
  salePrice: string;
  depositAmount: string;
  monthlyRentAmount: string;
  leaseStartDate: string;
  leaseEndDate: string;
  balanceDueDate: string;
  balanceDueDatePendingReason: string;
  memo: string;
};

let partyCounter = 0;

export function newParty(partial: Partial<PartyInput> = {}): PartyInput {
  partyCounter += 1;
  return {
    key: `party-${partyCounter}`,
    partyId: null,
    name: "",
    phone: "",
    customerId: "",
    ...partial,
  };
}

export function emptyContractForm(managingMembershipId = ""): ContractFormValues {
  return {
    dealType: "",
    managingMembershipId,
    signedDate: "",
    sellerParties: [newParty()],
    buyerParties: [newParty()],
    salePrice: "",
    depositAmount: "",
    monthlyRentAmount: "",
    leaseStartDate: "",
    leaseEndDate: "",
    balanceDueDate: "",
    balanceDueDatePendingReason: "",
    memo: "",
  };
}

type DetailParty = ContractDetailResponse["sellerLandlordParties"][number];

function fromDetailParty(party: DetailParty): PartyInput {
  return newParty({
    partyId: party.partyId,
    name: party.name,
    phone: party.phone ?? "",
    customerId: party.customerId ? String(party.customerId) : "",
  });
}

function amountText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export function formFromDetail(detail: ContractDetailResponse): ContractFormValues {
  return {
    dealType: detail.dealType,
    managingMembershipId: "",
    signedDate: detail.signedDate ?? "",
    sellerParties:
      detail.sellerLandlordParties.length > 0
        ? detail.sellerLandlordParties.map(fromDetailParty)
        : [newParty()],
    buyerParties:
      detail.buyerTenantParties.length > 0
        ? detail.buyerTenantParties.map(fromDetailParty)
        : [newParty()],
    salePrice: amountText(detail.salePrice),
    depositAmount: amountText(detail.depositAmount),
    monthlyRentAmount: amountText(detail.monthlyRentAmount),
    leaseStartDate: detail.leaseStartDate ?? "",
    leaseEndDate: detail.leaseEndDate ?? "",
    balanceDueDate: detail.balanceDueDate ?? "",
    balanceDueDatePendingReason: detail.balanceDueDatePendingReason ?? "",
    memo: detail.memo ?? "",
  };
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/[,\s]/g, "");
  if (cleaned === "") return Number.NaN;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

function optionalAmount(value: string): number | null {
  const parsed = parseAmount(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

type Mode = "draft" | "sign";

export function validateContractForm(
  values: ContractFormValues,
  mode: Mode,
  options: { requireManager?: boolean } = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  const strict = mode === "sign";
  if (values.dealType === "") errors.dealType = "거래유형을 선택해 주세요.";
  if (options.requireManager !== false && values.managingMembershipId === "") {
    errors.managingMembershipId = "담당 공인중개사를 선택해 주세요.";
  }
  if (countCodePoints(values.memo) > TEXT_LIMITS.contractMemo) {
    errors.memo = `업무 메모는 ${TEXT_LIMITS.contractMemo}자까지 입력할 수 있습니다.`;
  }
  const amountFields: Array<["salePrice" | "depositAmount" | "monthlyRentAmount", string]> = [
    ["salePrice", "매매가"],
    ["depositAmount", "보증금"],
    ["monthlyRentAmount", "월세"],
  ];
  for (const [field, label] of amountFields) {
    const raw = values[field];
    if (raw.trim() !== "" && (Number.isNaN(parseAmount(raw)) || parseAmount(raw) <= 0)) {
      errors[field] = `${label}은 0보다 큰 숫자로 입력해 주세요.`;
    }
  }
  if (values.leaseStartDate && values.leaseEndDate && values.leaseEndDate < values.leaseStartDate) {
    errors.leaseEndDate = "임대 만기일이 시작일보다 이릅니다.";
  }
  if (!strict) return errors;

  if (values.signedDate === "") errors.signedDate = "체결일을 입력해 주세요.";
  if (!values.sellerParties.some((party) => party.name.trim() !== "")) {
    errors.sellerLandlordParties = "매도·임대인을 한 명 이상 입력해 주세요.";
  }
  if (!values.buyerParties.some((party) => party.name.trim() !== "")) {
    errors.buyerTenantParties = "매수·임차인을 한 명 이상 입력해 주세요.";
  }
  if (values.dealType === "SALE" && !errors.salePrice && values.salePrice.trim() === "") {
    errors.salePrice = "매매가를 입력해 주세요.";
  }
  if (isLease(values.dealType)) {
    if (!errors.depositAmount && values.depositAmount.trim() === "") {
      errors.depositAmount = "보증금을 입력해 주세요.";
    }
    if (
      values.dealType === "MONTHLY" &&
      !errors.monthlyRentAmount &&
      values.monthlyRentAmount.trim() === ""
    ) {
      errors.monthlyRentAmount = "월세를 입력해 주세요.";
    }
    if (values.leaseStartDate === "") errors.leaseStartDate = "임대 시작일을 입력해 주세요.";
    if (values.leaseEndDate === "") errors.leaseEndDate = "임대 만기일을 입력해 주세요.";
  }
  if (values.balanceDueDate === "" && values.balanceDueDatePendingReason.trim() === "") {
    errors.balanceDueDate =
      "잔금 예정일을 입력하거나 날짜를 모르는 사유를 입력해 주세요. 임의 날짜로 채우지 않습니다.";
  }
  return errors;
}

function partyRequests(parties: PartyInput[]) {
  return parties
    .filter((party) => party.name.trim() !== "")
    .map((party) => ({
      name: party.name.trim(),
      phone: nullIfEmpty(party.phone),
      customerId: party.customerId === "" ? null : Number(party.customerId),
    }));
}

function amountsFor(values: ContractFormValues) {
  const sale = values.dealType === "SALE";
  return {
    salePrice: sale ? optionalAmount(values.salePrice) : null,
    depositAmount: sale ? null : optionalAmount(values.depositAmount),
    monthlyRentAmount:
      values.dealType === "MONTHLY" ? optionalAmount(values.monthlyRentAmount) : null,
    leaseStartDate: isLease(values.dealType) ? nullIfEmpty(values.leaseStartDate) : null,
    leaseEndDate: isLease(values.dealType) ? nullIfEmpty(values.leaseEndDate) : null,
    balanceDueDate: nullIfEmpty(values.balanceDueDate),
    balanceDueDatePendingReason: values.balanceDueDate
      ? null
      : nullIfEmpty(values.balanceDueDatePendingReason),
    memo: nullIfEmpty(values.memo),
  };
}

export function toDraftCreateRequest(values: ContractFormValues): ContractDraftCreateRequest {
  return {
    dealType: values.dealType,
    managingMembershipId: Number(values.managingMembershipId),
    sellerLandlordParties: partyRequests(values.sellerParties),
    buyerTenantParties: partyRequests(values.buyerParties),
    signedDate: nullIfEmpty(values.signedDate),
    ...amountsFor(values),
  };
}

export function toDraftUpdateRequest(values: ContractFormValues): ContractDraftUpdateRequest {
  const { dealType, managingMembershipId } = values;
  return {
    dealType,
    ...(managingMembershipId === "" ? {} : { managingMembershipId: Number(managingMembershipId) }),
    sellerLandlordParties: partyRequests(values.sellerParties),
    buyerTenantParties: partyRequests(values.buyerParties),
    signedDate: nullIfEmpty(values.signedDate),
    ...amountsFor(values),
  };
}

export function toCreateRequest(values: ContractFormValues): ContractCreateRequest {
  return {
    dealType: values.dealType,
    managingMembershipId: Number(values.managingMembershipId),
    signedDate: values.signedDate,
    sellerLandlordParties: partyRequests(values.sellerParties),
    buyerTenantParties: partyRequests(values.buyerParties),
    ...amountsFor(values),
  };
}

export function toRenewRequest(values: ContractFormValues): ContractRenewRequest {
  return {
    dealType: values.dealType === "MONTHLY" ? "MONTHLY" : "JEONSE",
    managingMembershipId: Number(values.managingMembershipId),
    signedDate: values.signedDate,
    sellerLandlordParties: partyRequests(values.sellerParties),
    buyerTenantParties: partyRequests(values.buyerParties),
    depositAmount: optionalAmount(values.depositAmount),
    monthlyRentAmount:
      values.dealType === "MONTHLY" ? optionalAmount(values.monthlyRentAmount) : null,
    leaseStartDate: nullIfEmpty(values.leaseStartDate),
    leaseEndDate: nullIfEmpty(values.leaseEndDate),
    balanceDueDate: nullIfEmpty(values.balanceDueDate),
    balanceDueDatePendingReason: values.balanceDueDate
      ? null
      : nullIfEmpty(values.balanceDueDatePendingReason),
  };
}

export function toSeoulDateTime(date: string, time: string): string | null {
  if (date === "" || time === "") return null;
  return `${date}T${time}:00+09:00`;
}

export function toCorrectionRequest(
  values: ContractFormValues,
  baseRevisionId: number,
  reason: string,
  effectiveAt: string,
): ContractCorrectionRequest {
  const parties = (items: PartyInput[]) =>
    items
      .filter((party) => party.name.trim() !== "")
      .map((party, index) => ({
        partyId: party.partyId,
        sequenceNo: index + 1,
        name: party.name.trim(),
        phone: nullIfEmpty(party.phone),
        customerId: party.customerId === "" ? null : Number(party.customerId),
      }));
  const amounts = amountsFor(values);
  return {
    baseRevisionId,
    reason: reason.trim(),
    effectiveAt,
    signedDate: values.signedDate,
    dealType: values.dealType as "SALE" | "JEONSE" | "MONTHLY",
    salePrice: amounts.salePrice,
    depositAmount: amounts.depositAmount,
    monthlyRentAmount: amounts.monthlyRentAmount,
    balanceDueDate: amounts.balanceDueDate,
    balanceDueDatePendingReason: amounts.balanceDueDatePendingReason,
    leaseStartDate: amounts.leaseStartDate,
    leaseEndDate: amounts.leaseEndDate,
    sellerLandlordParties: parties(values.sellerParties),
    buyerTenantParties: parties(values.buyerParties),
  };
}

export const REASON_LIMIT = 2000;

export function validateReason(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return "사유를 입력해 주세요.";
  if (countCodePoints(trimmed) > REASON_LIMIT)
    return `사유는 ${REASON_LIMIT}자까지 입력할 수 있습니다.`;
  return undefined;
}
