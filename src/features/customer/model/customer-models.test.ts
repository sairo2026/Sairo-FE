import { describe, expect, it } from "vitest";
import { buildMockCustomer } from "@/mocks/handlers/customer";
import {
  EMPTY_CUSTOMER_FORM,
  SENSITIVE_DATA_MESSAGE,
  hasResidentNumber,
  toCreateRequest,
  toUpdateRequest,
  validateCustomerForm,
} from "./form";
import {
  checkMergeReadiness,
  differingFields,
  needsFirstInquiryChoice,
  pickDefaultPrimary,
  toMergeRequest,
} from "./merge";

const valid = {
  ...EMPTY_CUSTOMER_FORM,
  name: "김수요",
  managingMembershipId: "2",
  dataSource: "방문 상담",
  processingBasis: "CONSENT",
  dataPurpose: "매물 상담",
  retentionUntil: "2029-11-10",
};

describe("고객 입력 검증", () => {
  it("필수 항목을 모두 채우면 오류가 없다", () => {
    expect(validateCustomerForm(valid, { isCreate: true })).toEqual({});
  });

  it("필수 항목이 비면 항목마다 오류를 돌려준다", () => {
    const errors = validateCustomerForm(EMPTY_CUSTOMER_FORM, { isCreate: true });
    expect(errors.name).toBe("이름을 입력해 주세요.");
    expect(errors.managingMembershipId).toBeDefined();
    expect(errors.dataSource).toBeDefined();
    expect(errors.processingBasis).toBe("처리 근거를 선택해 주세요.");
    expect(errors.dataPurpose).toBeDefined();
    expect(errors.retentionUntil).toBeDefined();
  });

  it("법인이면 법인명으로 안내한다", () => {
    const errors = validateCustomerForm(
      { ...EMPTY_CUSTOMER_FORM, isCorporation: true },
      { isCreate: true },
    );
    expect(errors.name).toBe("법인명을 입력해 주세요.");
  });

  it("수정에서는 이전 데이터의 미지정 처리 근거를 그대로 둘 수 있다", () => {
    expect(validateCustomerForm({ ...valid, processingBasis: "" }, { isCreate: false })).toEqual(
      {},
    );
  });

  it("연락처와 이메일 형식을 검사한다", () => {
    const errors = validateCustomerForm(
      { ...valid, phone: "1234", secondaryPhone: "010", email: "abc" },
      { isCreate: true },
    );
    expect(errors.phone).toContain("010-0000-0000");
    expect(errors.secondaryPhone).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it("주민등록번호 형태가 이름이나 메모에 있으면 막는다", () => {
    expect(hasResidentNumber("900101-1234567")).toBe(true);
    expect(hasResidentNumber("9001011234567")).toBe(true);
    expect(hasResidentNumber("010-1234-5678")).toBe(false);
    const errors = validateCustomerForm(
      { ...valid, name: "900101-1234567", memo: "주민번호 900101-2234567" },
      { isCreate: true },
    );
    expect(errors.name).toBe(SENSITIVE_DATA_MESSAGE);
    expect(errors.memo).toBe(SENSITIVE_DATA_MESSAGE);
  });

  it("요청 본문은 빈 값을 null로 바꾸고 수정 때 비어 있는 처리 근거는 보내지 않는다", () => {
    const request = toCreateRequest({ ...valid, phone: "010-1111-2222" });
    expect(request.phone).toBe("010-1111-2222");
    expect(request.email).toBeNull();
    expect(request.managingMembershipId).toBe(2);
    expect("processingBasis" in toUpdateRequest({ ...valid, processingBasis: "" })).toBe(false);
    expect(toUpdateRequest(valid).processingBasis).toBe("CONSENT");
  });
});

describe("고객 병합 규칙", () => {
  const older = buildMockCustomer({
    customerId: 20,
    name: "김수요",
    createdAt: "2026-10-01T09:00:00+09:00",
  });
  const newer = buildMockCustomer({
    customerId: 10,
    name: "김수요",
    memo: "중복",
    createdAt: "2026-10-05T09:00:00+09:00",
  });
  const inquiry = (id: number) => ({
    consultationId: id,
    consultationType: "FIRST_INQUIRY" as const,
    occurredAt: "2026-11-01T14:00:00+09:00",
    content: "문의",
    authorMembershipId: 2,
    authorName: "이중개",
    revisionCount: 0,
  });

  it("먼저 등록된 고객이 남는 고객이고 등록 시각이 같으면 ID가 작은 쪽이다", () => {
    expect(pickDefaultPrimary(newer, older)[0].customerId).toBe(20);
    const sameTime = { ...newer, createdAt: older.createdAt };
    expect(pickDefaultPrimary(older, sameTime)[0].customerId).toBe(10);
  });

  it("값이 다른 항목만 고르게 하고 한쪽이 비어 있어도 다른 항목으로 센다", () => {
    expect(differingFields(older, newer)).toEqual(["memo"]);
  });

  it("두 고객 모두 최초문의가 있을 때만 남길 상담을 고르게 한다", () => {
    expect(needsFirstInquiryChoice(older, newer)).toBe(false);
    const a = { ...older, consultations: [inquiry(1)] };
    const b = { ...newer, consultations: [inquiry(2)] };
    expect(needsFirstInquiryChoice(a, b)).toBe(true);
    expect(needsFirstInquiryChoice(a, newer)).toBe(false);
  });

  it("모든 조건을 채워야 병합 준비가 끝난다", () => {
    const input = {
      primary: { ...older, consultations: [inquiry(1)] },
      merged: { ...newer, consultations: [inquiry(2)] },
      choices: {},
      note: "",
      keepFirstInquiryId: null,
      isConfirmed: false,
    };
    expect(checkMergeReadiness(input).missing).toHaveLength(4);
    const ready = checkMergeReadiness({
      ...input,
      choices: { memo: "PRIMARY" as const },
      note: "같은 고객",
      keepFirstInquiryId: 1,
      isConfirmed: true,
    });
    expect(ready.isReady).toBe(true);
  });

  it("병합 요청에는 서로 다른 항목의 선택과 합쳐질 고객 버전만 담는다", () => {
    const request = toMergeRequest({
      primary: older,
      merged: { ...newer, version: 4 },
      choices: { memo: "MERGED", name: "PRIMARY" },
      note: " 같은 고객 ",
      keepFirstInquiryId: null,
    });
    expect(request).toEqual({
      primaryCustomerId: 20,
      mergedCustomerId: 10,
      conflictResolutionNote: "같은 고객",
      mergedCustomerVersion: 4,
      fieldChoices: { memo: "MERGED" },
    });
  });
});
