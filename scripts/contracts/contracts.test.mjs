import { describe, expect, it } from "vitest";
import { AREAS, selectAreaDtos } from "./areas.mjs";
import {
  applyEnumHints,
  emitDto,
  emitModule,
  extractEnumValues,
  normalizeType,
  typeExpression,
} from "./emit.mjs";
import { parseFieldTables, parseSpec } from "./spec-parser.mjs";

const SPEC = `# 명세서

### 27.1 DTO 색인

| DTO | 종류 | 연결 API | 필드 표 위치 |
| --- | --- | --- | --- |
| \`LoginRequest\` | 요청 | \`POST /api/auth/login\` | 27.2 「인증·회원」 도메인 절의 \`LoginRequest\` |
| \`LoginResponse\` | 응답 | \`POST /api/auth/login\` | 4장 「LoginResponse」 절 |
| \`AuthContextResponse\` | 응답 | \`GET /api/auth/context\` | 27.2 「인증·회원」 도메인 절의 \`AuthContextResponse\` |
| \`LogoutResponse\` | 응답 | \`POST /api/auth/logout\` | 27.2 「인증·회원」 도메인 절의 \`LogoutResponse\` |
| \`ContractListResponse\` | 응답 | \`GET /api/contracts\` | 27.10 「계약」 도메인 절의 \`ContractListResponse\` |

### LoginResponse

| 필드명 | 타입 | 필수/선택 | nullable | 제약·허용값 | 설명 |
|---|---|---|---|---|---|
| accessCondition | string | 필수 | 아니오 | — | 판정 결과 |
| role | string | 필수 | 예 | OWNER / AGENT / DEPUTY | 역할 |

### 27.2 인증·회원

#### LoginRequest

| 필드명 | 타입 | 필수/선택 | nullable | 제약·허용값 | 설명 |
|---|---|---|---|---|---|
| email | string | 필수 | 아니오 | — | 이메일 |
| password | string | 필수 | 아니오 | — | 비밀번호 |
| remember | boolean | 선택 | 아니오 | — | 로그인 유지 |

#### AuthContextResponse

| 필드명 | 타입 | 필수/선택 | nullable | 제약·허용값 | 설명 |
|---|---|---|---|---|---|
| accessCondition | string | 필수 | 아니오 | \`ACTIVE\` / \`REMOVED\` | 판정 |
| role | string | 선택 | 예 | 승인된 소속이 있을 때만 | 역할 |
| graceUntil | datetime | 선택 | 예 | ISO-8601 | 유예 종료 |
| reconsentRequired | boolean | 필수 | 아니오 | — | 재동의 |
| items[].termsCode | string | 필수 | 아니오 | — | 약관 코드 |
| items[].version | number (int64) | 조건부 필수 | 예 | — | 버전 |
| flags | object<string,boolean> | 필수 | 아니오 | — | 표시 |
| tags | array<string> | 필수 | 아니오 | — | 태그 |

#### LogoutResponse

HTTP 204.

JSON 응답 필드가 없다.

#### ContractListResponse

| 필드명 | 타입 | 필수/선택 | nullable | 제약·허용값 | 설명 |
|---|---|---|---|---|---|
| items | array<object> | 필수 | 아니오 | — | 목록 |
`;

function pick(dtos, name) {
  const dto = dtos.get(name);
  if (!dto) throw new Error(`${name} DTO가 없다`);
  return dto;
}

