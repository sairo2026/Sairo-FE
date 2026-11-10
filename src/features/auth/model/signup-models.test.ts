// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, ApiNetworkError } from "@/shared/api/client";
import { describeAuthError, formatWait } from "@/shared/lib/api-messages";
import { landingPathFor, safeNextPath } from "./landing";
import { passwordStrength, validatePasswordInput } from "./password-policy";
import {
  clearSignupDraft,
  loadPendingContactEmail,
  loadSignupDraft,
  saveSignupDraft,
} from "./signup-draft";
import { areRequiredTermsAgreed, visibleTerms } from "../components/terms-agreement-section";
import type { TermsCatalogItem } from "../components/terms-agreement-section";

describe("접근 상태별 이동 화면", () => {
  it.each([
    ["ACTIVE", "/"],
    ["PRE_VERIFICATION", "/office/start"],
    ["OFFICE_UNDER_REVIEW", "/office/review"],
    ["VERIFIED_UNPAID", "/billing"],
    ["PAYMENT_OVERDUE", "/billing"],
    ["AUTH_REVOKED", "/office/verification"],
    ["REMOVED", "/removed"],
    ["RETURN_EXPIRED", "/return"],
  ])("%s는 %s로 보낸다", (accessCondition, path) => {
    expect(landingPathFor({ accessCondition })).toBe(path);
  });
});

describe("돌아갈 주소", () => {
  it("같은 사이트 안의 경로만 허용한다", () => {
    expect(safeNextPath("/properties?page=2")).toBe("/properties?page=2");
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("/\\evil")).toBeNull();
    expect(safeNextPath("/login")).toBeNull();
    expect(safeNextPath("/signup/email")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
});

describe("비밀번호 규칙", () => {
  it("코드 포인트 기준 8자 이상 12자 이하를 허용하고 공백도 센다", () => {
    expect(validatePasswordInput("")).toBe("비밀번호를 입력해 주세요.");
    expect(validatePasswordInput("a".repeat(7))).toContain("8자 이상");
    expect(validatePasswordInput("a".repeat(13))).toContain("12자 이하");
    expect(validatePasswordInput("ab cd ef1")).toBeNull();
    expect(validatePasswordInput("가나다라마바사아")).toBeNull();
    expect(validatePasswordInput("😀".repeat(8))).toBeNull();
    expect(validatePasswordInput("😀".repeat(13))).toContain("12자 이하");
  });

  it("흔한 비밀번호는 거부한다", () => {
    expect(validatePasswordInput("12345678")).toContain("너무 흔한");
    expect(validatePasswordInput("PASSWORD1")).toContain("너무 흔한");
  });

  it("강도를 세 단계로 나눈다", () => {
    expect(passwordStrength("abc")).toBe("weak");
    expect(passwordStrength("abcdefgh")).toBe("weak");
    expect(passwordStrength("abcd1234")).toBe("fair");
    expect(passwordStrength("Abcd1234!x")).toBe("strong");
  });
});

describe("오류 문구", () => {
  it("대기 시간을 분과 초로 보여준다", () => {
    expect(formatWait(45)).toBe("45초");
    expect(formatWait(120)).toBe("2분");
    expect(formatWait(90)).toBe("1분 30초");
    expect(formatWait(0.2)).toBe("1초");
  });

  it("코드로 문구를 고르고 서버 메시지는 그대로 보이지 않는다", () => {
    const conflict = new ApiError(409, { code: "EMAIL_ALREADY_REGISTERED", message: "서버 문구" });
    expect(describeAuthError(conflict, "기본")).toBe("이미 가입된 이메일입니다.");
    const unknown = new ApiError(400, { code: "OTHER", message: "서버 문구" });
    expect(describeAuthError(unknown, "기본")).toBe("기본");
    expect(describeAuthError(new Error("x"), "기본")).toBe("기본");
  });

  it("429는 응답이 알려준 대기 시간을 쓰고 없으면 일반 문구를 쓴다", () => {
    const limited = new ApiError(429, {
      code: "RATE_LIMITED",
      message: "m",
      retryAfterSeconds: 61,
    });
    expect(describeAuthError(limited, "기본")).toContain("1분 1초");
    const noWait = new ApiError(429, { code: "RATE_LIMITED", message: "m" });
    expect(describeAuthError(noWait, "기본")).toContain("잠시 뒤에");
  });

  it("서버 오류와 연결 실패를 구분한다", () => {
    expect(describeAuthError(new ApiError(503, { code: "X", message: "m" }), "기본")).toContain(
      "일시적인 오류",
    );
    expect(describeAuthError(new ApiNetworkError("offline"), "기본")).toContain("인터넷 연결");
    expect(describeAuthError(new ApiNetworkError("timeout"), "기본")).toContain(
      "연결하지 못했습니다",
    );
  });
});

describe("약관 선택", () => {
  const items: TermsCatalogItem[] = [
    item("MARKETING", false),
    item("PRIVACY", true),
    item("TOS", true),
  ];

  function item(termsCode: string, required: boolean): TermsCatalogItem {
    return {
      termsCode,
      version: "v1",
      required,
      title: termsCode,
      documentUrl: "/x",
      category: "C",
      reconsentRequired: false,
      changeSummary: null,
    };
  }

  it("필수 항목을 앞에 두고 이메일이 없으면 마케팅을 숨긴다", () => {
    expect(visibleTerms([...items], true).map((i) => i.termsCode)).toEqual([
      "PRIVACY",
      "TOS",
      "MARKETING",
    ]);
    expect(visibleTerms([...items], false).map((i) => i.termsCode)).toEqual(["PRIVACY", "TOS"]);
  });

  it("필수 항목이 모두 체크돼야 통과한다", () => {
    expect(areRequiredTermsAgreed(items, { PRIVACY: true, TOS: true })).toBe(true);
    expect(areRequiredTermsAgreed(items, { PRIVACY: true })).toBe(false);
  });
});

describe("가입 입력 보관", () => {
  beforeEach(() => window.localStorage.clear());

  it("이름과 이메일과 번호만 보관하고 지울 수 있다", () => {
    saveSignupDraft({ name: "김중개", email: "a@b.co", phone: "010-1234-5678" });
    expect(loadSignupDraft()).toEqual({ name: "김중개", email: "a@b.co", phone: "010-1234-5678" });
    clearSignupDraft();
    expect(loadSignupDraft()).toEqual({ name: "", email: "", phone: "" });
  });

  it("깨진 보관값은 비어 있는 것으로 본다", () => {
    window.localStorage.setItem("sairo.signup.draft", "{broken");
    expect(loadSignupDraft()).toEqual({ name: "", email: "", phone: "" });
    window.localStorage.setItem("sairo.signup.draft", "123");
    expect(loadSignupDraft().name).toBe("");
    expect(loadPendingContactEmail()).toBe("");
  });
});
