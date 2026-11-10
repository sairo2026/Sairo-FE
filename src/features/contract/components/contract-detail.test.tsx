// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
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
import { describeRevisionChanges } from "./contract-history";
import { ContractDetailScreen } from "./contract-detail-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/contracts/9101",
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
});

afterAll(() => stopServer());

type User = ReturnType<typeof userEvent.setup>;

async function openStatusDialog(user: User) {
  await user.click(await screen.findByRole("button", { name: "상태 변경" }));
  return screen.findByRole("dialog");
}

function fillEffective(dialog: HTMLElement, label = "실제 효력") {
  fireEvent.change(within(dialog).getByLabelText(`${label} 날짜`, { exact: false }), {
    target: { value: "2026-11-09" },
  });
  fireEvent.change(within(dialog).getByLabelText(`${label} 시간`, { exact: false }), {
    target: { value: "10:00" },
  });
}

describe("계약 상세 세 가지 상태", () => {
  it("로딩 뒤 계약 상태·임대기간·잔금 상태를 따로 보여준다", async () => {
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    expect(document.querySelector("[aria-busy=true]")).not.toBeNull();
    const tracks = await screen.findByRole("list", { name: "계약 세 가지 상태" });
    expect(within(tracks).getByText("체결")).not.toBeNull();
    expect(within(tracks).getByText("기간 중")).not.toBeNull();
    expect(within(tracks).getByText("예정")).not.toBeNull();
    expect(screen.getByText(/자동으로 바뀌지 않고 담당자가 기록한 값만 표시/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "재계약" })).not.toBeNull();
  });

  it("매매는 임대기간 상태가 없고 재계약 버튼도 없다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 9500,
          dealType: "SALE",
          leasePeriodStatus: null,
          salePrice: 900_000_000,
          depositAmount: null,
          leaseStartDate: null,
          leaseEndDate: null,
        }),
      ],
    });
    renderOffice(<ContractDetailScreen contractId={9500} />, { role: "OWNER" });
    const tracks = await screen.findByRole("list", { name: "계약 세 가지 상태" });
    expect(within(tracks).getByText("해당 없음")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "재계약" })).toBeNull();
    expect(screen.getByText("900,000,000원")).not.toBeNull();
  });

  it("만기가 지난 임대기간은 확인 필요로 표시하되 계약 상태는 체결 그대로다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({ contractId: 9501, leasePeriodStatus: "MATURITY_CONFIRMATION_NEEDED" }),
      ],
    });
    renderOffice(<ContractDetailScreen contractId={9501} />, { role: "OWNER" });
    const tracks = await screen.findByRole("list", { name: "계약 세 가지 상태" });
    expect(within(tracks).getByText("만기 도래·확인 필요")).not.toBeNull();
    expect(within(tracks).getByText("체결")).not.toBeNull();
  });

  it("초안은 상태 변경 버튼과 버전 이력이 없고 초안 수정 링크가 있다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 9502,
          contractStatus: "DRAFT",
          leasePeriodStatus: null,
          settlementStatus: "UNDECIDED",
          currentRevisionId: null,
        }),
      ],
    });
    renderOffice(<ContractDetailScreen contractId={9502} />, { role: "OWNER" });
    expect(await screen.findByRole("link", { name: "초안 수정" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "상태 변경" })).toBeNull();
    expect(screen.queryByText("핵심정보 버전 이력")).toBeNull();
    expect(screen.getByText(/초안에는 서류를 올릴 수 없습니다/)).not.toBeNull();
  });
});

