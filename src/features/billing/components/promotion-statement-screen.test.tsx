// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { PromotionStatementScreen } from "./promotion-statement-screen";

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => stopServer());

it("금액이 불일치하면 0원 이용내역서 표시와 다운로드를 차단한다", async () => {
  server.use(
    http.get("/api/billing/promotion-periods", () =>
      HttpResponse.json([
        {
          id: 17,
          periodStart: "2027-01-31T14:30:00+09:00",
          periodEnd: "2027-02-28T14:30:00+09:00",
          listAmount: 49900,
          discountAmount: 40000,
          chargedAmount: 9900,
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
  renderOffice(<PromotionStatementScreen id={17} />, { role: "OWNER" });
  expect(await screen.findByText("이용내역서의 금액을 확인할 수 없습니다.")).not.toBeNull();
  expect((screen.getByRole("button", { name: "PDF 다운로드" }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  expect((screen.getByRole("button", { name: "인쇄" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText("카드 승인 없음")).toBeNull();
});
