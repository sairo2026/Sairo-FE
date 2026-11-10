// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { server } from "@/mocks/server";
import {
  EMPTY_PAGE,
  installSystemTestLifecycle,
  isDisabled,
  renderWithMonitor,
} from "../system-common/system-testing";
import { IncidentsScreen } from "./incidents-screen";
import {
  EMPTY_INCIDENT_CREATE,
  EMPTY_PRIVACY_CREATE,
  isStageSelectable,
  nextStage,
  toIncidentCreateBody,
  toIncidentUpdateBody,
  updateInputOf,
  validateIncidentCreate,
  validateIncidentUpdate,
  validatePrivacyCreate,
} from "./incidents-model";
import type { Incident } from "./incidents-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/incidents",
  useSearchParams: () => new URLSearchParams(),
}));

installSystemTestLifecycle();

function fillIncidentForm() {
  fireEvent.change(screen.getByLabelText(/^장애 제목/), { target: { value: "검색 오류" } });
  fireEvent.change(screen.getByLabelText(/^영향 서비스/), { target: { value: "SEARCH, API" } });
  fireEvent.change(screen.getByLabelText("장애 시작 시각 날짜"), {
    target: { value: "2026-11-10" },
  });
  fireEvent.change(screen.getByLabelText("장애 시작 시각 시각"), { target: { value: "09:30" } });
}

function incident(patch: Partial<Incident>): Incident {
  return {
    incidentId: 1,
    title: "예시",
    affectedServices: ["API"],
    affectedOffices: [],
    status: "DETECTED",
    detectedAt: "2026-11-10T09:00:00+09:00",
    startedAt: null,
    recoveredAt: null,
    closedAt: null,
    assignedOperatorId: null,
    rootCause: null,
    responseActions: null,
    customerNotice: null,
    preventionTasks: null,
    summary: null,
    ...patch,
  };
}

async function openUpdate(incidentId: number) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: `장애 ${incidentId} 갱신` }));
  return { user, dialog: screen.getByRole("dialog") };
}