describe("계약 상태 변경", () => {
  it("사유와 효력시각을 비우면 필드 오류를 보인다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openStatusDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "상태 변경" }));
    expect(await within(dialog).findByText("바꿀 상태를 선택해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("사유를 입력해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("실제 효력 날짜와 시간을 입력해 주세요.")).not.toBeNull();
  });

  it("종료로 바꾸면 계약 상태만 바뀌고 임대기간과 잔금 상태는 그대로다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openStatusDialog(user);
    await user.selectOptions(within(dialog).getByLabelText(/바꿀 상태/), "ENDED");
    fillEffective(dialog);
    await user.type(within(dialog).getByLabelText("사유"), "만기 정상 종료");
    await user.click(within(dialog).getByRole("button", { name: "상태 변경" }));
    const tracks = await screen.findByRole("list", { name: "계약 세 가지 상태" });
    await waitFor(() => expect(within(tracks).getByText("종료")).not.toBeNull());
    expect(within(tracks).getByText("기간 중")).not.toBeNull();
    expect(within(tracks).getByText("예정")).not.toBeNull();
    expect(await screen.findByText(/체결 → 종료/)).not.toBeNull();
  });

  it("매매 계약에는 해제 선택지가 없다", async () => {
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
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9500} />, { role: "OWNER" });
    const dialog = await openStatusDialog(user);
    const options = Array.from(
      (within(dialog).getByLabelText(/바꿀 상태/) as HTMLSelectElement).options,
    ).map((option) => option.text);
    expect(options).not.toContain("해제");
    expect(options).toContain("무효 (오기록 정정)");
  });

  it("서버가 해제를 거절하면 안내 문구를 보여준다", async () => {
    server.use(
      http.patch("/api/contracts/9101/status", () =>
        errorResponse(409, "SALE_CANNOT_TERMINATE", "매매는 해제할 수 없습니다."),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openStatusDialog(user);
    await user.selectOptions(within(dialog).getByLabelText(/바꿀 상태/), "TERMINATED");
    fillEffective(dialog);
    await user.type(within(dialog).getByLabelText("사유"), "합의 해제");
    await user.click(within(dialog).getByRole("button", { name: "상태 변경" }));
    expect(await within(dialog).findByText(/매매 계약은 해제로 바꿀 수 없습니다/)).not.toBeNull();
  });

  it("버전 충돌과 상태 전이 오류, 429를 구분해 안내한다", async () => {
    const user = userEvent.setup();
    server.use(http.patch("/api/contracts/9101/status", () => mockErrors.versionConflict(5)));
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    let dialog = await openStatusDialog(user);
    await user.selectOptions(within(dialog).getByLabelText(/바꿀 상태/), "CANCELLED");
    fillEffective(dialog);
    await user.type(within(dialog).getByLabelText("사유"), "취소");
    await user.click(within(dialog).getByRole("button", { name: "상태 변경" }));
    expect(await within(dialog).findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
    server.use(
      http.patch("/api/contracts/9101/status", () =>
        errorResponse(409, "INVALID_TRANSITION", "전이 불가"),
      ),
    );
    await user.click(within(dialog).getByRole("button", { name: "상태 변경" }));
    expect(await within(dialog).findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
    server.use(http.patch("/api/contracts/9101/status", () => mockErrors.rateLimited(10)));
    dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "상태 변경" }));
    expect(await within(dialog).findByText(/요청이 너무 많습니다/)).not.toBeNull();
  });
});

describe("잔금 상태 기록", () => {
  it("잔금 상태만 바꾸고 계약 상태는 그대로 둔다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "잔금 상태 기록" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/계약 종료나 중개보수 수납 완료를 뜻하지 않습니다/),
    ).not.toBeNull();
    await user.selectOptions(within(dialog).getByLabelText(/바꿀 잔금 상태/), "COMPLETE");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    const tracks = await screen.findByRole("list", { name: "계약 세 가지 상태" });
    await waitFor(() => expect(within(tracks).getByText("완료")).not.toBeNull());
    expect(within(tracks).getByText("체결")).not.toBeNull();
  });

  it("날짜와 시간 중 하나만 넣으면 함께 입력하라고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "잔금 상태 기록" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/바꿀 잔금 상태/), "PARTIAL");
    fireEvent.change(within(dialog).getByLabelText(/실제 효력 날짜/), {
      target: { value: "2026-11-01" },
    });
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await within(dialog).findByText("날짜와 시간을 함께 입력해 주세요.")).not.toBeNull();
  });
});

