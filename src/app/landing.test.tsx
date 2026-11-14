// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { MOCK_COMPANY_INFO, MOCK_PUBLIC_PRICING } from "@/mocks/handlers/billing";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { expectNoAxeViolations } from "@/shared/testing/route-a11y";
import ComingSoonPage from "./coming-soon/page";
import LandingRoute from "./page";
import { FAQ_COPY, LANDING_META } from "@/features/landing/model/landing-copy";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

beforeEach(() => {
  delete document.documentElement.dataset.splash;
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => stopServer());

function renderLanding() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <LandingRoute />
    </QueryClientProvider>,
  );
}

function hrefOf(name: string | RegExp, container: HTMLElement = document.body): string | null {
  return within(container).getAllByRole("link", { name })[0]?.getAttribute("href") ?? null;
}

describe("서비스 첫 화면", () => {
  it("제목은 하나이고 구역 제목이 순서대로 놓인다", async () => {
    renderLanding();
    await screen.findByTestId("pricing-summary-tiers");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent)).toEqual([
      "전화와 메모로 하던 조율을 기록이 남는 흐름으로",
      "사무소 업무에 필요한 기능",
      "방문 조율은 이렇게 진행됩니다",
      "요금",
      "자주 묻는 질문",
      "사무소 업무를 사이로에서 이어 보세요",
    ]);
  });

  it("로그인, 가입, 도입 문의, 요금 구역으로 가는 진입 버튼을 둔다", async () => {
    renderLanding();
    await screen.findByTestId("pricing-summary-tiers");
    const header = screen.getByRole("banner");
    expect(hrefOf("로그인", header)).toBe("/login");
    expect(hrefOf("가입하기", header)).toBe("/signup");
    const main = screen.getByRole("main");
    expect(hrefOf("가입하고 시작하기", main)).toBe("/signup");
    expect(hrefOf("요금 보기", main)).toBe("#pricing");
    expect(hrefOf("도입 문의", main)).toBe("/support/enterprise");
    expect(hrefOf("요금 자세히 보기", main)).toBe("/pricing");
    expect(hrefOf("본문으로 건너뛰기")).toBe("#main");
    expect(main.getAttribute("id")).toBe("main");
  });

  it("구역 이동 메뉴가 실제 구역을 가리킨다", async () => {
    const view = renderLanding();
    await screen.findByTestId("pricing-summary-tiers");
    const menu = screen.getByRole("navigation", { name: "첫 화면 메뉴" });
    for (const link of within(menu).getAllByRole("link")) {
      const target = link.getAttribute("href") ?? "";
      expect(target.startsWith("#")).toBe(true);
      expect(view.container.querySelector(target)).not.toBeNull();
    }
  });

  it("방문 조율을 승인자 선택과 확정 전 재검증 방식으로 설명한다", async () => {
    renderLanding();
    await screen.findByTestId("pricing-summary-tiers");
    const steps = screen.getByRole("heading", { name: "방문 조율은 이렇게 진행됩니다" })
      .parentElement as HTMLElement;
    expect(
      within(steps)
        .getAllByRole("heading", { level: 3 })
        .map((node) => node.textContent),
    ).toEqual([
      "승인자가 조건을 등록합니다",
      "중개사가 맞는 시간에 신청합니다",
      "승인자가 신청을 비교해 선택합니다",
      "시스템이 다시 확인하고 확정합니다",
    ]);
    expect(screen.getByText("승인자가 정한 최신 방문 조건")).not.toBeNull();
    for (const feature of [
      "방문 조율",
      "매물 관리",
      "고객 관리",
      "계약 관리",
      "월말결산",
      "데이터 이전·내보내기",
    ]) {
      expect(screen.getByRole("heading", { level: 3, name: feature })).not.toBeNull();
    }
  });

  it("과장 표현을 쓰지 않고 금액을 문구에 고정하지 않는다", async () => {
    server.use(http.get("/api/public/pricing", () => mockErrors.server()));
    const view = renderLanding();
    await screen.findByRole("alert");
    const text = view.container.textContent ?? "";
    expect(text).not.toMatch(/최초|유일|완벽|최고|1위|100%|무조건|보장/);
    expect(text).not.toMatch(/[0-9][0-9,]*원/);
    expect(`${LANDING_META.title} ${LANDING_META.description}`).not.toMatch(
      /최초|유일|완벽|최고|1위|[0-9][0-9,]*원/,
    );
  });

  it("자주 묻는 질문은 펼침 요소로 답을 담고 정책 화면으로 연결한다", async () => {
    const view = renderLanding();
    await screen.findByTestId("pricing-summary-tiers");
    const items = view.container.querySelectorAll("#faq details");
    expect(items).toHaveLength(FAQ_COPY.items.length);
    for (const item of Array.from(items)) {
      expect(item.querySelector("summary")?.textContent).toBeTruthy();
    }
    expect(
      screen.getByText(/거래의 당사자나 중개인이 아니며 거래를 알선하지 않습니다/),
    ).not.toBeNull();
    expect(hrefOf("요금 안내 보기")).toBe("/pricing");
    expect(hrefOf("환불정책 보기")).toBe("/legal/refund-policy");
  });
});