describe("명세서 파서", () => {
  it("필드 표의 6개 열을 읽는다", () => {
    const fields = parseFieldTables(SPEC.split("\n"));
    const email = fields.find((field) => field.name === "email");
    expect(email).toEqual({
      name: "email",
      type: "string",
      requirement: "필수",
      nullable: "아니오",
      constraint: "—",
      description: "이메일",
    });
  });

  it("색인의 DTO 654개 같은 전체 목록을 이름·종류·API로 읽는다", () => {
    const dtos = parseSpec(SPEC);
    expect(dtos.size).toBe(5);
    expect(dtos.get("LoginRequest")?.kind).toBe("request");
    expect(dtos.get("LoginResponse")?.apis).toEqual([{ method: "POST", path: "/api/auth/login" }]);
  });

  it("앞 장과 27장에 나뉜 필드를 한 DTO로 모으고 필드 표가 없으면 빈 목록이다", () => {
    const dtos = parseSpec(SPEC);
    expect(dtos.get("LoginResponse")?.fields.map((field) => field.name)).toEqual([
      "accessCondition",
      "role",
    ]);
    expect(dtos.get("LogoutResponse")?.fields).toEqual([]);
  });

  it("다음 제목에서 DTO 절이 끝난다", () => {
    const dtos = parseSpec(SPEC);
    expect(dtos.get("LoginRequest")?.fields).toHaveLength(3);
  });
});

describe("타입 변환", () => {
  it("괄호 보충 설명과 이스케이프를 지운다", () => {
    expect(normalizeType("number (int64)")).toBe("number");
    expect(normalizeType("array\\<object\\>")).toBe("array<object>");
  });

  it("허용값이 슬래시로 나열되면 열거형으로 바꾼다", () => {
    expect(extractEnumValues("OWNER / AGENT / DEPUTY")).toEqual(["OWNER", "AGENT", "DEPUTY"]);
    expect(extractEnumValues("접근 상태 중 하나: `ACTIVE` / `REMOVED`")).toEqual([
      "ACTIVE",
      "REMOVED",
    ]);
    expect(extractEnumValues("ISO-8601")).toBeNull();
    expect(extractEnumValues("승인된 소속이 있을 때만")).toBeNull();
  });

  it("기본 타입과 배열·사전을 zod 식으로 바꾼다", () => {
    expect(typeExpression("string", "").expression).toBe("z.string()");
    expect(typeExpression("datetime", "").expression).toBe("z.iso.datetime({ offset: true })");
    expect(typeExpression("array<string>", "").expression).toBe("z.array(z.string())");
    expect(typeExpression("object<string,boolean>", "").expression).toBe(
      "z.record(z.string(), z.boolean())",
    );
    expect(typeExpression("int64", "").expression).toBe("z.number()");
  });

  it("모르는 타입은 unknown으로 두고 알 수 없다고 표시한다", () => {
    expect(typeExpression("mystery", "")).toEqual({ expression: "z.unknown()", known: false });
  });
});

describe("코드 생성", () => {
  const dtos = parseSpec(SPEC);

  it("필수·선택·nullable을 구분해 객체 스키마와 타입을 만든다", () => {
    const code = emitDto(pick(dtos, "LoginRequest"));
    expect(code).toContain("email: z.string()");
    expect(code).toContain("remember: z.boolean().optional()");
    expect(code).toContain("export type LoginRequest = z.infer<typeof LoginRequestSchema>;");
  });

  it("중첩 경로를 객체 배열로 묶고 조건부 필수는 선택으로 둔다", () => {
    const code = emitDto(pick(dtos, "AuthContextResponse"));
    expect(code).toContain(
      "items: z.array(z.object({ termsCode: z.string(), version: z.number().nullable().optional() }))",
    );
    expect(code).toContain('accessCondition: z.enum(["ACTIVE", "REMOVED"])');
    expect(code).toContain("graceUntil: z.iso.datetime({ offset: true }).nullable().optional()");
    expect(code).toContain("flags: z.record(z.string(), z.boolean())");
  });

  it("필드 표가 없는 DTO는 빈 객체다", () => {
    expect(emitDto(pick(dtos, "LogoutResponse"))).toContain("z.object({  })");
  });

  it("허용값 보강은 표에 허용값이 없을 때만 적용한다", () => {
    const hinted = applyEnumHints(pick(dtos, "AuthContextResponse"), {
      "AuthContextResponse.role": ["OWNER", "AGENT"],
      "AuthContextResponse.accessCondition": ["X", "Y"],
    });
    const code = emitDto(hinted);
    expect(code).toContain('role: z.enum(["OWNER", "AGENT"]).nullable().optional()');
    expect(code).toContain('z.enum(["ACTIVE", "REMOVED"])');
  });

  it("생성 파일 머리글과 zod 가져오기를 붙인다", () => {
    const issues = [];
    const source = emitModule([pick(dtos, "LoginRequest")], issues);
    expect(source.startsWith("// 이 파일은 scripts/generate-contracts.mjs가")).toBe(true);
    expect(source).toContain('import { z } from "zod";');
    expect(issues).toEqual([]);
  });
});

