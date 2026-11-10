// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { mockOffices, resetOpsHomeMock } from "@/mocks/handlers/ops-home";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../../home/testing/render-ops-screen";
import type { OpsRole } from "../../model/roles";
import { OfficeDetailScreen } from "./office-detail-screen";
import { OfficesListScreen } from "./offices-list-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/offices",
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
  resetOpsHomeMock();
});
afterAll(() => stopServer());

function renderList(roles: OpsRole[]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<OfficesListScreen />, roles);
}

function renderDetail(roles: OpsRole[], officeId = 501) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<OfficeDetailScreen officeId={officeId} />, roles);
}

function emptyPage() {
  return HttpResponse.json({ items: [], page: 0, size: 25, totalElements: 0 });
}

describe("고객사 목록", () => {
  it("불러오는 동안 표를 로딩 상태로 보인다", () => {
    renderList(["OPS"]);
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("사무소 정보와 인증·구독 상태와 구성원 수를 보인다", async () => {
    renderList(["OPS"]);
    expect(await screen.findByText("사이로중개")).not.toBeNull();
    expect(screen.getByText("한강공인중개사사무소")).not.toBeNull();
    expect(screen.getAllByText("인증 완료").length).toBeGreaterThan(0);
    const table = within(screen.getByRole("table"));
    expect(table.getByText("회수")).not.toBeNull();
    expect(table.getByText("유료 정상")).not.toBeNull();
    expect(table.getByText("체험")).not.toBeNull();
    expect(table.getByText("구독 없음")).not.toBeNull();
    expect(screen.getAllByText("3명").length).toBeGreaterThan(0);
  });

  it("업무 역할이면 사무소명이 상세 링크다", async () => {
    renderList(["SUPPORT"]);
    const link = await screen.findByRole("link", { name: "사이로중개" });
    expect(link.getAttribute("href")).toBe("/ops/offices/501");
  });

  it("경영조회는 목록만 보고 상세 링크는 없다", async () => {
    renderList(["EXEC_VIEW"]);
    expect(await screen.findByText("사이로중개")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "사이로중개" })).toBeNull();
    expect(screen.getByText(/상세는 열 수 없습니다/)).not.toBeNull();
  });

  it("검색어를 적용하면 서버에 검색어를 보내 걸러진 결과를 보인다", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/ops/offices", ({ request }) => {
        seen.push(new URL(request.url).search);
        return emptyPage();
      }),
    );
    renderList(["OPS"]);
    await waitFor(() => expect(seen.length).toBe(1));
    await userEvent.type(screen.getByLabelText("검색어"), "나눔");
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(seen.length).toBe(2));
    expect(seen[1]).toContain("keyword=%EB%82%98%EB%88%94");
    expect(seen[0]).not.toContain("keyword");
  });

  it("검색 결과가 없으면 빈 목록 안내를 보인다", async () => {
    renderList(["OPS"]);
    await screen.findByText("사이로중개");
    await userEvent.type(screen.getByLabelText("검색어"), "없는사무소");
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 사무소가 없습니다.")).not.toBeNull();
  });

  it("인증 상태와 구독 상태 필터를 적용한다", async () => {
    renderList(["OPS"]);
    await screen.findByText("사이로중개");
    await userEvent.selectOptions(screen.getByLabelText("인증 상태"), "REVOKED");
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("사이로중개")).toBeNull());
    expect(screen.getByText("한강공인중개사사무소")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByText("사이로중개")).not.toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("구독 상태"), "TRIAL");
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("사이로중개")).toBeNull());
    expect(screen.getByText("나눔공인중개사사무소")).not.toBeNull();
  });

  it("서버 오류가 나면 오류와 다시 시도를 보이고 다시 시도하면 불러온다", async () => {
    server.use(http.get("/api/ops/offices", () => mockErrors.server(), { once: true }));
    renderList(["OPS"]);
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("사이로중개")).not.toBeNull();
  });

  it("권한이 없다는 응답은 역할 안내 문구로 보인다", async () => {
    server.use(http.get("/api/ops/offices", () => mockErrors.forbidden()));
    renderList(["OPS"]);
    expect((await screen.findByRole("alert")).textContent).toContain("운영 역할이 아닙니다");
  });

  it("조회 조건에 맞는 건이 하나도 없으면 빈 목록 안내를 보인다", async () => {
    server.use(http.get("/api/ops/offices", () => emptyPage()));
    renderList(["OPS"]);
    expect(await screen.findByText("조건에 맞는 사무소가 없습니다.")).not.toBeNull();
  });
});

