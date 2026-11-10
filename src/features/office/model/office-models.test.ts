import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/client";
import { describeOfficeError, describeRemaining, fieldErrorMap } from "./messages";
import {
  formatBusinessNumber,
  hasFinalConsonant,
  missingEvidence,
  objectParticle,
  qualificationBody,
  requiredEvidenceTypes,
  validateChangeRequest,
  validateEvidenceFile,
  validateInvite,
  validateLookup,
  validateQualification,
  validateReason,
  validateRegistration,
  validateRoster,
} from "./validation";

const VALID_REGISTRATION = {
  entityType: "INDIVIDUAL" as const,
  registrationAuthority: "서울특별시 종로구",
  realEstateLicenseNumber: "11110-2026-00001",
  businessRegistrationNumber: "123-45-67890",
  requestedOfficeName: "새사무소",
  requestedRepresentativeName: "김대표",
  requestedRepresentativePhone: "010-1111-2222",
  requestedAddress: "서울시 종로구 1",
  applicantRegistrationRelation: "대표 본인",
};

describe("조사와 형식", () => {
  it("받침에 따라 을과 를을 고른다", () => {
    expect(objectParticle("개설등록번호")).toBe("개설등록번호를");
    expect(objectParticle("등록관청")).toBe("등록관청을");
    expect(hasFinalConsonant("")).toBe(false);
    expect(hasFinalConsonant("abc")).toBe(false);
  });

  it("사업자등록번호는 하이픈을 넣어 10자리까지만 받는다", () => {
    expect(formatBusinessNumber("12345678901")).toBe("123-45-67890");
    expect(formatBusinessNumber("1234")).toBe("123-4");
  });
});

describe("사무소 등록 검증", () => {
  it("올바른 입력은 오류가 없다", () => {
    expect(validateRegistration(VALID_REGISTRATION)).toEqual({});
  });

  it("글자 수 상한과 형식을 검사한다", () => {
    const errors = validateRegistration({
      ...VALID_REGISTRATION,
      requestedOfficeName: "가".repeat(101),
      businessRegistrationNumber: "123",
      requestedRepresentativePhone: "1234",
      applicantRegistrationRelation: "",
    });
    expect(errors.requestedOfficeName).toBe("사무소명은 100자 이하로 입력해 주세요.");
    expect(errors.businessRegistrationNumber).toBeDefined();
    expect(errors.requestedRepresentativePhone).toBeDefined();
    expect(errors.applicantRegistrationRelation).toBeDefined();
  });

  it("등록번호 조회는 두 값이 모두 필요하다", () => {
    expect(validateLookup({ registrationAuthority: "", realEstateLicenseNumber: "" })).toEqual({
      registrationAuthority: "등록관청을 입력해 주세요.",
      realEstateLicenseNumber: "개설등록번호를 입력해 주세요.",
    });
  });
});

describe("증빙 검증", () => {
  it("이미지와 PDF만 10MB 이하로 받는다", () => {
    expect(validateEvidenceFile(new File(["a"], "a.pdf", { type: "application/pdf" }))).toBeNull();
    expect(validateEvidenceFile(new File(["a"], "a.jpg", { type: "" }))).toBeNull();
    expect(validateEvidenceFile(new File(["a"], "a.txt", { type: "text/plain" }))).toContain(
      "PDF, JPG, PNG만",
    );
    expect(validateEvidenceFile(new File([], "a.png", { type: "image/png" }))).toContain("비어");
  });

  it("법인은 두 종류를 더 요구한다", () => {
    expect(requiredEvidenceTypes("INDIVIDUAL")).toHaveLength(3);
    expect(requiredEvidenceTypes("CORPORATION")).toHaveLength(5);
    expect(missingEvidence("CORPORATION", {})).toHaveLength(5);
  });
});

