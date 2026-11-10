// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MembershipStatusResponse } from "@/lib/api/contracts/office.schema";
import { mockErrors, errorResponse } from "@/mocks/error-responses";
import { resetMockOfficeState, setMockOfficeState } from "@/mocks/handlers/office";
import { server, startMockServer } from "@/mocks/server";
import {
  MembershipRequestForm,
  MembershipStatusScreen,
  OfficeSearchScreen,
} from "./membership-screens";
import { renderOffice } from "@/shared/testing/office-render";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/office/join",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOfficeState();
  navigation.push.mockClear();
  navigation.replace.mockClear();
});

afterAll(() => stopServer());

function membership(partial: Partial<MembershipStatusResponse> = {}): MembershipStatusResponse {
  return {
    membershipId: 41,
    officeId: 5,
    officeName: "땡땡사무소",
    role: "AGENT",
    status: "PENDING",
    requestSource: "REQUEST",
    expiresAt: "2099-12-10T09:00:00+09:00",
    invitationAcceptedAt: null,
    rejectionReason: null,
    resolved: null,
    createdAt: "2026-11-10T09:00:00+09:00",
    updatedAt: "2026-11-10T09:00:00+09:00",
    version: 1,
    ...partial,
  };
}

describe("사무소 검색", () => {
  it("사업자등록번호가 10자리가 아니면 검증 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />);
    await user.type(screen.getByLabelText("사업자등록번호"), "123");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(screen.getByText("사업자등록번호 10자리를 입력해 주세요.")).not.toBeNull();
  });

  it("사업자등록번호로 찾으면 카드에 번호 없이 사무소를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />);
    await user.type(screen.getByLabelText("사업자등록번호"), "1234567890");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByText("땡땡사무소")).not.toBeNull();
    expect(screen.queryByText(/123-45-67890/)).toBeNull();
    expect(screen.getByRole("button", { name: "땡땡사무소 참여 신청" })).not.toBeNull();
  });

  it("사무소명과 지역으로도 찾는다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />);
    await user.click(screen.getByRole("radio", { name: "사무소명과 지역" }));
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(screen.getByText("사무소명을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("지역(시·군·구)을 입력해 주세요.")).not.toBeNull();
    await user.type(screen.getByLabelText("사무소명"), "땡땡");
    await user.type(screen.getByLabelText("지역 (시·군·구)"), "성북구");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByText("땡땡사무소")).not.toBeNull();
  });

  it("결과가 없으면 빈 결과 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />);
    await user.type(screen.getByLabelText("사업자등록번호"), "9999999999");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByText("검색 결과가 없습니다.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "새 사무소 생성하기" })).not.toBeNull();
  });

  it("검색이 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/offices/search", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />);
    await user.type(screen.getByLabelText("사업자등록번호"), "1234567890");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect((await screen.findByRole("alert")).textContent).toContain("일시적인 오류");
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("요청이 너무 많으면 대기 안내를 보여준다", async () => {
    server.use(http.get("/api/offices/search", () => mockErrors.rateLimited(45)));
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />);
    await user.type(screen.getByLabelText("사업자등록번호"), "1234567890");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect((await screen.findByRole("alert")).textContent).toContain("45초 뒤에 다시 시도");
  });

  it("서버가 검색 조건을 거부하면 조건 확인을 안내한다", async () => {
    server.use(
      http.get("/api/offices/search", () =>
        mockErrors.validation([{ field: "name", code: "REQUIRED", message: "조건 오류" }]),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />);
    await user.type(screen.getByLabelText("사업자등록번호"), "1234567890");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect((await screen.findByRole("alert")).textContent).toContain("검색 조건을 확인해 주세요.");
  });

  it("참여 신청을 누르면 선택한 사무소로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />);
    await user.type(screen.getByLabelText("사업자등록번호"), "1234567890");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.click(await screen.findByRole("button", { name: "땡땡사무소 참여 신청" }));
    expect(navigation.push).toHaveBeenCalledWith("/office/join/5");
  });

  it("이미 진행 중인 요청이 있으면 참여 신청을 막는다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeSearchScreen />, { context: { pendingMembershipId: 4 } });
    expect(screen.getByText(/새로 참여를 신청할 수 없습니다/)).not.toBeNull();
    await user.type(screen.getByLabelText("사업자등록번호"), "1234567890");
    await user.click(screen.getByRole("button", { name: "검색" }));
    const button = await screen.findByRole("button", { name: "땡땡사무소 참여 신청" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });
});

