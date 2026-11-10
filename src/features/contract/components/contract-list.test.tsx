// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import {
  buildMockContract,
  resetMockContractState,
  setMockContractState,
} from "@/mocks/handlers/contract";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ContractListScreen } from "./contract-list-screen";

const navigation = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/contracts",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockContractState();
  navigation.search = "";
});

afterAll(() => stopServer());

function daysFromNow(days: number): string {
  return new Date(Date.now() + 9 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);
}

describe("계약 목록", () => {
  it("로딩 뒤 유효 계약 탭에서 계약을 보여주고 서류 미첨부 경고를 표시한다", async () => {
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    expect(document.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(await screen.findByRole("link", { name: "서울특별시 성북구 정릉로 77" })).not.toBeNull();
    expect(screen.getByText("서류 미첨부: 거래계약서, 중개대상물 확인·설명서")).not.toBeNull();
    expect(screen.getByText("체결")).not.toBeNull();
    expect(screen.getByText("기간 중")).not.toBeNull();
    expect(screen.getByText("잔금 예정")).not.toBeNull();
    expect(screen.getByText("박임대")).not.toBeNull();
  });

  it("당사자가 둘 이상이면 첫 당사자 이름에 외 N명을 붙인다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 1,
          sellerLandlordParties: [
            { partyId: 1, sequenceNo: 1, name: "박공동", phone: null, customerId: null },
            { partyId: 2, sequenceNo: 2, name: "김공동", phone: null, customerId: null },
            { partyId: 3, sequenceNo: 3, name: "이공동", phone: null, customerId: null },
          ],
        }),
      ],
    });
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    expect(await screen.findByText("박공동 외 2명")).not.toBeNull();
  });

  it("탭에 따라 체결 계약만, 만기 90일 이내만, 전체를 보여준다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({ contractId: 1, leaseEndDate: daysFromNow(30) }),
        buildMockContract({ contractId: 2, leaseEndDate: daysFromNow(400) }),
        buildMockContract({
          contractId: 3,
          contractStatus: "DRAFT",
          leasePeriodStatus: null,
          settlementStatus: "UNDECIDED",
          sellerLandlordParties: [
            { partyId: 31, sequenceNo: 1, name: "초안당사자", phone: null, customerId: null },
          ],
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    await screen.findAllByRole("link", { name: "서울특별시 성북구 정릉로 77" });
    expect(screen.getAllByRole("link", { name: "서울특별시 성북구 정릉로 77" })).toHaveLength(2);
    expect(screen.queryByText("초안당사자")).toBeNull();
    await user.click(screen.getByRole("tab", { name: "임대 만기 90일 이내" }));
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: "서울특별시 성북구 정릉로 77" })).toHaveLength(1),
    );
    await user.click(screen.getByRole("tab", { name: "전체 계약" }));
    expect(await screen.findByText("초안당사자")).not.toBeNull();
  });

  it("주소 쿼리의 tab 값으로 만기 탭을 바로 연다", async () => {
    navigation.search = "tab=maturity";
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    expect(await screen.findByText("임대 만기가 90일 안에 오는 계약이 없습니다.")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "임대 만기 90일 이내", selected: true })).not.toBeNull();
  });

  it("중복 제외 계약은 기본 목록에서 빠지고 중복 제외 포함을 켜면 나온다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({ contractId: 1 }),
        buildMockContract({ contractId: 2, duplicateExcluded: true }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    await screen.findAllByRole("link", { name: "서울특별시 성북구 정릉로 77" });
    expect(screen.getAllByRole("link", { name: "서울특별시 성북구 정릉로 77" })).toHaveLength(1);
    await user.click(screen.getByRole("checkbox", { name: "중복 제외 포함" }));
    await waitFor(() => expect(screen.getByText("중복 제외됨")).not.toBeNull());
  });

  it("당사자 이름으로 검색한다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({ contractId: 1 }),
        buildMockContract(
          {
            contractId: 2,
            sellerLandlordParties: [
              { partyId: 21, sequenceNo: 1, name: "특별한이름", phone: null, customerId: null },
            ],
          },
          { propertyAddress: "서울특별시 종로구 1" },
        ),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    await screen.findAllByRole("link", { name: /서울특별시/ });
    const box = screen.getByRole("searchbox", { name: "당사자 이름" });
    await user.type(box, "특별한{Enter}");
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: /서울특별시/ })).toHaveLength(1),
    );
    expect(screen.getByRole("link", { name: "서울특별시 종로구 1" })).not.toBeNull();
  });

  it("계약이 없으면 빈 안내를 보여준다", async () => {
    setMockContractState({ contracts: [] });
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    expect(await screen.findByText("표시할 계약이 없습니다.")).not.toBeNull();
  });

  it("조회 오류는 안내와 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/contracts", () => mockErrors.server()));
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    expect(
      await screen.findByText("일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요."),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("서버가 403이나 429를 돌려주면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/contracts", () => mockErrors.forbidden()));
    const first = renderOffice(<ContractListScreen />, { role: "AGENT" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    first.unmount();
    server.use(http.get("/api/contracts", () => mockErrors.rateLimited(30)));
    renderOffice(<ContractListScreen />, { role: "AGENT" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });

  it("중개보조원은 요청 없이 접근 권한 화면을 보고 계약 등록 버튼이 없다", async () => {
    let called = false;
    server.use(
      http.get("/api/contracts", () => {
        called = true;
        return mockErrors.forbidden();
      }),
    );
    renderOffice(<ContractListScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "+ 계약 등록" })).toBeNull();
    expect(called).toBe(false);
  });

  it("계약 등록 링크와 상세 링크가 걸려 있다", async () => {
    renderOffice(<ContractListScreen />, { role: "OWNER" });
    const row = await screen.findByRole("link", { name: "서울특별시 성북구 정릉로 77" });
    expect(row.getAttribute("href")).toBe("/contracts/9101");
    expect(
      within(document.body).getByRole("link", { name: "+ 계약 등록" }).getAttribute("href"),
    ).toBe("/contracts/new");
  });
});
