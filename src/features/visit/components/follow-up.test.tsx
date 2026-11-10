// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockCustomerState } from "@/mocks/handlers/customer";
import { resetMockPropertyState } from "@/mocks/handlers/property";
import {
  buildMockCandidate,
  buildMockCoordination,
  getMockVisitState,
  resetMockVisitState,
  setMockVisitState,
} from "@/mocks/handlers/visit";
import {
  getMockVisitFollowState,
  resetMockVisitFollowState,
  setMockVisitFollowState,
} from "@/mocks/handlers/visit-follow";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CoordinationDetailScreen } from "./coordination-detail-screen";
import { SupervisionScreen } from "./supervision-screen";
import { validateResult } from "./result-section";
import { validateNotice, EMPTY_NOTICE_FORM } from "./assistant-notice-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/coordinations/801",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockVisitState();
  resetMockVisitFollowState();
  resetMockCustomerState();
  resetMockPropertyState();
});

afterAll(() => stopServer());

function confirmed(overrides: Partial<Parameters<typeof buildMockCoordination>[0]> = {}) {
  return buildMockCoordination({
    status: "CONFIRMED",
    confirmedScheduleVersion: 3,
    candidateProperties: [
      buildMockCandidate({ candidatePropertyId: 8011, propertyId: 501 }),
      buildMockCandidate({
        candidatePropertyId: 8012,
        propertyId: 502,
        propertyName: "허용받은 상가",
        crossOffice: true,
        ownerOfficeName: "다른 사무소",
      }),
    ],
    scheduleItems: [
      {
        itemId: 9101,
        candidatePropertyId: 8011,
        scheduledStartAt: "2026-11-12T10:00:00+09:00",
        scheduledEndAt: "2026-11-12T10:30:00+09:00",
        result: "SCHEDULED",
        state: "VALID",
        resultRecordedAt: null,
        correctionCount: 0,
      },
    ],
    ...overrides,
    coordinationId: 801,
  });
}

function prepare(overrides?: Partial<Parameters<typeof buildMockCoordination>[0]>) {
  setMockVisitState({ coordinations: [confirmed(overrides)] });
}

function fillCompleted(date = "2026-11-09", time = "10:05") {
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("실제 방문 날짜"), { target: { value: date } });
  fireEvent.change(within(dialog).getByLabelText("실제 방문 시각"), { target: { value: time } });
  return dialog;
}

