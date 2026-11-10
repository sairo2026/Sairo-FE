// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
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
  buildMockOfficeRequest,
  getMockVisitRequestState,
  resetMockVisitRequestState,
  setMockVisitRequestState,
} from "@/mocks/handlers/visit-request";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CoordinationDetailScreen } from "./coordination-detail-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/coordinations/801",
}));

function required<T>(item: T | undefined): T {
  if (item === undefined) throw new Error("대상을 찾지 못했습니다.");
  return item;
}

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockVisitState();
  resetMockVisitRequestState();
  resetMockCustomerState();
  resetMockPropertyState();
});

afterAll(() => stopServer());

const SLOT = { startsAt: "2026-11-12T10:00:00+09:00", endsAt: "2026-11-12T14:00:00+09:00" };

function prepare(overrides: Partial<Parameters<typeof buildMockCandidate>[0]> = {}) {
  setMockVisitState({
    coordinations: [
      buildMockCoordination({
        coordinationId: 801,
        status: "FINAL_CONFIRMATION_REQUIRED",
        candidateProperties: [
          buildMockCandidate({
            candidatePropertyId: 8011,
            propertyId: 501,
            applicableSlots: [SLOT],
            ...overrides,
          }),
        ],
      }),
    ],
  });
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "방문 신청" }));
}

async function pickSlot(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /2026-11-12 10:00/ }));
}

