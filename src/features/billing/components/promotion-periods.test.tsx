// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server, startMockServer } from "@/mocks/server";
import { buildSubscription } from "@/mocks/handlers/billing";
import { renderOffice } from "@/shared/testing/office-render";
import { PromotionPeriodsScreen } from "./promotion-periods-screen";

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => stopServer());

describe("무료 프로모션 이용내역", () => {
  it("거래가 없으면 빈 상태를 표시한다", async () => {
    server.use(http.get("/api/billing/promotion-periods", () => HttpResponse.json([])));
    renderOffice(<PromotionPeriodsScreen />, { role: "OWNER" });
    expect(await screen.findByText("무료 프로모션 이용내역이 없습니다.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "무료 프로모션 적용하기" })).toBeNull();
  });

  it("결제 전 대표는 승인된 코드를 적용하고 무료 상태를 다시 불러온다", async () => {
    const user = userEvent.setup();
    let applied = false;
    let submittedCode: string | null = null;
    server.use(
      http.get("/api/subscriptions/current", () =>
        HttpResponse.json({ ...buildSubscription(), status: applied ? "TRIAL" : "PRE_PAYMENT" }),
      ),
      http.get("/api/billing/promotion-periods/current", () =>
        HttpResponse.json(
          applied
            ? {
                campaignName: "출시 프로모션",
                campaignCode: "LAUNCH2026OWNER01",
                startsAt: "2027-01-31T14:30:00+09:00",
                freeEndsAt: "2027-03-31T14:30:00+09:00",
                nextFreeRenewalAt: "2027-02-28T14:30:00+09:00",
                conversionStatus: "CONFIRMATION_REQUIRED",
                potentialPaidAmount: 49900,
              }
            : null,
        ),
      ),
      http.get("/api/billing/promotion-periods", () => HttpResponse.json([])),
      http.post("/api/billing/promotion-periods/redeem", async ({ request }) => {
        submittedCode = ((await request.json()) as { code: string }).code;
        applied = true;
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );
    renderOffice(<PromotionPeriodsScreen />, { role: "OWNER" });
    await user.type(
      await screen.findByRole("textbox", { name: "프로모션 코드" }),
      " launch2026owner01 ",
    );
    await user.click(screen.getByRole("button", { name: "무료 프로모션 적용하기" }));
    await waitFor(() => expect(submittedCode).toBe("LAUNCH2026OWNER01"));
    expect(await screen.findByText("현재 프로모션")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "무료 프로모션 적용하기" })).toBeNull();
  });

  it("결제 전에도 대표가 아니면 코드 입력 폼을 보이지 않는다", async () => {
    server.use(
      http.get("/api/subscriptions/current", () =>
        HttpResponse.json({ ...buildSubscription(), status: "PRE_PAYMENT" }),
      ),
      http.get("/api/billing/promotion-periods/current", () => HttpResponse.json(null)),
      http.get("/api/billing/promotion-periods", () => HttpResponse.json([])),
    );
    renderOffice(<PromotionPeriodsScreen />, { role: "AGENT" });
    expect(await screen.findByText("무료 프로모션 이용내역이 없습니다.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "무료 프로모션 적용하기" })).toBeNull();
  });

  it("0원 내부 거래와 유료 전환 확인 대기를 분리해 표시한다", async () => {
    server.use(
      http.get("/api/billing/promotion-periods/current", () =>
        HttpResponse.json({
          campaignName: "출시 프로모션",
          campaignCode: "LAUNCH",
          startsAt: "2027-01-31T14:30:00+09:00",
          freeEndsAt: "2027-02-28T14:30:00+09:00",
          nextFreeRenewalAt: null,
          conversionStatus: "CONVERSION_PENDING",
          potentialPaidAmount: 49900,
        }),
      ),
      http.get("/api/billing/promotion-periods", () =>
        HttpResponse.json([
          {
            id: 17,
            periodStart: "2027-01-31T14:30:00+09:00",
            periodEnd: "2027-02-28T14:30:00+09:00",
            listAmount: 49900,
            discountAmount: 49900,
            chargedAmount: 0,
            priceVersion: "2027-01",
            createdAt: "2027-01-31T14:30:01+09:00",
            campaignName: "출시 프로모션",
            campaignCode: "LAUNCH",
            officeName: "테스트 사무소",
            plan: "SOLO",
            freeEndsAt: "2027-02-28T14:30:00+09:00",
          },
        ]),
      ),
    );
    renderOffice(<PromotionPeriodsScreen />, { role: "OWNER" });
    expect(await screen.findByText("무료 이용 종료 · 유료 구독 확인 대기")).not.toBeNull();
    expect(screen.getByText("실제 카드 청구")).not.toBeNull();
    expect(screen.getByRole("link", { name: "이용내역서 보기" }).getAttribute("href")).toBe(
      "/billing/promotion-periods/17",
    );
    expect(screen.getByRole("link", { name: "유료 구독 조건 확인하기" })).not.toBeNull();
  });
});
