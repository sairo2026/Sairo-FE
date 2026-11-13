// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse } from "@/mocks/error-responses";
import { resetMockOpsContent } from "@/mocks/handlers/ops-content";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { resetMockOpsSystemMonitor } from "@/mocks/handlers/ops-system-monitor";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { Integration } from "../integrations/integrations-model";
import type { OpsRole } from "../model/roles";
import { missingLaunchItems, summarizeLaunch } from "./launch-model";
import { LaunchScreen } from "./launch-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/launch",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOpsSession();
  resetMockOpsContent();
  resetMockOpsSystemMonitor();
});
afterAll(() => stopServer());

function companyInfo(missingItems: string[]) {
  return http.get("/api/ops/company-service-info", () =>
    HttpResponse.json({
      items: [],
      page: 0,
      size: 100,
      totalElements: 0,
      launchReady: missingItems.length === 0,
      missingItems,
    }),
  );
}

function renderScreen(roles: OpsRole[] = ["OPS"], missingItems: string[] = []) {
  server.use(companyInfo(missingItems));
  setMockOperatorRoles(roles);
  return renderOpsScreen(<LaunchScreen />, roles);
}

function integrationRow(patch: Partial<Integration>): Integration {
  return {
    integrationId: 1,
    environment: "PRODUCTION",
    provider: "예시 공급자",
    functionCode: "EMAIL",
    enabled: false,
    secretReferenceId: "ref-1",
    maskedConnection: "****",
    processingRegion: "KR",
    retentionPolicy: "발송 후 90일",
    contractStatus: "SIGNED",
    consentStatus: "NOT_REQUIRED",
    contractNoticeReviewedAt: "2026-11-01T09:00:00+09:00",
    lastCheckResult: "SUCCESS",
    lastSuccessAt: null,
    assignedOperatorId: null,
    approvedByOperatorId: null,
    ...patch,
  };
}

describe("출시 활성화 조건 계산", () => {
  it("계약, 동의, 점검이 끝나고 회사 정보가 준비되면 남은 조건이 없다", () => {
    expect(missingLaunchItems(integrationRow({}), [])).toEqual([]);
    expect(missingLaunchItems(integrationRow({ consentStatus: "GRANTED" }), [])).toEqual([]);
  });

  it("끝나지 않은 조건을 서버와 같은 이름으로 모은다", () => {
    const row = integrationRow({
      contractStatus: "PENDING",
      consentStatus: "PENDING",
      contractNoticeReviewedAt: null,
    });
    expect(missingLaunchItems(row, ["INQUIRY_DELIVERY_TEST"])).toEqual([
      "CONTRACT_SIGNED",
      "CONSENT",
      "CONTRACT_NOTICE_REVIEW",
      "COMPANY_INFO_INQUIRY_DELIVERY_TEST",
    ]);
  });

  it("활성 건수와 조건 미충족 건수를 센다", () => {
    const rows = [
      integrationRow({ integrationId: 1, enabled: true }),
      integrationRow({ integrationId: 2 }),
      integrationRow({ integrationId: 3, contractStatus: "EXPIRED" }),
    ];
    expect(summarizeLaunch(rows, [])).toEqual({ total: 3, enabled: 1, blocked: 1 });
  });
});

describe("출시 활성화 화면", () => {
  it("운영담당이 아니면 접근 불가 안내를 보인다", () => {
    renderScreen(["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("회사 정보 준비 상태와 운영 환경 연동만 보인다", async () => {
    renderScreen();
    expect(await screen.findByText("출시 준비 완료")).toBeTruthy();
    const table = await screen.findByRole("table", { name: "운영 환경 연동 목록" });
    expect(await within(table).findByText("SES_MAIL")).toBeTruthy();
    expect(within(table).getByText("NICE_SMS")).toBeTruthy();
    expect(within(table).queryByText("PASS_IDENTITY")).toBeNull();
  });

  it("조건이 남은 연동은 활성화 버튼 대신 남은 조건을 보인다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "운영 환경 연동 목록" });
    expect(await within(table).findByText("남은 조건: 계약 체결, 계약·고지 점검")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "연동 2 활성화" })).toBeNull();
  });

  it("조건을 채운 연동을 확인 뒤 활성화한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "연동 6 활성화" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/실제 고객 요청이 이 공급자로 전달됩니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "활성화" }));
    expect(await screen.findByText("연동 6을 운영 환경에서 활성화했습니다.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "연동 6 활성화" })).toBeNull();
  });

  it("서버가 조건 미충족으로 거절하면 남은 조건을 알린다", async () => {
    const user = userEvent.setup();
    renderScreen();
    server.use(
      http.patch("/api/ops/integrations/:integrationId", () =>
        errorResponse(409, "INTEGRATION_PREREQUISITE_INCOMPLETE", "조건이 끝나지 않았습니다.", {
          missingItems: ["CONSENT", "COMPANY_INFO_INQUIRY_DELIVERY_TEST"],
        }),
      ),
    );
    await user.click(await screen.findByRole("button", { name: "연동 6 활성화" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "활성화" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("남은 조건: 동의 완료, 실제 문의 수신 시험.");
  });

  it("정책 문서 게시와 표준 요금표 승인이 빠지면 남은 조건으로 알린다", async () => {
    const user = userEvent.setup();
    renderScreen();
    server.use(
      http.patch("/api/ops/integrations/:integrationId", () =>
        errorResponse(409, "INTEGRATION_PREREQUISITE_INCOMPLETE", "조건이 끝나지 않았습니다.", {
          missingItems: ["POLICY_DOCUMENTS_NOT_PUBLISHED", "STANDARD_PRICE_SCHEDULE_NOT_APPROVED"],
        }),
      ),
    );
    await user.click(await screen.findByRole("button", { name: "연동 6 활성화" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "활성화" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("남은 조건: 정책 문서 게시, 표준 요금표 승인.");
  });

  it("회사 정보가 준비되지 않으면 모든 비활성 연동을 막는다", async () => {
    renderScreen(["OPS"], ["PUBLISHED_VERSION"]);
    expect(await screen.findByText("출시 활성화 차단")).toBeTruthy();
    const missing = screen.getByRole("list", { name: "회사 정보에서 빠진 항목" });
    expect(within(missing).getByText("게시된 회사 정보 버전")).toBeTruthy();
    const table = await screen.findByRole("table", { name: "운영 환경 연동 목록" });
    expect(await within(table).findByText("남은 조건: 회사 정보 게시")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /활성화$/ })).toBeNull();
  });
});
