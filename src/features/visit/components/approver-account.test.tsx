// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  MOCK_PRIMARY_TOKEN,
  getMockApproverState,
  resetMockApproverState,
  setMockApproverState,
} from "@/mocks/handlers/visit-approver";
import type { MockPortalApproval } from "@/mocks/handlers/visit-approver";
import {
  getMockVisitReviewState,
  resetMockVisitReviewState,
  setMockVisitReviewState,
} from "@/mocks/handlers/visit-review";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { ApproverAccountScreen } from "./approver-account-screen";
import { ApproverBulkScreen } from "./approver-bulk-screen";
import { ApproverLoginScreen } from "./approver-login-screen";
import { ApproverPortalApprovalScreen } from "./approver-link-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/approver/account",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockApproverState();
  resetMockVisitReviewState();
  navigation.push.mockClear();
});

afterAll(() => stopServer());

function renderPage(ui: ReactNode) {
  return render(<QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>);
}

function portalApproval(partial: Partial<MockPortalApproval> & { approvalId: number }) {
  return {
    linkState: "LINKED",
    propertyDisplayName: `매물 ${partial.approvalId}`,
    propertyAddress: "서울특별시 성북구 정릉로 77",
    propertyRegion: "성북구 정릉동",
    approverType: "OWNER",
    approvalRole: "PRIMARY",
    ownerOfficeName: "사이로공인중개사",
    officeContactPhone: "02-1234-5678",
    approvalValidFrom: "2026-10-01T00:00:00+09:00",
    approvalValidUntil: "2026-12-31T23:59:59+09:00",
    approvalActive: true,
    activeConditionVersionNo: 2,
    conditionAppliesUntil: "2026-12-31T23:59:59+09:00",
    pendingRequestCount: 0,
    upcomingConfirmedVisitCount: 0,
    nextConfirmedVisitAt: null,
    ...partial,
  } as MockPortalApproval;
}

function login(approvals: MockPortalApproval[] = []) {
  setMockApproverState({ portalSession: true, portalApprovals: approvals });
}