describe("방문 결과 기록", () => {
  it("검증 함수는 완료의 미래 시각과 정정 사유 누락을 걸러낸다", () => {
    const base = {
      result: "COMPLETED",
      date: "2027-01-01",
      time: "10:00",
      cancelReason: "USER_CANCEL",
      correctionReason: "",
    };
    expect(validateResult(base, false, new Date("2026-11-10T00:00:00Z")).date).toContain("미래");
    expect(
      validateResult({ ...base, date: "2026-11-01" }, true, new Date("2026-11-10T00:00:00Z"))
        .correctionReason,
    ).toContain("정정 사유");
    expect(validateResult({ ...base, result: "" }, false).result).toContain("선택");
  });

  it("완료로 기록하면 평가 기한과 승인자 링크 안내를 보여준다", async () => {
    prepare();
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "결과 기록" }));
    fillCompleted();
    await user.click(screen.getByRole("button", { name: "결과 저장" }));
    expect(await screen.findByText(/승인자 평가 입력 기한은/)).not.toBeNull();
    expect(screen.getByText(/직원이 대신 입력할 수 없습니다/)).not.toBeNull();
    expect(getMockVisitState().coordinations[0]?.scheduleItems?.[0]?.result).toBe("COMPLETED");
    expect(getMockVisitState().coordinations[0]?.status).toBe("VISIT_COMPLETED");
    expect(
      await screen.findByRole("link", { name: "승인자 링크 발급 화면으로 이동" }),
    ).not.toBeNull();
  });

  it("실제 방문 시각 없이 저장하면 입력 오류를 보여주고 요청하지 않는다", async () => {
    prepare();
    const handler = vi.fn();
    server.use(
      http.patch("/api/visit-schedule-items/:itemId/result", () => {
        handler();
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "결과 기록" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("실제 방문 날짜"), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "결과 저장" }));
    expect(await screen.findByText("실제 방문 날짜와 시각을 입력해 주세요.")).not.toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it("취소를 고르면 사유 4종과 취소 건수 안내를 보인다", async () => {
    prepare();
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "결과 기록" }));
    await user.selectOptions(screen.getByLabelText("방문 결과"), "CANCELLED");
    const reason = screen.getByLabelText("취소 사유");
    expect(within(reason).getAllByRole("option")).toHaveLength(4);
    expect(screen.getByText(/취소 건수에 들어가지 않습니다/)).not.toBeNull();
    await user.selectOptions(reason, "CUSTOMER_REASON");
    await user.click(screen.getByRole("button", { name: "결과 저장" }));
    await waitFor(() =>
      expect(getMockVisitState().coordinations[0]?.scheduleItems?.[0]?.result).toBe("CANCELLED"),
    );
    expect(getMockVisitState().coordinations[0]?.status).toBe("VISIT_INCOMPLETE");
  });

  it("정정하면 사유를 받고 이력을 보여준다", async () => {
    prepare({
      coordinationId: 801,
      scheduleItems: [
        {
          itemId: 9101,
          candidatePropertyId: 8011,
          scheduledStartAt: "2026-11-09T10:00:00+09:00",
          scheduledEndAt: "2026-11-09T10:30:00+09:00",
          result: "NO_SHOW",
          state: "VALID",
          resultRecordedAt: "2026-11-09T12:00:00+09:00",
          correctionCount: 0,
        },
      ],
    });
    setMockVisitFollowState({
      histories: {
        9101: [
          {
            historyId: 1,
            previousResult: null,
            newResult: "NO_SHOW",
            previousActualVisitedAt: null,
            newActualVisitedAt: null,
            correctionReason: null,
            effectiveAt: "2026-11-09T12:00:00+09:00",
            recordedAt: "2026-11-09T12:00:00+09:00",
            recordedByName: "이중개",
          },
        ],
      },
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "결과 정정" }));
    expect(await screen.findByText(/처음 → 불참/)).not.toBeNull();
    await user.selectOptions(screen.getByLabelText("방문 결과"), "COMPLETED");
    fillCompleted("2026-11-09", "10:10");
    await user.click(screen.getByRole("button", { name: "정정 저장" }));
    expect(await screen.findByText("정정 사유를 입력해 주세요.")).not.toBeNull();
    await user.type(screen.getByLabelText("정정 사유"), "현장 확인 결과 방문함");
    await user.click(screen.getByRole("button", { name: "정정 저장" }));
    await waitFor(() =>
      expect(getMockVisitState().coordinations[0]?.scheduleItems?.[0]?.correctionCount).toBe(1),
    );
    expect(getMockVisitFollowState().histories[9101]).toHaveLength(2);
  });

  it("서버가 취소된 조율을 거절하면 오류를 보여준다", async () => {
    prepare();
    server.use(
      http.patch("/api/visit-schedule-items/:itemId/result", () =>
        errorResponse(409, "INVALID_TRANSITION", "x"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "결과 기록" }));
    fillCompleted();
    await user.click(screen.getByRole("button", { name: "결과 저장" }));
    expect(await screen.findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
  });

  it("권한 오류와 서버 오류도 구분해 안내한다", async () => {
    prepare();
    server.use(
      http.patch("/api/visit-schedule-items/:itemId/result", () => mockErrors.forbidden()),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "결과 기록" }));
    fillCompleted();
    await user.click(screen.getByRole("button", { name: "결과 저장" }));
    expect(await screen.findByText("이 작업을 할 권한이 없습니다.")).not.toBeNull();
  });

  it("조율이 취소된 상태에서는 결과 버튼이 막힌다", async () => {
    prepare({ coordinationId: 801, status: "CANCELLED" });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    const button = await screen.findByRole("button", { name: "결과 기록" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("취소된 조율에는 결과를 기록할 수 없습니다.")).not.toBeNull();
  });
});

