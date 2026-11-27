// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getMockVisitFollowState } from "@/mocks/handlers/visit-follow";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { CustomerPortalRequestScreen } from "./customer-portal-request-screen";

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => stopServer());
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T00:00:00+09:00"));
});

function renderRequest(id: number) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <CustomerPortalRequestScreen coordinationId={id} />
    </QueryClientProvider>,
  );
}

describe("고객 포털 방문 요청", () => {
  it("중개보조원 신분과 개인정보 요청 경로를 보존한다", async () => {
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/:id", () =>
        HttpResponse.json({
          ...getMockVisitFollowState().customerLink,
          managerLegalRole: "ASSISTANT",
        }),
      ),
      http.get("*/api/public/customer-visit-links/portal/requests/:id/reusable-times", () =>
        HttpResponse.json({ timeSlots: [] }),
      ),
    );
    renderRequest(71);
    expect(await screen.findByText("중개보조원 신분 안내")).not.toBeNull();
    expect(screen.getByRole("link", { name: "사무소에 전화해 요청하기" })).not.toBeNull();
    expect(screen.queryByText("[내 정보 요청하기]")).toBeNull();
  });

  it("만료된 포털 요청은 시간 입력을 열지 않는다", async () => {
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/:id", () =>
        HttpResponse.json({ code: "PUBLIC_LINK_NOT_FOUND" }, { status: 404 }),
      ),
    );
    renderRequest(71);
    expect(await screen.findByText("요청을 열 수 없습니다")).not.toBeNull();
    expect(screen.queryByText("가능한 시간 선택")).toBeNull();
  });

  it("포털에서 시간 제출 후에도 성공 안내를 유지한다", async () => {
    let submissions = 0;
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/:id", () =>
        HttpResponse.json(getMockVisitFollowState().customerLink),
      ),
      http.get("*/api/public/customer-visit-links/portal/requests/:id/reusable-times", () =>
        HttpResponse.json({ timeSlots: [] }),
      ),
      http.post("*/api/public/customer-visit-links/portal/requests/:id/available-times", () => {
        submissions += 1;
        return HttpResponse.json({
          coordinationId: 71,
          responseVersion: 1,
          submittedAt: "2026-11-10T10:00:00+09:00",
        });
      }),
    );
    const user = userEvent.setup();
    renderRequest(71);
    await user.click(await screen.findByRole("button", { name: "10:00" }));
    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "가능한 시간 제출" }));
    expect(await screen.findByText("가능한 시간을 제출했습니다.")).not.toBeNull();
    expect(submissions).toBe(1);
  });

  it("제출 중 세션이 만료되면 오래된 입력 화면을 닫는다", async () => {
    let expired = false;
    server.use(
      http.get("*/api/public/customer-visit-links/portal/requests/:id", () =>
        expired
          ? HttpResponse.json({ code: "PUBLIC_LINK_NOT_FOUND" }, { status: 404 })
          : HttpResponse.json(getMockVisitFollowState().customerLink),
      ),
      http.get("*/api/public/customer-visit-links/portal/requests/:id/reusable-times", () =>
        HttpResponse.json({ timeSlots: [] }),
      ),
      http.post("*/api/public/customer-visit-links/portal/requests/:id/available-times", () => {
        expired = true;
        return HttpResponse.json({ code: "PUBLIC_LINK_NOT_FOUND" }, { status: 404 });
      }),
    );
    const user = userEvent.setup();
    renderRequest(71);
    await user.click(await screen.findByRole("button", { name: "10:00" }));
    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "가능한 시간 제출" }));
    expect(await screen.findByText("요청을 열 수 없습니다")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "가능한 시간 제출" })).toBeNull();
  });
});
