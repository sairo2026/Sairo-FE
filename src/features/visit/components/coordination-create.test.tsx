// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse } from "@/mocks/error-responses";
import { resetMockCustomerState } from "@/mocks/handlers/customer";
import { resetMockPropertyState } from "@/mocks/handlers/property";
import { getMockVisitState, resetMockVisitState, setMockVisitState } from "@/mocks/handlers/visit";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CoordinationCreateScreen } from "./coordination-create-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => "/coordinations/new",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockVisitState();
  resetMockCustomerState();
  resetMockPropertyState();
  navigation.push.mockClear();
});

afterAll(() => stopServer());

const grant = {
  grantId: 31,
  approvalId: 7100,
  propertyId: 9001,
  ownerOfficeId: 77,
  ownerOfficeName: "행복공인중개사",
  scope: "OFFICE" as const,
  propertyName: "허용받은 오피스텔",
  propertyAddress: "서울특별시 종로구 세종로 1",
  categoryName: "오피스텔",
  dealTypes: [],
  approvalValidUntil: "2026-12-31T18:00:00+09:00",
  conditionRegistered: true,
};

async function pickBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.click((await screen.findAllByRole("radio", { name: /김수요/ }))[0] as HTMLElement);
  await user.click(await screen.findByRole("checkbox", { name: "국민대 앞 아파트 선택" }));
}

describe("방문 조율 생성", () => {
  it("고객과 후보 매물을 고르지 않으면 제출하지 않고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER" });
    await user.click(screen.getByRole("button", { name: "조율 만들기" }));
    expect(await screen.findByText("고객을 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("후보 매물을 1개 이상 선택해 주세요.")).not.toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("종료일이 30일을 넘으면 입력 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER" });
    await pickBasics(user);
    fireEvent.change(screen.getByLabelText("방문 가능 종료일"), {
      target: { value: "2099-01-01" },
    });
    await user.click(screen.getByRole("button", { name: "조율 만들기" }));
    expect(await screen.findByText("종료일은 오늘부터 30일 안이어야 합니다.")).not.toBeNull();
  });

  it("고객과 후보 매물을 골라 조율을 만들고 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER" });
    await pickBasics(user);
    await user.click(screen.getByRole("button", { name: "조율 만들기" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const created = getMockVisitState().coordinations[0];
    expect(created?.customerName).toBe("김수요");
    expect(created?.candidateProperties).toHaveLength(1);
    expect(navigation.push).toHaveBeenCalledWith(`/coordinations/${created?.coordinationId}`);
  });

  it("허용받은 매물에는 허용한 사무소 이름 배지를 붙여 함께 보여준다", async () => {
    setMockVisitState({ receivedGrants: [grant] });
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "AGENT" });
    expect(await screen.findByText("행복공인중개사")).not.toBeNull();
    await user.click(await screen.findByRole("checkbox", { name: "허용받은 오피스텔 선택" }));
    expect(screen.getByText(/후보 매물 선택 \(1\/20\)/)).not.toBeNull();
  });

  it("후보 상한을 넘기는 서버 오류를 안내한다", async () => {
    server.use(
      http.post("/api/visit-coordinations", () =>
        errorResponse(422, "CANDIDATE_LIMIT_EXCEEDED", "상한"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER" });
    await pickBasics(user);
    await user.click(screen.getByRole("button", { name: "조율 만들기" }));
    expect(await screen.findByText(/후보 매물은 자기 사무소 매물과/)).not.toBeNull();
  });

  it("신청 권한이 없는 매물이 포함되면 안내한다", async () => {
    server.use(
      http.post("/api/visit-coordinations", () =>
        errorResponse(422, "CANDIDATE_NOT_ALLOWED", "허용 없음"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER" });
    await pickBasics(user);
    await user.click(screen.getByRole("button", { name: "조율 만들기" }));
    expect(await screen.findByText(/신청 권한이 없는 매물이 포함/)).not.toBeNull();
  });

  it("보관된 고객을 고르면 거절 안내를 보여주고 선택을 해제한다", async () => {
    server.use(
      http.post("/api/visit-coordinations", () => errorResponse(409, "CUSTOMER_ARCHIVED", "보관")),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER" });
    await pickBasics(user);
    await user.click(screen.getByRole("button", { name: "조율 만들기" }));
    expect(await screen.findByText(/보관된 고객은 선택할 수 없습니다/)).not.toBeNull();
    expect((screen.getAllByRole("radio")[0] as HTMLInputElement).checked).toBe(false);
  });

  it("방문업무가 잠긴 중개보조원의 생성은 안내로 막힌다", async () => {
    setMockVisitState({ callerRole: "DEPUTY", deputyLocked: true });
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "DEPUTY" });
    await pickBasics(user);
    await user.click(screen.getByRole("button", { name: "조율 만들기" }));
    expect(await screen.findByText(/인원 한도를 넘어 방문 업무가 잠겼습니다/)).not.toBeNull();
  });

  it("중개보조원은 담당자를 바꿀 수 없고 대표·중개사는 고를 수 있다", async () => {
    const { unmount } = renderOffice(<CoordinationCreateScreen />, { role: "DEPUTY" });
    expect(screen.getByText(/담당자를 바꿀 수 없어/)).not.toBeNull();
    expect(screen.queryByLabelText("담당자")).toBeNull();
    unmount();
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER" });
    expect(screen.getByLabelText("담당자")).not.toBeNull();
  });

  it("고객 검색 결과가 없으면 빈 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER" });
    await screen.findAllByRole("radio", { name: /김수요/ });
    await user.type(screen.getByLabelText("고객 검색"), "없는이름");
    await user.click(screen.getAllByRole("button", { name: "검색" })[0] as HTMLElement);
    expect(await screen.findByText("검색된 고객이 없습니다.")).not.toBeNull();
  });

  it("읽기 전용 상태에서는 만들기 버튼이 막힌다", () => {
    renderOffice(<CoordinationCreateScreen />, { role: "OWNER", isReadOnly: true });
    expect(screen.getByText(/읽기만 가능한 상태/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "조율 만들기" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });
});
