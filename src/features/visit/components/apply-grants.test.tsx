// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOfficeState } from "@/mocks/handlers/office";
import { resetMockPropertyState } from "@/mocks/handlers/property";
import {
  buildMockApproval,
  getMockVisitState,
  resetMockVisitState,
  setMockVisitState,
} from "@/mocks/handlers/visit";
import {
  buildMockApplyGrant,
  buildMockOfficeRequest,
  getMockVisitRequestState,
  resetMockVisitRequestState,
  setMockVisitRequestState,
} from "@/mocks/handlers/visit-request";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ApplyGrantsScreen } from "./apply-grants-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/properties/501/access-approvals/7001/grants",
}));

function required<T>(item: T | undefined): T {
  if (item === undefined) throw new Error("대상을 찾지 못했습니다.");
  return item;
}

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockVisitState();
  resetMockVisitRequestState();
  resetMockPropertyState();
  resetMockOfficeState();
});

afterAll(() => stopServer());

function renderScreen(role: "OWNER" | "AGENT" | "DEPUTY" = "OWNER") {
  return renderOffice(<ApplyGrantsScreen propertyId={501} approvalId={7001} />, { role });
}

describe("신청 허용 관리", () => {
  it("허용 목록과 이 허용으로 들어온 신청 대기 건수를 보여준다", async () => {
    setMockVisitRequestState({
      grants: [
        buildMockApplyGrant({ grantId: 11, openRequestCount: 2 }),
        buildMockApplyGrant({
          grantId: 12,
          granteeOfficeName: "한강공인중개사",
          scope: "MEMBER",
          granteeMemberName: "최중개",
          state: "REVOKED",
          revokeReason: "계약 종료",
        }),
      ],
    });
    renderScreen();
    expect(screen.getByText("허용 목록을 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("정릉부동산")).not.toBeNull();
    expect(screen.getByText(/이 허용으로 들어온 신청 대기 2건/)).not.toBeNull();
    expect(screen.getByText("적용 중")).not.toBeNull();
    expect(screen.getAllByText("회수").length).toBeGreaterThan(0);
    expect(screen.getByText(/특정 중개사 · 최중개/)).not.toBeNull();
    expect(
      screen.getByText(/승인자 연락처, 조건 값, 링크 발급, 재허용, 매물 수정은 포함되지 않습니다/),
    ).not.toBeNull();
  });

  it("허용이 없으면 빈 안내를 보여준다", async () => {
    renderScreen();
    expect(await screen.findByText("허용한 사무소가 없습니다.")).not.toBeNull();
  });

  it("중개보조원에게는 화면을 보여주지 않는다", async () => {
    setMockVisitState({ callerRole: "DEPUTY" });
    renderScreen("DEPUTY");
    expect(await screen.findByText("이 화면은 중개보조원에게 제공되지 않습니다.")).not.toBeNull();
  });

  it("공동 승인자 출입승인에는 허용을 추가할 수 없다", async () => {
    setMockVisitState({
      approvals: [
        buildMockApproval({ approvalId: 7001, propertyId: 501, approvalRole: "CO_APPROVER" }),
      ],
    });
    renderScreen();
    expect(
      await screen.findByText("공동 승인자 출입승인에는 신청을 허용할 수 없습니다."),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "허용 추가" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("목록 조회가 거절되면 접근 권한 화면을 보여준다", async () => {
    server.use(
      http.get("/api/properties/501/access-approvals/7001/apply-grants", () =>
        mockErrors.forbidden(),
      ),
    );
    renderScreen();
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("사무소를 검색해 골라 허용을 추가한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "허용 추가" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "허용 추가" }));
    expect(await within(dialog).findByText("허용할 사무소를 검색해 선택해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText("사무소명"), "땡땡");
    await user.type(within(dialog).getByLabelText("지역"), "성북구");
    await user.click(within(dialog).getByRole("button", { name: "사무소 검색" }));
    const hits = await within(dialog).findAllByRole("button", { pressed: false });
    const hit = hits.find((item) => item.textContent?.includes("성북구"));
    expect(hit).toBeDefined();
    await user.click(required(hit));
    await user.click(within(dialog).getByRole("button", { name: "허용 추가" }));
    expect(await screen.findByText("신청 허용을 추가했습니다.")).not.toBeNull();
    expect(getMockVisitRequestState().grants).toHaveLength(1);
  });

  it("서버가 필드 오류를 돌려주면 해당 입력에 표시한다", async () => {
    server.use(
      http.post("/api/properties/501/access-approvals/7001/apply-grants", () =>
        mockErrors.validation([
          { field: "granteeMembershipId", message: "대상이 올바르지 않습니다." },
        ]),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "허용 추가" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("사무소명"), "땡땡");
    await user.type(within(dialog).getByLabelText("지역"), "성북구");
    await user.click(within(dialog).getByRole("button", { name: "사무소 검색" }));
    const hits = await within(dialog).findAllByRole("button", { pressed: false });
    await user.click(required(hits.find((item) => item.textContent?.includes("성북구"))));
    await user.type(within(dialog).getByLabelText(/특정 중개사 구성원 번호/), "7");
    await user.click(within(dialog).getByRole("button", { name: "허용 추가" }));
    expect(await within(dialog).findByText("대상이 올바르지 않습니다.")).not.toBeNull();
  });

  it("검색 조건이 없는 사무소 검색 실패를 안내한다", async () => {
    server.use(http.get("/api/offices/search", () => mockErrors.server()));
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "허용 추가" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("사무소명"), "땡땡");
    await user.type(within(dialog).getByLabelText("지역"), "성북구");
    await user.click(within(dialog).getByRole("button", { name: "사무소 검색" }));
    expect(
      await within(dialog).findByText(/사무소를 검색하지 못했습니다|일시적인 오류/),
    ).not.toBeNull();
  });

  it("같은 대상의 활성 허용이 있으면 중복 안내를 보여준다", async () => {
    server.use(
      http.post(
        "/api/properties/501/access-approvals/7001/apply-grants",
        () =>
          new Response(
            JSON.stringify({ code: "APPLY_GRANT_DUPLICATE_ACTIVE", message: "중복", traceId: "t" }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "허용 추가" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("사무소명"), "땡땡");
    await user.type(within(dialog).getByLabelText("지역"), "성북구");
    await user.click(within(dialog).getByRole("button", { name: "사무소 검색" }));
    const hits = await within(dialog).findAllByRole("button", { pressed: false });
    await user.click(required(hits.find((item) => item.textContent?.includes("성북구"))));
    await user.click(within(dialog).getByRole("button", { name: "허용 추가" }));
    expect(
      await within(dialog).findByText("같은 대상에게 적용 중인 허용이 이미 있습니다."),
    ).not.toBeNull();
  });

  it("회수는 사유가 필요하고 영향 건수를 안내하며 결과를 보여준다", async () => {
    setMockVisitRequestState({
      grants: [buildMockApplyGrant({ grantId: 11, openRequestCount: 1 })],
      requests: [buildMockOfficeRequest({ requestId: 9501, accessGrantId: 11, crossOffice: true })],
    });
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "정릉부동산 허용 회수" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/신청 대기 1건이 기간 만료로 종결되고, 확정된 방문은 유지됩니다/),
    ).not.toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "회수" }));
    expect(await within(dialog).findByText("회수 사유를 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByRole("textbox"), "계약 종료");
    await user.click(within(dialog).getByRole("button", { name: "회수" }));
    expect(
      await screen.findByText(
        /신청 대기 1건은 기간 만료로 종결되었고 확정된 방문 0건은 유지됩니다/,
      ),
    ).not.toBeNull();
    await waitFor(() => expect(getMockVisitRequestState().grants[0]?.state).toBe("REVOKED"));
    expect(getMockVisitRequestState().requests[0]?.status).toBe("EXPIRED");
    expect(getMockVisitState().approvals).toHaveLength(1);
  });

  it("이미 회수된 허용을 다시 회수하면 상태 오류를 안내한다", async () => {
    setMockVisitRequestState({ grants: [buildMockApplyGrant({ grantId: 11 })] });
    server.use(
      http.post(
        "/api/properties/501/access-approvals/7001/apply-grants/11/revoke",
        () =>
          new Response(
            JSON.stringify({ code: "INVALID_TRANSITION", message: "상태", traceId: "t" }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "정릉부동산 허용 회수" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox"), "계약 종료");
    await user.click(within(dialog).getByRole("button", { name: "회수" }));
    expect(await within(dialog).findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
  });
});
