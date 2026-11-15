import { QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOCK_COMPANY_INFO, MOCK_PUBLIC_PRICING } from "@/mocks/handlers/billing";
import { createQueryClient } from "@/shared/api/query-client";
import { loadPublicCompanyInfo, loadPublicPricing } from "@/shared/lib/server-public-data";
import { PricingSummaryServer } from "./pricing-summary.server";
import { PublicBusinessFooterServer } from "./public-business-footer.server";
import { PublicPricingScreenServer } from "./public-pricing-screen.server";

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn((url: string) => Promise.resolve(handler(url)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function backendResponse(url: string): Response {
  if (url.endsWith("/api/public/company-info")) return Response.json(MOCK_COMPANY_INFO);
  if (url.endsWith("/api/public/pricing")) return Response.json(MOCK_PUBLIC_PRICING);
  return new Response(null, { status: 404 });
}

async function renderFirstHtml(element: Promise<React.ReactElement>): Promise<string> {
  return renderToString(
    <QueryClientProvider client={createQueryClient()}>{await element}</QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("서버에서 가져오는 공개 정보", () => {
  it("공개 API 응답을 검증해 돌려주고 60초마다 다시 가져온다", async () => {
    const fetchMock = stubFetch(backendResponse);
    expect(await loadPublicCompanyInfo()).toEqual(MOCK_COMPANY_INFO);
    expect(await loadPublicPricing()).toEqual(MOCK_PUBLIC_PRICING);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { next: object }];
    expect(init.next).toEqual({ revalidate: 60 });
  });

  it("오류 응답, 형식 불일치, 네트워크 실패는 값 없음으로 처리한다", async () => {
    stubFetch(() => new Response(null, { status: 503 }));
    expect(await loadPublicCompanyInfo()).toBeUndefined();
    stubFetch(() => Response.json({ unexpected: true }));
    expect(await loadPublicPricing()).toBeUndefined();
    stubFetch(() => Promise.reject(new Error("connect ECONNREFUSED")));
    expect(await loadPublicCompanyInfo()).toBeUndefined();
  });
});

describe("첫 HTML에 담기는 공개 정보", () => {
  it("하단 사업자 정보가 서버 응답 HTML에 들어 있다", async () => {
    stubFetch(backendResponse);
    const html = await renderFirstHtml(PublicBusinessFooterServer());
    expect(html).toContain('data-testid="business-info"');
    expect(html).toContain(MOCK_COMPANY_INFO.businessName);
    expect(html).toContain(MOCK_COMPANY_INFO.businessNumber ?? "");
    expect(html).toContain(MOCK_COMPANY_INFO.contactPhone ?? "");
  });

  it("랜딩 요금 요약과 요금 페이지의 요금표가 서버 응답 HTML에 들어 있다", async () => {
    stubFetch(backendResponse);
    const summary = await renderFirstHtml(PricingSummaryServer());
    const screen = await renderFirstHtml(PublicPricingScreenServer());
    expect(summary).toContain('data-testid="pricing-summary-tiers"');
    expect(summary).not.toContain("요금표를 불러오는 중입니다");
    expect(screen).not.toContain("요금표를 불러오는 중입니다");
    expect(screen).toContain("구간별 요금");
  });

  it("서버 조회가 실패하면 현재처럼 불러오는 중 상태로 시작해 클라이언트가 이어받는다", async () => {
    stubFetch(() => new Response(null, { status: 503 }));
    const footer = await renderFirstHtml(PublicBusinessFooterServer());
    const summary = await renderFirstHtml(PricingSummaryServer());
    expect(footer).not.toContain('data-testid="business-info"');
    expect(footer).toContain("이용약관");
    expect(summary).toContain("요금표를 불러오는 중입니다");
  });
});