describe("영역 선택", () => {
  const dtos = parseSpec(SPEC);

  it("인증 영역은 인증 경로의 DTO만 고르고 공통 DTO는 제외한다", () => {
    const names = selectAreaDtos(dtos, "auth").map((dto) => dto.name);
    expect(names).toContain("LoginRequest");
    expect(names).not.toContain("AuthContextResponse");
    expect(names).not.toContain("ContractListResponse");
  });

  it("알 수 없는 영역은 사용 가능한 영역을 알리며 실패한다", () => {
    expect(() => selectAreaDtos(dtos, "nope")).toThrow(/사용 가능한 영역/);
    expect(Object.keys(AREAS)).toEqual(expect.arrayContaining(["common", "auth"]));
  });
});

describe("사무소 영역 선택", () => {
  const OFFICE_SPEC = `### 27.1 DTO 색인

| DTO | 종류 | 연결 API | 필드 표 위치 |
| --- | --- | --- | --- |
| \`MembershipStatusResponse\` | 응답 | \`GET /api/memberships/me\` | 27.5 절 |
| \`MeResponse\` | 응답 | \`GET /api/me\` | 27.2 절 |
| \`OfficeLookupResponse\` | 응답 | \`GET /api/offices/lookup\` | 6장 절 |
| \`OfficeCloseRequest\` | 요청 | \`POST /api/offices/current/close\` | 27.5 절 |
| \`ExportPolicyUpdateRequest\` | 요청 | \`PUT /api/offices/current/export-policy\` | 27.14 절 |
| \`OfficeChangeRequestResponse\` | 응답 | \`POST /api/office-change-requests\` | 6장 절 |
| \`OwnerTransferStatusResponse\` | 응답 | \`GET /api/owner-transfers/{transferId}\` | 6장 절 |
`;

  it("memberships 경로를 계정 경로로 오인하지 않고 사무소 영역에 넣는다", () => {
    const dtos = parseSpec(OFFICE_SPEC);
    const office = selectAreaDtos(dtos, "office").map((dto) => dto.name);
    const auth = selectAreaDtos(dtos, "auth").map((dto) => dto.name);
    expect(office).toContain("MembershipStatusResponse");
    expect(office).toContain("OfficeLookupResponse");
    expect(office).toContain("OfficeChangeRequestResponse");
    expect(office).toContain("OwnerTransferStatusResponse");
    expect(auth).not.toContain("MembershipStatusResponse");
    expect(auth).toContain("MeResponse");
  });

  it("사무소 종료와 내보내기 정책은 사무소 영역에서 뺀다", () => {
    const names = selectAreaDtos(parseSpec(OFFICE_SPEC), "office").map((dto) => dto.name);
    expect(names).not.toContain("OfficeCloseRequest");
    expect(names).not.toContain("ExportPolicyUpdateRequest");
    expect(Object.keys(AREAS)).toContain("office");
  });
});