describe("재조율과 취소", () => {
  it("재조율로 전환하면 영향 방문과 대안 없음 안내를 보여준다", async () => {
    prepare();
    setMockVisitFollowState({ noAlternativeItemIds: [9101] });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.type(await screen.findByLabelText("재조율이 필요한 이유"), "점유자 변경");
    await user.click(screen.getByRole("button", { name: "재조율 필요로 전환" }));
    expect(await screen.findByText(/재조율 필요로 전환했습니다/)).not.toBeNull();
    expect(screen.getByText(/대안 없음, 이번 조율에서 제외하려면/)).not.toBeNull();
    expect(getMockVisitState().coordinations[0]?.status).toBe("RESCHEDULE_REQUIRED");
  });

  it("출입승인 철회를 접수하면 재조율 필요로 바뀐다", async () => {
    prepare();
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "출입승인 철회 접수" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "철회 접수" }));
    expect(await within(dialog).findByText("출입승인 번호를 숫자로 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText("출입승인 번호"), "7001");
    fireEvent.change(within(dialog).getByLabelText("철회 날짜"), {
      target: { value: "2026-11-09" },
    });
    fireEvent.change(within(dialog).getByLabelText("철회 시각"), { target: { value: "09:00" } });
    await user.type(within(dialog).getByLabelText("철회 사유"), "승인자 철회 통보");
    await user.click(within(dialog).getByRole("button", { name: "철회 접수" }));
    await waitFor(() =>
      expect(getMockVisitState().approvals[0]?.revocationReason).toBe("승인자 철회 통보"),
    );
    expect(getMockVisitState().coordinations[0]?.status).toBe("RESCHEDULE_REQUIRED");
  });

  it("전체 취소와 남은 일정 취소를 구분해 안내한다", async () => {
    prepare({
      coordinationId: 801,
      scheduleItems: [
        {
          itemId: 9101,
          candidatePropertyId: 8011,
          scheduledStartAt: "2026-11-09T10:00:00+09:00",
          scheduledEndAt: "2026-11-09T10:30:00+09:00",
          result: "COMPLETED",
          state: "VALID",
          resultRecordedAt: "2026-11-09T12:00:00+09:00",
          correctionCount: 0,
        },
        {
          itemId: 9102,
          candidatePropertyId: 8012,
          scheduledStartAt: "2026-11-12T10:00:00+09:00",
          scheduledEndAt: "2026-11-12T10:30:00+09:00",
          result: "SCHEDULED",
          state: "VALID",
          resultRecordedAt: null,
          correctionCount: 0,
        },
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "남은 일정 취소" }));
    expect(screen.getByText(/결과는 유지하고 아직 결과가 없는 남은 일정만 취소/)).not.toBeNull();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "남은 일정 취소" }),
    );
    await waitFor(() =>
      expect(getMockVisitState().coordinations[0]?.status).toBe("VISIT_COMPLETED"),
    );
    expect(getMockVisitState().coordinations[0]?.scheduleItems?.[1]?.result).toBe("CANCELLED");
  });

  it("결과가 없으면 전체 취소하고 취소된 조율은 새 기간으로 복제한다", async () => {
    prepare();
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "조율 전체 취소" }));
    expect(screen.getByText(/이전 대기자는 자동으로 올라가지 않고/)).not.toBeNull();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "전체 취소" }));
    await waitFor(() => expect(getMockVisitState().coordinations[0]?.status).toBe("CANCELLED"));
    await user.click(await screen.findByRole("button", { name: "새 기간으로 복제" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "복제해서 새 조율 만들기" }));
    expect(await within(dialog).findByText("방문 가능 시작일을 입력해 주세요.")).not.toBeNull();
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    fireEvent.change(within(dialog).getByLabelText("방문 가능 시작일"), {
      target: { value: soon },
    });
    fireEvent.change(within(dialog).getByLabelText("방문 가능 종료일"), {
      target: { value: later },
    });
    await user.click(within(dialog).getByRole("button", { name: "복제해서 새 조율 만들기" }));
    expect(await within(dialog).findByRole("link", { name: "새 조율 열기" })).not.toBeNull();
    expect(getMockVisitState().coordinations).toHaveLength(2);
  });

  it("구독이 제한되면 복제를 숨기고 취소·철회·결과 기록만 남는다", async () => {
    prepare({ coordinationId: 801, status: "CANCELLED" });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, {
      role: "OWNER",
      isReadOnly: true,
    });
    expect(await screen.findByText(/구독이 제한된 상태입니다/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "새 기간으로 복제" })).toBeNull();
  });

  it("중개보조원에게는 취소·재조율 영역이 보이지 않는다", async () => {
    prepare();
    setMockVisitState({ callerRole: "DEPUTY", deputyAssignedIds: [801] });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "DEPUTY" });
    await screen.findByText("방문 조율 상세");
    expect(screen.queryByText("재조율과 취소")).toBeNull();
  });
});

