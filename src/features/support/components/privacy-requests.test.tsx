// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import {
  buildMockPrivacyRequest,
  resetSupportInquiryState,
  supportInquiryState,
} from "@/mocks/handlers/support";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { PrivacyRequestDetailScreen } from "./privacy-request-detail-screen";
import { PrivacyRequestsScreen } from "./privacy-requests-screen";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/privacy-requests",
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
  push.mockClear();
});

afterAll(() => stopServer());

function seed(overrides: Parameters<typeof buildMockPrivacyRequest>[0]) {
  supportInquiryState.privacyRequests = [buildMockPrivacyRequest({ requestId: 31, ...overrides })];
}

describe("개인정보 권리 요청 접수", () => {
  it("안내 문구와 이력을 보여준다", async () => {
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    expect(screen.getByText(/접수일부터 10일 안에 처리 결과를 알려 드리며/)).not.toBeNull();
    expect(screen.getByText(/해당 사무소가 처리자이므로 사무소로 전달됩니다/)).not.toBeNull();
    expect(await screen.findByRole("link", { name: "열람 요청" })).not.toBeNull();
    expect(screen.queryByText(/고객지원 문의로 전달해 주세요/)).toBeNull();
  });

  it("대표에게는 사무소 고객 요청 전달 안내를 더 보여준다", () => {
    renderOffice(<PrivacyRequestsScreen />, { role: "OWNER" });
    expect(screen.getByText(/고객지원 문의로 전달해 주세요/)).not.toBeNull();
  });

  it("이력이 없으면 빈 안내를 보여준다", async () => {
    supportInquiryState.privacyRequests = [];
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    expect(await screen.findByText("접수한 권리 요청이 없습니다.")).not.toBeNull();
  });

  it("이력 조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/privacy-requests/me", () => mockErrors.server()));
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("처리 상태로 거른다", async () => {
    supportInquiryState.privacyRequests = [
      buildMockPrivacyRequest({ requestId: 1, requestType: "ACCESS", status: "RECEIVED" }),
      buildMockPrivacyRequest({ requestId: 2, requestType: "DELETION", status: "COMPLETED" }),
    ];
    const user = userEvent.setup();
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    await screen.findByRole("link", { name: "삭제 요청" });
    await user.selectOptions(screen.getByLabelText("처리 상태"), "COMPLETED");
    await waitFor(() => expect(screen.queryByRole("link", { name: "열람 요청" })).toBeNull());
    expect(screen.getByRole("link", { name: "삭제 요청" })).not.toBeNull();
  });

  it("유형과 내용이 없으면 항목별 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    await user.click(screen.getByRole("button", { name: "요청 접수" }));
    expect(screen.getByText("요청 유형을 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("요청 내용을 입력해 주세요.")).not.toBeNull();
  });

  it("여섯 가지 요청 유형을 고를 수 있다", () => {
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    const select = screen.getByLabelText("요청 유형") as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      "유형을 선택해 주세요",
      "열람",
      "정정",
      "삭제",
      "처리정지",
      "동의 철회",
      "이전",
    ]);
  });

  it("접수하면 처리 상태 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    await user.selectOptions(screen.getByLabelText("요청 유형"), "DELETION");
    await user.type(screen.getByLabelText("요청 내용"), "내 이름을 삭제해 주세요");
    await user.click(screen.getByRole("button", { name: "요청 접수" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/privacy-requests/200?received=1"));
    expect(supportInquiryState.privacyRequests[0]?.requestType).toBe("DELETION");
  });

  it("주민등록번호가 보이면 서버가 거절하고 문구를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    await user.selectOptions(screen.getByLabelText("요청 유형"), "ACCESS");
    await user.type(screen.getByLabelText("요청 내용"), "900101-1234567");
    await user.click(screen.getByRole("button", { name: "요청 접수" }));
    expect(
      await screen.findByText(/주민등록번호나 계좌번호로 보이는 숫자가 있습니다/),
    ).not.toBeNull();
  });

  it("429를 받으면 기다리라는 안내를 보여준다", async () => {
    server.use(http.post("/api/privacy-requests", () => mockErrors.rateLimited(30)));
    const user = userEvent.setup();
    renderOffice(<PrivacyRequestsScreen />, { role: "AGENT" });
    await user.selectOptions(screen.getByLabelText("요청 유형"), "ACCESS");
    await user.type(screen.getByLabelText("요청 내용"), "열람");
    await user.click(screen.getByRole("button", { name: "요청 접수" }));
    expect(await screen.findByText(/30초 뒤에 다시 시도/)).not.toBeNull();
  });
});

