// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  MOCK_CO_APPROVER_TOKEN,
  MOCK_EXPIRED_TOKEN,
  MOCK_PRIMARY_TOKEN,
  buildMockRequest,
  getMockApproverState,
  resetMockApproverState,
  setMockApproverState,
} from "@/mocks/handlers/visit-approver";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { ApproverLinkScreen } from "./approver-link-screen";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockApproverState();
});

afterAll(() => stopServer());

function renderLink(token: string | undefined = MOCK_PRIMARY_TOKEN) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ApproverLinkScreen token={token} />
    </QueryClientProvider>,
  );
}

async function openTab(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("tab", { name }));
}

async function pickRequest(user: ReturnType<typeof userEvent.setup>, name: string) {
  await openTab(user, "신청 비교·선택");
  await user.click(await screen.findByRole("button", { name }));
  return screen.findByRole("dialog");
}

describe("승인자 링크 화면 조건 등록", () => {
  it("로딩 뒤 적용 중인 조건과 개인정보 안내와 계정 안내를 보여준다", async () => {
    renderLink();
    expect(screen.getByRole("status")).not.toBeNull();
    expect(await screen.findByDisplayValue("30")).not.toBeNull();
    expect(screen.getByText("개인정보 수집 안내")).not.toBeNull();
    expect(screen.getByText(/휴대폰 번호 인증으로 계정을 만들 수 있습니다/)).not.toBeNull();
    expect(screen.getByText(/링크를 폐기해도 계정 접근은 유지되며/)).not.toBeNull();
    expect(screen.getByText(/받는 항목: 방문 가능한 시간과 방문 조건/)).not.toBeNull();
    expect(
      screen.getByText(/출입승인 기간이 끝난 뒤 \d+일 동안 보관하고 삭제합니다/),
    ).not.toBeNull();
    expect(screen.getByText(/고객의 이름과 연락처는 보이지 않습니다/)).not.toBeNull();
    expect(
      screen.getByText("이 링크는 받으신 분만 사용해 주세요. 다른 사람에게 전달하지 마세요."),
    ).not.toBeNull();
    expect(
      screen.getByText(
        /링크 접속 일시와 접속 환경 정보는 원문이 아닌 변환값으로만 1년 동안 보관합니다/,
      ),
    ).not.toBeNull();
    expect(screen.getAllByDisplayValue("10:00").length).toBeGreaterThan(0);
  });

  it("선택을 기다리는 신청이 있으면 신청 비교 탭으로 가는 안내를 먼저 보여준다", async () => {
    const user = userEvent.setup();
    renderLink();
    expect(await screen.findByText(/선택을 기다리는 방문 신청이 \d+건 있습니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "신청 비교·선택으로 이동" }));
    expect(screen.getByRole("tab", { name: "신청 비교·선택" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("형식이 틀린 링크는 서버에 묻지 않고 열 수 없다고 안내한다", async () => {
    renderLink("short");
    expect(await screen.findByText("링크를 열 수 없습니다")).not.toBeNull();
  });

  it("없는 링크는 열 수 없다고 안내한다", async () => {
    renderLink("approver-token-unknown-000001");
    expect(await screen.findByText("링크를 열 수 없습니다")).not.toBeNull();
    expect(screen.getByText(/잘못되었거나 만료/)).not.toBeNull();
  });

  it("만료된 링크는 사무소에 새 링크를 요청하라고 안내한다", async () => {
    renderLink(MOCK_EXPIRED_TOKEN);
    expect(await screen.findByText(/링크가 만료되었습니다/)).not.toBeNull();
  });

  it("요청이 많으면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    server.use(
      http.get("/api/public/approver-property-links/:token/conditions", () =>
        mockErrors.rateLimited(30),
      ),
    );
    renderLink();
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });

  it("서버 오류에는 다시 시도 버튼을 보여준다", async () => {
    server.use(
      http.get("/api/public/approver-property-links/:token/confirmed-schedules", () =>
        mockErrors.server(),
      ),
    );
    renderLink();
    expect(await screen.findByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("활성 조건이 없으면 기본값 3이 채워지고 비우면 제한 없음 문구가 나온다", async () => {
    setMockApproverState({ conditions: [] });
    const user = userEvent.setup();
    renderLink();
    const field = await screen.findByLabelText("하루 최대 방문 횟수");
    expect((field as HTMLInputElement).value).toBe("3");
    await user.clear(field);
    expect(
      screen.getByText("하루 최대 방문 횟수를 비우면 제한 없음으로 저장됩니다."),
    ).not.toBeNull();
  });

  it("가능한 시간대가 하나도 없으면 요청 없이 막고 이유를 안내한다", async () => {
    setMockApproverState({ conditions: [] });
    const user = userEvent.setup();
    renderLink();
    await screen.findByLabelText("하루 최대 방문 횟수");
    await user.click(screen.getByRole("button", { name: "조건 저장" }));
    expect(await screen.findByText(/가능한 시간대를 1개 이상 입력해 주세요/)).not.toBeNull();
    expect(getMockApproverState().conditions).toHaveLength(0);
  });

  it("제외할 시간대만 넣은 날짜는 그날 전체가 방문 불가로 처리된다고 경고한다", async () => {
    setMockApproverState({ conditions: [] });
    const user = userEvent.setup();
    renderLink();
    await screen.findByLabelText("하루 최대 방문 횟수");
    await user.click(screen.getByRole("button", { name: "날짜 예외 추가" }));
    fireEvent.change(screen.getByLabelText("날짜 예외 1 날짜"), {
      target: { value: "2026-12-01" },
    });
    fireEvent.change(screen.getByLabelText("날짜 예외 1 종류"), { target: { value: "EXCLUDE" } });
    expect(await screen.findByText(/2026-12-01에는 제외할 시간대만 있고/)).not.toBeNull();
    fireEvent.change(screen.getByLabelText("날짜 예외 1 종류"), { target: { value: "AVAILABLE" } });
    await waitFor(() =>
      expect(screen.queryByText(/2026-12-01에는 제외할 시간대만 있고/)).toBeNull(),
    );
  });

  it("연속·분산 선호는 아직 신청 목록 순서에 쓰이지 않는다고 안내한다", async () => {
    renderLink();
    expect(await screen.findByText(/아직 신청 목록의 순서에는 쓰이지 않으며/)).not.toBeNull();
  });

  it("범위를 벗어난 값은 요청 없이 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderLink();
    const field = await screen.findByLabelText("하루 최대 방문 횟수");
    await user.clear(field);
    await user.type(field, "30");
    await user.click(screen.getByRole("button", { name: "조건 저장" }));
    expect(await screen.findByText("1 이상 20 이하의 정수로 입력해 주세요.")).not.toBeNull();
    expect(getMockApproverState().conditions).toHaveLength(1);
  });

  it("조건을 저장하면 새 버전이 되고 겹친 시간대는 합쳐졌다고 안내한다", async () => {
    const user = userEvent.setup();
    renderLink();
    await screen.findByLabelText("하루 최대 방문 횟수");
    await user.click(screen.getByRole("button", { name: "월요일 시간대 추가" }));
    await user.click(screen.getByRole("button", { name: "월요일 시간대 추가" }));
    await user.click(screen.getByRole("button", { name: "조건 저장" }));
    expect(await screen.findByText("조건 2번 버전으로 저장했습니다.")).not.toBeNull();
    expect(screen.getByText(/하나로 합쳐 저장했습니다/)).not.toBeNull();
    const active = getMockApproverState().conditions.filter((item) => item.status === "ACTIVE");
    expect(active).toHaveLength(1);
  });

  it("확정 방문에 영향이 있으면 영향을 보여주고 확인한 뒤에만 저장한다", async () => {
    setMockApproverState({
      impactItems: [
        {
          scheduleItemId: 6001,
          scheduledStartAt: "2026-11-18T10:00:00+09:00",
          scheduledEndAt: "2026-11-18T10:30:00+09:00",
          violatedRules: ["MIN_GAP"],
        },
      ],
    });
    const user = userEvent.setup();
    renderLink();
    await screen.findByLabelText("하루 최대 방문 횟수");
    await user.click(screen.getByRole("button", { name: "조건 저장" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("방문 간 최소 간격 위반")).not.toBeNull();
    const save = within(dialog).getByRole("button", { name: "영향을 확인하고 저장" });
    expect(save.getAttribute("aria-disabled")).toBe("true");
    await user.click(within(dialog).getByLabelText("영향을 확인했습니다"));
    await user.click(save);
    expect(await screen.findByText("조건 2번 버전으로 저장했습니다.")).not.toBeNull();
  });

  it("서버가 필드 오류를 보내면 해당 입력 아래에 표시한다", async () => {
    server.use(
      http.put("/api/public/approver-property-links/:token/conditions", () =>
        mockErrors.validation([
          { field: "maxVisitsPerDay", code: "OUT_OF_RANGE", message: "서버에서 거절한 값입니다." },
        ]),
      ),
    );
    const user = userEvent.setup();
    renderLink();
    await screen.findByLabelText("하루 최대 방문 횟수");
    await user.click(screen.getByRole("button", { name: "조건 저장" }));
    expect(await screen.findByText("허용 범위를 벗어났습니다. 값을 확인해 주세요.")).not.toBeNull();
    expect(screen.queryByText(/서버에서/)).toBeNull();
  });

  it("개인정보 안내 버전이 바뀌었으면 다시 확인하라고 안내한다", async () => {
    const user = userEvent.setup();
    renderLink();
    await screen.findByLabelText("하루 최대 방문 횟수");
    setMockApproverState({ noticeVersion: "2026-12" });
    await user.click(screen.getByRole("button", { name: "조건 저장" }));
    expect(await screen.findByText(/개인정보 안내가 바뀌었습니다/)).not.toBeNull();
  });

  it("공동 승인자 링크는 입력을 막고 읽기 전용 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderLink(MOCK_CO_APPROVER_TOKEN);
    expect(await screen.findByText(/공동 승인자는 조건을 입력할 수 없고/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "조건 저장" })).toBeNull();
    await openTab(user, "신청 비교·선택");
    expect(
      screen.getByText(
        /이 링크는 읽기 전용입니다. 조건 입력과 신청 선택은 대표 승인자만 할 수 있습니다/,
      ),
    ).not.toBeNull();
  });

  it("저장 요청이 읽기 전용으로 거절되면 입력을 잠근다", async () => {
    server.use(
      http.put("/api/public/approver-property-links/:token/conditions", () =>
        errorResponse(403, "APPROVER_READ_ONLY", "읽기 전용"),
      ),
    );
    const user = userEvent.setup();
    renderLink();
    await screen.findByLabelText("하루 최대 방문 횟수");
    await user.click(screen.getByRole("button", { name: "조건 저장" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "조건 저장" })).toBeNull());
    expect(screen.getAllByText(/공동 승인자는 조건을/).length).toBeGreaterThan(0);
  });
});

describe("승인자 링크 화면 신청 비교와 선택", () => {
  it("신청 목록에 이전 방문 이력과 신뢰 요약과 선호 표시를 보여주고 고객 정보는 없다", async () => {
    const user = userEvent.setup();
    renderLink();
    await openTab(user, "신청 비교·선택");
    expect(await screen.findByText("사이로공인중개사 · 김중개")).not.toBeNull();
    expect(screen.getByText("내가 지정한 중개사")).not.toBeNull();
    expect(screen.getAllByText(/이전 방문 이력: 완료 2건 · 확정 취소 0건/)).toHaveLength(2);
    expect(
      screen.getByText(/겹치는 신청은 승인 대기로 함께 보이며 확정 예약이 아닙니다/),
    ).not.toBeNull();
    expect(screen.getByText(/자료 없음과 표본 부족은 낮은 평가가 아닙니다/)).not.toBeNull();
    expect(screen.getByText(/약속한 시각에 방문 시작: 대부분 지킴/)).not.toBeNull();
    expect(screen.getByText(/아직 제공하지 않는 미확인 항목/)).not.toBeNull();
    expect(screen.queryByText(/고객 이름|고객 연락처/)).toBeNull();
  });

  it("신청이 없으면 빈 안내를 보여준다", async () => {
    setMockApproverState({ requests: [] });
    const user = userEvent.setup();
    renderLink();
    await openTab(user, "신청 비교·선택");
    expect(await screen.findByText("비교할 신청이 없습니다")).not.toBeNull();
  });

  it("신청을 선택하면 확정되고 겹치는 다른 신청은 시간 마감된다", async () => {
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    await user.type(within(dialog).getByLabelText("선택 메모 (선택 입력)"), "오전이 좋습니다");
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/선택한 신청이 확정되었습니다/)).not.toBeNull();
    expect(screen.getByText(/시간이 겹치는 다른 신청 1건은 시간 마감되었습니다/)).not.toBeNull();
    expect(await screen.findByText("비교할 신청이 없습니다")).not.toBeNull();
    await openTab(user, "확정 일정");
    expect(await screen.findByText("사이로공인중개사 · 김중개")).not.toBeNull();
  });

  it("재검증에 실패하면 사유와 다른 신청 선택 안내를 보여준다", async () => {
    setMockApproverState({
      revalidationFailure: { code: "MIN_GAP", detail: "앞선 방문과 10분 차이입니다." },
    });
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/확정하지 못했습니다/)).not.toBeNull();
    expect(screen.getByText(/방문 간 최소 간격을 지키지 못해 확정하지 못했습니다/)).not.toBeNull();
    expect(
      screen.getByText(/남아 있는 다른 신청을 선택할 수 있습니다|지금 비교할 다른 신청은 없으며/),
    ).not.toBeNull();
  });

  it("중개보조원 한도 잠금으로 재검증에 실패해도 승인자에게는 일반 실패 안내만 보인다", async () => {
    setMockApproverState({
      revalidationFailure: { code: "DEPUTY_VISIT_LOCKED", detail: "" },
    });
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/재검증에 실패해 신청을 확정하지 못했습니다/)).not.toBeNull();
    expect(screen.queryByText(/중개보조원 인원 한도/)).toBeNull();
  });

  it("재검증 실패에 중개사 일정 충돌이 있으면 승인자에게는 일반 표현만 보이고 영문 코드와 상세 원문은 숨긴다", async () => {
    setMockApproverState({
      revalidationFailure: {
        code: "BROKER_CONFLICT",
        detail: "위반한 규칙: BROKER_CONFLICT, CUSTOMER_CONFLICT, MIN_GAP",
      },
    });
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(
      await screen.findByText(/다른 일정과 겹치거나 신청 쪽 사정으로 확정하지 못했습니다/),
    ).not.toBeNull();
    expect(screen.getByText(/방문 간 최소 간격을 지키지 못해 확정하지 못했습니다/)).not.toBeNull();
    expect(screen.queryByText(/BROKER_CONFLICT|CUSTOMER_CONFLICT|위반한 규칙/)).toBeNull();
    expect(screen.queryByText(/담당 중개사|고객의 다른/)).toBeNull();
  });

  it("알 수 없는 재검증 실패 코드는 영문 그대로 보이지 않고 일반 문구로 안내한다", async () => {
    setMockApproverState({
      revalidationFailure: { code: "BRAND_NEW_RULE", detail: "위반한 규칙: BRAND_NEW_RULE" },
    });
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/재검증에 실패해 신청을 확정하지 못했습니다/)).not.toBeNull();
    expect(screen.queryByText(/BRAND_NEW_RULE/)).toBeNull();
  });

  it("조건이 변경되어 재검증에 실패하면 조건 변경 사유를 보여준다", async () => {
    setMockApproverState({
      revalidationFailure: { code: "CONDITION_CHANGED", detail: "위반한 규칙: WINDOW_MISMATCH" },
    });
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/신청한 뒤 조건이 바뀌어 새 조건에 맞지 않아/)).not.toBeNull();
    expect(screen.getByText(/가능한 시간대가 아니어서 확정하지 못했습니다/)).not.toBeNull();
  });

  it("버전이 어긋나면 안내하고 목록을 새로 불러온다", async () => {
    server.use(
      http.post("/api/public/approver-property-links/:token/visit-requests/:requestId/select", () =>
        mockErrors.versionConflict(4),
      ),
    );
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("이미 처리된 신청은 안내한다", async () => {
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    setMockApproverState({
      requests: getMockApproverState().requests.map((item) =>
        item.requestId === 9001 ? { ...item, status: "WITHDRAWN" } : item,
      ),
    });
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/이미 처리되었거나 희망 시작 시각이 지난 신청/)).not.toBeNull();
  });

  it("개인정보 안내 버전이 바뀌면 선택을 거절하고 안내한다", async () => {
    const user = userEvent.setup();
    renderLink();
    const dialog = await pickRequest(user, "김중개 신청 선택");
    setMockApproverState({ noticeVersion: "2026-12" });
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/개인정보 안내가 바뀌었습니다/)).not.toBeNull();
  });
});

