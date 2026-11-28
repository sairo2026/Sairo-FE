// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { CustomerPortalIndex } from "./customer-portal-index";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

beforeEach(() => {
  server.use(
    http.get("*/api/public/customer-visit-links/portal/preferences", () =>
      HttpResponse.json({
        exists: false,
        version: 0,
        preferredWeekdays: [],
        preferredStartTime: null,
        preferredEndTime: null,
        confirmedAt: null,
        retentionUntil: "2026-12-31",
        noticeVersion: "1.0",
        preferenceDisclosureVersion: "1.0",
      preferenceDisclosureText: "수집 항목: 선호 요일과 선호 시간대.",
      sessionBinding: "test-session-binding",
      }),
    ),
  );
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => stopServer());

function renderIndex() {
  const queryClient = createQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <CustomerPortalIndex />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("고객 방문 요청 모아보기", () => {
  it("인증 전에는 요청 식별자나 일정 정보를 보여주지 않는다", async () => {
    renderIndex();
    expect(await screen.findByText(/방문 요청 링크에서 이메일 인증을 완료하면/)).not.toBeNull();
    expect(screen.queryByRole("list", { name: "내 방문 요청 목록" })).toBeNull();
  });

  it("이메일 인증 세션의 요청만 보이고 종료하면 목록을 숨긴다", async () => {
    let verified = true;
    server.use(
      http.get("*/api/public/customer-visit-links/portal", () =>
        HttpResponse.json(
          verified
            ? {
                available: true,
                verified: true,
                items: [
                  {
                    coordinationId: 71,
                    status: "TIME_COLLECTING",
                    periodStartDate: "2026-11-11",
                    periodEndDate: "2026-11-20",
                    canRespond: true,
                  },
                ],
              }
            : { available: false, verified: false, items: [] },
        ),
      ),
      http.post("*/api/public/customer-visit-links/portal/logout", () => {
        verified = false;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const queryClient = renderIndex();
    queryClient.setQueryData(["customer-visit-portal", "prior-link"], {
      available: true,
      verified: true,
      items: [{ coordinationId: 71 }],
    });
    queryClient.setQueryData(["customer-portal-request", 71], { officeName: "test office" });
    queryClient.setQueryData(["customer-visit-preference"], {
      exists: true,
      version: 1,
      preferredWeekdays: [],
      preferredStartTime: null,
      preferredEndTime: null,
      confirmedAt: null,
      retentionUntil: "2026-12-31",
      noticeVersion: "1.0",
      preferenceDisclosureVersion: "1.0",
      preferenceDisclosureText: "수집 항목: 선호 요일과 선호 시간대.",
      sessionBinding: "test-session-binding",
    });
    expect(await screen.findByText("방문 요청 #71")).not.toBeNull();
    expect(screen.getByText("2026-11-11 ~ 2026-11-20")).not.toBeNull();
    expect(screen.getByRole("link", { name: "가능한 시간 확인·수정" }).getAttribute("href")).toBe(
      "/visit/portal/71",
    );
    await user.click(screen.getByRole("button", { name: "이 기기에서 보기 종료" }));
    expect(await screen.findByText(/방문 요청 링크에서 이메일 인증을 완료하면/)).not.toBeNull();
    expect(screen.queryByText("방문 요청 #71")).toBeNull();
    expect(queryClient.getQueryData(["customer-visit-portal", "prior-link"])).toEqual({
      available: true,
      verified: false,
      items: [],
    });
    expect(queryClient.getQueryData(["customer-portal-request", 71])).toBeUndefined();
    expect(queryClient.getQueryData(["customer-visit-preference"])).toBeUndefined();
  });

  it("확정된 방문에는 일정 확인 경로를 제공하고 수집 중인 방문에는 제공하지 않는다", async () => {
    server.use(
      http.get("*/api/public/customer-visit-links/portal", () =>
        HttpResponse.json({
          available: true,
          verified: true,
          items: [
            {
              coordinationId: 71,
              status: "TIME_COLLECTING",
              periodStartDate: "2026-11-11",
              periodEndDate: "2026-11-20",
              canRespond: true,
              canViewSchedule: false,
            },
            {
              coordinationId: 72,
              status: "APPLYING",
              periodStartDate: "2026-11-11",
              periodEndDate: "2026-11-20",
              canRespond: false,
              canViewSchedule: true,
            },
            {
              coordinationId: 73,
              status: "CANCELLED",
              periodStartDate: "2026-11-11",
              periodEndDate: "2026-11-20",
              canRespond: false,
              canViewSchedule: true,
            },
          ],
        }),
      ),
    );
    renderIndex();
    const links = await screen.findAllByRole("link", { name: "확정 일정 확인" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/visit/portal/72/confirmed",
      "/visit/portal/73/confirmed",
    ]);
    expect(screen.getAllByRole("link", { name: "가능한 시간 확인·수정" })).toHaveLength(1);
  });

  it("인증된 고객이 기본 선호를 저장하고 삭제해도 방문 요청은 유지한다", async () => {
    const savedBodies: unknown[] = [];
    server.use(
      http.get("*/api/public/customer-visit-links/portal", () =>
        HttpResponse.json({
          available: true,
          verified: true,
          items: [
            {
              coordinationId: 71,
              status: "TIME_COLLECTING",
              periodStartDate: "2026-11-11",
              periodEndDate: "2026-11-20",
              canRespond: true,
            },
          ],
        }),
      ),
      http.put("*/api/public/customer-visit-links/portal/preferences", async ({ request }) => {
        const body = await request.json();
        savedBodies.push(body);
        return HttpResponse.json({
          exists: true,
          version: 1,
          preferredWeekdays: ["MONDAY"],
          preferredStartTime: "10:00:00",
          preferredEndTime: "18:00:00",
          confirmedAt: "2026-11-28T14:00:00Z",
          retentionUntil: "2026-12-31",
          noticeVersion: "1.0",
          preferenceDisclosureVersion: "1.0",
      preferenceDisclosureText: "수집 항목: 선호 요일과 선호 시간대.",
      sessionBinding: "test-session-binding",
        });
      }),
      http.delete("*/api/public/customer-visit-links/portal/preferences", () =>
        HttpResponse.json({
          exists: false,
          version: 2,
          preferredWeekdays: [],
          preferredStartTime: null,
          preferredEndTime: null,
          confirmedAt: null,
          retentionUntil: "2026-12-31",
          noticeVersion: "1.0",
          preferenceDisclosureVersion: "1.0",
      preferenceDisclosureText: "수집 항목: 선호 요일과 선호 시간대.",
      sessionBinding: "test-session-binding",
        }),
      ),
    );
    const user = userEvent.setup();
    const queryClient = renderIndex();
    expect(await screen.findByText("기본 방문 선호")).not.toBeNull();
    await user.click(await screen.findByRole("checkbox", { name: "월요일" }));
    fireEvent.change(screen.getByLabelText("선호 시작 시간"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("선호 종료 시간"), { target: { value: "18:00" } });
    await user.click(
      screen.getByRole("checkbox", { name: "기본 방문 선호 저장 안내를 확인했습니다. (필수)" }),
    );
    await user.click(screen.getByRole("button", { name: "선호 저장" }));
    expect(await screen.findByText("기본 선호를 저장했습니다.")).not.toBeNull();
    expect(savedBodies).toEqual([
      {
        expectedVersion: 0,
        acknowledgedNoticeVersion: "1.0",
        acknowledgedPreferenceDisclosureVersion: "1.0",
        sessionBinding: "test-session-binding",
        preferredWeekdays: ["MONDAY"],
        preferredStartTime: "10:00:00",
        preferredEndTime: "18:00:00",
      },
    ]);
    queryClient.setQueryData(
      ["customer-visit-preference", "linked-token"],
      queryClient.getQueryData(["customer-visit-preference"]),
    );
    await user.click(screen.getByRole("button", { name: "저장한 선호 삭제" }));
    await user.click(screen.getByRole("button", { name: "삭제하기" }));
    expect(await screen.findByText("기본 선호를 삭제했습니다.")).not.toBeNull();
    expect((screen.getByRole("checkbox", { name: "월요일" }) as HTMLInputElement).checked).toBe(
      false,
    );
    expect(screen.getByText("방문 요청 #71")).not.toBeNull();
    expect(
      (
        queryClient.getQueryData(["customer-visit-preference", "linked-token"]) as {
          exists: boolean;
        }
      ).exists,
    ).toBe(false);
  });
});