describe("장애 단계 모델", () => {
  it("다음 단계는 순서대로만 계산한다", () => {
    expect(nextStage("DETECTED")).toBe("CONFIRMED");
    expect(nextStage("CONFIRMED")).toBe("RESPONDING");
    expect(nextStage("RESPONDING")).toBe("RECOVERED");
    expect(nextStage("RECOVERED")).toBe("CLOSED");
    expect(nextStage("CLOSED")).toBeNull();
  });

  it("현재 단계 유지와 바로 다음 단계만 선택할 수 있다", () => {
    expect(isStageSelectable("DETECTED", "DETECTED")).toBe(true);
    expect(isStageSelectable("DETECTED", "CONFIRMED")).toBe(true);
    expect(isStageSelectable("DETECTED", "RESPONDING")).toBe(false);
    expect(isStageSelectable("RESPONDING", "CONFIRMED")).toBe(false);
    expect(isStageSelectable("CLOSED", "RECOVERED")).toBe(false);
  });

  it("단계를 건너뛰면 검증 오류를 돌려준다", () => {
    const input = { ...updateInputOf(incident({})), status: "RECOVERED" as const };
    expect(validateIncidentUpdate(input, "DETECTED").status).toBeTruthy();
    expect(validateIncidentUpdate({ ...input, status: "CONFIRMED" }, "DETECTED")).toEqual({});
  });

  it("등록 검증은 제목과 영향 서비스와 시작 시각을 필수로 본다", () => {
    const errors = validateIncidentCreate(EMPTY_INCIDENT_CREATE);
    expect(errors.title).toBeTruthy();
    expect(errors.services).toBeTruthy();
    expect(errors.startedDate).toBeTruthy();
    expect(errors.officeIds).toBeUndefined();
  });

  it("제목이 200자를 넘으면 오류다", () => {
    const base = {
      ...EMPTY_INCIDENT_CREATE,
      services: "API",
      startedDate: "2026-11-10",
      startedTime: "09:00",
    };
    expect(validateIncidentCreate({ ...base, title: "가".repeat(200) }).title).toBeUndefined();
    expect(validateIncidentCreate({ ...base, title: "가".repeat(201) }).title).toBeTruthy();
  });

  it("영향 사무소 번호가 숫자가 아니면 오류다", () => {
    const base = {
      ...EMPTY_INCIDENT_CREATE,
      title: "t",
      services: "API",
      startedDate: "2026-11-10",
      startedTime: "09:00",
    };
    expect(validateIncidentCreate({ ...base, officeIds: "1, a" }).officeIds).toBeTruthy();
    expect(validateIncidentCreate({ ...base, officeIds: "1, 2" }).officeIds).toBeUndefined();
  });

  it("등록 본문은 서버가 정하는 상태와 감지 일시를 담지 않는다", () => {
    const body = toIncidentCreateBody({
      ...EMPTY_INCIDENT_CREATE,
      title: " 제목 ",
      services: "API, BILLING",
      officeIds: "",
      startedDate: "2026-11-10",
      startedTime: "09:30",
    });
    expect(body).toEqual({
      title: "제목",
      affectedServices: ["API", "BILLING"],
      affectedOfficeIds: [],
      startedAt: "2026-11-10T09:30:00+09:00",
    });
  });

  it("갱신 본문은 빈 칸을 보내지 않는다", () => {
    const body = toIncidentUpdateBody({ ...updateInputOf(incident({})), status: "CONFIRMED" });
    expect(body).toEqual({ status: "CONFIRMED" });
  });

  it("개인정보 사고 등록 검증은 필수 입력을 확인한다", () => {
    const errors = validatePrivacyCreate(EMPTY_PRIVACY_CREATE);
    expect(errors.incidentLogId).toBeTruthy();
    expect(errors.affectedScope).toBeTruthy();
    expect(errors.reportRequirement).toBeTruthy();
    expect(errors.noticeRequirement).toBeTruthy();
    expect(errors.reportDueDate).toBeUndefined();
  });

  it("기한은 날짜만 입력하면 오류다", () => {
    const errors = validatePrivacyCreate({ ...EMPTY_PRIVACY_CREATE, noticeDueDate: "2026-11-20" });
    expect(errors.noticeDueDate).toBeTruthy();
  });
});