describe("참여 요청", () => {
  it("사무소 이름과 두 역할을 보여준다", async () => {
    window.sessionStorage.setItem(
      "sairo.office.join-target",
      JSON.stringify({ officeId: 5, name: "땡땡사무소", address: "서울특별시 성북구 정릉로 77" }),
    );
    renderOffice(<MembershipRequestForm officeId={5} />);
    expect(screen.getByText("땡땡사무소에 참여를 요청하시겠습니까?")).not.toBeNull();
    expect(screen.getByRole("radio", { name: "소속 공인중개사" })).not.toBeNull();
    expect(screen.getByRole("radio", { name: "중개 보조원" })).not.toBeNull();
  });

  it("소속공인중개사는 자격번호와 확인 항목을 모두 요구한다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembershipRequestForm officeId={5} />);
    await user.click(screen.getByRole("button", { name: "참여 요청" }));
    expect(screen.getByText("자격증 번호를 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("고용신고 확인에 체크해 주세요.")).not.toBeNull();
    expect(screen.getByText("필요 교육 이수 확인에 체크해 주세요.")).not.toBeNull();
  });

  it("중개보조원은 자격번호를 받지 않고 직무교육 확인을 요구한다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembershipRequestForm officeId={5} />);
    await user.click(screen.getByRole("radio", { name: "중개 보조원" }));
    expect(screen.queryByLabelText("자격증 번호")).toBeNull();
    await user.click(screen.getByRole("button", { name: "참여 요청" }));
    expect(screen.getByText("직무교육 이수 확인에 체크해 주세요.")).not.toBeNull();
  });

  it("입력을 마치면 요청을 보내고 승인 대기 화면으로 이동한다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/offices/:officeId/memberships", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return errorResponse(409, "PENDING_MEMBERSHIP_EXISTS", "이미 있음");
      }),
    );
    const user = userEvent.setup();
    renderOffice(<MembershipRequestForm officeId={5} />);
    await user.type(screen.getByLabelText("자격증 번호"), "A-1234");
    await user.click(screen.getByLabelText("고용신고를 확인했습니다"));
    await user.click(screen.getByLabelText("필요한 교육을 이수했습니다"));
    await user.click(screen.getByRole("button", { name: "참여 요청" }));
    expect((await screen.findByRole("alert")).textContent).toContain("진행 중인 참여 요청");
    expect(sent).toEqual({
      role: "AGENT",
      qualificationNumber: "A-1234",
      employmentReportConfirmed: true,
      trainingConfirmed: true,
    });
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "참여 요청" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/office/membership"));
  });

  it("인증되지 않은 사무소는 찾을 수 없다고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembershipRequestForm officeId={99} />);
    await user.click(screen.getByRole("radio", { name: "중개 보조원" }));
    await user.click(screen.getByLabelText("고용신고를 확인했습니다"));
    await user.click(screen.getByLabelText("직무교육을 이수했습니다"));
    await user.click(screen.getByRole("button", { name: "참여 요청" }));
    expect((await screen.findByRole("alert")).textContent).toContain("대상을 찾을 수 없습니다");
  });

  it("서버 필드 오류를 자격번호 아래에 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<MembershipRequestForm officeId={5} />);
    await user.type(screen.getByLabelText("자격증 번호"), "형식오류");
    await user.click(screen.getByLabelText("고용신고를 확인했습니다"));
    await user.click(screen.getByLabelText("필요한 교육을 이수했습니다"));
    await user.click(screen.getByRole("button", { name: "참여 요청" }));
    expect(await screen.findByText("자격증 번호 형식이 올바르지 않습니다.")).not.toBeNull();
  });
});