describe("승인자 번호 인증", () => {
  async function sendCode(user: ReturnType<typeof userEvent.setup>, phone = "010-1234-5678") {
    await user.type(screen.getByLabelText("휴대폰 번호"), phone);
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    return screen.findByLabelText("인증번호 6자리");
  }

  it("번호를 보내면 남은 시간과 재발송 대기와 남은 입력 횟수를 보여준다", async () => {
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen />);
    expect(screen.getByText(/번호의 해시와/)).not.toBeNull();
    await sendCode(user);
    expect(screen.getByText("5:00")).not.toBeNull();
    expect(screen.getByText(/60초 뒤 재발송/)).not.toBeNull();
    expect(screen.getByText("남은 입력 횟수 5회")).not.toBeNull();
  });

  it("올바른 인증번호로 로그인하면 모아보기로 이동한다", async () => {
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen />);
    await user.type(await sendCode(user), "123456");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/approver/account"));
    expect(getMockApproverState().portalSession).toBe(true);
  });

  it("틀린 인증번호는 남은 입력 횟수를 줄이고 안내한다", async () => {
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen />);
    await user.type(await sendCode(user), "000000");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByText("인증번호가 맞지 않습니다. 다시 확인해 주세요.")).not.toBeNull();
    expect(screen.getByText("남은 입력 횟수 4회")).not.toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("6자리가 아니면 서버에 묻지 않고 안내한다", async () => {
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen />);
    await user.type(await sendCode(user), "12");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByText("인증번호 6자리를 입력해 주세요.")).not.toBeNull();
  });

  it("휴대폰 번호 형식이 틀리면 인증번호를 보내지 않는다", async () => {
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen />);
    await user.type(screen.getByLabelText("휴대폰 번호"), "123");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    expect(await screen.findByText("휴대폰 번호를 숫자로 정확히 입력해 주세요.")).not.toBeNull();
  });

  it("문자 수단이 없으면 준비 중 안내로 바꾸고 번호 입력을 막는다", async () => {
    setMockVisitReviewState({ smsUnavailable: true });
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen />);
    await user.type(screen.getByLabelText("휴대폰 번호"), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    expect(
      await screen.findByText(/문자 인증을 준비 중이라 아직 이용할 수 없습니다/),
    ).not.toBeNull();
    expect(screen.queryByLabelText("휴대폰 번호")).toBeNull();
  });

  it("만료된 인증번호는 다시 받으라고 안내한다", async () => {
    setMockVisitReviewState({ otpExpired: true });
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen />);
    await user.type(await sendCode(user), "123456");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByText(/인증번호 유효 시간이 지났습니다/)).not.toBeNull();
  });

  it("발송이 429이면 대기 안내를 보여준다", async () => {
    server.use(http.post("/api/public/approver-auth/otp", () => mockErrors.rateLimited(45)));
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen />);
    await user.type(screen.getByLabelText("휴대폰 번호"), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    expect(await screen.findByText(/약 45초 뒤에 시도해 주세요/)).not.toBeNull();
  });

  it("링크에서 들어오면 계정 만들기이며 링크의 번호와 맞지 않으면 일반 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen token={MOCK_PRIMARY_TOKEN} />);
    expect(screen.getByText("번호 인증으로 계정 만들기")).not.toBeNull();
    await user.type(screen.getByLabelText("휴대폰 번호"), "01099998888");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    expect(await screen.findByText(/인증을 진행할 수 없는 번호입니다/)).not.toBeNull();
  });

  it("링크에서 계정을 만들 때 개인정보 안내 버전을 담아 인증한다", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post("/api/public/approver-auth/verify", async ({ request }) => {
        bodies.push((await request.clone().json()) as Record<string, unknown>);
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderPage(<ApproverLoginScreen token={MOCK_PRIMARY_TOKEN} />);
    await user.type(screen.getByLabelText("휴대폰 번호"), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText("인증번호 6자리"), "123456");
    await waitFor(() => expect(screen.getByText("개인정보 수집 안내")).not.toBeNull());
    await user.click(screen.getByRole("button", { name: "인증하고 계정 만들기" }));
    await waitFor(() => expect(bodies.length).toBe(1));
    expect(bodies[0]?.purpose).toBe("CLAIM");
    expect(bodies[0]?.acknowledgedNoticeVersion).toBe(getMockApproverState().noticeVersion);
  });
});