describe("확정 안내 전달", () => {
  it("안내문과 전달 기록을 보여주고 허용받은 매물은 승인자 안내가 없음을 알린다", async () => {
    prepare();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText("고객 안내문")).not.toBeNull();
    expect(screen.getByText(/승인자 안내문 · 국민대 앞 아파트/)).not.toBeNull();
    expect(screen.getByText(/승인자용 안내문이 만들어지지 않고/)).not.toBeNull();
    expect(screen.getByText("기록된 전달이 없습니다.")).not.toBeNull();
  });

  it("고객에게 전달한 사실을 채널과 시각으로 기록한다", async () => {
    prepare();
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await screen.findByText("고객 안내문");
    await user.click(screen.getByRole("button", { name: "전달 기록 저장" }));
    expect(await screen.findByText("실제 전달 날짜와 시각을 입력해 주세요.")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("실제 전달 날짜"), { target: { value: "2026-11-10" } });
    fireEvent.change(screen.getByLabelText("실제 전달 시각"), { target: { value: "09:30" } });
    await user.click(screen.getByRole("button", { name: "전달 기록 저장" }));
    await waitFor(() => expect(getMockVisitFollowState().deliveries).toHaveLength(1));
    expect(await screen.findByText("전달함")).not.toBeNull();
  });

  it("서버가 승인자 전달 기록을 거절하면 안내한다", async () => {
    prepare();
    server.use(
      http.post("/api/visit-coordinations/:id/confirmation-deliveries", () =>
        errorResponse(409, "INVALID_TRANSITION", "x"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await screen.findByText("고객 안내문");
    fireEvent.change(screen.getByLabelText("실제 전달 날짜"), { target: { value: "2026-11-10" } });
    fireEvent.change(screen.getByLabelText("실제 전달 시각"), { target: { value: "09:30" } });
    await user.click(screen.getByRole("button", { name: "전달 기록 저장" }));
    expect(await screen.findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
  });

  it("안내문 조회가 실패하면 오류를 보여준다", async () => {
    prepare();
    server.use(
      http.get("/api/visit-coordinations/:id/confirmation-messages", () => mockErrors.forbidden()),
    );
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText("이 작업을 할 권한이 없습니다.")).not.toBeNull();
  });
});

describe("보조원 고지와 감독", () => {
  it("검증 함수는 실제 시각과 예외 사유 중 하나만 허용한다", () => {
    expect(validateNotice({ ...EMPTY_NOTICE_FORM, recipientName: "김수요" }).date).toContain(
      "실제 고지",
    );
    expect(
      validateNotice({ ...EMPTY_NOTICE_FORM, recipientName: "김수요", mode: "MISSING" })
        .exceptionReason,
    ).toContain("사유");
    expect(validateNotice({ ...EMPTY_NOTICE_FORM }).recipientName).toContain("이름");
  });

  it("고지를 기록하고 필수 대상 누락 경고를 확인한다", async () => {
    prepare();
    setMockVisitState({ callerRole: "DEPUTY", deputyAssignedIds: [801] });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "DEPUTY" });
    await user.click(await screen.findByRole("button", { name: "보조원 고지 기록" }));
    expect(await screen.findByText(/필수 고지 대상 중 기록되지 않은 대상/)).not.toBeNull();
    expect(screen.getByText(/감독 확인은 대표와 이 조율의 담당 소속공인중개사만/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "고지 기록 추가" }));
    await user.click(screen.getByRole("button", { name: "고지 기록 저장" }));
    expect(await screen.findByText("고지 대상 이름을 입력해 주세요.")).not.toBeNull();
    await user.type(screen.getByLabelText("고지 대상 이름"), "김수요");
    fireEvent.change(screen.getByLabelText("실제 고지 날짜"), { target: { value: "2026-11-09" } });
    fireEvent.change(screen.getByLabelText("실제 고지 시각"), { target: { value: "09:00" } });
    await user.click(screen.getByRole("button", { name: "고지 기록 저장" }));
    await waitFor(() => expect(getMockVisitFollowState().notices).toHaveLength(1));
    expect(await screen.findByText("확인 전")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "고지 내용 확인" })).toBeNull();
  });

  it("대표는 고지를 확인하고 다시 확인하면 거절 안내를 본다", async () => {
    prepare();
    setMockVisitFollowState({
      notices: [
        {
          noticeId: 1,
          scheduleItemId: 9101,
          recipientType: "CUSTOMER",
          recipientName: "김수요",
          noticeMethod: "PHONE",
          notifiedAt: "2026-11-09T09:00:00+09:00",
          missingExceptionReason: null,
          followupAction: null,
          recordedAfterTheFact: true,
          confirmedAt: null,
        },
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "보조원 고지 기록" }));
    expect(await screen.findByText("사후 기록")).not.toBeNull();
    await user.type(screen.getByLabelText("추가 안내 (선택)"), "현장에서 한 번 더 안내");
    server.use(
      http.post(
        "/api/visit-assistant-notices/:noticeId/confirm",
        () => errorResponse(409, "INVALID_TRANSITION", "x"),
        { once: true },
      ),
    );
    await user.click(screen.getByRole("button", { name: "고지 내용 확인" }));
    expect(await screen.findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "고지 내용 확인" }));
    await waitFor(() => expect(getMockVisitFollowState().notices[0]?.confirmedAt).not.toBeNull());
  });
});