describe("참여 입력 검증", () => {
  const base = {
    qualificationNumber: "",
    employmentReportConfirmed: true,
    trainingConfirmed: true,
  };

  it("소속공인중개사는 자격번호가 필요하고 중개보조원은 필요 없다", () => {
    expect(validateQualification({ ...base, role: "AGENT" }).qualificationNumber).toBeDefined();
    expect(validateQualification({ ...base, role: "DEPUTY" })).toEqual({});
    expect(qualificationBody({ ...base, role: "DEPUTY" })).not.toHaveProperty(
      "qualificationNumber",
    );
    expect(
      qualificationBody({ ...base, role: "AGENT", qualificationNumber: " A1 " }),
    ).toMatchObject({ qualificationNumber: "A1" });
  });

  it("초대는 이메일 형식과 역할을 검사한다", () => {
    expect(validateInvite({ email: "a", role: "" })).toEqual({
      email: "이메일 주소를 올바르게 입력해 주세요.",
      role: "역할을 선택해 주세요.",
    });
    expect(validateInvite({ email: "a@b.co", role: "AGENT" })).toEqual({});
  });

  it("사유는 비어 있거나 500자를 넘으면 안 된다", () => {
    expect(validateReason("")).toBe("사유를 입력해 주세요.");
    expect(validateReason("가".repeat(501))).toBe("사유는 500자 이하로 입력해 주세요.");
    expect(validateReason("충분")).toBeUndefined();
    expect(validateReason("", "거절 사유")).toBe("거절 사유를 입력해 주세요.");
  });

  it("고용명부 항목과 변경 신청을 검사한다", () => {
    expect(
      validateRoster({
        personName: "",
        legalQualification: "",
        employmentStartDate: "",
        confirmationSource: "",
      }),
    ).toHaveProperty("personName");
    expect(validateChangeRequest("ADDRESS", {})).toHaveProperty("address");
    expect(validateChangeRequest("REGISTRATION_INFO", {})).toHaveProperty("registrationAuthority");
    expect(
      validateChangeRequest("REGISTRATION_INFO", { businessRegistrationNumber: "12" }),
    ).toHaveProperty("businessRegistrationNumber");
    expect(validateChangeRequest("", {})).toHaveProperty("changeType");
  });
});

describe("오류 문구", () => {
  const apiError = (status: number, code: string, extra = {}) =>
    new ApiError(status, { code, message: "m", ...extra });

  it("사무소 오류 코드를 안내 문구로 바꾼다", () => {
    expect(describeOfficeError(apiError(409, "LAST_OWNER"), "x")).toContain("유일한 대표");
    expect(describeOfficeError(apiError(409, "DEPUTY_QUOTA_EXCEEDED"), "x")).toContain("5배");
    expect(describeOfficeError(apiError(403, "FORBIDDEN"), "x")).toContain("권한");
  });

  it("429와 5xx는 공통 문구를 쓰고 모르는 코드는 기본 문구를 쓴다", () => {
    expect(
      describeOfficeError(apiError(429, "RATE_LIMITED", { retryAfterSeconds: 60 }), "x"),
    ).toContain("1분");
    expect(describeOfficeError(apiError(500, "INTERNAL_ERROR"), "x")).toContain("일시적인 오류");
    expect(describeOfficeError(apiError(400, "WHATEVER"), "기본")).toBe("기본");
    expect(describeOfficeError(new Error("x"), "기본")).toBe("기본");
  });

  it("필드 오류를 필드명 기준으로 모은다", () => {
    const error = apiError(400, "INVALID_REQUEST", {
      fieldErrors: [
        { field: "a", code: "X", message: "첫째" },
        { field: "a", code: "Y", message: "둘째" },
        { field: "b", code: "Z", message: "셋째" },
      ],
    });
    expect(fieldErrorMap(error)).toEqual({ a: "첫째", b: "셋째" });
    expect(fieldErrorMap(new Error("x"))).toEqual({});
  });

  it("남은 시간을 일, 시간, 분으로 나눠 말한다", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    expect(describeRemaining(null, now)).toBeNull();
    expect(describeRemaining("2026-11-09T00:00:00Z", now)).toBe("기한이 지났습니다");
    expect(describeRemaining("2026-11-12T05:00:00Z", now)).toBe("2일 5시간 남음");
    expect(describeRemaining("2026-11-10T03:30:00Z", now)).toBe("3시간 30분 남음");
    expect(describeRemaining("2026-11-10T00:10:00Z", now)).toBe("10분 남음");
  });
});