describe("승인 대기와 초대 수락", () => {
  it("불러오는 동안 로딩을 보여주고 요청이 없으면 안내한다", async () => {
    renderOffice(<MembershipStatusScreen />);
    expect(screen.getByText("참여 요청 상태를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("진행 중인 참여 요청이나 초대가 없습니다.")).not.toBeNull();
  });

  it("조회가 실패하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/memberships/me", () => mockErrors.server()));
    renderOffice(<MembershipStatusScreen />);
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("참여 요청 대기는 30일 기한과 남은 시간을 보여준다", async () => {
    setMockOfficeState({ myMembership: membership() });
    renderOffice(<MembershipStatusScreen />);
    expect(await screen.findByText("대표의 승인을 기다리고 있습니다.")).not.toBeNull();
    expect(screen.getByText(/참여 요청은 요청 후 30일까지 유효합니다/)).not.toBeNull();
    expect(screen.getByText(/승인 기한: \d+일/)).not.toBeNull();
  });

  it("요청을 철회하면 확인 뒤 철회 상태를 보여준다", async () => {
    setMockOfficeState({ myMembership: membership() });
    const user = userEvent.setup();
    renderOffice(<MembershipStatusScreen />);
    await user.click(await screen.findByRole("button", { name: "요청 철회" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "철회" }));
    expect(
      await screen.findByText("참여 요청을 철회했습니다.", { selector: "p[role=status]" }),
    ).not.toBeNull();
  });

  it("철회가 실패하면 오류를 보여준다", async () => {
    setMockOfficeState({ myMembership: membership() });
    server.use(http.post("/api/memberships/:id/cancel", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<MembershipStatusScreen />);
    await user.click(await screen.findByRole("button", { name: "요청 철회" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "철회" }));
    expect((await screen.findByRole("alert")).textContent).toContain("일시적인 오류");
  });

  it("기한이 지난 요청은 만료 안내와 새로 시작 버튼을 보여준다", async () => {
    setMockOfficeState({
      myMembership: membership({ expiresAt: "2020-01-01T00:00:00+09:00" }),
    });
    const user = userEvent.setup();
    renderOffice(<MembershipStatusScreen />);
    expect(await screen.findByText("참여 요청 기한이 지났습니다.")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "새로 시작" }));
    expect(navigation.push).toHaveBeenCalledWith("/office/start");
  });

  it("거절되면 사유를 보여주고 재신청을 시작한다", async () => {
    setMockOfficeState({
      myMembership: membership({
        status: "REJECTED",
        rejectionReason: "자격 확인 불가",
        resolved: false,
      }),
    });
    const user = userEvent.setup();
    renderOffice(<MembershipStatusScreen />);
    expect(await screen.findByText("거절 사유: 자격 확인 불가")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "재신청 시작" }));
    expect(await screen.findByText("대표의 승인을 기다리고 있습니다.")).not.toBeNull();
  });

  it("초대는 7일 기한과 수락 입력을 보여주고 수락하면 승인 대기로 바뀐다", async () => {
    setMockOfficeState({ myMembership: membership({ requestSource: "INVITE" }) });
    const user = userEvent.setup();
    renderOffice(<MembershipStatusScreen />);
    expect(await screen.findByText(/초대는 발급 또는 재발송 후 7일 안에만 수락/)).not.toBeNull();
    const form = screen.getByRole("form", { name: "초대 수락" });
    await user.click(within(form).getByRole("button", { name: "초대 수락" }));
    expect(within(form).getByText("자격증 번호를 입력해 주세요.")).not.toBeNull();
    await user.type(within(form).getByLabelText("자격증 번호"), "A-1");
    await user.click(within(form).getByLabelText("고용신고를 확인했습니다"));
    await user.click(within(form).getByLabelText("필요한 교육을 이수했습니다"));
    await user.click(within(form).getByRole("button", { name: "초대 수락" }));
    expect(
      await screen.findByText(
        "초대를 수락했습니다. 대표가 승인하면 업무 화면을 사용할 수 있습니다.",
      ),
    ).not.toBeNull();
    expect(screen.queryByRole("form", { name: "초대 수락" })).toBeNull();
  });

  it("기한이 지난 초대를 서버가 거부하면 상태 변경 안내를 보여준다", async () => {
    setMockOfficeState({ myMembership: membership({ requestSource: "INVITE", role: "DEPUTY" }) });
    server.use(
      http.post("/api/memberships/:id/accept-invitation", () =>
        errorResponse(409, "INVALID_TRANSITION", "만료"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<MembershipStatusScreen />);
    const form = await screen.findByRole("form", { name: "초대 수락" });
    expect(within(form).queryByLabelText("자격증 번호")).toBeNull();
    await user.click(within(form).getByLabelText("고용신고를 확인했습니다"));
    await user.click(within(form).getByLabelText("직무교육을 이수했습니다"));
    await user.click(within(form).getByRole("button", { name: "초대 수락" }));
    expect((await screen.findByRole("alert")).textContent).toContain("이미 처리되었거나");
  });

  it("승인된 소속은 업무 시작 버튼을 보여준다", async () => {
    setMockOfficeState({ myMembership: membership({ status: "APPROVED", expiresAt: null }) });
    const user = userEvent.setup();
    renderOffice(<MembershipStatusScreen />);
    await user.click(await screen.findByRole("button", { name: "업무 시작" }));
    expect(navigation.push).toHaveBeenCalledWith("/");
  });
});
