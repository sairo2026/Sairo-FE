// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockCustomerState } from "@/mocks/handlers/customer";
import { resetMockPropertyState } from "@/mocks/handlers/property";
import { resetMockVisitState } from "@/mocks/handlers/visit";
import {
  buildMockOfficeRequest,
  getMockVisitRequestState,
  resetMockVisitRequestState,
  setMockVisitRequestState,
} from "@/mocks/handlers/visit-request";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { RequestStatusScreen } from "./request-status-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/coordinations/801/requests",
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

function seed() {
  setMockVisitRequestState({
    requests: [
      buildMockOfficeRequest({ requestId: 9501 }),
      buildMockOfficeRequest({
        requestId: 9502,
        candidatePropertyId: 8012,
        status: "TIME_CLOSED",
        closedAt: "2026-11-10T10:00:00+09:00",
        crossOffice: true,
      }),
      buildMockOfficeRequest({
        requestId: 9503,
        status: "REVALIDATION_FAILED",
        closedAt: "2026-11-10T10:00:00+09:00",
      }),
    ],
    notices: [
      {
        noticeId: 1,
        requestId: 9502,
        noticeType: "TIME_CLOSED",
        channel: "IN_APP",
        createdAt: "2026-11-10T10:00:00+09:00",
        readAt: null,
      },
      {
        noticeId: 2,
        requestId: 9503,
        noticeType: "REVALIDATION_FAILED",
        channel: "IN_APP",
        createdAt: "2026-11-10T10:05:00+09:00",
        readAt: "2026-11-10T10:06:00+09:00",
      },
      {
        noticeId: 3,
        requestId: 9999,
        noticeType: "SLOT_REOPENED",
        channel: "IN_APP",
        createdAt: "2026-11-10T10:05:00+09:00",
        readAt: null,
      },
    ],
  });
}

describe("방문 신청 현황", () => {
  it("불러오는 동안 로딩을 보여주고 상태별 건수와 허용받은 매물 표시를 보여준다", async () => {
    seed();
    renderOffice(<RequestStatusScreen coordinationId={801} />, { role: "AGENT" });
    expect(screen.getByText("신청 현황을 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByRole("button", { name: "전체 3" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "신청 대기 1" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "시간 마감 1" })).not.toBeNull();
    expect(screen.getByText("허용받은 사무소 매물")).not.toBeNull();
    expect(
      screen.getByText(/재검증에 실패한 신청은 종결되며 다시 신청하려면 새 신청/),
    ).not.toBeNull();
  });

  it("상태 필터로 목록을 좁힌다", async () => {
    seed();
    const user = userEvent.setup();
    renderOffice(<RequestStatusScreen coordinationId={801} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "재검증 실패 1" }));
    expect(screen.queryByRole("button", { name: "신청 9501 철회" })).toBeNull();
    expect(screen.getAllByText("재검증 실패").length).toBeGreaterThan(1);
  });

  it("신청이 없으면 빈 안내를 보여준다", async () => {
    renderOffice(<RequestStatusScreen coordinationId={801} />, { role: "AGENT" });
    expect(await screen.findByText("표시할 신청이 없습니다.")).not.toBeNull();
    expect(await screen.findByText("받은 알림이 없습니다.")).not.toBeNull();
  });

  it("이 조율의 신청에 대한 알림만 보여주고 확인하면 새 알림 표시가 사라진다", async () => {
    seed();
    const user = userEvent.setup();
    renderOffice(<RequestStatusScreen coordinationId={801} />, { role: "AGENT" });
    expect(await screen.findByText(/자동으로 승격되지 않습니다/)).not.toBeNull();
    expect(screen.queryByText("빈자리 재개방")).toBeNull();
    expect(await screen.findAllByText("새 알림")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "시간 마감 알림 확인" }));
    await waitFor(() => expect(getMockVisitRequestState().notices[0]?.readAt).not.toBeNull());
    await waitFor(() => expect(screen.queryByText("새 알림")).toBeNull());
  });

  it("알림 확인 처리가 실패하면 오류를 보여준다", async () => {
    seed();
    server.use(http.post("/api/visit-request-notices/1/read", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<RequestStatusScreen coordinationId={801} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "시간 마감 알림 확인" }));
    expect(await screen.findByText(/알림을 확인 처리하지 못했습니다|일시적인 오류/)).not.toBeNull();
  });

  it("목록 조회가 실패하면 오류 화면과 다시 시도를 보여준다", async () => {
    server.use(http.get("/api/visit-coordinations/801/visit-requests", () => mockErrors.server()));
    renderOffice(<RequestStatusScreen coordinationId={801} />, { role: "AGENT" });
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
  });

  it("권한이 없으면 접근 권한 화면을 보여준다", async () => {
    server.use(
      http.get("/api/visit-coordinations/801/visit-requests", () => mockErrors.forbidden()),
    );
    renderOffice(<RequestStatusScreen coordinationId={801} />, { role: "AGENT" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("없는 조율이면 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<RequestStatusScreen coordinationId={999} />, { role: "AGENT" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("요청이 많으면 다시 시도 시간을 안내한다", async () => {
    server.use(
      http.get("/api/visit-coordinations/801/visit-requests", () => mockErrors.rateLimited(12)),
    );
    renderOffice(<RequestStatusScreen coordinationId={801} />, { role: "AGENT" });
    expect(await screen.findByText(/12초/)).not.toBeNull();
  });
});