describe("승인자 링크 화면 확정 일정", () => {
  it("확정된 방문이 없으면 빈 안내와 발급 사무소 문의처를 보여준다", async () => {
    const user = userEvent.setup();
    renderLink();
    await openTab(user, "확정 일정");
    expect(await screen.findByText("확정된 방문이 없습니다")).not.toBeNull();
    expect(screen.getByText("02-1234-5678")).not.toBeNull();
    expect(screen.getByText(/이 화면에서 요청을 받지 않으니/)).not.toBeNull();
    expect(screen.getByText("받은 변경 신청이 없습니다")).not.toBeNull();
  });

  it("방문별 재조율 필요 표시와 허용받은 사무소 방문 표시를 붙이고 일정은 비우지 않는다", async () => {
    setMockApproverState({
      confirmed: [
        {
          approvalId: 7001,
          scheduleItemId: 6001,
          scheduledStartAt: "2026-11-18T10:00:00+09:00",
          scheduledEndAt: "2026-11-18T10:30:00+09:00",
          result: "SCHEDULED",
          state: "RESCHEDULE_REQUIRED",
          confirmedRequestId: 9001,
          applicantOfficeName: "정릉부동산",
          applicantBrokerName: "박중개",
          applicantRelation: "GRANTED_OFFICE",
        },
      ],
    });
    const user = userEvent.setup();
    renderLink();
    await openTab(user, "확정 일정");
    expect(await screen.findByText("재조율 필요")).not.toBeNull();
    expect(screen.getByText("허용받은 사무소의 방문")).not.toBeNull();
    expect(screen.getByText("정릉부동산 · 박중개")).not.toBeNull();
  });

  it("변경 신청을 선택하면 재승인으로 처리하며 별도 거절 버튼은 없다", async () => {
    setMockApproverState({
      requests: [
        ...getMockApproverState().requests,
        buildMockRequest({ requestId: 9050, requestKind: "CHANGE", applicantBrokerName: "최변경" }),
      ],
    });
    const user = userEvent.setup();
    renderLink();
    await openTab(user, "확정 일정");
    await user.click(await screen.findByRole("button", { name: "최변경 신청 선택" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/재승인으로 처리되며 별도의 거절 버튼은 없습니다/),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: /거절/ })).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "선택하기" }));
    expect(await screen.findByText(/선택한 신청이 확정되었습니다/)).not.toBeNull();
  });

  it("공동 승인자는 확정 일정을 읽기만 한다", async () => {
    const user = userEvent.setup();
    renderLink(MOCK_CO_APPROVER_TOKEN);
    await openTab(user, "확정 일정");
    expect(
      await screen.findByText(/변경 신청을 볼 수 없고 확정 일정만 읽을 수 있습니다/),
    ).not.toBeNull();
  });
});

describe("입력 요소 동작", () => {
  it("날짜 예외와 날짜별 조건을 추가하고 삭제한다", async () => {
    const user = userEvent.setup();
    renderLink();
    await screen.findByLabelText("하루 최대 방문 횟수");
    await user.click(screen.getByRole("button", { name: "날짜 예외 추가" }));
    expect(screen.getByLabelText("날짜 예외 1 날짜")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("날짜 예외 1 종류"), { target: { value: "BLOCK" } });
    expect(screen.queryByLabelText("날짜 예외 1 시작")).toBeNull();
    await user.click(screen.getByRole("button", { name: "날짜 예외 1 삭제" }));
    expect(screen.queryByLabelText("날짜 예외 1 날짜")).toBeNull();
    await user.click(screen.getByRole("button", { name: "날짜별 조건 추가" }));
    fireEvent.change(screen.getByLabelText("하루 최대 방문 횟수 (날짜별 조건 1)"), {
      target: { value: "VALUE" },
    });
    expect(screen.getByLabelText("하루 최대 방문 횟수 값 (날짜별 조건 1)")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "조건 저장" }));
    expect((await screen.findAllByText("날짜를 입력해 주세요.")).length).toBeGreaterThan(0);
  });
});