describe("장애 탭", () => {
  it("장애 목록과 영향 범위와 담당을 보여준다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    expect(await screen.findByText("결제 연동 지연")).toBeTruthy();
    expect(screen.getByText("NOTIFICATION, API")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getAllByText("전체 사무소").length).toBeGreaterThan(0);
    expect(screen.getByText("운영자 7")).toBeTruthy();
    expect(screen.getByText("발송 공급자 장애")).toBeTruthy();
    expect(screen.getByText("대체 경로로 전환")).toBeTruthy();
  });

  it("단계 이름을 배지로 보여준다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    const table = screen.getByRole("table", { name: "장애 목록" });
    expect(within(table).getAllByText("감지").length).toBeGreaterThan(1);
    expect(within(table).getAllByText("대응").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("종료").length).toBeGreaterThan(1);
  });

  it("목록이 비면 안내한다", async () => {
    server.use(http.get("/api/ops/incidents", () => HttpResponse.json(EMPTY_PAGE)));
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    expect(await screen.findByText("등록된 장애가 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/ops/incidents", () => {
        calls += 1;
        return calls === 1 ? mockErrors.server() : HttpResponse.json(EMPTY_PAGE);
      }),
    );
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await userEvent.setup().click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("등록된 장애가 없습니다.")).toBeTruthy();
  });

  it("목록 조회가 403이면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/incidents", () => mockErrors.forbidden()));
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("목록 조회가 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.get("/api/ops/incidents", () => mockErrors.rateLimited(20)));
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    expect(await screen.findByText(/20초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("단계 필터로 목록을 좁힌다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("장애 단계"), "CLOSED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("결제 연동 지연")).toBeNull());
    expect(screen.getByText("검색 지연")).toBeTruthy();
  });

  it("필수 입력이 비면 등록하지 않고 오류를 보인다", async () => {
    const calls = vi.fn();
    server.use(
      http.post("/api/ops/incidents", () => {
        calls();
        return mockErrors.server();
      }),
    );
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    await userEvent.setup().click(screen.getByRole("button", { name: "장애 등록" }));
    expect(await screen.findByText("장애 제목을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("영향 서비스를 1개 이상 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("장애 시작 시각을 입력해 주세요.")).toBeTruthy();
    expect(calls).not.toHaveBeenCalled();
  });

  it("등록하면 감지 단계로 시작한다는 안내와 함께 목록에 나타난다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    expect(
      screen.getByText(/상태는 감지로 시작하고 감지 일시는 서버 시각으로 기록됩니다/),
    ).toBeTruthy();
    fillIncidentForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "장애 등록" }));
    expect(await screen.findByText("장애 14를 감지 단계로 등록했습니다.")).toBeTruthy();
    expect(await screen.findByText("검색 오류")).toBeTruthy();
  });

  it("등록 본문에 상태와 감지 일시와 담당자가 들어가지 않는다", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/incidents", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            incidentId: 99,
            title: "검색 오류",
            status: "DETECTED",
            detectedAt: "2026-11-10T09:31:00+09:00",
            startedAt: "2026-11-10T09:30:00+09:00",
            assignedOperatorId: null,
          },
          { status: 201 },
        );
      }),
    );
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    fillIncidentForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "장애 등록" }));
    await screen.findByText("장애 99를 감지 단계로 등록했습니다.");
    expect(body).toEqual({
      title: "검색 오류",
      affectedServices: ["SEARCH", "API"],
      affectedOfficeIds: [],
      startedAt: "2026-11-10T09:30:00+09:00",
    });
  });

  it("담당 운영자를 선택해 지정하면 본문에 담는다", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/incidents", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            incidentId: 99,
            title: "검색 오류",
            status: "DETECTED",
            detectedAt: "2026-11-10T09:31:00+09:00",
            startedAt: null,
            assignedOperatorId: 5,
          },
          { status: 201 },
        );
      }),
    );
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    fillIncidentForm();
    fireEvent.change(screen.getByLabelText("담당 운영자 번호"), { target: { value: "5" } });
    await userEvent.setup().click(screen.getByRole("button", { name: "장애 등록" }));
    await screen.findByText("장애 99를 감지 단계로 등록했습니다.");
    expect(body.assignedOperatorId).toBe(5);
  });

  it("등록이 400이면 서버 문구를 보인다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    fillIncidentForm();
    fireEvent.change(screen.getByLabelText("담당 운영자 번호"), { target: { value: "999" } });
    await userEvent.setup().click(screen.getByRole("button", { name: "장애 등록" }));
    expect(await screen.findByText(/입력값을 확인해 주세요. 활성 운영자가 아닙니다./)).toBeTruthy();
  });

  it("등록이 403이면 권한 안내를 보인다", async () => {
    server.use(http.post("/api/ops/incidents", () => mockErrors.forbidden()));
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    fillIncidentForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "장애 등록" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("등록이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.post("/api/ops/incidents", () => mockErrors.rateLimited(15)));
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    fillIncidentForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "장애 등록" }));
    expect(await screen.findByText(/15초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("갱신 대화상자는 현재 단계와 바로 다음 단계만 고르게 한다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { dialog } = await openUpdate(11);
    const select = within(dialog).getByRole("combobox", { name: "장애 단계" });
    const option = (name: string) =>
      within(select).getByRole("option", { name }) as HTMLOptionElement;
    expect(option("감지").disabled).toBe(false);
    expect(option("확인").disabled).toBe(false);
    expect(option("대응").disabled).toBe(true);
    expect(option("복구").disabled).toBe(true);
    expect(option("종료").disabled).toBe(true);
  });

  it("종료된 장애는 다른 단계를 고를 수 없다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { dialog } = await openUpdate(13);
    const select = within(dialog).getByRole("combobox", { name: "장애 단계" });
    expect(
      (within(select).getByRole("option", { name: "복구" }) as HTMLOptionElement).disabled,
    ).toBe(true);
    expect(
      (within(select).getByRole("option", { name: "종료" }) as HTMLOptionElement).disabled,
    ).toBe(false);
  });

  it("다음 단계로 바꾸면 목록의 단계가 바뀐다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { user, dialog } = await openUpdate(11);
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "장애 단계" }),
      "CONFIRMED",
    );
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("장애 11를 갱신했습니다.")).toBeTruthy();
    const table = screen.getByRole("table", { name: "장애 목록" });
    await waitFor(() => expect(within(table).getByText("확인")).toBeTruthy());
  });

  it("복구 단계로 바꿀 때 복구 시각과 조치를 함께 보낸다", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.patch("/api/ops/incidents/:incidentId", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...incident({ incidentId: 12, status: "RECOVERED" }),
          recoveredAt: "2026-11-10T11:00:00+09:00",
        });
      }),
    );
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { user, dialog } = await openUpdate(12);
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "장애 단계" }),
      "RECOVERED",
    );
    fireEvent.change(within(dialog).getByLabelText("복구 확인 시각 날짜"), {
      target: { value: "2026-11-10" },
    });
    fireEvent.change(within(dialog).getByLabelText("복구 확인 시각 시각"), {
      target: { value: "11:00" },
    });
    fireEvent.change(within(dialog).getByLabelText("고객 안내"), {
      target: { value: "공지 발송" },
    });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    await screen.findByText("장애 12를 갱신했습니다.");
    expect(body.status).toBe("RECOVERED");
    expect(body.recoveredAt).toBe("2026-11-10T11:00:00+09:00");
    expect(body.customerNotice).toBe("공지 발송");
    expect(body.rootCause).toBe("발송 공급자 장애");
  });

  it("복구 시각을 날짜만 넣으면 오류를 보인다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { user, dialog } = await openUpdate(12);
    fireEvent.change(within(dialog).getByLabelText("복구 확인 시각 날짜"), {
      target: { value: "2026-11-10" },
    });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText("복구 시각은 날짜와 시각을 모두 입력해 주세요."),
    ).toBeTruthy();
  });

  it("담당자를 선택해 지정한다", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.patch("/api/ops/incidents/:incidentId", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(incident({ incidentId: 11, assignedOperatorId: 3 }));
      }),
    );
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { user, dialog } = await openUpdate(11);
    fireEvent.change(within(dialog).getByLabelText("담당 운영자 번호"), { target: { value: "3" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    await screen.findByText("장애 11를 갱신했습니다.");
    expect(body.assignedOperatorId).toBe(3);
    expect(body.status).toBe("DETECTED");
  });

  it("서버가 단계 건너뛰기를 409로 거절하면 안내한다", async () => {
    server.use(
      http.patch("/api/ops/incidents/:incidentId", () =>
        errorResponse(409, "INVALID_TRANSITION", "순서 위반"),
      ),
    );
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { user, dialog } = await openUpdate(11);
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("갱신 대상이 없으면 404 안내를 보인다", async () => {
    server.use(http.patch("/api/ops/incidents/:incidentId", () => mockErrors.notFound()));
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { user, dialog } = await openUpdate(11);
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("활성 운영자가 아닌 담당자는 400 안내를 보인다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { user, dialog } = await openUpdate(11);
    fireEvent.change(within(dialog).getByLabelText("담당 운영자 번호"), {
      target: { value: "999" },
    });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/활성 운영자가 아닙니다/)).toBeTruthy();
  });

  it("종료 시각은 서버 시각으로 기록된다는 안내를 둔다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    const { dialog } = await openUpdate(11);
    expect(
      within(dialog).getByText(/종료 시각은 종료로 바꾸는 시점의 서버 시각으로 기록됩니다/),
    ).toBeTruthy();
  });
});

