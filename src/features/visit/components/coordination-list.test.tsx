// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import {
  buildMockCoordination,
  resetMockVisitState,
  setMockVisitState,
} from "@/mocks/handlers/visit";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CoordinationListScreen } from "./coordination-list-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => "/coordinations",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockVisitState();
  navigation.push.mockClear();
});

afterAll(() => stopServer());

describe("방문 조율 목록", () => {
  it("불러오는 동안 로딩을 보여주고 조율 건과 상태별 건수를 표시한다", async () => {
    renderOffice(<CoordinationListScreen />, { role: "OWNER" });
    expect(document.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(await screen.findByText("김수요")).not.toBeNull();
    expect(screen.getByText("국민대 앞 아파트, 정릉 상가")).not.toBeNull();
    expect(screen.getByText("2개")).not.toBeNull();
    const card = screen.getByRole("button", { name: /^조율 가능/ });
    expect(within(card).getByText("1")).not.toBeNull();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(9);
  });

  it("상태 카드를 누르면 해당 상태만 보이고 다시 누르면 해제된다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({ coordinationId: 1, customerName: "가고객", status: "CONFIRMED" }),
        buildMockCoordination({ coordinationId: 2, customerName: "나고객", status: "CANCELLED" }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationListScreen />, { role: "AGENT" });
    await screen.findByText("가고객");
    await user.click(screen.getByRole("button", { name: /^취소/ }));
    await waitFor(() => expect(screen.queryByText("가고객")).toBeNull());
    expect(screen.getByText("나고객")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /^취소/ }));
    expect(await screen.findByText("가고객")).not.toBeNull();
  });

  it("상태 배지를 누르면 다음 동작 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: /김수요 조율 가능 상세로 이동/ }));
    expect(navigation.push).toHaveBeenCalledWith("/coordinations/801#schedule");
  });

  it("조율이 없으면 빈 목록 문구를 보여준다", async () => {
    setMockVisitState({ coordinations: [] });
    renderOffice(<CoordinationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("아직 만든 조율이 없습니다.")).not.toBeNull();
  });

  it("중개보조원에게는 배정된 건만 보인다는 안내와 배정 건만 보여준다", async () => {
    setMockVisitState({
      callerRole: "DEPUTY",
      coordinations: [
        buildMockCoordination({ coordinationId: 1, customerName: "배정고객" }),
        buildMockCoordination({ coordinationId: 2, customerName: "비배정고객" }),
      ],
      deputyAssignedIds: [1],
    });
    renderOffice(<CoordinationListScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("배정고객")).not.toBeNull();
    expect(screen.queryByText("비배정고객")).toBeNull();
    expect(screen.getByText("배정된 조율 건만 보입니다.")).not.toBeNull();
    expect(screen.queryByText("+ 조율 만들기")).toBeNull();
  });

  it("중개보조원에게 배정된 건이 없으면 전용 빈 문구를 보여준다", async () => {
    setMockVisitState({ callerRole: "DEPUTY", deputyAssignedIds: [] });
    renderOffice(<CoordinationListScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("배정된 조율 건이 없습니다.")).not.toBeNull();
  });

  it("서버 오류가 나면 안내와 다시 시도 버튼을 보여주고 재시도한다", async () => {
    server.use(http.get("/api/visit-coordinations", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<CoordinationListScreen />, { role: "OWNER" });
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("김수요")).not.toBeNull();
  });

  it("권한이 없으면 접근 권한 화면을 보여준다", async () => {
    server.use(http.get("/api/visit-coordinations", () => mockErrors.forbidden()));
    renderOffice(<CoordinationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("요청이 너무 많으면 잠시 후 다시 시도하라는 화면을 보여준다", async () => {
    server.use(http.get("/api/visit-coordinations", () => mockErrors.rateLimited(30)));
    renderOffice(<CoordinationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });
});
