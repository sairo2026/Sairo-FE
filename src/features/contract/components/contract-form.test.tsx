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
import { ContractCreateScreen, ContractDraftEditScreen } from "./contract-form-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => "/contracts/new",
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

type User = ReturnType<typeof userEvent.setup>;

async function pickManager(user: User) {
  const select = await screen.findByLabelText(/담당 공인중개사/);
  await waitFor(() => expect(within(select).length).toBeGreaterThan(1));
  await user.selectOptions(select, "2");
}

function within(select: HTMLElement) {
  return (select as HTMLSelectElement).options;
}

function setDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function fillLease(user: User) {
  await user.selectOptions(screen.getByLabelText(/거래유형/), "JEONSE");
  await user.type(screen.getByLabelText("매도·임대인 1 이름"), "박임대");
  await user.type(screen.getByLabelText("매수·임차인 1 이름"), "최임차");
  await user.type(screen.getByLabelText("보증금(원)"), "300000000");
  setDate("체결일", "2026-11-01");
  setDate("임대 시작일", "2026-12-01");
  setDate("임대 만기일", "2028-11-30");
  setDate("잔금 예정일", "2026-12-01");
}

describe("계약 등록", () => {
  it("매물 이름을 보여주고 거래유형에 따라 입력 항목이 바뀐다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByRole("link", { name: /국민대 앞 아파트/ })).not.toBeNull();
    expect(screen.queryByLabelText("매매가(원)")).toBeNull();
    await user.selectOptions(screen.getByLabelText(/거래유형/), "SALE");
    expect(screen.getByLabelText("매매가(원)")).not.toBeNull();
    expect(screen.queryByLabelText("보증금(원)")).toBeNull();
    await user.selectOptions(screen.getByLabelText(/거래유형/), "MONTHLY");
    expect(screen.getByLabelText("월세(원)")).not.toBeNull();
    expect(screen.getByLabelText("임대 시작일")).not.toBeNull();
  });

  it("필수값이 빠지면 항목별 오류를 보이고 요청을 보내지 않는다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "체결 등록" }));
    expect(await screen.findByText("거래유형을 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("담당 공인중개사를 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("체결일을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("매도·임대인을 한 명 이상 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("매수·임차인을 한 명 이상 입력해 주세요.")).not.toBeNull();
    expect(screen.getAllByText(/임의 날짜로 채우지 않습니다/).length).toBeGreaterThan(0);
    expect(getMockContractState().contracts).toHaveLength(1);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("임대 만기가 시작보다 이르면 오류로 표시한다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByLabelText(/거래유형/);
    await fillLease(user);
    setDate("임대 만기일", "2026-01-01");
    await user.click(screen.getByRole("button", { name: "체결 등록" }));
    expect(await screen.findByText("임대 만기일이 시작일보다 이릅니다.")).not.toBeNull();
  });

  it("업무 메모가 2000자를 넘으면 막는다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    const memo = await screen.findByLabelText("업무 메모");
    await user.click(memo);
    await user.paste("가".repeat(2001));
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText("업무 메모는 2000자까지 입력할 수 있습니다.")).not.toBeNull();
  });

  it("전세 계약을 체결 등록하면 상세로 이동한다", async () => {
    setMockContractState({ contracts: [] });
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByLabelText(/거래유형/);
    await pickManager(user);
    await fillLease(user);
    await user.click(screen.getByRole("button", { name: "체결 등록" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const created = getMockContractState().contracts.at(-1);
    expect(created?.detail.contractStatus).toBe("SIGNED");
    expect(created?.detail.depositAmount).toBe(300000000);
    expect(navigation.push).toHaveBeenCalledWith(`/contracts/${created?.detail.contractId}`);
  });

  it("잔금 날짜를 모르면 사유만 받고 체결 등록한다", async () => {
    setMockContractState({ contracts: [] });
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByLabelText(/거래유형/);
    await pickManager(user);
    await fillLease(user);
    setDate("잔금 예정일", "");
    await user.type(screen.getByLabelText("잔금 예정일을 모르는 사유"), "잔금일 협의 중");
    await user.click(screen.getByRole("button", { name: "체결 등록" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    const created = getMockContractState().contracts.at(-1);
    expect(created?.detail.balanceDueDate).toBeNull();
    expect(created?.detail.balanceDueDatePendingReason).toBe("잔금일 협의 중");
  });

  it("초안은 거래유형과 담당자만 있어도 저장된다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByLabelText(/거래유형/);
    await pickManager(user);
    await user.selectOptions(screen.getByLabelText(/거래유형/), "SALE");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(getMockContractState().contracts.at(-1)?.detail.contractStatus).toBe("DRAFT");
  });

  it("서버가 체결 조건 부족을 필드별로 알려 주면 해당 입력 아래에 보인다", async () => {
    server.use(
      http.post("/api/properties/501/contracts", () =>
        errorResponse(400, "INCOMPLETE_FOR_SIGNING", "부족", {
          fieldErrors: [{ field: "depositAmount", message: "서버: 보증금이 필요합니다." }],
        }),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByLabelText(/거래유형/);
    await pickManager(user);
    await fillLease(user);
    await user.click(screen.getByRole("button", { name: "체결 등록" }));
    expect(await screen.findByText("서버: 보증금이 필요합니다.")).not.toBeNull();
    expect(screen.getByText(/체결에 필요한 값이 빠져 있습니다/)).not.toBeNull();
  });

  it("같은 매물에 기간이 겹치는 체결 계약이 있으면 409 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByLabelText(/거래유형/);
    await pickManager(user);
    await fillLease(user);
    setDate("임대 시작일", "2027-01-01");
    setDate("임대 만기일", "2027-12-31");
    await user.click(screen.getByRole("button", { name: "체결 등록" }));
    expect(await screen.findByText(/기간이 겹치는 체결 계약이 이미 있습니다/)).not.toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("보관된 매물은 등록할 수 없다는 안내를 보여준다", async () => {
    setMockContractState({ archivedPropertyIds: [501] });
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByLabelText(/거래유형/);
    await pickManager(user);
    await user.selectOptions(screen.getByLabelText(/거래유형/), "SALE");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText(/보관된 매물에는 계약을 등록할 수 없습니다/)).not.toBeNull();
  });

  it("요청이 너무 잦으면 429 안내를 보여준다", async () => {
    server.use(http.post("/api/properties/501/contracts/drafts", () => mockErrors.rateLimited(20)));
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER" });
    await screen.findByLabelText(/거래유형/);
    await pickManager(user);
    await user.selectOptions(screen.getByLabelText(/거래유형/), "SALE");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).not.toBeNull();
  });

  it("매물 없이 들어오면 매물을 고르게 하고 고르지 않으면 오류를 보인다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractCreateScreen propertyId={null} />, { role: "OWNER" });
    const picker = await screen.findByLabelText(/매물 선택/);
    await waitFor(() => expect((picker as HTMLSelectElement).options.length).toBeGreaterThan(1));
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText("매물을 선택해 주세요.")).not.toBeNull();
  });

  it("중개보조원은 접근 권한 화면을 본다", async () => {
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "체결 등록" })).toBeNull();
  });

  it("읽기 전용 상태에서는 저장 버튼이 비활성이다", async () => {
    renderOffice(<ContractCreateScreen propertyId={501} />, { role: "OWNER", isReadOnly: true });
    const button = await screen.findByRole("button", { name: "체결 등록" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("계약 초안 수정", () => {
  const draft = () =>
    buildMockContract({
      contractId: 9300,
      contractStatus: "DRAFT",
      leasePeriodStatus: null,
      settlementStatus: "UNDECIDED",
      currentRevisionId: null,
      memo: "초안 메모",
    });

  it("저장된 값을 채워 보여주고 초안 저장은 같은 초안을 고친다", async () => {
    setMockContractState({ contracts: [draft()] });
    const user = userEvent.setup();
    renderOffice(<ContractDraftEditScreen contractId={9300} />, { role: "OWNER" });
    expect(await screen.findByDisplayValue("박임대")).not.toBeNull();
    expect(screen.getByDisplayValue("초안 메모")).not.toBeNull();
    await user.clear(screen.getByLabelText("업무 메모"));
    await user.type(screen.getByLabelText("업무 메모"), "고친 메모");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/contracts/9300"));
    expect(getMockContractState().contracts[0]?.detail.memo).toBe("고친 메모");
  });

  it("체결 등록은 초안을 고친 뒤 체결한다", async () => {
    setMockContractState({ contracts: [draft()] });
    const user = userEvent.setup();
    renderOffice(<ContractDraftEditScreen contractId={9300} />, { role: "OWNER" });
    await screen.findByDisplayValue("박임대");
    await user.click(screen.getByRole("button", { name: "체결 등록" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/contracts/9300"));
    const saved = getMockContractState().contracts[0]?.detail;
    expect(saved?.contractStatus).toBe("SIGNED");
    expect(saved?.currentRevisionId).not.toBeNull();
  });

  it("확인 뒤 초안을 삭제하고 목록으로 돌아간다", async () => {
    setMockContractState({ contracts: [draft()] });
    const user = userEvent.setup();
    renderOffice(<ContractDraftEditScreen contractId={9300} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "초안 삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/contracts"));
    expect(getMockContractState().contracts).toHaveLength(0);
  });

  it("다른 사용자가 먼저 고쳤으면 버전 충돌 안내를 보여준다", async () => {
    setMockContractState({ contracts: [draft()] });
    server.use(http.patch("/api/contracts/9300/draft", () => mockErrors.versionConflict(3)));
    const user = userEvent.setup();
    renderOffice(<ContractDraftEditScreen contractId={9300} />, { role: "OWNER" });
    await screen.findByDisplayValue("박임대");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("체결된 계약은 초안으로 수정할 수 없다고 안내한다", async () => {
    renderOffice(<ContractDraftEditScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText(/체결된 계약은 초안으로 수정할 수 없습니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "계약 상세로 이동" })).not.toBeNull();
  });

  it("없는 계약은 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<ContractDraftEditScreen contractId={1} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("중개보조원은 접근 권한 화면을 본다", async () => {
    renderOffice(<ContractDraftEditScreen contractId={9300} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });
});
