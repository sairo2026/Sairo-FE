// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
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
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CoordinationDetailScreen } from "./coordination-detail-screen";

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
  resetMockCustomerState();
  resetMockPropertyState();
});

afterAll(() => stopServer());

const grant = {
  grantId: 31,
  approvalId: 7100,
  propertyId: 9001,
  ownerOfficeId: 77,
  ownerOfficeName: "행복공인중개사",
  scope: "OFFICE" as const,
  propertyName: "허용 오피스텔",
  propertyAddress: "서울특별시 종로구 세종로 1",
  categoryName: "오피스텔",
  dealTypes: [],
  approvalValidUntil: "2026-12-31T18:00:00+09:00",
  conditionRegistered: true,
};

function detail() {
  return getMockVisitState().coordinations[0];
}

describe("방문 조율 상세", () => {
  it("불러오는 동안 로딩을 보여주고 후보 매물과 상태를 표시한다", async () => {
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(screen.getByText("조율 정보를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("방문 조율 상세")).not.toBeNull();
    expect(screen.getAllByText("국민대 앞 아파트").length).toBeGreaterThan(0);
    expect(screen.getAllByText("조율 가능").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "김수요" })).not.toBeNull();
  });

  it("없는 조율이면 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<CoordinationDetailScreen coordinationId={999} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("권한이 없으면 접근 권한 화면을 보여준다", async () => {
    server.use(http.get("/api/visit-coordinations/801", () => mockErrors.forbidden()));
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("허용받은 후보에는 사무소 배지와 허용 상태를 보이고 상세주소 안내를 한다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "COORDINATABLE",
          candidateProperties: [
            buildMockCandidate({
              candidatePropertyId: 1,
              propertyId: 9001,
              propertyName: "허용 오피스텔",
              propertyAddress: null,
              crossOffice: true,
              ownerOfficeName: "행복공인중개사",
              grantState: "REVOKED",
            }),
          ],
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "AGENT" });
    expect(await screen.findByText("행복공인중개사")).not.toBeNull();
    expect(screen.getByText("허용 회수")).not.toBeNull();
    expect(screen.getByText(/허용이 끝나 신청할 수 없습니다/)).not.toBeNull();
    expect(screen.getByText(/상세주소는 확정 신청 뒤에 보입니다/)).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "허용 오피스텔 제거" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("조율 가능 상태에서는 후보를 제거할 수 없다", async () => {
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await screen.findByText("방문 조율 상세");
    expect(
      screen.getByRole("button", { name: "국민대 앞 아파트 제거" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("시간 수집 중에는 후보를 제거하고 목록에서 사라진다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "TIME_COLLECTING",
          candidateProperties: [
            buildMockCandidate({ candidatePropertyId: 1, propertyId: 501 }),
            buildMockCandidate({
              candidatePropertyId: 2,
              propertyId: 502,
              propertyName: "정릉 상가",
            }),
          ],
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "정릉 상가 제거" }));
    await waitFor(() => expect(detail()?.candidateProperties).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText("정릉 상가")).toBeNull());
  });

  it("후보 제거가 거절되면 상태 안내를 보여준다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "TIME_COLLECTING",
          candidateProperties: [
            buildMockCandidate({ candidatePropertyId: 1, propertyId: 501 }),
            buildMockCandidate({
              candidatePropertyId: 2,
              propertyId: 502,
              propertyName: "정릉 상가",
            }),
          ],
        }),
      ],
    });
    server.use(
      http.delete("/api/visit-coordinations/801/candidate-properties/1", () =>
        errorResponse(409, "INVALID_TRANSITION", "상태"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "국민대 앞 아파트 제거" }));
    expect(await screen.findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
  });

  it("후보 매물을 추가한다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "TIME_COLLECTING",
          candidateProperties: [],
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "후보 추가" }));
    await user.click(await screen.findByRole("checkbox", { name: "국민대 앞 아파트 선택" }));
    await user.click(screen.getByRole("button", { name: "추가" }));
    await waitFor(() => expect(detail()?.candidateProperties).toHaveLength(1));
  });

  it("후보 상한 오류와 허용 없음 오류를 안내한다", async () => {
    setMockVisitState({
      coordinations: [buildMockCoordination({ coordinationId: 801, status: "TIME_COLLECTING" })],
    });
    server.use(
      http.post("/api/visit-coordinations/801/candidate-properties", () =>
        errorResponse(422, "CANDIDATE_NOT_ALLOWED", "허용 없음"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "후보 추가" }));
    await user.click(await screen.findByRole("checkbox", { name: "국민대 앞 아파트 선택" }));
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(await screen.findByText(/신청 권한이 없는 매물이 포함/)).not.toBeNull();
  });

  it("고객 링크를 재발급하면 원문을 한 번만 보여주고 복사한다", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "링크 재발급" }));
    const confirm = await screen.findByRole("dialog");
    expect(within(confirm).getByText(/이전에 전달한 링크는 즉시 사용할 수 없게/)).not.toBeNull();
    await user.click(within(confirm).getByRole("button", { name: "재발급" }));
    const dialog = await screen.findByRole("dialog", { name: "고객 링크" });
    const input = within(dialog).getByLabelText("발급된 링크") as HTMLInputElement;
    expect(input.value).toContain("https://sairo.example.com/visit-responses/");
    await user.click(within(dialog).getByRole("button", { name: "링크 복사" }));
    expect(await within(dialog).findByText("복사했습니다.")).not.toBeNull();
    expect(writeText).toHaveBeenCalledWith(input.value);
  });

  it("확정된 방문은 살아 있는 고객 링크가 없을 때만 재발급 버튼을 보인다", async () => {
    const link = (expiresAt: string) => ({
      linkId: 9001,
      issuedAt: "2026-11-10T09:00:00+09:00",
      expiresAt,
      revokedAt: null,
      responseVersion: 1,
    });
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "CONFIRMED",
          customerLink: link("2099-01-01T00:00:00+09:00"),
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText(/살아 있는 고객 링크가 없을 때만 재발급/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "링크 재발급" })).toBeNull();
    cleanup();
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "CONFIRMED",
          customerLink: link("2020-01-01T00:00:00+09:00"),
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByRole("button", { name: "링크 재발급" })).not.toBeNull();
  });

  it("고객 링크의 사용 가능·만료·폐기 상태를 배지로 보여주고 만료되면 재발급을 안내한다", async () => {
    const base = {
      linkId: 9001,
      issuedAt: "2026-11-10T09:00:00+09:00",
      responseVersion: 1,
    };
    const cases = [
      { expiresAt: "2099-01-01T00:00:00+09:00", revokedAt: null, text: "사용 가능" },
      { expiresAt: "2020-01-01T00:00:00+09:00", revokedAt: null, text: "만료됨" },
      {
        expiresAt: "2099-01-01T00:00:00+09:00",
        revokedAt: "2026-11-11T09:00:00+09:00",
        text: "폐기됨",
      },
    ];
    for (const item of cases) {
      setMockVisitState({
        coordinations: [
          buildMockCoordination({
            coordinationId: 801,
            status: "COORDINATABLE",
            customerLink: { ...base, expiresAt: item.expiresAt, revokedAt: item.revokedAt },
          }),
        ],
      });
      renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
      const section = (await screen.findByText("고객 가능 시간")).closest("section");
      if (!section) throw new Error("고객 가능 시간 영역이 없다");
      expect(within(section).getByText(item.text)).not.toBeNull();
      expect(within(section).queryByText(/고객이 열 수 없습니다/) === null).toBe(
        item.text === "사용 가능",
      );
      cleanup();
    }
  });

  it("고객 링크가 없으면 발급하고 발급 실패를 안내한다", async () => {
    setMockVisitState({
      coordinations: [buildMockCoordination({ coordinationId: 801, status: "TIME_COLLECTING" })],
    });
    server.use(
      http.post("/api/visit-coordinations/801/customer-link", () =>
        errorResponse(409, "INVALID_TRANSITION", "상태"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "고객 링크 발급" }));
    expect(await screen.findByText(/지금 상태에서는 처리할 수 없습니다/)).not.toBeNull();
  });

  it("일정 구성을 저장하면 계산된 시작 시각을 보여주고 최종 확정 필요 상태가 된다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "일정 저장" }));
    expect(await screen.findByText(/일정 구성을 저장했습니다/)).not.toBeNull();
    expect(screen.getByLabelText("계산된 시작 시각")).not.toBeNull();
    expect(detail()?.status).toBe("FINAL_CONFIRMATION_REQUIRED");
  });

  it("후보에 저장된 방문·이동 시간을 일정 입력의 처음 값으로 쓴다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "COORDINATABLE",
          candidateProperties: [
            buildMockCandidate({
              candidatePropertyId: 1,
              propertyId: 501,
              visitDurationMinutes: 45,
              travelDurationMinutes: 20,
              approvalId: 7001,
            }),
          ],
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText(/방문 45분 · 이동 20분/)).not.toBeNull();
    const visit = (await screen.findAllByLabelText("방문 소요시간 (분)"))[0] as HTMLInputElement;
    expect(visit.value).toBe("45");
    const travel = screen.getAllByLabelText("다음 매물까지 이동시간 (분)")[0] as HTMLInputElement;
    expect(travel.value).toBe("20");
  });

  it("방문 소요시간이 범위를 벗어나면 저장하지 않고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    const fields = await screen.findAllByLabelText("방문 소요시간 (분)");
    await user.clear(fields[0] as HTMLElement);
    await user.type(fields[0] as HTMLElement, "1");
    await user.click(screen.getByRole("button", { name: "일정 저장" }));
    expect(await screen.findByText(/5분에서 240분 사이/)).not.toBeNull();
    expect(detail()?.version).toBe(1);
  });

  it("일정 저장 중 버전이 어긋나면 충돌 안내를 보여준다", async () => {
    server.use(
      http.put("/api/visit-coordinations/801/schedule", () => mockErrors.versionConflict(5)),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "일정 저장" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("허용 범위를 벗어난 구성은 시간 범위 안내를 보여준다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "COORDINATABLE",
          candidateProperties: [buildMockCandidate({ candidatePropertyId: 1, propertyId: 501 })],
          customerTimeSlots: [],
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "일정 저장" }));
    expect(await screen.findByText(/승인자 조건이 등록되지 않았거나/)).not.toBeNull();
    const link = await screen.findByRole("link", { name: "국민대 앞 아파트 승인자 조건 등록" });
    expect(link.getAttribute("href")).toBe("/properties/501/access-approvals");
  });

  it("일정 저장이 막히면 조건이 없는 허용받은 매물을 먼저 표시하고 확인 링크를 준다", async () => {
    setMockVisitState({
      receivedGrants: [{ ...grant, propertyId: 9001, conditionRegistered: false }],
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "COORDINATABLE",
          candidateProperties: [
            buildMockCandidate({ candidatePropertyId: 1, propertyId: 501 }),
            buildMockCandidate({
              candidatePropertyId: 2,
              propertyId: 9001,
              propertyName: "허용 오피스텔",
              crossOffice: true,
              ownerOfficeName: "행복공인중개사",
              grantState: "ACTIVE",
            }),
          ],
          customerTimeSlots: [],
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "일정 저장" }));
    const list = await screen.findByRole("list", { name: "일정 저장을 막은 후보 확인" });
    await waitFor(() => expect(within(list).getByText("승인자 조건 미등록")).not.toBeNull());
    const rows = within(list).getAllByRole("listitem");
    expect(within(rows[0] as HTMLElement).getByText("허용 오피스텔")).not.toBeNull();
    expect(
      within(rows[0] as HTMLElement)
        .getByRole("link", { name: "허용 오피스텔 허용받은 매물에서 확인" })
        .getAttribute("href"),
    ).toBe("/granted-properties");
  });

  it("서버가 원인 후보를 알려 주면 그 후보를 이 매물 때문이라고 표시한다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "COORDINATABLE",
          candidateProperties: [
            buildMockCandidate({ candidatePropertyId: 1, propertyId: 501 }),
            buildMockCandidate({
              candidatePropertyId: 2,
              propertyId: 502,
              propertyName: "정릉 상가",
            }),
          ],
        }),
      ],
    });
    server.use(
      http.put("/api/visit-coordinations/801/schedule", () =>
        errorResponse(422, "TIME_OUT_OF_RANGE", "원문 메시지", { candidatePropertyIds: [2] }),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "일정 저장" }));
    const list = await screen.findByRole("list", { name: "일정 저장을 막은 후보 확인" });
    const rows = within(list).getAllByRole("listitem");
    expect(within(rows[0] as HTMLElement).getByText("정릉 상가")).not.toBeNull();
    expect(
      within(rows[0] as HTMLElement).getByText(/이 매물 때문에 일정을 저장하지 못했습니다/),
    ).not.toBeNull();
    expect(screen.queryByText("원문 메시지")).toBeNull();
  });

  it("후보가 하나뿐이면 시간 수집 중이어도 제거를 막는다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "TIME_COLLECTING",
          candidateProperties: [buildMockCandidate({ candidatePropertyId: 1, propertyId: 501 })],
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(
      (await screen.findByRole("button", { name: "국민대 앞 아파트 제거" })).getAttribute(
        "aria-disabled",
      ),
    ).toBe("true");
    expect(screen.getByText(/후보는 1개 이상 남아야 합니다/)).not.toBeNull();
  });

  it("읽기 전용 사무소에서는 시간 수집 중에도 후보를 제거할 수 없다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "TIME_COLLECTING",
          candidateProperties: [
            buildMockCandidate({ candidatePropertyId: 1, propertyId: 501 }),
            buildMockCandidate({
              candidatePropertyId: 2,
              propertyId: 502,
              propertyName: "정릉 상가",
            }),
          ],
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, {
      role: "OWNER",
      isReadOnly: true,
    });
    expect(
      (await screen.findByRole("button", { name: "정릉 상가 제거" })).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("신청을 받는 중에는 고객 링크 발급과 일정 구성 대신 사유를 안내한다", async () => {
    setMockVisitState({
      coordinations: [buildMockCoordination({ coordinationId: 801, status: "APPLYING" })],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText(/신청을 받는 중에는 고객 링크를 새로 발급/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "고객 링크 발급" })).toBeNull();
    expect(screen.getByText(/신청을 받는 중에는 일정 구성을 바꿀 수 없습니다/)).not.toBeNull();
    expect(
      screen.getByText(/발급한 뒤 7일 또는 방문 가능 시작일 24시간 전 중 빠른 시각/),
    ).not.toBeNull();
  });

  it("충돌 확인에서 겹치는 일정을 종류와 시각으로 보여준다", async () => {
    setMockVisitState({
      conflicts: [
        {
          candidatePropertyId: 8011,
          conflictType: "MANAGER_OVERLAP",
          conflictingScheduleItemId: 5,
          conflictingCoordinationId: null,
          conflictingStartAt: "2026-11-12T10:00:00+09:00",
          conflictingEndAt: "2026-11-12T10:30:00+09:00",
          conflictingPropertyName: null,
        },
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "충돌 확인" }));
    const list = await screen.findByLabelText("겹치는 일정");
    expect(within(list).getByText(/담당자 일정과 겹침/)).not.toBeNull();
  });

  it("겹치는 일정이 없으면 없다고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "충돌 확인" }));
    expect(await screen.findByText("겹치는 일정이 없습니다.")).not.toBeNull();
  });

  it("시간 수집 중에는 일정 구성 대신 안내를 보여준다", async () => {
    setMockVisitState({
      coordinations: [buildMockCoordination({ coordinationId: 801, status: "TIME_COLLECTING" })],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(
      await screen.findByText(/조율 가능 상태가 되면 일정을 구성할 수 있습니다/),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "일정 저장" })).toBeNull();
  });

  it("담당자를 바꾼다", async () => {
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await screen.findByRole("option", { name: "김대표" });
    await user.selectOptions(screen.getByLabelText("담당자"), "김대표");
    await user.click(screen.getByRole("button", { name: "담당자 변경" }));
    await waitFor(() => expect(detail()?.managerMembershipId).toBe(1));
  });

  it("새 담당자의 일정이 겹치면 겹침 안내를 보여준다", async () => {
    setMockVisitState({ managerConflictMembershipIds: [1] });
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await screen.findByRole("option", { name: "김대표" });
    await user.selectOptions(screen.getByLabelText("담당자"), "김대표");
    await user.click(screen.getByRole("button", { name: "담당자 변경" }));
    expect(await screen.findByText(/방문 일정이 겹칩니다/)).not.toBeNull();
  });

  it("담당자 변경 중 버전 충돌이 나면 안내한다", async () => {
    server.use(
      http.patch("/api/visit-coordinations/801/manager", () => mockErrors.versionConflict(3)),
    );
    const user = userEvent.setup();
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    await screen.findByRole("option", { name: "김대표" });
    await user.selectOptions(screen.getByLabelText("담당자"), "김대표");
    await user.click(screen.getByRole("button", { name: "담당자 변경" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("중개보조원에게는 담당자 변경이 없고 고객 이름과 연락처만 보여준다", async () => {
    setMockVisitState({ callerRole: "DEPUTY", deputyAssignedIds: [801] });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "DEPUTY" });
    expect(await screen.findByText(/김수요 · 010-1234-5678/)).not.toBeNull();
    expect(screen.queryByText("담당자 변경")).toBeNull();
    expect(screen.queryByRole("link", { name: "김수요" })).toBeNull();
  });

  it("배정되지 않은 조율은 중개보조원에게 찾을 수 없음으로 보인다", async () => {
    setMockVisitState({ callerRole: "DEPUTY", deputyAssignedIds: [] });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "DEPUTY" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("고객 정보 조회가 거절되면 오류를 보여준다", async () => {
    setMockVisitState({ callerRole: "DEPUTY", deputyAssignedIds: [801] });
    server.use(http.get("/api/customers/301/assistant-view", () => mockErrors.forbidden()));
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "DEPUTY" });
    expect(await screen.findByText("이 작업을 할 권한이 없습니다.")).not.toBeNull();
  });

  it("재조율 경보가 있으면 이유와 발생 시각을 보여준다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "RESCHEDULE_REQUIRED",
          rescheduleAlert: {
            triggerType: "ACCESS_REVOKED",
            reason: "출입승인이 철회되었습니다.",
            raisedAt: "2026-11-10T10:00:00+09:00",
            approvalId: 7001,
          },
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText(/출입승인이 철회되었습니다/)).not.toBeNull();
  });

  it("담당 인계로 재조율이 필요하면 사유가 없어도 인계 안내를 보여준다", async () => {
    setMockVisitState({
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          status: "RESCHEDULE_REQUIRED",
          rescheduleAlert: {
            triggerType: "ASSIGNEE_HANDOVER",
            reason: null,
            raisedAt: "2026-11-10T10:00:00+09:00",
            approvalId: null,
          },
        }),
      ],
    });
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText(/담당이 바뀌어 일정을 다시 조율해야 합니다/)).not.toBeNull();
  });

  it("읽기 전용 상태에서는 변경 버튼이 막힌다", async () => {
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, {
      role: "OWNER",
      isReadOnly: true,
    });
    expect(
      (await screen.findByRole("button", { name: "후보 추가" })).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "일정 저장" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("요청이 많으면 잠시 후 다시 시도하라는 화면을 보여준다", async () => {
    server.use(http.get("/api/visit-coordinations/801", () => mockErrors.rateLimited(20)));
    renderOffice(<CoordinationDetailScreen coordinationId={801} />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });
});
