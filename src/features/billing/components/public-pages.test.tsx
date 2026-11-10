// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { MOCK_COMPANY_INFO, MOCK_PUBLIC_PRICING } from "@/mocks/handlers/billing";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { LegalDocumentScreen } from "./legal-document-screen";
import { PublicBusinessFooter } from "./public-business-footer";
import { PublicPricingScreen } from "./public-pricing-screen";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => stopServer());

function renderPublic(ui: ReactNode) {
  return render(<QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>);
}

describe("공개 요금 페이지", () => {
  it("불러오는 동안 로딩을 보여준다", () => {
    renderPublic(<PublicPricingScreen />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("확정 구간식과 VAT 포함 표시, 1명부터 10명까지 예시를 보여준다", async () => {
    renderPublic(<PublicPricingScreen />);
    expect(await screen.findByRole("heading", { name: "사무소 단위 월 구독 요금" })).not.toBeNull();
    expect(screen.getByText("1인")).not.toBeNull();
    expect(screen.getByText("2~4인")).not.toBeNull();
    expect(screen.getByText("5인 이상")).not.toBeNull();
    expect(screen.getByText("기업")).not.toBeNull();
    expect(screen.getByText("별도 견적")).not.toBeNull();
    expect(screen.getByText(/월 39,900원 \(VAT 포함\)/)).not.toBeNull();
    expect(screen.getByText(/월 39,900원 \+ \(인원 - 1\) × 10,000원/)).not.toBeNull();
    expect(screen.getByText(/월 69,900원 \+ \(인원 - 4\) × 8,000원/)).not.toBeNull();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(11);
    expect(within(table).getByText("117,900원")).not.toBeNull();
  });

  it("결제 심사 전 표지와 일반 체험 방식, 가입 진입 버튼을 보여준다", async () => {
    renderPublic(<PublicPricingScreen />);
    expect(await screen.findByText(/확정 요금이며 결제 심사 후 청구를 시작합니다/)).not.toBeNull();
    expect(
      screen.getByText(/사무소 인증을 마친 날부터 60일 동안 무료로 사용합니다/),
    ).not.toBeNull();
    expect(screen.getByText("요금 구간 안내")).not.toBeNull();
    expect(screen.getByText(/모든 구간의 기능은 같습니다/)).not.toBeNull();
    expect(screen.getByText("청약철회와 환불")).not.toBeNull();
    expect(screen.getByText("신용카드와 체크카드 자동결제만 지원합니다.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "구독·결제 약관" }).getAttribute("href")).toBe(
      "/legal/subscription-terms",
    );
    expect(screen.getByRole("link", { name: "가입하고 카드 등록하기" }).getAttribute("href")).toBe(
      "/signup",
    );
    expect(screen.getByText("카드를 등록해도 무료 기간 중에는 결제되지 않습니다.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "환불정책" }).getAttribute("href")).toBe(
      "/legal/refund-policy",
    );
    expect(screen.getByTestId("pricing-image").textContent).toContain(
      "화면 예시를 불러오지 못했습니다.",
    );
  });

  it("결제 심사 후에는 표지를 내리고 고정 종료 방식 문구를 보여준다", async () => {
    server.use(
      http.get("/api/public/pricing", () =>
        HttpResponse.json({
          ...MOCK_PUBLIC_PRICING,
          provisionalPrice: false,
          generalTrial: {
            freeEndMode: "FIXED_END",
            durationDays: null,
            fixedFreeEndsAt: "2027-04-01T00:00:00+09:00",
            applicantWindowEndsAt: "2027-03-01T00:00:00+09:00",
          },
        }),
      ),
    );
    renderPublic(<PublicPricingScreen />);
    expect(
      await screen.findByText(
        "2027-03-01까지 가입한 사무소는 2027-04-01까지 무료로 사용합니다. 유료 전환 전에 안내를 드리고 결제는 2027-04-02부터 시작됩니다. 결제 전에 금액과 결제일을 다시 안내하고 동의를 받습니다.",
      ),
    ).not.toBeNull();
    expect(screen.queryByText(/확정 요금이며 결제 심사 후 청구를 시작합니다/)).toBeNull();
  });

  it("활성 체험 이벤트가 없으면 무료 기간을 약속하지 않고 문의를 안내한다", async () => {
    server.use(
      http.get("/api/public/pricing", () =>
        HttpResponse.json({ ...MOCK_PUBLIC_PRICING, generalTrial: null }),
      ),
    );
    renderPublic(<PublicPricingScreen />);
    expect(
      await screen.findByText(
        "현재 가입 조건을 준비하고 있습니다. 이용 조건은 고객지원으로 문의해 주세요.",
      ),
    ).not.toBeNull();
    expect(screen.queryByText(/무료로 사용합니다/)).toBeNull();
  });

  it("요금표를 불러오지 못하면 결제가 진행되지 않았다고 알리고 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/public/pricing", () => mockErrors.server()));
    const user = userEvent.setup();
    renderPublic(<PublicPricingScreen />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "현재 적용 중인 요금표를 불러오지 못했습니다. 결제는 진행되지 않았습니다.",
    );
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("1인")).not.toBeNull();
  });

  it("요금표가 게시되지 않았으면 같은 오류 안내를 보여준다", async () => {
    server.use(
      http.get("/api/public/pricing", () =>
        HttpResponse.json(
          { code: "PRICE_SCHEDULE_NOT_PUBLISHED", message: "없음", traceId: "t" },
          { status: 404 },
        ),
      ),
    );
    renderPublic(<PublicPricingScreen />);
    expect((await screen.findByRole("alert")).textContent).toContain("결제는 진행되지 않았습니다.");
  });

  it("요청 제한(429)이면 대기 시간을 알린다", async () => {
    server.use(http.get("/api/public/pricing", () => mockErrors.rateLimited(90)));
    renderPublic(<PublicPricingScreen />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "1분 30초 뒤에 다시 시도해 주세요.",
    );
  });
});

describe("공개 사업자 정보 하단", () => {
  it("게시된 회사 정보를 보여주고 신고번호가 비어 있으면 그 줄을 숨긴다", async () => {
    server.use(http.get("/api/public/company-info", () => HttpResponse.json(MOCK_COMPANY_INFO)));
    renderPublic(<PublicBusinessFooter />);
    const info = await screen.findByTestId("business-info");
    expect(within(info).getByText("사이로(SAIRO)")).not.toBeNull();
    expect(within(info).getByText("김태환")).not.toBeNull();
    expect(within(info).getByText("사업자등록번호")).not.toBeNull();
    expect(within(info).getByText("전화")).not.toBeNull();
    expect(within(info).queryByText("통신판매업 신고번호")).toBeNull();
    expect(screen.getByRole("link", { name: "환불정책" }).getAttribute("href")).toBe(
      "/legal/refund-policy",
    );
    expect(screen.getByRole("link", { name: "고객문의" }).getAttribute("href")).toBe("/support");
  });

  it("통신판매업 신고번호가 있으면 줄을 보여준다", async () => {
    server.use(
      http.get("/api/public/company-info", () =>
        HttpResponse.json({ ...MOCK_COMPANY_INFO, ecommerceNotice: "2026-서울-0000" }),
      ),
    );
    renderPublic(<PublicBusinessFooter />);
    expect(await screen.findByText("2026-서울-0000")).not.toBeNull();
  });

  it("게시된 회사 정보가 없으면 링크 줄만 보여준다", async () => {
    renderPublic(<PublicBusinessFooter />);
    expect(await screen.findByRole("link", { name: "이용약관" })).not.toBeNull();
    expect(screen.queryByTestId("business-info")).toBeNull();
    expect(screen.getByRole("link", { name: "개인정보처리방침" }).getAttribute("href")).toBe(
      "/legal/privacy",
    );
  });
});

describe("약관과 환불정책 페이지", () => {
  it("이용약관 조항과 목차를 보여준다", () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <LegalDocumentScreen slug="terms" />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "이용약관" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "제1조 (목적)" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "제23조 (준거법과 관할)" })).not.toBeNull();
    const toc = screen.getByRole("navigation", { name: "이용약관 목차" });
    expect(within(toc).getAllByRole("link").length).toBeGreaterThanOrEqual(23);
    expect(screen.getByText("시행 버전 1.0")).not.toBeNull();
  });

  it("환불정책은 환불 기준을 보여주고 초안 표기를 노출하지 않는다", () => {
    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <LegalDocumentScreen slug="refund-policy" />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "환불정책" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "2. 환불 대상과 금액" })).not.toBeNull();
    expect(container.textContent).not.toMatch(/변호사|초안|내부 기준안/);
  });

  it("개인정보처리방침 조항을 보여준다", () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <LegalDocumentScreen slug="privacy" />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "개인정보처리방침" })).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: /제7조 \(개인정보 처리업무의 위탁\)/ }),
    ).not.toBeNull();
  });
});
