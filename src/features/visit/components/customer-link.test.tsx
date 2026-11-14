// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  MOCK_CUSTOMER_EXPIRED_TOKEN,
  MOCK_CUSTOMER_TOKEN,
  getMockVisitFollowState,
  resetMockVisitFollowState,
  setMockVisitFollowState,
} from "@/mocks/handlers/visit-follow";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { CustomerLinkScreen } from "./customer-link-screen";
import {
  acceptsCustomerResponse,
  parseSubmittedSlots,
  toSubmitSlots,
  validateSlots,
} from "../model/customer-times";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockVisitFollowState();
});

afterAll(() => stopServer());

function renderLink(token: string | undefined = MOCK_CUSTOMER_TOKEN) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <CustomerLinkScreen token={token} />
    </QueryClientProvider>,
  );
}

const WINDOW = { startDate: "2026-11-11", endDate: "2026-11-20" };
const NOW = new Date("2026-11-10T00:00:00Z");

describe("고객 시간 입력 모델", () => {
  it("빈 목록, 순서 오류, 기간 밖, 지난 시간을 걸러낸다", () => {
    expect(validateSlots([], WINDOW, NOW).formError).toContain("한 개 이상");
    const base = { key: 1, date: "2026-11-12", start: "10:00", end: "11:00" };
    expect(validateSlots([base], WINDOW, NOW).errors[1]).toBeUndefined();
    expect(validateSlots([{ ...base, end: "09:00" }], WINDOW, NOW).errors[1]).toContain("늦어야");
    expect(validateSlots([{ ...base, date: "2026-12-01" }], WINDOW, NOW).errors[1]).toContain(
      "방문 가능 기간",
    );
    expect(validateSlots([{ ...base, start: "" }], WINDOW, NOW).errors[1]).toContain("모두 입력");
    expect(
      validateSlots([{ ...base, date: "2026-11-11" }], WINDOW, new Date("2026-11-12T00:00:00Z"))
        .errors[1],
    ).toContain("지난 시간");
  });

  it("이미 낸 시간이 있으면 빈 목록을 제출 취소로 허용한다", () => {
    expect(validateSlots([], WINDOW, NOW, true)).toEqual({ errors: {} });
  });

  it("백엔드가 받는 상태와 제출 마감으로 제출 가능 여부를 정한다", () => {
    const later = "2026-11-17T09:00:00+09:00";
    expect(acceptsCustomerResponse("TIME_COLLECTING", later, NOW)).toBe(true);
    expect(acceptsCustomerResponse("RESCHEDULE_REQUIRED", later, NOW)).toBe(true);
    expect(acceptsCustomerResponse("CONFIRMED", later, NOW)).toBe(false);
    expect(acceptsCustomerResponse("APPLYING", later, NOW)).toBe(false);
    expect(acceptsCustomerResponse("TIME_COLLECTING", "2026-11-09T09:00:00+09:00", NOW)).toBe(
      false,
    );
  });

  it("제출 형식으로 바꾸고 서버 값은 안전하게 해석한다", () => {
    expect(toSubmitSlots([{ key: 1, date: "2026-11-12", start: "10:00", end: "11:00" }])).toEqual([
      { startsAt: "2026-11-12T10:00:00+09:00", endsAt: "2026-11-12T11:00:00+09:00" },
    ]);
    expect(parseSubmittedSlots(null)).toEqual([]);
    expect(parseSubmittedSlots([{ startsAt: "a", endsAt: "b" }])).toHaveLength(1);
  });
});

