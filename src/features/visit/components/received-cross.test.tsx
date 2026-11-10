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
import type { MockGrant } from "@/mocks/handlers/visit";
import {
  resetMockVisitRequestState,
  setMockVisitRequestState,
} from "@/mocks/handlers/visit-request";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CrossOfficeScreen } from "./cross-office-screen";
import { ReceivedGrantsScreen } from "./received-grants-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/granted-properties",
}));

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

const grant: MockGrant = {
  grantId: 11,
  approvalId: 7101,
  propertyId: 901,
  ownerOfficeId: 31,
  ownerOfficeName: "행복공인중개사",
  scope: "OFFICE",
  granteeMembershipId: null,
  propertyName: "허용받은 오피스텔",
  propertyAddress: "서울특별시 성북구 보국문로",
  categoryName: "오피스텔",
  dealTypes: ["MONTHLY"],
  approvalValidUntil: "2026-12-31T18:00:00+09:00",
  grantExpiresAt: null,
  conditionRegistered: false,
  conditionAppliesUntil: null,
};

describe("허용받은 매물", () => {
  it("허용받은 매물이 없으면 빈 안내를 보여준다", async () => {
    renderOffice(<ReceivedGrantsScreen />, { role: "AGENT" });
    expect(screen.getByText("허용받은 매물을 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("허용받은 매물이 없습니다.")).not.toBeNull();
  });

  it("허용한 사무소와 조건 등록 여부, 안내 문구를 보여준다", async () => {
    setMockVisitState({ receivedGrants: [grant] });
    renderOffice(<ReceivedGrantsScreen />, { role: "AGENT" });
    expect(await screen.findByText("허용받은 오피스텔")).not.toBeNull();
    expect(screen.getByText("행복공인중개사")).not.toBeNull();
    expect(screen.getByText("사무소 전체")).not.toBeNull();
    expect(screen.getByText("승인자 조건이 아직 등록되지 않았습니다.")).not.toBeNull();
    expect(screen.getByText(/상세주소는 확정 신청이 생긴 뒤에만/)).not.toBeNull();
  });

  it("조율을 고르고 후보로 담으면 이미 담김으로 바뀐다", async () => {
    setMockVisitState({ receivedGrants: [grant] });
    const user = userEvent.setup();
    renderOffice(<ReceivedGrantsScreen />, { role: "AGENT" });
    const button = await screen.findByRole("button", { name: "허용받은 오피스텔 후보로 담기" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await user.selectOptions(await screen.findByLabelText("담을 조율"), "801");
    await user.click(screen.getByRole("button", { name: "허용받은 오피스텔 후보로 담기" }));
    expect(await screen.findByText("후보 매물로 담았습니다.")).not.toBeNull();
    await waitFor(() =>
      expect(
        getMockVisitState().coordinations[0]?.candidateProperties.map((c) => c.propertyId),
      ).toContain(901),
    );
    expect(await screen.findByText("이미 담김")).not.toBeNull();
  });

  it("후보 담기가 거절되면 서버 안내를 보여준다", async () => {
    setMockVisitState({ receivedGrants: [grant] });
    server.use(
      http.post("/api/visit-coordinations/801/candidate-properties", () =>
        errorResponse(422, "CANDIDATE_NOT_ALLOWED", "허용 없음"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ReceivedGrantsScreen />, { role: "AGENT" });
    await screen.findByText("허용받은 오피스텔");
    await user.selectOptions(await screen.findByLabelText("담을 조율"), "801");
    await user.click(screen.getByRole("button", { name: "허용받은 오피스텔 후보로 담기" }));
    expect(await screen.findByText(/신청 권한이 없는 매물이 포함되어 있습니다/)).not.toBeNull();
  });

  it("후보가 20개면 담기 버튼이 막힌다", async () => {
    setMockVisitState({
      receivedGrants: [grant],
      coordinations: [
        buildMockCoordination({
          coordinationId: 801,
          candidateProperties: Array.from({ length: 20 }, (_, index) =>
            buildMockCandidate({ candidatePropertyId: 9000 + index, propertyId: 600 + index }),
          ),
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<ReceivedGrantsScreen />, { role: "AGENT" });
    await screen.findByText("허용받은 오피스텔");
    await user.selectOptions(await screen.findByLabelText("담을 조율"), "801");
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "허용받은 오피스텔 후보로 담기" })
          .getAttribute("aria-disabled"),
      ).toBe("true"),
    );
  });

  it("목록 조회 실패는 다시 시도를 보여주고 429는 대기 안내를 보여준다", async () => {
    server.use(http.get("/api/apply-grants/received", () => mockErrors.rateLimited(9)));
    renderOffice(<ReceivedGrantsScreen />, { role: "AGENT" });
    expect(await screen.findByText(/9초/)).not.toBeNull();
  });

  it("중개보조원에게는 화면을 보여주지 않는다", async () => {
    renderOffice(<ReceivedGrantsScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("이 화면은 중개보조원에게 제공되지 않습니다.")).not.toBeNull();
  });
});

describe("다른 사무소 신청·확정 방문 현황", () => {
  function seed() {
    setMockVisitRequestState({
      crossRequests: [
        {
          requestId: 1,
          requestKind: "NEW",
          status: "EXPIRED",
          applicantOfficeName: "정릉부동산",
          applicantBrokerName: "박중개",
          requestedStartAt: "2026-11-12T10:00:00+09:00",
          requestedEndAt: "2026-11-12T10:30:00+09:00",
          expectedDurationMinutes: 30,
          submittedAt: "2026-11-10T09:00:00+09:00",
          closedAt: "2026-11-10T11:00:00+09:00",
          closeReasonCode: "GRANT_REVOKED",
        },
        {
          requestId: 2,
          requestKind: "CHANGE",
          status: "PENDING",
          applicantOfficeName: "한강공인중개사",
          applicantBrokerName: "최중개",
          requestedStartAt: "2026-11-13T10:00:00+09:00",
          requestedEndAt: "2026-11-13T10:30:00+09:00",
          expectedDurationMinutes: 30,
          submittedAt: "2026-11-10T09:30:00+09:00",
          closedAt: null,
          closeReasonCode: null,
        },
      ],
      crossSchedules: [
        {
          scheduleItemId: 7,
          scheduledStartAt: "2026-11-14T10:00:00+09:00",
          scheduledEndAt: "2026-11-14T10:30:00+09:00",
          result: "SCHEDULED",
          state: "RESCHEDULE_REQUIRED",
          applicantOfficeName: "정릉부동산",
          applicantBrokerName: "박중개",
          confirmedRequestId: 1,
        },
      ],
    });
  }

  it("신청 탭은 종결 사유와 상태 필터를 보여준다", async () => {
    seed();
    const user = userEvent.setup();
    renderOffice(<CrossOfficeScreen propertyId={501} />, { role: "OWNER" });
    expect(screen.getByText("신청 현황을 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText(/정릉부동산 · 박중개/)).not.toBeNull();
    expect(screen.getByText(/허용 회수/)).not.toBeNull();
    expect(screen.getByText(/고객 이름, 연락처, 인원, 요청사항은 보이지 않습니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "신청 대기" }));
    await waitFor(() => expect(screen.queryByText(/정릉부동산 · 박중개/)).toBeNull());
    expect(screen.getByText(/한강공인중개사 · 최중개/)).not.toBeNull();
  });

  it("확정 방문 탭은 방문별 상태 배지를 보여준다", async () => {
    seed();
    const user = userEvent.setup();
    renderOffice(<CrossOfficeScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "확정 방문" }));
    expect(await screen.findByText("재조율 필요")).not.toBeNull();
    expect(screen.getByText("예정")).not.toBeNull();
  });

  it("들어온 신청이 없으면 빈 안내를 보여준다", async () => {
    renderOffice(<CrossOfficeScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("다른 사무소의 신청이 없습니다.")).not.toBeNull();
  });

  it("내 매물이 아니면 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<CrossOfficeScreen propertyId={999} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("권한이 없으면 접근 권한 화면을 보여준다", async () => {
    server.use(http.get("/api/properties/501/cross-office-requests", () => mockErrors.forbidden()));
    renderOffice(<CrossOfficeScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("중개보조원에게는 화면을 보여주지 않는다", async () => {
    renderOffice(<CrossOfficeScreen propertyId={501} />, { role: "DEPUTY" });
    expect(await screen.findByText("이 화면은 중개보조원에게 제공되지 않습니다.")).not.toBeNull();
  });
});
