// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockProperty,
  getMockPropertyState,
  resetMockPropertyState,
  setMockPropertyState,
} from "@/mocks/handlers/property";
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
    expect(cells.getByText("월세")).not.toBeNull();
    expect(cells.getByText("2,000만원 / 90만원")).not.toBeNull();
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
    expect(await screen.findByText(/등록된 매물이 없습니다/)).not.toBeNull();
  });

  it("하한이 상한보다 크면 조회하지 않고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    await screen.findByText("정릉 상가");
    await user.selectOptions(screen.getByLabelText("거래유형"), "SALE");
    await user.type(screen.getByLabelText("매매가 하한(만원)"), "100");
    await user.type(screen.getByLabelText("매매가 상한(만원)"), "1");
    await user.click(screen.getByRole("button", { name: "조건 적용" }));
    expect(await screen.findByText(/하한이 상한보다 클 수 없습니다/)).not.toBeNull();
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
    await screen.findByText(/등록된 매물이 없습니다/);
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

  it("거래유형을 고르기 전에는 가격 입력이 막히고 안내가 보인다", async () => {
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    await screen.findByRole("link", { name: "국민대 앞 아파트" });
    expect(screen.getByLabelText("가격 하한(만원)").hasAttribute("disabled")).toBe(true);
    expect(screen.getByLabelText("가격 상한(만원)").hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("가격은 거래유형을 먼저 선택하면 입력할 수 있습니다.")).not.toBeNull();
  });

  it("월세를 고르면 월세 금액 기준이라는 라벨과 안내로 바뀌고 입력할 수 있다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyListScreen />, { role: "OWNER" });
    await screen.findByRole("link", { name: "국민대 앞 아파트" });
    await user.selectOptions(screen.getByLabelText("거래유형"), "MONTHLY");
    const min = screen.getByLabelText("월세 하한(만원)");
    expect(min.hasAttribute("disabled")).toBe(false);
    expect(screen.getByLabelText("월세 상한(만원)")).not.toBeNull();
    expect(screen.getByText("월세 매물은 보증금이 아닌 월세 금액으로 찾습니다.")).not.toBeNull();
    await user.type(min, "50");
    await user.selectOptions(screen.getByLabelText("거래유형"), "");
    expect((screen.getByLabelText("가격 하한(만원)") as HTMLInputElement).value).toBe("");
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
    await screen.findByText(/등록된 매물이 없습니다/);
    await user.type(screen.getByRole("searchbox"), "정릉");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() => expect(requests.some((item) => item.includes("keyword="))).toBe(true));
    await user.click(screen.getByRole("switch", { name: "보관된 매물만 보기" }));
    await waitFor(() => expect(requests.some((item) => item.includes("archived=true"))).toBe(true));
    expect(await screen.findByText("보관된 매물이 없습니다.")).not.toBeNull();
  });

  describe("여러 매물 보관", () => {
    it("선택한 매물이 없으면 보관 버튼을 막고, 전체 선택하면 모두 고른다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyListScreen />, { role: "OWNER" });
      await screen.findByRole("link", { name: "국민대 앞 아파트" });
      const archive = screen.getByRole("button", { name: "보관" });
      expect(archive.getAttribute("aria-disabled")).toBe("true");
      await user.click(screen.getByLabelText("전체 선택"));
      expect((screen.getByLabelText("국민대 앞 아파트 선택") as HTMLInputElement).checked).toBe(
        true,
      );
      expect((screen.getByLabelText("정릉 상가 선택") as HTMLInputElement).checked).toBe(true);
      expect(screen.getByRole("button", { name: "보관" }).getAttribute("aria-disabled")).toBeNull();
      await user.click(screen.getByLabelText("전체 선택"));
      expect((screen.getByLabelText("정릉 상가 선택") as HTMLInputElement).checked).toBe(false);
    });

    it("선택한 매물을 보관하고 완료 안내를 보여준다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyListScreen />, { role: "OWNER" });
      await screen.findByRole("link", { name: "국민대 앞 아파트" });
      await user.click(screen.getByLabelText("국민대 앞 아파트 선택"));
      await user.click(screen.getByRole("button", { name: "보관" }));
      const confirm = await screen.findByRole("dialog", {
        name: "선택한 매물 1건을 보관할까요?",
      });
      await user.click(within(confirm).getByRole("button", { name: "보관" }));
      const notice = await screen.findByRole("dialog", { name: "매물 보관이 완료되었습니다." });
      expect(
        getMockPropertyState().properties.find((item) => item.propertyId === 501)?.deletedAt,
      ).toBeTruthy();
      await user.click(within(notice).getByRole("button", { name: "확인" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.queryByRole("link", { name: "국민대 앞 아파트" })).toBeNull();
    });

    it("보관할 수 없는 매물은 건마다 이유를 알려 주고 나머지는 보관한다", async () => {
      const state = getMockPropertyState();
      setMockPropertyState({
        properties: [
          ...state.properties,
          buildMockProperty({
            propertyId: 503,
            name: "방문 조율 중인 매물",
            activeCoordinations: [
              { coordinationId: 1, status: "APPLYING", customerName: "김손님" },
            ],
          }),
          buildMockProperty({
            propertyId: 504,
            name: "계약 중인 매물",
            contracts: [
              {
                contractId: 2,
                dealType: "MONTHLY",
                contractStatus: "SIGNED",
                signedDate: "2026-11-01",
                leaseStartDate: "2026-12-01",
                leaseEndDate: "2027-11-30",
              },
            ],
          }),
        ],
      });
      const user = userEvent.setup();
      renderOffice(<PropertyListScreen />, { role: "OWNER" });
      await screen.findByRole("link", { name: "국민대 앞 아파트" });
      await user.click(screen.getByLabelText("전체 선택"));
      await user.click(screen.getByRole("button", { name: "보관" }));
      await user.click(
        within(await screen.findByRole("dialog")).getByRole("button", { name: "보관" }),
      );
      const notice = await screen.findByRole("dialog", {
        name: "매물 보관·삭제가 완료되었습니다.",
      });
      const failed = within(within(notice).getByRole("list", { name: "처리하지 못한 매물" }));
      expect(failed.getByText("방문 조율 중인 매물")).not.toBeNull();
      expect(failed.getByText(/진행 중인 방문 조율이나 다른 사무소의 예정된 방문/)).not.toBeNull();
      expect(failed.getByText("계약 중인 매물")).not.toBeNull();
      expect(failed.getByText(/진행 중인 계약이 있어 보관할 수 없습니다/)).not.toBeNull();
      expect(within(notice).getByText(/2건은 처리하지 못했습니다/)).not.toBeNull();
      await user.click(within(notice).getByRole("button", { name: "확인" }));
      expect(await screen.findByRole("link", { name: "방문 조율 중인 매물" })).not.toBeNull();
      expect((screen.getByLabelText("방문 조율 중인 매물 선택") as HTMLInputElement).checked).toBe(
        true,
      );
    });

    it("결제가 지연된 읽기 전용 상태에서는 선택과 보관을 막는다", async () => {
      renderOffice(<PropertyListScreen />, { role: "OWNER", isReadOnly: true });
      await screen.findByRole("link", { name: "국민대 앞 아파트" });
      expect((screen.getByLabelText("전체 선택") as HTMLInputElement).disabled).toBe(true);
      expect((screen.getByLabelText("국민대 앞 아파트 선택") as HTMLInputElement).disabled).toBe(
        true,
      );
    });

    it("보관된 매물 보기에서는 선택 열을 보여주지 않는다", async () => {
      const user = userEvent.setup();
      renderOffice(<PropertyListScreen />, { role: "OWNER" });
      await screen.findByRole("link", { name: "국민대 앞 아파트" });
      await user.click(screen.getByRole("switch", { name: "보관된 매물만 보기" }));
      await screen.findByText("보관된 매물이 없습니다.");
      expect(screen.queryByLabelText("전체 선택")).toBeNull();
    });
  });
});
