// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { CustomerPortalIndex } from "./customer-portal-index";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
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
  });
});