describe("매물·고객 영역 선택", () => {
  const SPEC = `### 27.1 DTO 색인

| DTO | 종류 | 연결 API | 필드 표 위치 |
| --- | --- | --- | --- |
| \`PropertyListResponse\` | 응답 | \`GET /api/properties\` | 8장 절 |
| \`PropertyCategoryListResponse\` | 응답 | \`GET /api/property-categories\` | 8장 절 |
| \`OwnerOccupantCreateRequest\` | 요청 | \`POST /api/properties/{propertyId}/owner-occupants\` | 10장 절 |
| \`AccessApprovalResponse\` | 응답 | \`POST /api/properties/{propertyId}/access-approvals\` | 7장 절 |
| \`ContractCreateRequest\` | 요청 | \`POST /api/properties/{propertyId}/contracts\` | 9장 절 |
| \`CustomerListResponse\` | 응답 | \`GET /api/customers\` | 10장 절 |
| \`DemandConditionUpdateRequest\` | 요청 | \`PATCH /api/demand-conditions/{conditionId}\` | 10장 절 |
| \`CustomerConsultationUpdateRequest\` | 요청 | \`PATCH /api/customer-consultations/{consultationId}\` | 10장 절 |
`;

  it("매물 영역은 방문 승인과 계약 경로를 제외하고 소유·점유 연결은 고객 영역으로 보낸다", () => {
    const dtos = parseSpec(SPEC);
    const property = selectAreaDtos(dtos, "property").map((dto) => dto.name);
    const customer = selectAreaDtos(dtos, "customer").map((dto) => dto.name);
    expect(property).toEqual(["PropertyListResponse", "PropertyCategoryListResponse"]);
    expect(customer).toEqual(
      expect.arrayContaining([
        "CustomerListResponse",
        "OwnerOccupantCreateRequest",
        "DemandConditionUpdateRequest",
        "CustomerConsultationUpdateRequest",
      ]),
    );
    expect(customer).not.toContain("AccessApprovalResponse");
    expect(property).not.toContain("ContractCreateRequest");
  });
});

describe("구독·결제 영역 선택", () => {
  const SPEC = `### 27.1 DTO 색인

| DTO | 종류 | 연결 API | 필드 표 위치 |
| --- | --- | --- | --- |
| \`BillingPlanListResponse\` | 응답 | \`GET /api/billing/plans\` | 19장 절 |
| \`PublicPricingResponse\` | 응답 | \`GET /api/public/pricing\` | 19장 절 |
| \`AuthStatusResponse\` | 응답 | \`GET /api/offices/current/auth-status\` | 19장 절 |
| \`RefundRequestCreateRequest\` | 요청 | \`POST /api/refund-requests\` | 19장 절 |
| \`ReturnVisitResultRequest\` | 요청 | \`POST /api/return-grants/{grantId}/visit-coordinations/{coordinationId}/result\` | 12장 절 |
| \`OpsRefundReviewRequest\` | 요청 | \`POST /api/ops/refund-requests/{refundId}/review\` | 25장 절 |
| \`PublicCompanyInfoResponse\` | 응답 | \`GET /api/public/company-info\` | 27.15 절 |
`;

  it("결제 경로만 구독·결제 영역에 넣고 방문 예외와 운영 콘솔 경로는 뺀다", () => {
    const dtos = parseSpec(SPEC);
    const billing = selectAreaDtos(dtos, "billing").map((dto) => dto.name);
    expect(billing).toEqual([
      "BillingPlanListResponse",
      "PublicPricingResponse",
      "AuthStatusResponse",
      "RefundRequestCreateRequest",
    ]);
  });

  it("인증 상태 응답은 사무소 영역이 아니라 구독·결제 영역에 둔다", () => {
    const dtos = parseSpec(SPEC);
    const office = selectAreaDtos(dtos, "office").map((dto) => dto.name);
    expect(office).not.toContain("AuthStatusResponse");
  });

  it("공개 사업자 정보 응답은 공개 사이트 영역으로 생성한다", () => {
    const names = selectAreaDtos(parseSpec(SPEC), "public-site").map((dto) => dto.name);
    expect(names).toEqual(["PublicCompanyInfoResponse"]);
  });
});
