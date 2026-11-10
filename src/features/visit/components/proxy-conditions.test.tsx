// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockPropertyState } from "@/mocks/handlers/property";
import { buildMockApproval, resetMockVisitState, setMockVisitState } from "@/mocks/handlers/visit";
import {
  buildMockCondition,
  getMockApproverState,
  resetMockApproverState,
  setMockApproverState,
} from "@/mocks/handlers/visit-approver";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ProxyConditionsScreen } from "./proxy-conditions-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/properties/501/access-approvals/7001/conditions",
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
  resetMockApproverState();
});

afterAll(() => stopServer());

function proxyOnly() {
  setMockApproverState({
    conditions: [buildMockCondition({ approvalId: 7001, source: "PROXY" })],
  });
}

describe("승인자 조건 대리 입력 화면", () => {
  it("로딩 뒤 조건 이력과 출처를 보여준다", async () => {
    proxyOnly();
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7001} />, { role: "OWNER" });
    expect(screen.getByRole("status")).not.toBeNull();
    expect(await screen.findByText("1번 버전")).not.toBeNull();
    expect(screen.getByText("중개사 대리 입력")).not.toBeNull();
    expect(screen.getByText("적용 중")).not.toBeNull();
  });

  it("이력이 없으면 안내하고 개인정보 안내 없이 대리 입력으로 저장한다", async () => {
    setMockApproverState({ conditions: [] });
    const user = userEvent.setup();
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7001} />, { role: "AGENT" });
    expect(await screen.findByText("등록된 조건 이력이 없습니다.")).not.toBeNull();
    expect(screen.queryByText("개인정보 수집 안내")).toBeNull();
    await user.click(screen.getByRole("button", { name: "대리 입력으로 저장" }));
    expect(await screen.findByText("조건 1번 버전으로 저장했습니다.")).not.toBeNull();
    expect(getMockApproverState().conditions[0]?.source).toBe("PROXY");
    expect(await screen.findByText("1번 버전")).not.toBeNull();
  });

  it("승인자 본인 입력이 적용 중이면 대리 입력을 막고 안내한다", async () => {
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7001} />, { role: "OWNER" });
    expect(await screen.findByText(/승인자 본인이 입력한 조건이 적용 중이라/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "대리 입력으로 저장" })).toBeNull();
  });

  it("공동 승인자 출입승인에는 입력할 수 없다고 안내한다", async () => {
    setMockVisitState({
      approvals: [
        buildMockApproval({ approvalId: 7002, propertyId: 501, approvalRole: "CO_APPROVER" }),
      ],
    });
    setMockApproverState({ conditions: [] });
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7002} />, { role: "OWNER" });
    expect(
      await screen.findByText(/공동 승인자 출입승인에는 조건을 만들 수 없습니다/),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "대리 입력으로 저장" })).toBeNull();
  });

  it("중개보조원에게는 권한 없음 화면을 보여준다", async () => {
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7001} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("확정 방문에 영향이 있으면 영향 확인 뒤 다시 저장한다", async () => {
    proxyOnly();
    setMockApproverState({
      impactItems: [
        {
          scheduleItemId: 6001,
          scheduledStartAt: "2026-11-18T10:00:00+09:00",
          scheduledEndAt: "2026-11-18T10:30:00+09:00",
          violatedRules: [],
        },
      ],
    });
    const user = userEvent.setup();
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7001} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "대리 입력으로 저장" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByLabelText("영향을 확인했습니다"));
    await user.click(within(dialog).getByRole("button", { name: "영향을 확인하고 저장" }));
    expect(await screen.findByText("조건 2번 버전으로 저장했습니다.")).not.toBeNull();
  });

  it("서버가 대리 입력을 거절하면 상태 안내를 보여준다", async () => {
    proxyOnly();
    server.use(
      http.put(
        "/api/properties/:propertyId/access-approvals/:approvalId/approver-conditions/proxy",
        () => errorResponse(409, "INVALID_TRANSITION", "본인 입력이 활성입니다."),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7001} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "대리 입력으로 저장" }));
    expect(await screen.findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
  });

  it("검증에 실패하면 서버 필드 오류를 입력 아래에 보여준다", async () => {
    proxyOnly();
    server.use(
      http.put(
        "/api/properties/:propertyId/access-approvals/:approvalId/approver-conditions/proxy",
        () =>
          mockErrors.validation([
            { field: "minGapMinutes", message: "간격 값이 올바르지 않습니다." },
          ]),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7001} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "대리 입력으로 저장" }));
    expect(await screen.findByText("간격 값이 올바르지 않습니다.")).not.toBeNull();
  });

  it("이력을 불러오지 못하면 오류 화면을 보여준다", async () => {
    server.use(
      http.get("/api/properties/:propertyId/access-approvals/:approvalId/approver-conditions", () =>
        mockErrors.forbidden(),
      ),
    );
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={7001} />, { role: "OWNER" });
    await waitFor(() => expect(screen.getByText("접근 권한이 없습니다")).not.toBeNull());
  });

  it("없는 출입승인은 찾을 수 없음으로 보여준다", async () => {
    server.use(
      http.get("/api/properties/:propertyId/access-approvals/:approvalId/approver-conditions", () =>
        mockErrors.notFound(),
      ),
    );
    renderOffice(<ProxyConditionsScreen propertyId={501} approvalId={9999} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });
});