describe("서비스 첫 화면 요금 요약", () => {
  it("불러오는 동안 로딩을 알린다", () => {
    renderLanding();
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.textContent).toContain("요금표를 불러오는 중입니다.");
  });

  it("서버가 준 구간과 금액, 무료 기간, 청구 시작 전 표지를 보여준다", async () => {
    renderLanding();
    const tiers = await screen.findByTestId("pricing-summary-tiers");
    expect(
      within(tiers)
        .getAllByRole("heading", { level: 3 })
        .map((node) => node.textContent),
    ).toEqual(["1인", "2~4인", "5인 이상", "기업"]);
    expect(within(tiers).getByText("월 39,900원")).not.toBeNull();
    expect(within(tiers).getByText(/월 39,900원 \+ \(인원 - 1\) × 10,000원/)).not.toBeNull();
    expect(within(tiers).getByText(/월 69,900원 \+ \(인원 - 4\) × 8,000원/)).not.toBeNull();
    expect(within(tiers).getByText("별도 견적")).not.toBeNull();
    expect(screen.getByText(/부가가치세를 포함한 월 이용료입니다/)).not.toBeNull();
    expect(
      screen.getByText(/사무소 인증을 마친 날부터 60일 동안 무료로 사용합니다/),
    ).not.toBeNull();
    expect(screen.getByText(/확정 요금이며 결제 심사 후 청구를 시작합니다/)).not.toBeNull();
  });

  it("서버 값이 바뀌면 바뀐 금액을 그대로 보여준다", async () => {
    server.use(
      http.get("/api/public/pricing", () =>
        HttpResponse.json({
          ...MOCK_PUBLIC_PRICING,
          provisionalPrice: false,
          generalTrial: null,
          plans: [
            {
              planCode: "SOLO",
              minMembers: 1,
              maxMembers: 1,
              baseAmount: 12300,
              includedMembers: 1,
              perSeatAmount: null,
            },
          ],
        }),
      ),
    );
    renderLanding();
    const tiers = await screen.findByTestId("pricing-summary-tiers");
    expect(within(tiers).getByText("월 12,300원")).not.toBeNull();
    expect(within(tiers).queryByText(/39,900원/)).toBeNull();
    expect(screen.queryByText(/확정 요금이며 결제 심사 후 청구를 시작합니다/)).toBeNull();
    expect(
      screen.getByText(
        "현재 가입 조건을 준비하고 있습니다. 이용 조건은 고객지원으로 문의해 주세요.",
      ),
    ).not.toBeNull();
    expect(screen.queryByText(/무료로 사용합니다/)).toBeNull();
  });

  it("요금표를 불러오지 못하면 안내하고 다시 시도하면 요금을 보여준다", async () => {
    server.use(http.get("/api/public/pricing", () => mockErrors.server()));
    const user = userEvent.setup();
    renderLanding();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "현재 적용 중인 요금표를 불러오지 못했습니다. 결제는 진행되지 않았습니다.",
    );
    expect(hrefOf("요금 안내로 이동", alert)).toBe("/pricing");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    server.resetHandlers();
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByTestId("pricing-summary-tiers")).not.toBeNull();
  });
});

