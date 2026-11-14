// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockPropertyState } from "@/mocks/handlers/property";
import {
  buildMockApproval,
  getMockVisitState,
  resetMockVisitState,
  setMockVisitState,
} from "@/mocks/handlers/visit";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { AccessApprovalScreen } from "./access-approval-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/properties/501/access-approvals",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockVisitState();
  resetMockPropertyState();
});

afterAll(() => stopServer());

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "+ 출입승인 등록" }));
  return screen.findByRole("dialog");
}

describe("출입승인 화면", () => {
  it("로딩 뒤 출입승인 이력과 활성 링크 없음 상태를 보여준다", async () => {
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    expect(screen.getByText("매물 정보를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("박점유")).not.toBeNull();
    expect(screen.getByText("대표 승인자")).not.toBeNull();
    expect(await screen.findByText("활성 링크가 없습니다.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "승인자 조건" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "신청 허용" })).not.toBeNull();
  });

  it("없는 매물은 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<AccessApprovalScreen propertyId={999} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("출입승인이 없으면 빈 안내를 보여준다", async () => {
    setMockVisitState({ approvals: [] });
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("등록된 출입승인이 없습니다.")).not.toBeNull();
  });

  it("이력 조회가 거절되면 접근 권한 화면을 보여준다", async () => {
    server.use(http.get("/api/properties/501/access-approvals", () => mockErrors.forbidden()));
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("승인자 링크를 발급하면 원문을 한 번만 보여주고 상태가 바뀐다", async () => {
    const user = userEvent.setup();
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "링크 발급" }));
    const dialog = await screen.findByRole("dialog");
    expect((within(dialog).getByLabelText("발급된 링크") as HTMLInputElement).value).toContain(
      "https://sairo.example.com/approver/",
    );
    expect(within(dialog).getByText(/출입승인당 하나/)).not.toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(await screen.findByRole("button", { name: "링크 재발급" })).not.toBeNull();
    expect(screen.getByText(/마지막 접속 없음/)).not.toBeNull();
  });

  it("연락처가 없는 출입승인도 링크를 발급할 수 있다", async () => {
    setMockVisitState({
      approvals: [buildMockApproval({ approvalId: 7002, propertyId: 501, approverPhone: null })],
    });
    const user = userEvent.setup();
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    const issue = await screen.findByRole("button", { name: "링크 발급" });
    expect(issue.getAttribute("aria-disabled")).not.toBe("true");
    await user.click(issue);
    expect(await screen.findByRole("dialog")).not.toBeNull();
  });

  it("공동 승인자 출입승인은 읽기 전용 링크라고 안내하고 신청 허용 진입점이 없다", async () => {
    setMockVisitState({
      approvals: [
        buildMockApproval({ approvalId: 7003, propertyId: 501, approvalRole: "CO_APPROVER" }),
      ],
    });
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("공동 승인자 링크는 읽기 전용입니다.")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "신청 허용" })).toBeNull();
  });

  it("링크 발급이 서버에서 거절되면 오류를 보여준다", async () => {
    server.use(
      http.post("/api/properties/501/access-approvals/7001/approver-property-link", () =>
        errorResponse(409, "INVALID_TRANSITION", "상태"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "링크 발급" }));
    expect(await screen.findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
  });

  it("활성 링크를 폐기한다", async () => {
    setMockVisitState({
      approverLinks: {
        7001: {
          linkId: 1,
          issuedAt: "2026-11-10T09:00:00+09:00",
          expiresAt: "2026-11-17T09:00:00+09:00",
          lastAccessedAt: null,
        },
      },
    });
    const user = userEvent.setup();
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "링크 폐기" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "폐기" }),
    );
    await waitFor(() => expect(getMockVisitState().approverLinks[7001]).toBeUndefined());
    expect(await screen.findByText("활성 링크가 없습니다.")).not.toBeNull();
  });

  it("철회된 출입승인은 철회 정보만 보여주고 링크 버튼이 없다", async () => {
    setMockVisitState({
      approvals: [
        buildMockApproval({
          approvalId: 7004,
          propertyId: 501,
          revokedAt: "2026-11-09T10:00:00+09:00",
          revocationReason: "점유자 변경",
        }),
      ],
    });
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("철회됨")).not.toBeNull();
    expect(screen.getByText(/점유자 변경/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "링크 발급" })).toBeNull();
  });

  it("중개보조원에게는 링크 발급 영역이 없고 안내만 보인다", async () => {
    setMockVisitState({ callerRole: "DEPUTY" });
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "DEPUTY" });
    expect(await screen.findByText(/승인자 링크는 승인된 대표와 소속공인중개사만/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "링크 발급" })).toBeNull();
  });

  it("출입승인 등록은 이름과 연락처를 검사한다", async () => {
    const user = userEvent.setup();
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    const dialog = await openForm(user);
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(await within(dialog).findByText("승인자 이름을 입력해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("승인자 본인 입력은 연락처가 필요합니다.")).not.toBeNull();
  });

  it("공동 승인자로 출입승인을 등록한다", async () => {
    const user = userEvent.setup();
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    const dialog = await openForm(user);
    await user.type(within(dialog).getByLabelText("승인자 이름"), "정관리");
    await user.type(within(dialog).getByLabelText("승인자 연락처"), "01011112222");
    await user.click(within(dialog).getByLabelText("공동 승인자"));
    fireEvent.change(within(dialog).getByLabelText("승인 종료일"), {
      target: { value: "2099-12-31" },
    });
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    await waitFor(() => expect(getMockVisitState().approvals).toHaveLength(2));
    expect(getMockVisitState().approvals[0]?.approvalRole).toBe("CO_APPROVER");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("같은 기간 대표 승인자가 이미 있으면 서버 오류를 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    const dialog = await openForm(user);
    await user.type(within(dialog).getByLabelText("승인자 이름"), "정대표");
    await user.type(within(dialog).getByLabelText("승인자 연락처"), "01033334444");
    fireEvent.change(within(dialog).getByLabelText("승인 시작일"), {
      target: { value: "2026-11-05" },
    });
    fireEvent.change(within(dialog).getByLabelText("승인 종료일"), {
      target: { value: "2099-12-31" },
    });
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(await within(dialog).findByText(/대표 승인자 출입승인이 이미 있습니다/)).not.toBeNull();
  });

  it("대리 입력은 실제 확인 시각을 요구한다", async () => {
    const user = userEvent.setup();
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "AGENT" });
    const dialog = await openForm(user);
    await user.click(within(dialog).getByLabelText("중개사 대리 입력"));
    expect(within(dialog).getByLabelText("확인한 날짜")).not.toBeNull();
    fireEvent.change(within(dialog).getByLabelText("확인한 날짜"), {
      target: { value: "2099-01-01" },
    });
    await user.type(within(dialog).getByLabelText("승인자 이름"), "정대리");
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(await within(dialog).findByText("확인 시각은 현재 이후일 수 없습니다.")).not.toBeNull();
  });

  it("읽기 전용 상태에서는 등록 버튼이 막힌다", async () => {
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER", isReadOnly: true });
    expect(
      (await screen.findByRole("button", { name: "+ 출입승인 등록" })).getAttribute(
        "aria-disabled",
      ),
    ).toBe("true");
  });

  it("요청이 많으면 잠시 후 다시 시도하라는 화면을 보여준다", async () => {
    server.use(http.get("/api/properties/501/access-approvals", () => mockErrors.rateLimited(10)));
    renderOffice(<AccessApprovalScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });
});
