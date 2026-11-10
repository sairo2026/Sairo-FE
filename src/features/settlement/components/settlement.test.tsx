// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { getMockWorkState, resetMockWorkState, setMockWorkState } from "@/mocks/handlers/work";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { currentYearMonth, shiftYearMonth } from "../model/metrics";
import { SettlementDetailsScreen } from "./settlement-details-screen";
import { SettlementScreen } from "./settlement-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn(), search: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => "/settlements",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockWorkState();
  navigation.push.mockClear();
  navigation.search = "";
});

afterAll(() => stopServer());

const THIS_MONTH = currentYearMonth();
const LAST_MONTH = shiftYearMonth(THIS_MONTH, -1);

describe("월말결산 대시보드", () => {
  it("로딩 뒤 이번 달 지표와 집계 중 표시, 기준 시각을 보여준다", async () => {
    renderOffice(<SettlementScreen />, { role: "OWNER" });
    expect(document.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(await screen.findByText("집계 중")).not.toBeNull();
    expect(screen.getByText(/집계 기준 시각 2026-11-10 09:00/)).not.toBeNull();
    expect(screen.getByRole("link", { name: /^잔금 기준 약정보수 3,000,000원/ })).not.toBeNull();
    expect(screen.getByRole("link", { name: /^미수금 500,000원/ })).not.toBeNull();
    expect(screen.getByRole("link", { name: /^초과수납 0원/ })).not.toBeNull();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(11);
  });

  it("현재 월 다음 달로는 이동할 수 없고 이전 달로는 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<SettlementScreen />, { role: "OWNER" });
    await screen.findByText("집계 중");
    expect((screen.getByRole("button", { name: "다음 달" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await user.click(screen.getByRole("button", { name: "이전 달" }));
    expect(navigation.push).toHaveBeenCalledWith(`/settlements?month=${LAST_MONTH}`);
  });

  it("지난 달은 집계 완료로 표시하고 사무소 생성월 이전으로는 이동하지 않는다", async () => {
    navigation.search = "month=2026-08";
    renderOffice(<SettlementScreen />, { role: "OWNER" });
    expect(await screen.findByText("집계 완료")).not.toBeNull();
    expect((screen.getByRole("button", { name: "이전 달" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("사무소 생성월 이전 주소는 이번 달로 보정한다", async () => {
    navigation.search = "month=2020-01";
    renderOffice(<SettlementScreen />, { role: "OWNER" });
    expect(await screen.findByText("집계 중")).not.toBeNull();
    expect(screen.getByText(`${THIS_MONTH.replace("-", "년 ")}월`)).not.toBeNull();
  });

  it("데이터 이전 등록 수와 잔금 예정일 누락 안내를 따로 표시한다", async () => {
    setMockWorkState({ settlement: { agreedFeeUndatedCount: 2, propertyCountNewMigrated: 1 } });
    renderOffice(<SettlementScreen />, { role: "OWNER" });
    expect(
      await screen.findByText(/잔금 예정일이 없어 잔금 기준 약정보수에서 빠진 계약이 2건/),
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: "빠진 계약 보기" }).getAttribute("href")).toBe(
      `/settlements/${THIS_MONTH}/details?metric=agreedFeeUndatedCount`,
    );
    expect(screen.getByText(/데이터 이전으로 등록: 매물/)).not.toBeNull();
  });

  it("지표를 누르면 같은 월의 상세 내역 주소로 이어진다", async () => {
    renderOffice(<SettlementScreen />, { role: "OWNER" });
    const link = await screen.findByRole("link", { name: /^체결 계약 2건/ });
    expect(link.getAttribute("href")).toBe(
      `/settlements/${THIS_MONTH}/details?metric=contractSignedCount`,
    );
  });

  it("중개보조원은 접근 권한 화면을 본다", async () => {
    setMockWorkState({ callerRole: "DEPUTY" });
    renderOffice(<SettlementScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("조회 오류는 다시 시도할 수 있고 429는 대기 안내를 보여준다", async () => {
    server.use(http.get(`/api/settlements/${THIS_MONTH}`, () => mockErrors.server()));
    const user = userEvent.setup();
    const first = renderOffice(<SettlementScreen />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("집계 중")).not.toBeNull();
    first.unmount();
    server.use(http.get("/api/settlements", () => mockErrors.rateLimited(30)));
    renderOffice(<SettlementScreen />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });
});

describe("월간 메모", () => {
  async function renderMemo() {
    const view = renderOffice(<SettlementScreen />, { role: "OWNER" });
    const box = await screen.findByRole("textbox", { name: "월간 메모" });
    return { ...view, box: box as HTMLTextAreaElement };
  }

  it("아직 없는 메모는 비어 있고 처음 저장하면 작성자가 표시된다", async () => {
    const user = userEvent.setup();
    const { box } = await renderMemo();
    expect(box.value).toBe("");
    expect(screen.getByText(/작성 기록 없음/)).not.toBeNull();
    await user.type(box, "이번 달 메모");
    await user.click(screen.getByRole("button", { name: "메모 저장" }));
    expect(await screen.findByText("메모를 저장했습니다.")).not.toBeNull();
    expect(getMockWorkState().memos[THIS_MONTH]?.version).toBe(1);
    expect(await screen.findByText(/이중개/)).not.toBeNull();
  });

  it("2000자를 넘기면 저장하지 않는다", async () => {
    const user = userEvent.setup();
    const { box } = await renderMemo();
    await user.click(box);
    await user.paste("가".repeat(2001));
    await user.click(screen.getByRole("button", { name: "메모 저장" }));
    expect(await screen.findByText("메모는 2000자까지 입력할 수 있습니다.")).not.toBeNull();
    expect(getMockWorkState().memos[THIS_MONTH]).toBeUndefined();
  });

  it("주민번호 패턴은 서버가 거절하고 안내를 보여준다", async () => {
    const user = userEvent.setup();
    const { box } = await renderMemo();
    await user.type(box, "900101-1234567");
    await user.click(screen.getByRole("button", { name: "메모 저장" }));
    expect(
      await screen.findByText(/주민등록번호나 전체 계좌번호는 입력할 수 없습니다/),
    ).not.toBeNull();
  });

  it("다른 사람이 먼저 고쳤으면 최신 메모와 비교해 덮어쓰기를 고른다", async () => {
    const user = userEvent.setup();
    const { box } = await renderMemo();
    setMockWorkState({
      memos: {
        [THIS_MONTH]: {
          content: "동료가 쓴 메모",
          version: 3,
          updatedByMemberName: "김대표",
          updatedAt: "2026-11-10T08:00:00+09:00",
        },
      },
    });
    await user.type(box, "내가 쓴 메모");
    await user.click(screen.getByRole("button", { name: "메모 저장" }));
    const conflict = await screen.findByRole("alertdialog", { name: "메모 충돌" });
    expect(within(conflict).getByText("동료가 쓴 메모")).not.toBeNull();
    expect(within(conflict).getByText("내가 쓴 메모")).not.toBeNull();
    expect(within(conflict).getByText(/김대표/)).not.toBeNull();
    await user.click(within(conflict).getByRole("button", { name: "내 입력으로 덮어쓰기" }));
    await waitFor(() => expect(getMockWorkState().memos[THIS_MONTH]?.content).toBe("내가 쓴 메모"));
    expect(getMockWorkState().memos[THIS_MONTH]?.version).toBe(4);
  });

  it("충돌에서 최신 내용을 고르면 입력창이 최신 메모로 바뀐다", async () => {
    const user = userEvent.setup();
    const { box } = await renderMemo();
    setMockWorkState({
      memos: {
        [THIS_MONTH]: {
          content: "동료가 쓴 메모",
          version: 1,
          updatedByMemberName: "김대표",
          updatedAt: "2026-11-10T08:00:00+09:00",
        },
      },
    });
    await user.type(box, "내 메모");
    await user.click(screen.getByRole("button", { name: "메모 저장" }));
    await user.click(await screen.findByRole("button", { name: "최신 내용 사용" }));
    await waitFor(() =>
      expect(
        (screen.getByRole("textbox", { name: "월간 메모" }) as HTMLTextAreaElement).value,
      ).toBe("동료가 쓴 메모"),
    );
  });

  it("메모 조회가 404이면 찾을 수 없음 화면을 보여준다", async () => {
    server.use(http.get(`/api/settlements/${THIS_MONTH}/memo`, () => mockErrors.notFound()));
    renderOffice(<SettlementScreen />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("저장 요청이 서버 오류를 내면 안내를 보여준다", async () => {
    server.use(
      http.put(`/api/settlements/${THIS_MONTH}/memo`, () =>
        errorResponse(500, "INTERNAL_ERROR", "오류"),
      ),
    );
    const user = userEvent.setup();
    const { box } = await renderMemo();
    await user.type(box, "메모");
    await user.click(screen.getByRole("button", { name: "메모 저장" }));
    expect(
      await screen.findByText("일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요."),
    ).not.toBeNull();
  });
});

describe("월말결산 상세 내역", () => {
  it("지표별 원본 목록을 보여주고 첫 열에서 상세 화면으로 이동한다", async () => {
    navigation.search = "metric=contractSignedCount";
    renderOffice(<SettlementDetailsScreen yearMonth={THIS_MONTH} />, { role: "OWNER" });
    const link = await screen.findByRole("link", { name: "서울특별시 성북구 정릉로 77" });
    expect(link.getAttribute("href")).toBe("/contracts/9101");
    expect(screen.getByText("전세")).not.toBeNull();
    expect(screen.getByText("2026-11-03")).not.toBeNull();
    expect(screen.getByRole("link", { name: "월말결산으로 돌아가기" }).getAttribute("href")).toBe(
      `/settlements?month=${THIS_MONTH}`,
    );
  });

  it("미수금 지표는 지급의무자별 내역을 보여준다", async () => {
    navigation.search = "metric=outstandingAmount";
    renderOffice(<SettlementDetailsScreen yearMonth={THIS_MONTH} />, { role: "OWNER" });
    expect(await screen.findByText("박임대")).not.toBeNull();
    expect(screen.getByText("1,500,000원")).not.toBeNull();
  });

  it("내역이 없으면 빈 안내를 보여준다", async () => {
    navigation.search = "metric=contractSignedCount";
    server.use(
      http.get(`/api/settlements/${THIS_MONTH}/details`, () =>
        Response.json({
          metric: "contractSignedCount",
          yearMonth: THIS_MONTH,
          items: [],
          page: 0,
          size: 25,
          totalElements: 0,
        }),
      ),
    );
    renderOffice(<SettlementDetailsScreen yearMonth={THIS_MONTH} />, { role: "OWNER" });
    expect(await screen.findByText("이 지표에 해당하는 내역이 없습니다.")).not.toBeNull();
  });

  it("알 수 없는 지표나 잘못된 월은 찾을 수 없음 화면이다", async () => {
    navigation.search = "metric=unknown";
    const first = renderOffice(<SettlementDetailsScreen yearMonth={THIS_MONTH} />, {
      role: "OWNER",
    });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
    first.unmount();
    navigation.search = "metric=contractSignedCount";
    renderOffice(<SettlementDetailsScreen yearMonth="2026-13" />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("서버가 400을 내면 오류 안내와 다시 시도 버튼을 보여준다", async () => {
    navigation.search = "metric=contractSignedCount";
    server.use(
      http.get(`/api/settlements/${THIS_MONTH}/details`, () =>
        mockErrors.validation([{ field: "metric", message: "잘못됨" }]),
      ),
    );
    renderOffice(<SettlementDetailsScreen yearMonth={THIS_MONTH} />, { role: "OWNER" });
    expect(await screen.findByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("중개보조원은 접근 권한 화면을 본다", async () => {
    navigation.search = "metric=contractSignedCount";
    renderOffice(<SettlementDetailsScreen yearMonth={THIS_MONTH} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });
});

describe("월 계산", () => {
  it("연도 경계를 넘어 이동한다", () => {
    expect(shiftYearMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftYearMonth("2026-12", 1)).toBe("2027-01");
  });
});