describe("서비스 첫 화면 하단", () => {
  it("게시된 사업자 정보가 없으면 약관 링크 줄만 보여준다", async () => {
    renderLanding();
    await screen.findByTestId("pricing-summary-tiers");
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).queryByTestId("business-info")).toBeNull();
    expect(hrefOf("이용약관", footer)).toBe("/legal/terms");
    expect(hrefOf("개인정보처리방침", footer)).toBe("/legal/privacy");
    expect(hrefOf("환불정책", footer)).toBe("/legal/refund-policy");
    expect(hrefOf("고객문의", footer)).toBe("/support");
  });

  it("게시된 사업자 정보를 보여주고 값이 없는 줄은 생략한다", async () => {
    server.use(
      http.get("/api/public/company-info", () =>
        HttpResponse.json({ ...MOCK_COMPANY_INFO, contactPhone: null }),
      ),
    );
    renderLanding();
    const info = await screen.findByTestId("business-info");
    expect(within(info).getByText("상호")).not.toBeNull();
    expect(within(info).getByText("사이로(SAIRO)")).not.toBeNull();
    expect(within(info).getByText("사업자등록번호")).not.toBeNull();
    expect(within(info).getByText("주소")).not.toBeNull();
    expect(within(info).getByText("이메일")).not.toBeNull();
    expect(within(info).queryByText("전화")).toBeNull();
    expect(within(info).queryByText("통신판매업 신고번호")).toBeNull();
    const footer = screen.getByRole("contentinfo");
    expect(hrefOf("이용약관", footer)).toBe("/legal/terms");
    expect(hrefOf("개인정보처리방침", footer)).toBe("/legal/privacy");
    expect(hrefOf("환불정책", footer)).toBe("/legal/refund-policy");
  });
});

describe("서비스 첫 화면 접근성", () => {
  it("요금을 불러온 화면에 자동 점검 위반이 없다", async () => {
    server.use(http.get("/api/public/company-info", () => HttpResponse.json(MOCK_COMPANY_INFO)));
    const view = renderLanding();
    await screen.findByTestId("pricing-summary-tiers");
    await screen.findByTestId("business-info");
    await expectNoAxeViolations(view.container);
  });

  it("요금 오류 화면에 자동 점검 위반이 없다", async () => {
    server.use(http.get("/api/public/pricing", () => mockErrors.server()));
    const view = renderLanding();
    await screen.findByRole("alert");
    await expectNoAxeViolations(view.container);
  });

  it("스플래시가 재생 중이어도 자동 점검 위반이 없고 본문이 함께 그려져 있다", async () => {
    document.documentElement.dataset.splash = "play";
    const view = renderLanding();
    await screen.findByTestId("pricing-summary-tiers");
    expect(screen.getByTestId("logo-splash")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).not.toBeNull();
    await expectNoAxeViolations(view.container);
  });
});

describe("출시 안내 화면", () => {
  it("로고와 안내 문구, 공개 안내 링크, 하단 약관 링크를 보여준다", async () => {
    const view = render(
      <QueryClientProvider client={createQueryClient()}>
        <ComingSoonPage />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "정식 출시를 준비하고 있습니다",
    );
    expect(screen.getByRole("img", { name: "사이로" })).not.toBeNull();
    const guide = screen.getByRole("navigation", { name: "공개 안내" });
    expect(hrefOf("요금 안내", guide)).toBe("/pricing");
    expect(hrefOf("약관과 정책", guide)).toBe("/legal");
    const footer = screen.getByRole("contentinfo");
    expect(hrefOf("이용약관", footer)).toBe("/legal/terms");
    expect(view.container.querySelector('[data-testid="logo-splash"]')).toBeNull();
    await expectNoAxeViolations(view.container);
  });
});