describe("권리 요청 처리 상태", () => {
  function open(justReceived = false) {
    renderOffice(<PrivacyRequestDetailScreen requestId={31} justReceived={justReceived} />, {
      role: "AGENT",
    });
  }

  it("접수 직후 상태, 기한, 본인 확인, 처리 주체를 보여준다", async () => {
    seed({});
    open(true);
    expect(await screen.findByText(/요청을 접수했습니다. 처리 상태와 기한은/)).not.toBeNull();
    expect(screen.getByText("법정 처리 기한")).not.toBeNull();
    expect(screen.getByText("내부 목표 기한")).not.toBeNull();
    expect(screen.getByText("본인 확인 중")).not.toBeNull();
    expect(screen.getByText("사이로가 직접 처리합니다.")).not.toBeNull();
  });

  it("사무소 전달 건은 처리 사무소 이름을 보여준다", async () => {
    seed({ status: "FORWARDED", handlerType: "OFFICE", responsibleOfficeName: "해든중개" });
    open();
    expect(
      await screen.findByText("해든중개이 처리하며 사이로가 사무소의 지시에 따라 지원합니다."),
    ).not.toBeNull();
    expect(screen.getByText("사무소 전달", { selector: "span" })).not.toBeNull();
  });

  it("거절된 요청은 사유와 이의 제기 연락처를 보여준다", async () => {
    seed({ status: "REJECTED", decisionReason: "법령상 보존 의무", identityStatus: "VERIFIED" });
    open();
    expect(
      await screen.findByText(/요청하신 열람은 법령상 보존 의무로 처리할 수 없습니다/),
    ).not.toBeNull();
    expect(screen.getByText(/이의를 제기하실 수 있습니다/)).not.toBeNull();
    expect(screen.getByText("본인 확인됨")).not.toBeNull();
  });

  it("보완 대기는 보완 중에도 기한이 멈추지 않는다고 안내한다", async () => {
    seed({ status: "WAITING_FOR_INFO", decisionReason: "가입 이메일" });
    open();
    expect(
      await screen.findByText(/본인 확인을 위해 가입 이메일을 추가로 확인해 주세요/),
    ).not.toBeNull();
    expect(screen.getByText(/처리 기한은 멈추지 않습니다/)).not.toBeNull();
  });

  it("보완 항목이 없으면 일반 안내를 보여준다", async () => {
    seed({ status: "WAITING_FOR_INFO" });
    open();
    expect(await screen.findByText(/보완이 필요하면 안내해 드립니다/)).not.toBeNull();
  });

  it("일부 제한된 요청은 제한 사유를 보여준다", async () => {
    seed({ status: "PARTIALLY_RESTRICTED", decisionReason: "계약서 보존" });
    open();
    expect(
      await screen.findByText(/일부 제한된 요청입니다. 결정 사유: 계약서 보존/),
    ).not.toBeNull();
  });

  it("완료된 요청은 완료 시각을 보여준다", async () => {
    seed({ status: "COMPLETED", completedAt: "2026-11-12T09:00:00+09:00" });
    open();
    const section = await screen.findByText("완료 시각");
    expect(section.nextElementSibling?.textContent).toBe("2026-11-12 09:00");
  });

  it("남의 요청이나 없는 요청은 찾을 수 없음을 보여준다", async () => {
    supportInquiryState.privacyRequests = [];
    open();
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("조회가 실패하면 오류를 보여준다", async () => {
    server.use(http.get("/api/privacy-requests/:id", () => mockErrors.server()));
    open();
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    expect(within(document.body).getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });
});