describe("효력시각별 이력과 정정 버전", () => {
  it("체결 버전과 상태 변경 이력을 보여주고 자동 변경은 시스템 자동으로 표시한다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract(
          { contractId: 9101 },
          {
            history: [
              {
                track: "CONTRACT",
                fromStatus: null,
                toStatus: "SIGNED",
                reason: null,
                changedByMembershipId: 2,
                changedByMemberName: "이중개",
                effectiveAt: "2026-10-01T00:00:00+09:00",
                supersedesHistoryId: null,
                createdAt: "2026-10-01T10:00:00+09:00",
              },
              {
                track: "LEASE_PERIOD",
                fromStatus: "BEFORE_START",
                toStatus: "IN_PROGRESS",
                reason: null,
                changedByMembershipId: null,
                changedByMemberName: null,
                effectiveAt: "2026-10-15T00:00:00+09:00",
                supersedesHistoryId: null,
                createdAt: "2026-10-15T00:01:00+09:00",
              },
              {
                track: "CONTRACT",
                fromStatus: "ENDED",
                toStatus: "SIGNED",
                reason: "오입력 정정",
                changedByMembershipId: 2,
                changedByMemberName: "이중개",
                effectiveAt: "2026-10-02T00:00:00+09:00",
                supersedesHistoryId: 1,
                createdAt: "2026-10-20T10:00:00+09:00",
              },
            ],
          },
        ),
      ],
    });
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("시작 전 → 기간 중")).not.toBeNull();
    expect(screen.getByText(/시스템 자동/)).not.toBeNull();
    expect(screen.getByText("이전 기록 정정")).not.toBeNull();
    expect(screen.getByText("처음 → 체결")).not.toBeNull();
    expect(screen.getByText("버전 1")).not.toBeNull();
  });

  it("핵심정보를 정정하면 새 버전이 추가되고 바뀐 항목만 이전과 현재로 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "핵심정보 정정" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("체결일"), { target: { value: "2026-10-03" } });
    fillEffective(dialog, "정정 효력");
    await user.type(within(dialog).getByLabelText("정정 사유"), "체결일 오기록");
    await user.click(within(dialog).getByRole("button", { name: "정정 버전 등록" }));
    expect(await screen.findByText("버전 2")).not.toBeNull();
    expect(screen.getByText("정정 사유: 체결일 오기록")).not.toBeNull();
    expect(screen.getByText("체결일: 2026-10-01 → 2026-10-03")).not.toBeNull();
    const request = getMockContractState().contracts[0]?.revisions.at(-1);
    expect(request?.supersedesRevisionId).toBe(9101 * 10 + 1);
  });

  it("정정에는 사유와 효력시각이 필요하다", async () => {
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "핵심정보 정정" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "정정 버전 등록" }));
    expect(await within(dialog).findByText("사유를 입력해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("실제 효력 날짜와 시간을 입력해 주세요.")).not.toBeNull();
  });

  it("다른 사용자가 먼저 정정했으면 최신 값 확인 안내를 보여준다", async () => {
    server.use(
      http.post("/api/contracts/9101/corrections", () =>
        errorResponse(409, "CONTRACT_REVISION_CONFLICT", "최신 버전이 아닙니다."),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "핵심정보 정정" }));
    const dialog = await screen.findByRole("dialog");
    fillEffective(dialog, "정정 효력");
    await user.type(within(dialog).getByLabelText("정정 사유"), "정정");
    await user.click(within(dialog).getByRole("button", { name: "정정 버전 등록" }));
    expect(
      await within(dialog).findByText(/다른 사용자가 먼저 계약 핵심정보를 정정했습니다/),
    ).not.toBeNull();
  });

  it("당사자 번호 오류와 기간 겹침 오류를 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/contracts/9101/corrections", () =>
        errorResponse(400, "INVALID_CONTRACT_PARTY", "당사자 오류"),
      ),
    );
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "핵심정보 정정" }));
    const dialog = await screen.findByRole("dialog");
    fillEffective(dialog, "정정 효력");
    await user.type(within(dialog).getByLabelText("정정 사유"), "정정");
    await user.click(within(dialog).getByRole("button", { name: "정정 버전 등록" }));
    expect(await within(dialog).findByText(/중복으로 보낸 당사자가 있습니다/)).not.toBeNull();
    server.use(
      http.post("/api/contracts/9101/corrections", () =>
        errorResponse(409, "PROPERTY_HAS_ACTIVE_CONTRACT", "겹침"),
      ),
    );
    await user.click(within(dialog).getByRole("button", { name: "정정 버전 등록" }));
    expect(
      await within(dialog).findByText(/기간이 겹치는 체결 계약이 이미 있습니다/),
    ).not.toBeNull();
  });

  it("정정 버전 번호가 첨부 서류의 계약 버전 표시와 맞는다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 9101,
          documents: [
            {
              documentId: 1,
              documentType: "SALES_CONTRACT",
              versionNo: 1,
              contractRevisionId: 9101 * 10 + 1,
              retentionYears: 5,
              piiMaskingConfirmed: false,
            },
          ],
        }),
      ],
    });
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    const item = (await screen.findByText("거래계약서")).closest("li");
    await waitFor(() => expect(item?.textContent).toContain("계약 버전 1"));
    expect(item?.textContent).toContain("문서 버전 1");
  });

  it("버전 비교는 바뀐 항목만 이전과 현재로 만든다", () => {
    const base = buildMockContract({ contractId: 1 }).revisions[0];
    if (!base) throw new Error("revision");
    const changed = {
      ...base,
      previousSnapshot: base.currentSnapshot,
      currentSnapshot: {
        ...base.currentSnapshot,
        depositAmount: 400_000_000,
        signedDate: "2026-10-02",
      },
    };
    expect(describeRevisionChanges(changed)).toEqual([
      "체결일: 2026-10-01 → 2026-10-02",
      "보증금: 300,000,000원 → 400,000,000원",
    ]);
    expect(describeRevisionChanges(base)).toContain("체결일: 2026-10-01");
  });
});