describe("역할별 탭", () => {
  it("운영담당만 있으면 장애 탭만 보인다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS"]);
    await screen.findByText("결제 연동 지연");
    expect(screen.getByRole("tab", { name: "장애" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "개인정보 사고" })).toBeNull();
  });

  it("개인정보담당만 있으면 개인정보 사고 탭만 보이고 장애 등록 폼이 없다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["PRIVACY"]);
    expect(await screen.findByText("정보주체 통지 필요")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "장애" })).toBeNull();
    expect(screen.queryByRole("form", { name: "장애 등록" })).toBeNull();
  });

  it("두 역할을 모두 가지면 두 탭이 보이고 탭을 옮길 수 있다", async () => {
    renderWithMonitor(<IncidentsScreen />, ["OPS", "PRIVACY"]);
    await screen.findByText("결제 연동 지연");
    await userEvent.setup().click(screen.getByRole("tab", { name: "개인정보 사고" }));
    expect(await screen.findByText("정보주체 통지 필요")).toBeTruthy();
  });

  it("두 역할이 모두 없으면 접근 불가 안내를 보인다", () => {
    renderWithMonitor(<IncidentsScreen />, ["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });
});

describe("개인정보 사고 탭", () => {
  async function renderPrivacy() {
    renderWithMonitor(<IncidentsScreen />, ["PRIVACY"]);
    await screen.findByText("정보주체 통지 필요");
  }

  function fillPrivacyForm(logId = "11") {
    fireEvent.change(screen.getByLabelText(/^연결할 장애 번호/), { target: { value: logId } });
    fireEvent.change(screen.getByLabelText("사고 대상과 범위"), {
      target: { value: "연락처 3건" },
    });
    fireEvent.change(screen.getByLabelText("신고 요건 판단"), { target: { value: "해당 없음" } });
    fireEvent.change(screen.getByLabelText("통지 요건 판단"), { target: { value: "통지 필요" } });
  }

  it("목록에 증빙 미등록 상태와 담당자를 보여준다", async () => {
    await renderPrivacy();
    expect(screen.getByText("증빙 미등록")).toBeTruthy();
    expect(screen.getByText("운영자 7")).toBeTruthy();
    expect(screen.getByText("가입 사무소 1곳의 고객 연락처")).toBeTruthy();
  });

  it("담당자 자동 지정과 증빙 분리 안내를 둔다", async () => {
    await renderPrivacy();
    expect(
      screen.getByText(/담당자는 등록하는 운영자로 자동 지정되고 직접 고를 수 없습니다/),
    ).toBeTruthy();
    expect(screen.getByText(/조치 증빙은 등록한 뒤에 따로 추가합니다/)).toBeTruthy();
    expect(screen.queryByLabelText("담당 운영자 번호")).toBeNull();
  });

  it("목록이 비면 안내한다", async () => {
    server.use(http.get("/api/ops/privacy-incidents", () => HttpResponse.json(EMPTY_PAGE)));
    renderWithMonitor(<IncidentsScreen />, ["PRIVACY"]);
    expect(await screen.findByText("등록된 개인정보 사고가 없습니다.")).toBeTruthy();
  });

  it("목록이 403이면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/privacy-incidents", () => mockErrors.forbidden()));
    renderWithMonitor(<IncidentsScreen />, ["PRIVACY"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("필수 입력이 비면 등록하지 않는다", async () => {
    await renderPrivacy();
    await userEvent.setup().click(screen.getByRole("button", { name: "사고 등록" }));
    expect(await screen.findByText("연결할 장애 번호를 숫자로 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("사고 대상과 범위를 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("신고 요건 판단 내용을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("통지 요건 판단 내용을 입력해 주세요.")).toBeTruthy();
  });

  it("등록하면 담당자가 등록자로 지정된다는 결과를 보이고 본문에 담당자를 보내지 않는다", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/privacy-incidents", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            privacyIncidentId: 30,
            incidentLogId: 11,
            reportDueAt: null,
            noticeDueAt: null,
            assignedOperatorId: 1,
            createdAt: "2026-11-10T09:00:00+09:00",
          },
          { status: 201 },
        );
      }),
    );
    await renderPrivacy();
    fillPrivacyForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "사고 등록" }));
    expect(
      await screen.findByText(/개인정보 사고 30를 등록했습니다. 담당자는 등록한 운영자\(1\)/),
    ).toBeTruthy();
    expect(body).toEqual({
      incidentLogId: 11,
      affectedScope: "연락처 3건",
      reportRequirement: "해당 없음",
      noticeRequirement: "통지 필요",
    });
  });

  it("신고 기한과 통지 기한을 입력하면 서울 시각으로 보낸다", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/privacy-incidents", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            privacyIncidentId: 31,
            incidentLogId: 11,
            reportDueAt: null,
            noticeDueAt: null,
            assignedOperatorId: 1,
            createdAt: "2026-11-10T09:00:00+09:00",
          },
          { status: 201 },
        );
      }),
    );
    await renderPrivacy();
    fillPrivacyForm();
    fireEvent.change(screen.getByLabelText("통지 기한 날짜"), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByLabelText("통지 기한 시각"), { target: { value: "18:00" } });
    await userEvent.setup().click(screen.getByRole("button", { name: "사고 등록" }));
    await screen.findByText(/개인정보 사고 31를 등록했습니다/);
    expect(body.noticeDueAt).toBe("2026-11-20T18:00:00+09:00");
    expect(body.reportDueAt).toBeUndefined();
  });

  it("등록한 사고가 목록에 나타난다", async () => {
    await renderPrivacy();
    fillPrivacyForm("11");
    await userEvent.setup().click(screen.getByRole("button", { name: "사고 등록" }));
    expect(await screen.findByText("연락처 3건")).toBeTruthy();
  });

  it("없는 장애에 연결하면 404 안내를 보인다", async () => {
    await renderPrivacy();
    fillPrivacyForm("999");
    await userEvent.setup().click(screen.getByRole("button", { name: "사고 등록" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("이미 사고가 연결된 장애는 400 안내를 보인다", async () => {
    await renderPrivacy();
    fillPrivacyForm("12");
    await userEvent.setup().click(screen.getByRole("button", { name: "사고 등록" }));
    expect(await screen.findByText(/이미 개인정보 사고가 등록된 장애입니다/)).toBeTruthy();
  });

  it("등록이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.post("/api/ops/privacy-incidents", () => mockErrors.rateLimited(40)));
    await renderPrivacy();
    fillPrivacyForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "사고 등록" }));
    expect(await screen.findByText(/40초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("증빙은 등록 뒤에 따로 추가하고 사유가 비면 저장할 수 없다", async () => {
    await renderPrivacy();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "사고 21 증빙 추가" }));
    const dialog = screen.getByRole("dialog");
    expect(isDisabled(within(dialog).getByRole("button", { name: "증빙 저장" }))).toBe(true);
    await user.type(within(dialog).getByLabelText("증빙 보관 위치"), "신고 접수증 보관함 #2026-11");
    expect(isDisabled(within(dialog).getByRole("button", { name: "증빙 저장" }))).toBe(false);
  });

  it("증빙을 저장하면 목록에 보관 위치가 나타난다", async () => {
    await renderPrivacy();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "사고 21 증빙 추가" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("증빙 보관 위치"), "신고 접수증 보관함 #2026-11");
    await user.click(within(dialog).getByRole("button", { name: "증빙 저장" }));
    expect(await screen.findByText("사고 21의 조치 증빙을 저장했습니다.")).toBeTruthy();
    expect(await screen.findByText("신고 접수증 보관함 #2026-11")).toBeTruthy();
  });

  it("증빙 저장이 404이면 대화상자에 안내한다", async () => {
    server.use(http.patch("/api/ops/privacy-incidents/:id", () => mockErrors.notFound()));
    await renderPrivacy();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "사고 21 증빙 추가" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("증빙 보관 위치"), "위치");
    await user.click(within(dialog).getByRole("button", { name: "증빙 저장" }));
    expect(await within(dialog).findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("증빙 저장이 403이면 대화상자에 권한 안내를 보인다", async () => {
    server.use(http.patch("/api/ops/privacy-incidents/:id", () => mockErrors.forbidden()));
    await renderPrivacy();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "사고 21 증빙 추가" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("증빙 보관 위치"), "위치");
    await user.click(within(dialog).getByRole("button", { name: "증빙 저장" }));
    expect(
      await within(dialog).findByText("이 처리를 할 수 있는 운영 역할이 아닙니다."),
    ).toBeTruthy();
  });
});