describe("고객 공개 링크 화면", () => {
  it("불러오는 동안 로딩을 보이고 사무소·담당자·후보 매물·개인정보 안내를 보여준다", async () => {
    renderLink();
    expect(document.querySelector('[role="status"], [aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("사이로 공인중개사사무소")).not.toBeNull();
    expect(screen.getByText(/담당 이중개 \(소속공인중개사\)/)).not.toBeNull();
    expect(screen.getByText(/국민대 앞 아파트/)).not.toBeNull();
    expect(screen.getByText("개인정보 수집 안내")).not.toBeNull();
    expect(screen.getByText("받는 항목: 방문 가능한 시간")).not.toBeNull();
    expect(screen.getByText("제출하면 위 안내를 확인한 것으로 처리됩니다.")).not.toBeNull();
    expect(screen.queryByLabelText("개인정보 수집 안내를 확인했습니다")).toBeNull();
    expect(screen.getByText(/방문 가능 기간은 2026-11-11 ~ 2026-11-20/)).not.toBeNull();
  });

  it("담당자가 중개보조원이면 신분 고지 문구를 보여준다", async () => {
    setMockVisitFollowState({
      customerLink: { ...getMockVisitFollowState().customerLink, managerLegalRole: "ASSISTANT" },
    });
    renderLink();
    expect(await screen.findByText(/중개보조원은 공인중개사가 아니며/)).not.toBeNull();
  });

  it("시간을 추가하고 안내를 확인한 뒤 제출하면 저장된다", async () => {
    const user = userEvent.setup();
    renderLink();
    await user.click(await screen.findByRole("button", { name: "가능한 시간 추가" }));
    fireEvent.change(screen.getByLabelText("1번째 날짜"), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText("1번째 시작"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("1번째 종료"), { target: { value: "11:00" } });
    await user.click(screen.getByRole("button", { name: "가능한 시간 제출" }));
    expect(
      await screen.findByText(/방문 가능 기간\(2026-11-11 ~ 2026-11-20\) 안에서 골라 주세요/),
    ).not.toBeNull();
    fireEvent.change(screen.getByLabelText("1번째 날짜"), { target: { value: "2026-11-19" } });
    await user.click(screen.getByRole("button", { name: "가능한 시간 제출" }));
    expect(await screen.findByText("가능한 시간을 제출했습니다.")).not.toBeNull();
    expect(getMockVisitFollowState().customerSubmitted).toHaveLength(1);
  });

  it("시간이 없으면 제출하지 않고 안내한다", async () => {
    const user = userEvent.setup();
    renderLink();
    await screen.findByRole("button", { name: "가능한 시간 제출" });
    await user.click(screen.getByRole("button", { name: "가능한 시간 제출" }));
    expect(await screen.findByText("가능한 시간을 한 개 이상 추가해 주세요.")).not.toBeNull();
    expect(getMockVisitFollowState().customerSubmitted).toHaveLength(0);
  });

  it("이미 낸 시간은 채워 보이고 수정해 다시 제출할 수 있다", async () => {
    setMockVisitFollowState({
      customerSubmitted: [
        { startsAt: "2026-11-19T10:00:00+09:00", endsAt: "2026-11-19T11:00:00+09:00" },
      ],
    });
    const user = userEvent.setup();
    renderLink();
    expect(await screen.findByDisplayValue("2026-11-19")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "가능한 시간 수정 제출" }));
    expect(await screen.findByText("가능한 시간을 제출했습니다.")).not.toBeNull();
  });

  it("이미 낸 시간을 모두 지우고 제출하면 제출 취소로 보낸다", async () => {
    setMockVisitFollowState({
      customerSubmitted: [
        { startsAt: "2026-11-19T10:00:00+09:00", endsAt: "2026-11-19T11:00:00+09:00" },
      ],
    });
    const user = userEvent.setup();
    renderLink();
    await screen.findByDisplayValue("2026-11-19");
    await user.click(screen.getByRole("button", { name: "1번째 시간 삭제" }));
    expect(screen.getByText(/앞서 보낸 가능한 시간이 모두 취소됩니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "제출한 시간 모두 취소" }));
    expect(await screen.findByText("가능한 시간을 제출했습니다.")).not.toBeNull();
    expect(getMockVisitFollowState().customerSubmitted).toHaveLength(0);
  });

  it("고객 응답을 받지 않는 조율 상태면 제출할 수 없다", async () => {
    setMockVisitFollowState({
      customerLink: { ...getMockVisitFollowState().customerLink, coordinationStatus: "CONFIRMED" },
    });
    renderLink();
    const button = await screen.findByRole("button", { name: "가능한 시간 제출" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("지금은 가능한 시간을 제출하거나 고칠 수 없습니다.")).not.toBeNull();
  });

  it("시간을 삭제할 수 있다", async () => {
    const user = userEvent.setup();
    renderLink();
    await user.click(await screen.findByRole("button", { name: "가능한 시간 추가" }));
    await user.click(screen.getByRole("button", { name: "1번째 시간 삭제" }));
    expect(screen.queryByLabelText("1번째 날짜")).toBeNull();
  });

  it("개인정보 안내 버전이 바뀌면 새로 고치라고 안내한다", async () => {
    server.use(
      http.post("/api/public/customer-visit-links/:token/available-times", () =>
        errorResponse(409, "NOTICE_VERSION_CHANGED", "x"),
      ),
    );
    setMockVisitFollowState({
      customerSubmitted: [
        { startsAt: "2026-11-19T10:00:00+09:00", endsAt: "2026-11-19T11:00:00+09:00" },
      ],
    });
    const user = userEvent.setup();
    renderLink();
    await screen.findByDisplayValue("2026-11-19");
    await user.click(screen.getByRole("button", { name: "가능한 시간 수정 제출" }));
    expect(
      await screen.findByText(/개인정보 안내가 바뀌었습니다. 내용을 확인한 뒤 다시 제출해 주세요/),
    ).not.toBeNull();
  });

  it("제출 속도 제한에 걸리면 대기 시간을 안내한다", async () => {
    server.use(
      http.post("/api/public/customer-visit-links/:token/available-times", () =>
        mockErrors.rateLimited(20),
      ),
    );
    setMockVisitFollowState({
      customerSubmitted: [
        { startsAt: "2026-11-19T10:00:00+09:00", endsAt: "2026-11-19T11:00:00+09:00" },
      ],
    });
    const user = userEvent.setup();
    renderLink();
    await screen.findByDisplayValue("2026-11-19");
    await user.click(screen.getByRole("button", { name: "가능한 시간 수정 제출" }));
    expect(await screen.findByText(/20초/)).not.toBeNull();
  });

  it("만료된 링크와 잘못된 링크는 같은 문구로 안내한다", async () => {
    const expected =
      /이 링크는 사용할 수 없습니다. 만료되었거나 새 링크로 바뀌었을 수 있습니다. 새 링크가 필요하면 방문을 조율하는 사무소로 문의해 주세요. 입력하신 내용은 정해진 보관 기간이 지나면 삭제됩니다./;
    renderLink(MOCK_CUSTOMER_EXPIRED_TOKEN);
    expect(await screen.findByText(expected)).not.toBeNull();
    cleanup();
    renderLink("unknown-token-0000001");
    expect(await screen.findByText(expected)).not.toBeNull();
    cleanup();
    renderLink("짧음");
    expect(await screen.findByText(expected)).not.toBeNull();
  });

  it("서버 오류가 나면 다시 시도 안내를 보여준다", async () => {
    server.use(http.get("/api/public/customer-visit-links/:token", () => mockErrors.forbidden()));
    renderLink();
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
  });

  it("확정 일정 탭은 일정이 없으면 안내하고 있으면 동선을 읽기 전용으로 보여준다", async () => {
    const user = userEvent.setup();
    renderLink();
    await user.click(await screen.findByRole("tab", { name: "확정 일정" }));
    expect(await screen.findByText("확정된 일정이 아직 없습니다")).not.toBeNull();
    cleanup();
    setMockVisitFollowState({
      customerConfirmed: {
        state: "VALID",
        scheduleVersion: 2,
        managerDisplayName: "이중개",
        managerLegalRole: "AFFILIATED_AGENT",
        officeContactPhone: "02-1234-5678",
        items: [
          {
            sortOrder: 1,
            scheduledStartAt: "2026-11-12T10:00:00+09:00",
            scheduledEndAt: "2026-11-12T10:30:00+09:00",
            propertyAddress: "서울특별시 성북구 정릉로 77",
            travelDurationMinutes: 15,
          },
        ],
      },
    });
    renderLink();
    await user.click(await screen.findByRole("tab", { name: "확정 일정" }));
    expect(await screen.findByText(/1\. 서울특별시 성북구 정릉로 77/)).not.toBeNull();
    expect(screen.getByText(/다음 방문까지 이동 15분/)).not.toBeNull();
    expect(screen.getByText(/24시간까지만 볼 수 있습니다/)).not.toBeNull();
  });

  it("취소·재조율 필요·대체된 일정은 비우고 사무소 문의를 안내한다", async () => {
    setMockVisitFollowState({
      customerConfirmed: {
        state: "RESCHEDULE_REQUIRED",
        scheduleVersion: 2,
        managerDisplayName: "이중개",
        managerLegalRole: "ASSISTANT",
        officeContactPhone: "02-1234-5678",
        items: [],
      },
    });
    const user = userEvent.setup();
    renderLink();
    await user.click(await screen.findByRole("tab", { name: "확정 일정" }));
    const panel = await screen.findByRole("tabpanel");
    expect(await within(panel).findByText("일정을 표시할 수 없습니다")).not.toBeNull();
    expect(within(panel).getByText("재조율 필요")).not.toBeNull();
    await waitFor(() =>
      expect(within(panel).getByRole("link", { name: "02-1234-5678" })).not.toBeNull(),
    );
  });
});
