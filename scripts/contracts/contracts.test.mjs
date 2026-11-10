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
