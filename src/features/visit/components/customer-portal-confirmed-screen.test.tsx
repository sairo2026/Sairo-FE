// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { CustomerPortalConfirmedScreen } from "./customer-portal-confirmed-screen";

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => stopServer());

function renderScreen(id = 72) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <CustomerPortalConfirmedScreen coordinationId={id} />
    </QueryClientProvider>,
  );
}

describe("인증된 고객의 확정 방문", () => {
  it("본인의 일정과 매물·시간을 표시한다", async () => {
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/72/confirmed", () =>
        HttpResponse.json({
          state: "VALID",
          scheduleVersion: 1,
          managerDisplayName: "담당자",
          managerLegalRole: "REPRESENTATIVE_AGENT",
          officeContactPhone: "02-000-0000",
          items: [
            {
              sortOrder: 1,
              scheduledStartAt: "2026-12-01T17:00:00+09:00",
              scheduledEndAt: "2026-12-01T17:30:00+09:00",
              propertyAddress: "서울시 테스트 매물",
              travelDurationMinutes: null,
            },
          ],
        }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("서울시 테스트 매물", { exact: false })).not.toBeNull();
    expect(screen.getByText("확정된 방문 1건을 확인할 수 있습니다.")).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "내 방문 요청으로 돌아가기" }).getAttribute("href"),
    ).toBe("/visit/portal");
  });

  it("다음 방문이 다른 날이면 이동 안내를 표시하지 않는다", async () => {
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/72/confirmed", () =>
        HttpResponse.json({
          state: "VALID",
          scheduleVersion: 2,
          managerDisplayName: "담당자",
          managerLegalRole: "REPRESENTATIVE_AGENT",
          officeContactPhone: "02-000-0000",
          items: [
            {
              sortOrder: 1,
              scheduledStartAt: "2026-12-01T17:00:00+09:00",
              scheduledEndAt: "2026-12-01T17:30:00+09:00",
              propertyAddress: "첫 매물",
              travelDurationMinutes: 15,
            },
            {
              sortOrder: 2,
              scheduledStartAt: "2026-12-02T18:00:00+09:00",
              scheduledEndAt: "2026-12-02T18:30:00+09:00",
              propertyAddress: "둘째 매물",
              travelDurationMinutes: null,
            },
          ],
        }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("첫 매물", { exact: false })).not.toBeNull();
    expect(screen.queryByText(/다음 방문까지 이동/)).toBeNull();
  });

  it("열람 기한이 지난 일정은 비공개 상태로 안내한다", async () => {
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/72/confirmed", () =>
        HttpResponse.json({ code: "PUBLIC_LINK_EXPIRED", message: "expired" }, { status: 404 }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("일정 열람 기간이 지났습니다")).not.toBeNull();
  });

  it("다른 고객의 일정은 이메일 확인 안내만 표시한다", async () => {
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/72/confirmed", () =>
        HttpResponse.json({ code: "PUBLIC_LINK_NOT_FOUND", message: "not found" }, { status: 404 }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("고객 확인이 필요합니다")).not.toBeNull();
  });

  it.each([
    ["CANCELLED", "취소된 일정입니다"],
    ["RESCHEDULE_REQUIRED", "일정을 다시 조율 중입니다"],
    ["SUPERSEDED", "이전 일정입니다"],
  ])("%s 상태를 구별해 안내한다", async (state, expected) => {
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/72/confirmed", () =>
        HttpResponse.json({
          state,
          scheduleVersion: 2,
          managerDisplayName: "담당자",
          managerLegalRole: "REPRESENTATIVE_AGENT",
          officeContactPhone: "02-000-0000",
          items: [],
        }),
      ),
    );
    renderScreen();
    expect(await screen.findByText(expected)).not.toBeNull();
    expect(screen.queryByText("표시할 확정 일정이 없습니다")).toBeNull();
  });
});