describe("보조원 고지 감독 이력", () => {
  it("대표만 보고 로딩과 빈 목록을 거쳐 이력을 보여준다", async () => {
    renderOffice(<SupervisionScreen />, { role: "OWNER" });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("기록된 보조원 고지가 없습니다.")).not.toBeNull();
  });

  it("고지가 있으면 확인 여부를 보여준다", async () => {
    setMockVisitFollowState({
      notices: [
        {
          noticeId: 1,
          scheduleItemId: 9101,
          recipientType: "APPROVER",
          recipientName: "박소유",
          noticeMethod: "SMS",
          notifiedAt: "2026-11-09T09:00:00+09:00",
          missingExceptionReason: null,
          followupAction: null,
          recordedAfterTheFact: false,
          confirmedAt: null,
        },
      ],
    });
    renderOffice(<SupervisionScreen />, { role: "OWNER" });
    expect(await screen.findByText("확인 전")).not.toBeNull();
    expect(screen.getByText("출입 승인자")).not.toBeNull();
  });

  it("대표가 아니면 접근 권한 화면을 보여준다", () => {
    renderOffice(<SupervisionScreen />, { role: "AGENT" });
    expect(screen.getByText(/대표만 볼 수 있습니다/)).not.toBeNull();
  });

  it("서버가 403이나 429를 돌려주면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/visit-assistant-notices", () => mockErrors.rateLimited(30)));
    renderOffice(<SupervisionScreen />, { role: "OWNER" });
    expect(await screen.findByText(/30/)).not.toBeNull();
  });
});
