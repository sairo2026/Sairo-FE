// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockPropertyState, setMockPropertyState } from "@/mocks/handlers/property";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { PropertyListScreen } from "./property-list-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/properties",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockPropertyState();
});

afterAll(() => stopServer());

describe("매물 목록", () => {
  it("불러오는 동안 로딩을 보여주고 매물 행을 표시한다", async () => {
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    const row = (await screen.findByRole("link", { name: "국민대 앞 아파트" })).closest("tr");
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement);
    expect(cells.getByText("월세 2,000만원 / 90만원")).not.toBeNull();
    expect(cells.getByText("활성")).not.toBeNull();
    expect(cells.getByText("김소유")).not.toBeNull();
    expect(cells.getByText("아파트")).not.toBeNull();
    expect(cells.getByText("이중개")).not.toBeNull();
    const draftRow = screen.getByRole("link", { name: "정릉 상가" }).closest("tr");
    expect(within(draftRow as HTMLElement).getByText("임시저장")).not.toBeNull();
  });

  it("매물이 없으면 빈 목록 안내를 보여준다", async () => {
    setMockPropertyState({ properties: [] });
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    expect(await screen.findByText(/조건에 맞는 매물이 없습니다/)).not.toBeNull();
  });

  it("조회가 실패하면 목록 안에 오류와 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/properties", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: "국민대 앞 아파트" })).not.toBeNull();
  });

  it("권한이 없으면 권한 없음 화면을 보여준다", async () => {
    server.use(http.get("/api/properties", () => mockErrors.forbidden()));
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("요청이 많으면 대기 안내를 보여준다", async () => {
    server.use(http.get("/api/properties", () => mockErrors.rateLimited(30)));
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });

  it("거래유형을 고르면 해당 거래 제안이 있는 매물만 다시 조회한다", async () => {
    const requests: string[] = [];
    server.use(
      http.get("/api/properties", ({ request }) => {
        requests.push(new URL(request.url).search);
        return HttpResponse.json({ items: [], page: 0, size: 25, totalElements: 0 });
      }),
    );
    const user = userEvent.setup();
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    await screen.findByText(/조건에 맞는 매물이 없습니다/);
    await user.selectOptions(screen.getByLabelText("거래유형"), "SALE");
    await waitFor(() => expect(requests.some((item) => item.includes("dealType=SALE"))).toBe(true));
  });

  it("면적 범위만 입력하면 면적 종류를 고르라고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    await screen.findByRole("link", { name: "국민대 앞 아파트" });
    await user.type(screen.getByLabelText("면적 하한(㎡)"), "50");
    await user.click(screen.getByRole("button", { name: "조건 적용" }));
    expect(
      await screen.findByText("면적 범위를 쓰려면 면적 종류를 먼저 선택해 주세요."),
    ).not.toBeNull();
  });

  it("가격 범위만 입력하면 거래유형을 고르라고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    await screen.findByRole("link", { name: "국민대 앞 아파트" });
    await user.type(screen.getByLabelText("가격 하한(만원)"), "1000");
    await user.click(screen.getByRole("button", { name: "조건 적용" }));
    expect(
      await screen.findByText("가격 범위를 쓰려면 거래유형을 먼저 선택해 주세요."),
    ).not.toBeNull();
  });

  it("서버가 면적 종류 누락을 검증 오류로 알려도 오류 문구를 보여준다", async () => {
    server.use(
      http.get("/api/properties", () =>
        errorResponse(400, "INVALID_REQUEST", "입력값을 확인해 주세요."),
      ),
    );
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    expect(await screen.findByText("매물 목록을 불러오지 못했습니다.")).not.toBeNull();
  });

  it("검색어와 보관 보기를 조회 조건으로 보낸다", async () => {
    const requests: string[] = [];
    server.use(
      http.get("/api/properties", ({ request }) => {
        requests.push(new URL(request.url).search);
        return HttpResponse.json({ items: [], page: 0, size: 25, totalElements: 0 });
      }),
    );
    const user = userEvent.setup();
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    await screen.findByText(/조건에 맞는 매물이 없습니다/);
    await user.type(screen.getByRole("searchbox"), "정릉");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() => expect(requests.some((item) => item.includes("keyword="))).toBe(true));
    await user.click(screen.getByRole("switch", { name: "보관된 매물만 보기" }));
    await waitFor(() => expect(requests.some((item) => item.includes("archived=true"))).toBe(true));
    expect(await screen.findByText("보관된 매물이 없습니다.")).not.toBeNull();
  });
});