describe("고객사 상세", () => {
  it("마스킹된 기본 정보와 원문 조회 요청 링크를 보인다", async () => {
    renderDetail(["SUPPORT"]);
    expect(await screen.findByText("123-45-*****")).not.toBeNull();
    expect(screen.getByText("010-****-1234")).not.toBeNull();
    expect(screen.getByText(/마스킹된 운영 메타데이터만/)).not.toBeNull();
    const link = screen.getByRole("link", { name: "원문 조회 요청" });
    expect(link.getAttribute("href")).toBe(
      "/ops/raw-access/new?targetType=OFFICE&targetId=501&officeId=501",
    );
  });

  it("구독과 반환·보관 권한 요약을 보인다", async () => {
    const office = mockOffices.items[0];
    if (!office) throw new Error("모의 사무소가 없습니다.");
    office.detail.returnGrant = {
      grantId: 1,
      grantedAt: "2026-10-01T09:00:00+09:00",
      expiresAt: "2026-10-31T09:00:00+09:00",
      revokedAt: null,
    };
    renderDetail(["SUPPORT"]);
    expect(await screen.findByText("유료 정상")).not.toBeNull();
    expect(screen.getByText(/2026-10-01 09:00 발급, 2026-10-31 09:00 만료/)).not.toBeNull();
    expect(screen.getByText("보관 권한").nextElementSibling?.textContent).toBe("발급 이력 없음");
  });

  it("구독이 없는 사무소는 구독 없음으로 보인다", async () => {
    renderDetail(["SUPPORT"], 502);
    expect(await screen.findByText("구독 없음")).not.toBeNull();
    expect(screen.getByText("회수")).not.toBeNull();
  });

  it("인증 이력 탭이 기본이고 구성원과 고용명부 탭으로 바꿀 수 있다", async () => {
    renderDetail(["SUPPORT"]);
    expect(await screen.findByRole("list", { name: "인증 이력" })).not.toBeNull();
    expect(screen.getByText("서류 확인 완료")).not.toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "구성원" }));
    expect(screen.getByRole("table", { name: "구성원 목록" })).not.toBeNull();
    expect(screen.getByText("대표")).not.toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "고용명부 현황" }));
    expect(screen.getByText("2명")).not.toBeNull();
    expect(screen.getByText(/개인 식별 값은 보이지 않습니다/)).not.toBeNull();
  });

  it("해당 역할이 없으면 청구·문의·이전·운영이력 탭을 숨기고 목록 API도 부르지 않는다", async () => {
    let called = 0;
    const count = () => {
      called += 1;
      return emptyPage();
    };
    server.use(
      http.get("/api/ops/billing/invoices", count),
      http.get("/api/ops/support-inquiries", count),
      http.get("/api/ops/import-support-requests", count),
      http.get("/api/ops/audit-log", count),
    );
    renderDetail(["REVIEW"]);
    await screen.findByText("123-45-*****");
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["인증 이력", "구성원", "고용명부 현황"]);
    expect(called).toBe(0);
  });

  it("결제담당에게만 청구 탭이 보이고 청구서 목록을 불러온다", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/ops/billing/invoices", ({ request }) => {
        seen.push(new URL(request.url).search);
        return HttpResponse.json({
          items: [
            {
              invoiceId: 31,
              officeId: 501,
              subscriptionId: 1,
              billingPeriodStart: "2026-10-01T00:00:00+09:00",
              billingPeriodEnd: "2026-11-01T00:00:00+09:00",
              amount: 30000,
              memberCountSnapshot: 3,
              unitPriceSnapshot: 10000,
              vatIncludedAmount: 33000,
              priceVersion: "A",
              consentVersion: "A",
              consentAmountLimit: 40000,
              consentedAt: "2026-09-30T09:00:00+09:00",
              purchaseConsentId: 5,
              status: "PAID",
              dueAt: "2026-10-05T00:00:00+09:00",
              paidAt: "2026-10-02T00:00:00+09:00",
              createdAt: "2026-10-01T00:00:00+09:00",
            },
          ],
          page: 0,
          size: 25,
          totalElements: 1,
        });
      }),
    );
    renderDetail(["BILLING"]);
    await userEvent.click(await screen.findByRole("tab", { name: "청구" }));
    expect(await screen.findByText("33,000원")).not.toBeNull();
    expect(screen.getByText("결제 완료")).not.toBeNull();
    expect(seen[0]).toContain("officeId=501");
    expect(screen.queryByRole("tab", { name: "문의" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "운영이력" })).toBeNull();
  });

  it("청구 탭이 비어 있으면 빈 목록 안내를 보인다", async () => {
    server.use(http.get("/api/ops/billing/invoices", () => emptyPage()));
    renderDetail(["BILLING"]);
    await userEvent.click(await screen.findByRole("tab", { name: "청구" }));
    expect(await screen.findByText("이 사무소의 청구서가 없습니다.")).not.toBeNull();
  });

  it("고객지원에게는 문의 탭이 보이고 사무소 조건으로 불러온다", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/ops/support-inquiries", ({ request }) => {
        seen.push(new URL(request.url).search);
        return emptyPage();
      }),
    );
    renderDetail(["SUPPORT"]);
    await userEvent.click(await screen.findByRole("tab", { name: "문의" }));
    expect(await screen.findByText("이 사무소의 문의가 없습니다.")).not.toBeNull();
    expect(seen[0]).toContain("officeId=501");
    expect(screen.queryByRole("tab", { name: "청구" })).toBeNull();
  });

  it("이전담당에게는 이전 탭이 보인다", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/ops/import-support-requests", ({ request }) => {
        seen.push(new URL(request.url).search);
        return emptyPage();
      }),
    );
    renderDetail(["MIGRATION"]);
    await userEvent.click(await screen.findByRole("tab", { name: "이전" }));
    expect(await screen.findByText("이 사무소의 이전 지원 신청이 없습니다.")).not.toBeNull();
    expect(seen[0]).toContain("officeId=501");
  });

  it("보안관리자에게는 운영이력 탭이 보이고 사무소 대상 감사 이력을 불러온다", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/ops/audit-log", ({ request }) => {
        seen.push(new URL(request.url).search);
        return HttpResponse.json({
          items: [
            {
              auditId: 1,
              operatorAccountId: 1,
              operatorName: "운영 김사이",
              actionType: "OFFICE_REVOKED",
              targetType: "OFFICE",
              targetId: 501,
              detail: "허위 확인",
              createdAt: "2026-11-01T09:00:00+09:00",
            },
          ],
          page: 0,
          size: 25,
          totalElements: 1,
        });
      }),
    );
    renderDetail(["SECURITY_ADMIN"]);
    await userEvent.click(await screen.findByRole("tab", { name: "운영이력" }));
    expect(await screen.findByText("OFFICE_REVOKED")).not.toBeNull();
    expect(seen[0]).toContain("targetType=OFFICE");
    expect(seen[0]).toContain("targetId=501");
  });

  it("탭 목록을 불러오지 못하면 탭 안에서 오류와 다시 시도를 보인다", async () => {
    server.use(http.get("/api/ops/billing/invoices", () => emptyPage()));
    server.use(http.get("/api/ops/billing/invoices", () => mockErrors.server(), { once: true }));
    renderDetail(["BILLING"]);
    await userEvent.click(await screen.findByRole("tab", { name: "청구" }));
    const panel = await screen.findByRole("tabpanel");
    expect(await within(panel).findByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("경영조회만 있으면 상세를 열 수 없고 상세 API도 부르지 않는다", async () => {
    let called = false;
    server.use(
      http.get("/api/ops/offices/:officeId", () => {
        called = true;
        return mockErrors.forbidden();
      }),
    );
    renderDetail(["EXEC_VIEW"]);
    expect(screen.getByRole("alert").textContent).toContain(
      "이 화면을 볼 수 있는 운영 역할이 아닙니다",
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(called).toBe(false);
  });

  it("없는 사무소는 찾을 수 없다고 안내한다", async () => {
    renderDetail(["SUPPORT"], 999);
    expect(
      await screen.findByRole("heading", { name: "페이지를 찾을 수 없습니다" }),
    ).not.toBeNull();
  });

  it("서버 오류는 다시 시도로 복구할 수 있다", async () => {
    server.use(http.get("/api/ops/offices/:officeId", () => mockErrors.server(), { once: true }));
    renderDetail(["SUPPORT"]);
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("123-45-*****")).not.toBeNull();
  });

  it("불러오는 동안 로딩 안내를 보인다", () => {
    renderDetail(["SUPPORT"]);
    expect(screen.getByText("사무소 정보를 불러오는 중입니다.")).not.toBeNull();
  });
});
