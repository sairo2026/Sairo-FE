// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockContract,
  getMockContractState,
  resetMockContractState,
  setMockContractState,
} from "@/mocks/handlers/contract";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ContractRenewScreen } from "./contract-renew-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => "/contracts/9101/renew",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockContractState();
  navigation.push.mockClear();
});

afterAll(() => stopServer());

function setDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function fillRenewal(user: ReturnType<typeof userEvent.setup>) {
  const manager = await screen.findByLabelText(/담당 공인중개사/);
  await waitFor(() => expect((manager as HTMLSelectElement).options.length).toBeGreaterThan(1));
  await user.selectOptions(manager, "2");
  setDate("체결일", "2028-09-01");
  setDate("임대 시작일", "2028-10-15");
  setDate("임대 만기일", "2030-10-14");
  setDate("잔금 예정일", "2028-10-15");
}

describe("재계약", () => {
  it("기존 당사자와 금액을 채우고 체결일과 새 임대기간은 비워 둔다", async () => {
    renderOffice(<ContractRenewScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByDisplayValue("박임대")).not.toBeNull();
    expect(screen.getByDisplayValue("최임차")).not.toBeNull();
    expect(screen.getByDisplayValue("300000000")).not.toBeNull();
    expect((screen.getByLabelText("체결일") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("임대 시작일") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/거래유형/) as HTMLSelectElement).disabled).toBe(true);
  });

  it("월세 계약은 월세 금액도 채운다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({ contractId: 9600, dealType: "MONTHLY", monthlyRentAmount: 800000 }),
      ],
    });
    renderOffice(<ContractRenewScreen contractId={9600} />, { role: "OWNER" });
    expect(await screen.findByDisplayValue("800000")).not.toBeNull();
  });

  it("재계약을 등록하면 기존 계약은 그대로 두고 새 계약 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractRenewScreen contractId={9101} />, { role: "OWNER" });
    await fillRenewal(user);
    await user.click(screen.getByRole("button", { name: "재계약 등록" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const [original, renewed] = getMockContractState().contracts;
    expect(original?.detail.contractStatus).toBe("SIGNED");
    expect(renewed?.detail.previousContractId).toBe(9101);
    expect(navigation.push).toHaveBeenCalledWith(`/contracts/${renewed?.detail.contractId}`);
  });

  it("필수값이 빠지면 항목별 오류를 보이고 요청하지 않는다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractRenewScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "재계약 등록" }));
    expect(await screen.findByText("체결일을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("임대 시작일을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("담당 공인중개사를 선택해 주세요.")).not.toBeNull();
    expect(getMockContractState().contracts).toHaveLength(1);
  });

  it("같은 매물에서 기간이 겹치면 등록할 수 없다는 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractRenewScreen contractId={9101} />, { role: "OWNER" });
    await fillRenewal(user);
    setDate("임대 시작일", "2027-01-01");
    setDate("임대 만기일", "2027-12-31");
    await user.click(screen.getByRole("button", { name: "재계약 등록" }));
    expect(await screen.findByText(/기간이 겹치는 체결 계약이 이미 있습니다/)).not.toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("서버 필드 오류와 429를 보여준다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/contracts/9101/renew", () =>
        errorResponse(400, "INCOMPLETE_FOR_SIGNING", "부족", {
          fieldErrors: [{ field: "depositAmount", message: "서버: 보증금 필요" }],
        }),
      ),
    );
    renderOffice(<ContractRenewScreen contractId={9101} />, { role: "OWNER" });
    await fillRenewal(user);
    await user.click(screen.getByRole("button", { name: "재계약 등록" }));
    expect(await screen.findByText("서버: 보증금 필요")).not.toBeNull();
    server.use(http.post("/api/contracts/9101/renew", () => mockErrors.rateLimited(10)));
    await user.click(screen.getByRole("button", { name: "재계약 등록" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).not.toBeNull();
  });

  it("매매나 초안은 재계약할 수 없다고 안내한다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 9500,
          dealType: "SALE",
          leasePeriodStatus: null,
          salePrice: 1,
        }),
      ],
    });
    renderOffice(<ContractRenewScreen contractId={9500} />, { role: "OWNER" });
    expect(
      await screen.findByText(/재계약은 체결된 전세·월세 계약에서만 할 수 있습니다/),
    ).not.toBeNull();
  });

  it("없는 계약은 찾을 수 없음, 중개보조원은 접근 권한 화면을 본다", async () => {
    const first = renderOffice(<ContractRenewScreen contractId={1} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
    first.unmount();
    renderOffice(<ContractRenewScreen contractId={9101} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });
});
