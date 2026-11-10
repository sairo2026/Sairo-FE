import type {
  CustomerDetailResponse,
  CustomerMergeRequest,
} from "@/lib/api/contracts/customer.schema";

export const MERGE_FIELDS = [
  "name",
  "phone",
  "secondaryPhone",
  "email",
  "memo",
  "managingMembershipId",
] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];
export type MergeSide = "PRIMARY" | "MERGED";
export type MergeChoices = Partial<Record<MergeField, MergeSide>>;

export const MERGE_FIELD_LABEL: Record<MergeField, string> = {
  name: "이름",
  phone: "연락처",
  secondaryPhone: "보조 연락처",
  email: "이메일",
  memo: "업무 메모",
  managingMembershipId: "담당 공인중개사",
};

/** 먼저 등록된 고객을 남는 고객으로 삼는다. 등록 시각이 같으면 고객 ID가 작은 쪽이다. */
export function pickDefaultPrimary(
  first: CustomerDetailResponse,
  second: CustomerDetailResponse,
): [CustomerDetailResponse, CustomerDetailResponse] {
  const firstTime = Date.parse(first.createdAt);
  const secondTime = Date.parse(second.createdAt);
  if (firstTime !== secondTime) {
    return firstTime < secondTime ? [first, second] : [second, first];
  }
  return first.customerId <= second.customerId ? [first, second] : [second, first];
}

export function fieldValue(customer: CustomerDetailResponse, field: MergeField): string {
  const value = customer[field];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function isSameValue(
  primary: CustomerDetailResponse,
  merged: CustomerDetailResponse,
  field: MergeField,
): boolean {
  return fieldValue(primary, field) === fieldValue(merged, field);
}

export function differingFields(
  primary: CustomerDetailResponse,
  merged: CustomerDetailResponse,
): MergeField[] {
  return MERGE_FIELDS.filter((field) => !isSameValue(primary, merged, field));
}

export function firstInquiryIds(customer: CustomerDetailResponse): number[] {
  return customer.consultations
    .filter((item) => item.consultationType === "FIRST_INQUIRY")
    .map((item) => item.consultationId);
}

export function needsFirstInquiryChoice(
  primary: CustomerDetailResponse,
  merged: CustomerDetailResponse,
): boolean {
  return firstInquiryIds(primary).length > 0 && firstInquiryIds(merged).length > 0;
}

export type MergeReadiness = { isReady: boolean; missing: string[] };

export function checkMergeReadiness(input: {
  primary: CustomerDetailResponse;
  merged: CustomerDetailResponse;
  choices: MergeChoices;
  note: string;
  keepFirstInquiryId: number | null;
  isConfirmed: boolean;
}): MergeReadiness {
  const missing: string[] = [];
  const unchosen = differingFields(input.primary, input.merged).filter(
    (field) => input.choices[field] === undefined,
  );
  if (unchosen.length > 0) missing.push("서로 다른 항목의 값을 모두 선택해 주세요.");
  if (input.note.trim() === "") missing.push("충돌 정리 메모를 입력해 주세요.");
  if (needsFirstInquiryChoice(input.primary, input.merged) && input.keepFirstInquiryId === null) {
    missing.push("최초문의로 남길 상담을 선택해 주세요.");
  }
  if (!input.isConfirmed) missing.push("되돌릴 수 없다는 안내를 확인해 주세요.");
  return { isReady: missing.length === 0, missing };
}

export function toMergeRequest(input: {
  primary: CustomerDetailResponse;
  merged: CustomerDetailResponse;
  choices: MergeChoices;
  note: string;
  keepFirstInquiryId: number | null;
}): CustomerMergeRequest {
  const fieldChoices: NonNullable<CustomerMergeRequest["fieldChoices"]> = {};
  for (const field of differingFields(input.primary, input.merged)) {
    const side = input.choices[field];
    if (side) fieldChoices[field] = side;
  }
  return {
    primaryCustomerId: input.primary.customerId,
    mergedCustomerId: input.merged.customerId,
    conflictResolutionNote: input.note.trim(),
    mergedCustomerVersion: input.merged.version,
    ...(input.keepFirstInquiryId !== null ? { keepFirstInquiryId: input.keepFirstInquiryId } : {}),
    ...(Object.keys(fieldChoices).length > 0 ? { fieldChoices } : {}),
  };
}
