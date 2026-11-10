import { describe, expect, it } from "vitest";
import {
  emptyContractForm,
  newParty,
  parseAmount,
  toCorrectionRequest,
  toCreateRequest,
  toDraftCreateRequest,
  toSeoulDateTime,
  validateContractForm,
  validateReason,
} from "./form";
import { partyText } from "./labels";

function leaseForm() {
  return {
    ...emptyContractForm("2"),
    dealType: "MONTHLY",
    signedDate: "2026-11-01",
    sellerParties: [newParty({ name: " 박임대 ", phone: "010" }), newParty()],
    buyerParties: [newParty({ name: "최임차", customerId: "7" })],
    depositAmount: "1,000,000",
    monthlyRentAmount: "500000",
    leaseStartDate: "2026-12-01",
    leaseEndDate: "2028-11-30",
    balanceDueDate: "",
    balanceDueDatePendingReason: "협의 중",
  };
}

describe("계약 입력 모델", () => {
  it("금액은 쉼표를 빼고 양의 정수만 받는다", () => {
    expect(parseAmount("1,234")).toBe(1234);
    expect(parseAmount("12.5")).toBeNaN();
    expect(parseAmount("")).toBeNaN();
  });

  it("체결 검증은 거래유형별 필수값과 잔금 사유를 확인한다", () => {
    const errors = validateContractForm(
      { ...leaseForm(), depositAmount: "", leaseEndDate: "", balanceDueDatePendingReason: "" },
      "sign",
    );
    expect(errors.depositAmount).toBeDefined();
    expect(errors.leaseEndDate).toBeDefined();
    expect(errors.balanceDueDate).toBeDefined();
    expect(validateContractForm(leaseForm(), "sign")).toEqual({});
  });

  it("초안 검증은 거래유형과 담당자만 요구한다", () => {
    const errors = validateContractForm(emptyContractForm(), "draft");
    expect(Object.keys(errors).sort()).toEqual(["dealType", "managingMembershipId"]);
  });

  it("이름이 빈 당사자는 요청에서 빼고 이름은 앞뒤 공백을 지운다", () => {
    const request = toCreateRequest(leaseForm());
    expect(request.sellerLandlordParties).toEqual([
      { name: "박임대", phone: "010", customerId: null },
    ]);
    expect(request.buyerTenantParties[0]?.customerId).toBe(7);
    expect(request.depositAmount).toBe(1000000);
    expect(request.balanceDueDate).toBeNull();
    expect(request.balanceDueDatePendingReason).toBe("협의 중");
  });

  it("매매는 보증금과 임대기간을 보내지 않는다", () => {
    const request = toDraftCreateRequest({
      ...leaseForm(),
      dealType: "SALE",
      salePrice: "900000000",
    });
    expect(request.salePrice).toBe(900000000);
    expect(request.depositAmount).toBeNull();
    expect(request.leaseStartDate).toBeNull();
    expect(request.monthlyRentAmount).toBeNull();
  });

  it("정정 요청은 전체값과 기존 당사자 번호를 담고 새 당사자는 번호가 null이다", () => {
    const form = leaseForm();
    form.sellerParties = [
      newParty({ partyId: 11, name: "박임대" }),
      newParty({ name: "새당사자" }),
    ];
    const request = toCorrectionRequest(form, 5, " 사유 ", "2026-11-02T10:00:00+09:00");
    expect(request.baseRevisionId).toBe(5);
    expect(request.reason).toBe("사유");
    expect(request.sellerLandlordParties.map((party) => [party.partyId, party.sequenceNo])).toEqual(
      [
        [11, 1],
        [null, 2],
      ],
    );
  });

  it("사유는 비어 있거나 2000자를 넘으면 오류다", () => {
    expect(validateReason("  ")).toBeDefined();
    expect(validateReason("가".repeat(2001))).toBeDefined();
    expect(validateReason("가".repeat(2000))).toBeUndefined();
  });

  it("효력시각은 한국 시간대로 만들고 비어 있으면 null이다", () => {
    expect(toSeoulDateTime("2026-11-09", "10:00")).toBe("2026-11-09T10:00:00+09:00");
    expect(toSeoulDateTime("2026-11-09", "")).toBeNull();
  });

  it("당사자 표시는 둘 이상이면 외 N명을 붙인다", () => {
    expect(partyText("박임대", 1)).toBe("박임대");
    expect(partyText("박임대", 3)).toBe("박임대 외 2명");
    expect(partyText(null, 0)).toBe("-");
  });
});