describe("방문 신청", () => {
  it("신청 가능 구간을 고르면 희망 시각이 채워지고 제출하면 신청 대기로 보인다", async () => {
    prepare();
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    expect(
      await screen.findByText(
        /겹치는 승인 대기 신청은 함께 존재할 수 있으며 확정 예약이나 점유가 아닙니다/,
      ),
    ).not.toBeNull();
    await openForm(user);
    expect(screen.getByText("고객의 이름과 연락처는 넣지 마세요.")).not.toBeNull();
    await pickSlot(user);
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(await screen.findByText(/방문 신청을 제출했습니다/)).not.toBeNull();
    const created = getMockVisitRequestState().requests[0];
    expect(created?.requestKind).toBe("NEW");
    expect(created?.requestedStartAt).toBe("2026-11-12T10:00:00+09:00");
    expect(getMockVisitState().coordinations[0]?.status).toBe("APPLYING");
    expect(await screen.findAllByText("신청 대기")).not.toBeNull();
    expect(screen.getByRole("button", { name: "신청 진행 중" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("구간을 고르지 않으면 제출하지 않고 안내한다", async () => {
    prepare();
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(await screen.findByText("신청할 구간을 선택해 주세요.")).not.toBeNull();
    expect(getMockVisitRequestState().requests).toHaveLength(0);
  });

  it("연락처가 들어간 요청사항은 제출하지 않고 막는다", async () => {
    prepare();
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await openForm(user);
    await pickSlot(user);
    const note = screen.getByLabelText(/요청사항/);
    await user.type(note, "010-1234-5678로 연락");
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(await screen.findByText("고객의 연락처는 요청사항에 넣을 수 없습니다.")).not.toBeNull();
    expect(getMockVisitRequestState().requests).toHaveLength(0);
  });

  it("승인자 조건 위반은 위반 규칙을 보여준다", async () => {
    prepare();
    setMockVisitRequestState({ violatedRules: ["MIN_GAP", "MAX_VISITS_PER_DAY"] });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await openForm(user);
    await pickSlot(user);
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(await screen.findByText("다른 방문과의 최소 간격을 지키지 못합니다.")).not.toBeNull();
    expect(screen.getByText("하루 최대 방문 횟수를 넘습니다.")).not.toBeNull();
  });

  it("구성원 동시 신청 한도는 현재 건수를 안내한다", async () => {
    prepare();
    setMockVisitRequestState({ quotaScope: "MEMBERSHIP" });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await openForm(user);
    await pickSlot(user);
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(await screen.findByText(/신청 한도에 도달했습니다 \(현재 40건\)/)).not.toBeNull();
  });

  it("출입승인별 한도는 매물의 신청 대기 한도 문구만 보여준다", async () => {
    prepare();
    setMockVisitRequestState({ quotaScope: "APPROVAL" });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await openForm(user);
    await pickSlot(user);
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(await screen.findByText(/이 매물의 신청 대기 한도에 도달했습니다/)).not.toBeNull();
    expect(screen.queryByText(/현재 \d+건/)).toBeNull();
  });

  it("제출 속도 제한이면 다시 시도할 시간을 안내한다", async () => {
    prepare();
    setMockVisitRequestState({ rateLimited: true });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await openForm(user);
    await pickSlot(user);
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(await screen.findByText(/30초/)).not.toBeNull();
  });

  it("서버가 허용 비활성으로 거절하면 허용한 사무소 문의를 안내한다", async () => {
    prepare();
    server.use(
      http.post("/api/visit-coordinations/801/visit-requests", () =>
        errorResponse(403, "APPLY_GRANT_INACTIVE", "허용 없음"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await openForm(user);
    await pickSlot(user);
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(
      await screen.findByText(/신청 허용이 회수되었거나 만료되어 신청할 수 없습니다/),
    ).not.toBeNull();
  });

  it("같은 후보에 대기 신청이 있으면 중복 안내를 보여준다", async () => {
    prepare();
    server.use(
      http.post("/api/visit-coordinations/801/visit-requests", () =>
        errorResponse(409, "VISIT_REQUEST_DUPLICATE_ACTIVE", "중복"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await openForm(user);
    await pickSlot(user);
    await user.click(screen.getByRole("button", { name: "방문 신청 제출" }));
    expect(await screen.findByText(/신청 대기 중인 신청이 이미 있습니다/)).not.toBeNull();
  });

  it("허용이 회수된 후보는 신청 버튼 대신 안내를 보여준다", async () => {
    prepare({
      crossOffice: true,
      ownerOfficeName: "행복공인중개사",
      grantId: 11,
      grantState: "REVOKED",
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    expect(
      await screen.findByText(
        /허용이 회수되었거나 만료되어 신청할 수 없습니다. 허용한 사무소에 문의해 주세요/,
      ),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "방문 신청" })).toBeNull();
  });

  it("중개보조원은 방문 신청을 낼 수 없다", async () => {
    prepare();
    setMockVisitState({ callerRole: "DEPUTY", deputyAssignedIds: [801] });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "DEPUTY" });
    expect(await screen.findByText("중개보조원은 방문 신청을 낼 수 없습니다.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "방문 신청" })).toBeNull();
  });

  it("신청을 받을 수 없는 조율 상태에서는 새 신청 안내만 보인다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "COORDINATABLE",
          candidateProperties: [
            buildMockCandidate({
              candidatePropertyId: 8011,
              propertyId: 501,
              applicableSlots: [SLOT],
            }),
          ],
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    expect(
      await screen.findByText("지금 조율 상태에서는 새 신청을 낼 수 없습니다."),
    ).not.toBeNull();
  });

  it("구독이 제한된 상태에서는 신청 버튼이 막힌다", async () => {
    prepare();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, {
      role: "AGENT",
      isReadOnly: true,
    });
    const button = await screen.findByRole("button", { name: "방문 신청" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  it("신청 대기 신청을 철회하면 조율 상태가 신청 전으로 돌아온다", async () => {
    prepare();
    setMockVisitState({
      coordinations: getMockVisitState().coordinations.map((item) => ({
        ...item,
        status: "APPLYING",
      })),
    });
    setMockVisitRequestState({ requests: [buildMockOfficeRequest({ requestId: 9501 })] });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "신청 9501 철회" }));
    await waitFor(() => expect(getMockVisitRequestState().requests[0]?.status).toBe("WITHDRAWN"));
    expect(getMockVisitState().coordinations[0]?.status).toBe("FINAL_CONFIRMATION_REQUIRED");
    expect(await screen.findByText("신청 철회")).not.toBeNull();
  });

  it("철회가 버전 충돌이면 안내하고 목록을 다시 받는다", async () => {
    prepare();
    setMockVisitRequestState({ requests: [buildMockOfficeRequest({ requestId: 9501 })] });
    server.use(http.post("/api/visit-requests/9501/withdraw", () => mockErrors.versionConflict(3)));
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "신청 9501 철회" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("이미 처리된 신청의 철회는 상태 오류를 안내한다", async () => {
    prepare();
    setMockVisitRequestState({ requests: [buildMockOfficeRequest({ requestId: 9501 })] });
    server.use(
      http.post("/api/visit-requests/9501/withdraw", () =>
        errorResponse(409, "VISIT_REQUEST_INVALID_STATE", "처리됨"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "신청 9501 철회" }));
    expect(
      await screen.findByText(/이미 처리되었거나 희망 시작 시각이 지난 신청입니다/),
    ).not.toBeNull();
  });

  it("신청 목록 조회가 실패하면 안내를 보여준다", async () => {
    prepare();
    server.use(http.get("/api/visit-coordinations/801/visit-requests", () => mockErrors.server()));
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    expect(await screen.findByText(/신청 목록을 불러오지 못했습니다/)).not.toBeNull();
  });
});

describe("확정 방문 변경과 재승인", () => {
  function confirmed(alternatives: boolean) {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "RESCHEDULE_REQUIRED",
          candidateProperties: [
            buildMockCandidate({
              candidatePropertyId: 8011,
              propertyId: 501,
              applicableSlots: [SLOT],
            }),
            buildMockCandidate({
              candidatePropertyId: 8012,
              propertyId: 502,
              propertyName: "정릉 상가",
            }),
          ],
          scheduleItems: [
            {
              itemId: 5001,
              candidatePropertyId: 8011,
              result: "SCHEDULED",
              state: "RESCHEDULE_REQUIRED",
              scheduledStartAt: "2026-11-13T10:00:00+09:00",
              scheduledEndAt: "2026-11-13T10:30:00+09:00",
              resultRecordedAt: null,
              correctionCount: 0,
              travelFeasibleToNext: false,
            },
            {
              itemId: 5002,
              candidatePropertyId: 8012,
              result: "SCHEDULED",
              state: "VALID",
              scheduledStartAt: "2026-11-13T11:00:00+09:00",
              scheduledEndAt: "2026-11-13T11:30:00+09:00",
              resultRecordedAt: null,
              correctionCount: 0,
              travelFeasibleToNext: true,
            },
          ],
          alternatives: alternatives
            ? [
                {
                  scheduleItemId: 5001,
                  candidatePropertyId: 8011,
                  startAt: "2026-11-12T10:00:00+09:00",
                  endAt: "2026-11-12T10:30:00+09:00",
                  checks: {
                    customer: "OK",
                    broker: "OK",
                    approverCondition: "OK",
                    confirmedVisits: "OK",
                    travel: "OK",
                  },
                },
              ]
            : [],
        }),
      ],
    });
  }

  it("영향받는 방문과 고정되는 방문을 구분해 보여준다", async () => {
    confirmed(true);
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    expect(await screen.findByText("변경 필요")).not.toBeNull();
    expect(screen.getByText("영향 없이 고정")).not.toBeNull();
    expect(screen.getByText("다음 방문까지 이동이 어렵습니다.")).not.toBeNull();
    expect(screen.getByText(/재승인을 받기 전에는 기존 확정이 유지/)).not.toBeNull();
  });

  it("변경안을 고르면 변경 신청이 올라가고 조율 상태는 그대로다", async () => {
    confirmed(true);
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "이 변경안으로 재승인 요청" }));
    expect(await screen.findByText(/변경 신청을 올렸습니다/)).not.toBeNull();
    const created = getMockVisitRequestState().requests[0];
    expect(created?.requestKind).toBe("CHANGE");
    expect(created?.replacesScheduleItemId).toBe(5001);
    expect(getMockVisitState().coordinations[0]?.status).toBe("RESCHEDULE_REQUIRED");
    expect(getMockVisitRequestState().notices[0]?.noticeType).toBe("REAPPROVAL_REQUESTED");
  });

  it("대안이 없으면 방문 제외 안내를 보여준다", async () => {
    confirmed(false);
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    expect(
      await screen.findByText(/대안이 없어 변경이 필요하다는 알림을 보냈습니다/),
    ).not.toBeNull();
  });

  it("직접 고른 구간으로 변경 신청을 낼 수 있다", async () => {
    confirmed(false);
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    const buttons = await screen.findAllByRole("button", { name: "직접 구간 골라 변경 신청" });
    await user.click(required(buttons[0]));
    await user.click(await screen.findByRole("button", { name: /2026-11-12 10:00/ }));
    await user.click(screen.getByRole("button", { name: "변경 신청 제출" }));
    expect(await screen.findByText(/변경 신청을 올렸습니다/)).not.toBeNull();
  });

  it("변경 신청이 승인자 조건에 맞지 않으면 사유를 보여준다", async () => {
    confirmed(true);
    server.use(
      http.post("/api/visit-schedule-items/5001/change-requests", () =>
        errorResponse(422, "APPROVER_CONDITION_VIOLATED", "위반", {
          violatedRules: ["WINDOW_MISMATCH"],
        }),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "이 변경안으로 재승인 요청" }));
    expect(await screen.findByText("승인자가 허용한 시간대가 아닙니다.")).not.toBeNull();
  });

  it("중개보조원은 변경 신청 버튼을 보지 못한다", async () => {
    confirmed(true);
    setMockVisitState({ callerRole: "DEPUTY", deputyAssignedIds: [801] });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "DEPUTY" });
    await screen.findByText("변경 필요");
    expect(screen.queryByRole("button", { name: "직접 구간 골라 변경 신청" })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "이 변경안으로 재승인 요청" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });
});