describe("중복 제외와 접근 제한", () => {
  it("대표만 중복 제외 버튼을 보고 제외하면 제외 정보가 표시된다", async () => {
    setMockContractState({
      contracts: [buildMockContract({ contractId: 9101 }), buildMockContract({ contractId: 9102 })],
    });
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9102} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "중복 제외" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(
        (within(dialog).getByLabelText(/중복 대상 계약/) as HTMLSelectElement).options.length,
      ).toBeGreaterThan(1),
    );
    await user.selectOptions(within(dialog).getByLabelText(/중복 대상 계약/), "9101");
    await user.type(within(dialog).getByLabelText("사유"), "같은 계약을 두 번 입력");
    await user.click(within(dialog).getByRole("button", { name: "중복 제외" }));
    expect(await screen.findByText(/중복 제외된 계약입니다/)).not.toBeNull();
    expect(screen.getByText(/같은 계약을 두 번 입력/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "계약 9101" })).not.toBeNull();
  });

  it("중복 제외 사유와 대상이 없으면 오류를 보이고 소속공인중개사에게는 버튼이 없다", async () => {
    const user = userEvent.setup();
    const first = renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "중복 제외" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "중복 제외" }));
    expect(await within(dialog).findByText("중복 대상 계약을 선택해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("사유를 입력해 주세요.")).not.toBeNull();
    first.unmount();
    cleanup();
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "AGENT" });
    await screen.findByRole("button", { name: "핵심정보 정정" });
    expect(screen.queryByRole("button", { name: "중복 제외" })).toBeNull();
  });

  it("서버가 이미 제외된 계약이라고 하면 안내한다", async () => {
    setMockContractState({
      contracts: [buildMockContract({ contractId: 9101 }), buildMockContract({ contractId: 9102 })],
    });
    server.use(
      http.post("/api/contracts/9102/duplicate-exclusion", () =>
        errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "불가"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ContractDetailScreen contractId={9102} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "중복 제외" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(
        (within(dialog).getByLabelText(/중복 대상 계약/) as HTMLSelectElement).options.length,
      ).toBeGreaterThan(1),
    );
    await user.selectOptions(within(dialog).getByLabelText(/중복 대상 계약/), "9101");
    await user.type(within(dialog).getByLabelText("사유"), "중복");
    await user.click(within(dialog).getByRole("button", { name: "중복 제외" }));
    expect(
      await within(dialog).findByText(/지금 계약 상태에서는 할 수 없는 작업입니다/),
    ).not.toBeNull();
  });

  it("중개보조원은 요청 없이 접근 권한 화면을 본다", async () => {
    let called = false;
    server.use(
      http.get("/api/contracts/9101", () => {
        called = true;
        return mockErrors.forbidden();
      }),
    );
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    expect(called).toBe(false);
  });

  it("서버가 403을 돌려주면 접근 권한 화면을 보여준다", async () => {
    server.use(http.get("/api/contracts/9101", () => mockErrors.forbidden()));
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "AGENT" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("없는 계약, 서버 오류, 429를 구분해 보여준다", async () => {
    const first = renderOffice(<ContractDetailScreen contractId={1} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
    first.unmount();
    server.use(http.get("/api/contracts/9101", () => mockErrors.server()));
    const second = renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    second.unmount();
    server.use(http.get("/api/contracts/9101", () => mockErrors.rateLimited(30)));
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });

  it("읽기 전용 상태에서는 변경 버튼이 비활성이다", async () => {
    renderOffice(<ContractDetailScreen contractId={9101} />, { role: "OWNER", isReadOnly: true });
    const button = await screen.findByRole("button", { name: "핵심정보 정정" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "상태 변경" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
