// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { MOCK_ME, resetMockAccountState, setMockMe } from "@/mocks/handlers/account";
import {
  buildMockInquiry,
  resetSupportInquiryState,
  supportInquiryState,
} from "@/mocks/handlers/support";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { InquiryNewScreen } from "./inquiry-new-screen";
import { SupportHubScreen } from "./support-hub-screen";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/support",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetSupportInquiryState();
  resetMockAccountState();
  push.mockClear();
});

afterAll(() => stopServer());

const agreements = [
  {
    termsCode: "TOS",
    termsName: "이용약관",
    required: true,
    withdrawable: false,
    termsVersion: "1.0",
    agreed: true,
    recordedAt: "2026-11-01T09:00:00+09:00",
  },
  {
    termsCode: "MARKETING",
    termsName: "이메일 공지·혜택 안내 수신 동의",
    required: false,
    withdrawable: true,
    termsVersion: "1.0",
    agreed: true,
    recordedAt: "2026-11-02T09:00:00+09:00",
  },
];

describe("서비스 이용 화면", () => {
  it("약관 링크와 문의 이력, 위탁 업체 목록을 보여준다", async () => {
    setMockMe({ ...MOCK_ME, termsAgreements: agreements });
    renderOffice(<SupportHubScreen />, { role: "OWNER" });
    expect(screen.getByRole("link", { name: "이용약관" }).getAttribute("href")).toBe(
      "/legal/terms",
    );
    expect(await screen.findByRole("link", { name: "결제 문의" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "인증 문의" })).not.toBeNull();
    expect(screen.getAllByText("접수").length).toBeGreaterThan(1);
    expect(screen.getByText("답변됨")).not.toBeNull();
    expect(await screen.findByText("아마존웹서비스")).not.toBeNull();
    expect(screen.getByText(/수탁사와 위탁 업무가 바뀌면/)).not.toBeNull();
  });

  it("대표에게는 사무소 고객 요청 전달 안내를 보여주고 다른 역할에는 숨긴다", async () => {
    renderOffice(<SupportHubScreen />, { role: "OWNER" });
    expect(
      screen.getAllByText(/고객이 개인정보 열람, 정정, 삭제, 처리정지를 요청하면/).length,
    ).toBeGreaterThan(0);
    cleanup();
    renderOffice(<SupportHubScreen />, { role: "AGENT" });
    expect(screen.queryByText(/고객이 개인정보 열람, 정정, 삭제, 처리정지를 요청하면/)).toBeNull();
  });

  it("문의가 없으면 빈 안내를 보여준다", async () => {
    supportInquiryState.inquiries = [];
    renderOffice(<SupportHubScreen />, { role: "OWNER" });
    expect(await screen.findByText("아직 문의한 내역이 없습니다.")).not.toBeNull();
  });

  it("문의 이력 조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/support-inquiries/me", () => mockErrors.server()));
    renderOffice(<SupportHubScreen />, { role: "OWNER" });
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("게시된 위탁 업체 문서가 없으면 안내한다", async () => {
    supportInquiryState.policyBody = null;
    renderOffice(<SupportHubScreen />, { role: "OWNER" });
    expect(await screen.findByText("게시된 위탁 업체 목록이 없습니다.")).not.toBeNull();
  });

  it("위탁 업체 조회가 실패해도 다른 영역은 보여준다", async () => {
    server.use(http.get("/api/policy-documents", () => mockErrors.server()));
    renderOffice(<SupportHubScreen />, { role: "OWNER" });
    expect(await screen.findByRole("link", { name: "결제 문의" })).not.toBeNull();
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("필수 약관은 철회 대신 탈퇴 안내를 보여주고 선택 약관은 철회한다", async () => {
    setMockMe({ ...MOCK_ME, termsAgreements: agreements });
    let withdrawn: unknown;
    server.use(
      http.post("/api/me/terms-agreements", async ({ request }) => {
        withdrawn = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderOffice(<SupportHubScreen />, { role: "AGENT" });
    const table = await screen.findByRole("table", { name: "현재 동의 상태" });
    expect(within(table).getByText(/이용약관 동의는 철회할 수 없습니다/)).not.toBeNull();
    expect(within(table).getAllByRole("button", { name: "철회" })).toHaveLength(1);
    await user.click(within(table).getByRole("button", { name: "철회" }));
    expect(await screen.findByText("동의를 철회했습니다.")).not.toBeNull();
    expect(withdrawn).toEqual({
      termsCode: "MARKETING",
      version: "1.0",
      agreed: false,
      consentPath: "ACCOUNT_SETTINGS",
    });
  });

  it("철회가 거절되면 문구를 보여준다", async () => {
    setMockMe({ ...MOCK_ME, termsAgreements: agreements });
    server.use(
      http.post("/api/me/terms-agreements", () =>
        errorResponse(409, "TERMS_WITHDRAWAL_NOT_ALLOWED", "철회 불가"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<SupportHubScreen />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "철회" }));
    const alerts = await screen.findAllByRole("alert");
    expect(
      alerts.some((node) => /이용약관 동의는 철회할 수 없습니다/.test(node.textContent ?? "")),
    ).toBe(true);
  });

  it("동의 내역 조회가 실패하면 오류를 보여준다", async () => {
    server.use(http.get("/api/me", () => mockErrors.server()));
    renderOffice(<SupportHubScreen />, { role: "AGENT" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("권리 요청, 기업 도입 문의, 탈퇴 안내로 가는 링크가 있다", () => {
    renderOffice(<SupportHubScreen />, { role: "AGENT" });
    expect(screen.getByRole("link", { name: "권리 요청하기" }).getAttribute("href")).toBe(
      "/privacy-requests",
    );
    expect(screen.getByRole("link", { name: "기업 도입 문의로 가기" }).getAttribute("href")).toBe(
      "/support/enterprise",
    );
    expect(screen.getByRole("link", { name: "회원 탈퇴 안내" }).getAttribute("href")).toBe(
      "/account/withdrawal",
    );
  });
});

describe("문의 작성", () => {
  it("유형과 내용이 없으면 항목별 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<InquiryNewScreen />, { role: "AGENT" });
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(screen.getByText("문의 유형을 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("문의 내용을 입력해 주세요.")).not.toBeNull();
  });

  it("2000자를 넘으면 막는다", async () => {
    const user = userEvent.setup();
    renderOffice(<InquiryNewScreen />, { role: "AGENT" });
    await user.selectOptions(screen.getByLabelText("문의 유형"), "BUG");
    await user.click(screen.getByLabelText("문의 내용"));
    await user.paste("가".repeat(2001));
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(screen.getByText("문의 내용은 2000자까지 입력할 수 있습니다.")).not.toBeNull();
  });

  it("접수하면 접수 완료 표시와 함께 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<InquiryNewScreen />, { role: "AGENT" });
    await user.selectOptions(screen.getByLabelText("문의 유형"), "BUG");
    await user.type(screen.getByLabelText("문의 내용"), "화면이 멈춥니다");
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/support/100?received=1"));
    expect(supportInquiryState.inquiries[0]?.category).toBe("BUG");
  });

  it("주민등록번호가 보이면 서버가 거절하고 문구를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<InquiryNewScreen />, { role: "AGENT" });
    await user.selectOptions(screen.getByLabelText("문의 유형"), "PRIVACY");
    await user.type(screen.getByLabelText("문의 내용"), "900101-1234567");
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(
      await screen.findByText(/주민등록번호나 계좌번호로 보이는 숫자가 있습니다/),
    ).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("429를 받으면 기다리라는 안내를 보여준다", async () => {
    server.use(http.post("/api/support-inquiries", () => mockErrors.rateLimited(40)));
    const user = userEvent.setup();
    renderOffice(<InquiryNewScreen />, { role: "AGENT" });
    await user.selectOptions(screen.getByLabelText("문의 유형"), "AUTH");
    await user.type(screen.getByLabelText("문의 내용"), "로그인");
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(await screen.findByText(/40초 뒤에 다시 시도/)).not.toBeNull();
  });

  it("첨부 안내 문구를 보여준다", () => {
    renderOffice(<InquiryNewScreen />, { role: "AGENT" });
    expect(
      screen.getByText(/첨부 파일에 주민등록번호, 전체 계좌번호, 카드번호가 보이지 않게/),
    ).not.toBeNull();
  });
});

describe("모의 문의 상태", () => {
  it("모의 문의 기본값이 공개 대화만 가진다", () => {
    expect(buildMockInquiry().messages.every((message) => message.visibility === "PUBLIC")).toBe(
      true,
    );
  });
});