describe("승인자 내 매물 모아보기", () => {
  it("세션이 없으면 로그인으로 돌아가는 안내를 보여준다", async () => {
    renderPage(<ApproverAccountScreen />);
    expect(await screen.findByText("로그인이 만료되었습니다")).not.toBeNull();
    expect(screen.getByRole("link", { name: "로그인으로 이동" })).not.toBeNull();
  });

  it("연결된 매물이 없으면 빈 안내를 보여준다", async () => {
    login();
    renderPage(<ApproverAccountScreen />);
    expect(await screen.findByText("연결된 매물이 없습니다")).not.toBeNull();
  });

  it("연결 제안과 매물 카드와 개인정보 안내를 보여준다", async () => {
    login([
      portalApproval({ approvalId: 1, pendingRequestCount: 2, upcomingConfirmedVisitCount: 1 }),
      portalApproval({ approvalId: 2, approvalRole: "CO_APPROVER" }),
      portalApproval({ approvalId: 3, approvalActive: false }),
      portalApproval({ approvalId: 4, linkState: "PENDING_CONFIRM", ownerOfficeName: "새사무소" }),
    ]);
    renderPage(<ApproverAccountScreen />);
    expect(await screen.findByText("연결된 매물 3개")).not.toBeNull();
    expect(screen.getByText("신청 대기 2건")).not.toBeNull();
    expect(screen.getByText("공동 승인자")).not.toBeNull();
    expect(screen.getByText("종료된 출입승인")).not.toBeNull();
    expect(screen.getByText("연결 제안")).not.toBeNull();
    expect(screen.getByText(/새사무소 · 성북구 정릉동/)).not.toBeNull();
    expect(screen.getByText("개인정보 수집 안내")).not.toBeNull();
    expect(screen.queryByLabelText("매물 2 일괄 적용 선택")).toBeNull();
  });

  it("연결 제안을 수락하면 매물 카드로 옮겨지고 거절하면 사라진다", async () => {
    login([
      portalApproval({ approvalId: 4, linkState: "PENDING_CONFIRM", ownerOfficeName: "새사무소" }),
      portalApproval({
        approvalId: 5,
        linkState: "PENDING_CONFIRM",
        ownerOfficeName: "다른사무소",
      }),
    ]);
    const user = userEvent.setup();
    renderPage(<ApproverAccountScreen />);
    await user.click(await screen.findByRole("button", { name: "새사무소 연결 수락" }));
    expect(await screen.findByText("연결된 매물 1개")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "다른사무소 연결 거절" }));
    await waitFor(() => expect(screen.queryByText("연결 제안")).toBeNull());
  });

  it("이미 처리된 연결 제안은 오류 문구를 보여준다", async () => {
    login([portalApproval({ approvalId: 4, linkState: "PENDING_CONFIRM" })]);
    server.use(
      http.post("/api/approver-portal/approvals/:id/link-decision", () =>
        errorResponse(409, "APPROVER_APPROVAL_ALREADY_LINKED", "중복"),
      ),
    );
    const user = userEvent.setup();
    renderPage(<ApproverAccountScreen />);
    await user.click(await screen.findByRole("button", { name: /연결 수락/ }));
    expect(await screen.findByText("이미 다른 계정에 연결된 출입승인입니다.")).not.toBeNull();
  });

  it("연결을 해제하면 목록에서 빠진다", async () => {
    login([portalApproval({ approvalId: 1 })]);
    const user = userEvent.setup();
    renderPage(<ApproverAccountScreen />);
    await user.click(await screen.findByRole("button", { name: "매물 1 연결 해제" }));
    expect(screen.getByText(/해제한 출입승인은 다시 제안되지 않습니다/)).not.toBeNull();
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "연결 해제" }));
    expect(await screen.findByText("연결된 매물이 없습니다")).not.toBeNull();
  });

  it("카드를 골라 일괄 적용으로 이동하는 링크가 생긴다", async () => {
    login([portalApproval({ approvalId: 1 }), portalApproval({ approvalId: 6 })]);
    const user = userEvent.setup();
    renderPage(<ApproverAccountScreen />);
    await user.click(await screen.findByLabelText("매물 1 일괄 적용 선택"));
    await user.click(screen.getByLabelText("매물 6 일괄 적용 선택"));
    const link = screen.getByRole("link", { name: /2개에 조건 일괄 적용/ });
    expect(link.getAttribute("href")).toBe("/approver/account/bulk?ids=1,6");
  });

  it("로그아웃하면 로그인 화면으로 이동한다", async () => {
    login([portalApproval({ approvalId: 1 })]);
    const user = userEvent.setup();
    renderPage(<ApproverAccountScreen />);
    await user.click(await screen.findByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/approver/account/login"));
    expect(getMockApproverState().portalSession).toBe(false);
  });

  it("서버 오류는 다시 시도할 수 있다", async () => {
    login();
    server.use(http.get("/api/approver-portal/approvals", () => mockErrors.server()));
    renderPage(<ApproverAccountScreen />);
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("해지는 확인 체크 뒤에만 되고 재인증을 거친 뒤 완료된다", async () => {
    login([portalApproval({ approvalId: 1 })]);
    const user = userEvent.setup();
    renderPage(<ApproverAccountScreen />);
    await screen.findByText("연결된 매물 1개");
    const close = screen.getByRole("button", { name: "계정 해지" });
    expect(close.getAttribute("aria-disabled")).toBe("true");
    await user.click(screen.getByLabelText("위 내용을 확인했고 계정을 해지합니다"));
    await user.click(close);
    expect(await screen.findByText(/10분 안에 번호 인증으로 다시 확인/)).not.toBeNull();
    await user.type(screen.getByLabelText("휴대폰 번호"), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText("인증번호 6자리"), "123456");
    await user.click(screen.getByRole("button", { name: "다시 인증하고 해지" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/approver/account/login"));
    expect(getMockApproverState().portalApprovals).toEqual([]);
  });
});

describe("승인자 계정 화면의 매물 업무", () => {
  it("세션 경로로 조건과 신청과 평가와 선호 화면을 같은 구성으로 연다", async () => {
    login([portalApproval({ approvalId: 7001 })]);
    const user = userEvent.setup();
    renderPage(<ApproverPortalApprovalScreen approvalId={7001} />);
    expect(await screen.findByDisplayValue("30")).not.toBeNull();
    expect(screen.getByRole("link", { name: "내 매물 모아보기로 돌아가기" })).not.toBeNull();
    await user.click(screen.getByRole("tab", { name: "방문 평가" }));
    expect(await screen.findByText("평가할 완료 방문이 없습니다")).not.toBeNull();
    await user.click(screen.getByRole("tab", { name: "선호 중개사" }));
    expect(await screen.findByText("지정할 수 있는 후보가 없습니다")).not.toBeNull();
  });

  it("세션이 만료되면 로그인으로 돌아가는 안내를 보여준다", async () => {
    renderPage(<ApproverPortalApprovalScreen approvalId={7001} />);
    expect(await screen.findByText("로그인이 만료되었습니다")).not.toBeNull();
  });

  it("연결되지 않은 출입승인은 찾을 수 없다고 안내한다", async () => {
    login([]);
    renderPage(<ApproverPortalApprovalScreen approvalId={9999} />);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });
});

describe("승인자 조건 일괄 적용", () => {
  function portal() {
    login([
      portalApproval({ approvalId: 1 }),
      portalApproval({ approvalId: 2 }),
      portalApproval({ approvalId: 3, approvalRole: "CO_APPROVER" }),
      portalApproval({ approvalId: 4, linkState: "PENDING_CONFIRM" }),
    ]);
  }

  it("대표 승인자로 연결된 출입승인만 대상으로 보여주고 하루 최대 횟수 기본값 3을 채운다", async () => {
    portal();
    renderPage(<ApproverBulkScreen initialIds={[1]} />);
    expect(await screen.findByText("대상 출입승인 1/20")).not.toBeNull();
    expect(screen.getByLabelText("매물 1")).not.toBeNull();
    expect(screen.getByLabelText("매물 2")).not.toBeNull();
    expect(screen.queryByLabelText("매물 3")).toBeNull();
    expect(screen.queryByLabelText("매물 4")).toBeNull();
    expect(screen.getByDisplayValue("3")).not.toBeNull();
  });

  it("선택 없이 미리보기를 누르면 안내한다", async () => {
    portal();
    const user = userEvent.setup();
    renderPage(<ApproverBulkScreen initialIds={[]} />);
    await user.click(await screen.findByRole("button", { name: "영향 미리보기" }));
    expect(await screen.findByText("적용할 출입승인을 선택해 주세요.")).not.toBeNull();
  });

  it("영향이 없으면 바로 적용되어 적용됨으로 표시한다", async () => {
    portal();
    const user = userEvent.setup();
    renderPage(<ApproverBulkScreen initialIds={[1, 2]} />);
    await user.click(await screen.findByRole("button", { name: "영향 미리보기" }));
    expect(await screen.findAllByText("영향 없음")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "선택한 출입승인에 적용" }));
    expect(await screen.findAllByText("적용됨")).toHaveLength(2);
  });

  it("영향이 있는 출입승인은 확인 체크 뒤에만 적용된다", async () => {
    portal();
    setMockVisitReviewState({ bulkImpactIds: [2] });
    const user = userEvent.setup();
    renderPage(<ApproverBulkScreen initialIds={[1, 2]} />);
    await user.click(await screen.findByRole("button", { name: "영향 미리보기" }));
    expect(await screen.findByText(/영향 받는 확정 방문 1건/)).not.toBeNull();
    const apply = screen.getByRole("button", { name: "선택한 출입승인에 적용" });
    expect(apply.getAttribute("aria-disabled")).toBe("true");
    await user.click(screen.getByLabelText("매물 2 영향을 확인했습니다"));
    await user.click(apply);
    expect(await screen.findAllByText("적용됨")).toHaveLength(2);
  });

  it("대상이 될 수 없는 출입승인은 실패로 구분해 보여준다", async () => {
    portal();
    const user = userEvent.setup();
    renderPage(<ApproverBulkScreen initialIds={[1, 3]} />);
    await user.click(await screen.findByRole("button", { name: "영향 미리보기" }));
    expect(
      await screen.findByText(/적용할 수 없음 · 대표 승인자 출입승인이 아닙니다/),
    ).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "선택한 출입승인에 적용" }));
    expect(await screen.findByText("실패")).not.toBeNull();
    expect(screen.getAllByText("적용됨")).toHaveLength(1);
  });

  it("서버가 영향 확인 필요로 돌려주면 확인 필요로 표시한다", async () => {
    portal();
    server.use(
      http.post("/api/approver-portal/condition-bulk", () =>
        Response.json({
          batchId: 1,
          requestedCount: 1,
          appliedCount: 0,
          needsImpactAckCount: 1,
          failedCount: 0,
          items: [
            {
              approvalId: 1,
              result: "NEEDS_IMPACT_ACK",
              conditionId: null,
              versionNo: null,
              failureCode: null,
              affectedItemCount: 1,
            },
          ],
        }),
      ),
    );
    const user = userEvent.setup();
    renderPage(<ApproverBulkScreen initialIds={[1]} />);
    await user.click(await screen.findByRole("button", { name: "영향 미리보기" }));
    await user.click(await screen.findByRole("button", { name: "선택한 출입승인에 적용" }));
    expect(await screen.findByText("영향 확인 필요")).not.toBeNull();
    expect(screen.getByText(/영향을 확인한 뒤 다시 적용해 주세요/)).not.toBeNull();
  });

  it("한 매물의 현재 조건을 불러와 폼에 채운다", async () => {
    login([portalApproval({ approvalId: 7001 })]);
    const user = userEvent.setup();
    renderPage(<ApproverBulkScreen initialIds={[]} />);
    await user.selectOptions(await screen.findByLabelText("한 매물의 현재 조건 불러오기"), "7001");
    await waitFor(() =>
      expect(
        screen.getAllByDisplayValue("30").length + screen.getAllByDisplayValue("10:00").length,
      ).toBeGreaterThan(0),
    );
  });

  it("서버가 상한 초과를 거절하면 안내한다", async () => {
    portal();
    server.use(
      http.post("/api/approver-portal/condition-bulk/preview", () =>
        errorResponse(422, "BULK_LIMIT_EXCEEDED", "상한"),
      ),
    );
    const user = userEvent.setup();
    renderPage(<ApproverBulkScreen initialIds={[1]} />);
    await user.click(await screen.findByRole("button", { name: "영향 미리보기" }));
    expect(
      await screen.findByText("한 번에 최대 20개 출입승인까지 적용할 수 있습니다."),
    ).not.toBeNull();
  });

  it("세션이 없으면 로그인 안내를 보여준다", async () => {
    renderPage(<ApproverBulkScreen initialIds={[]} />);
    expect(await screen.findByText("로그인이 만료되었습니다")).not.toBeNull();
  });

  it("선택은 20개까지만 담긴다", async () => {
    login(Array.from({ length: 22 }, (_, index) => portalApproval({ approvalId: index + 1 })));
    renderPage(
      <ApproverBulkScreen initialIds={Array.from({ length: 22 }, (_, index) => index + 1)} />,
    );
    expect(await screen.findByText("대상 출입승인 20/20")).not.toBeNull();
    expect(getMockVisitReviewState().bulkLimit).toBe(20);
  });
});
