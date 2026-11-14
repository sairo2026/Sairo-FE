// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockCustomerState, setMockCustomerState } from "@/mocks/handlers/customer";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CustomerListScreen } from "./customer-list-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/customers",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockCustomerState();
});

afterAll(() => stopServer());

describe("고객 목록", () => {
  it("불러오는 동안 로딩을 보여주고 고객 행과 역할 배지를 표시한다", async () => {
    renderOffice(<CustomerListScreen />, { role: "AGENT" });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    const link = (await screen.findAllByRole("link", { name: "김수요" }))[0] as HTMLElement;
    const row = link.closest("tr") as HTMLElement;
    expect(within(row).getByText("개인")).not.toBeNull();
    expect(within(row).getByText("수요 고객")).not.toBeNull();
    expect(within(row).getByText("소유자")).not.toBeNull();
    const corporate = screen.getByRole("link", { name: "박법인" }).closest("tr") as HTMLElement;
    expect(within(corporate).getByText("법인")).not.toBeNull();
  });

  it("고객이 없으면 빈 목록 안내를 보여준다", async () => {
    setMockCustomerState({ customers: [] });
    renderOffice(<CustomerListScreen />, { role: "AGENT" });
    expect(await screen.findByText(/조건에 맞는 고객이 없습니다/)).not.toBeNull();
  });

  it("조회가 실패하면 목록 안에 오류와 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/customers", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<CustomerListScreen />, { role: "AGENT" });
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect((await screen.findAllByRole("link", { name: "김수요" })).length).toBeGreaterThan(0);
  });

  it("권한이 없으면 권한 없음 화면을 보여준다", async () => {
    server.use(http.get("/api/customers", () => mockErrors.forbidden()));
    renderOffice(<CustomerListScreen />, { role: "AGENT" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("요청이 많으면 대기 안내를 보여준다", async () => {
    server.use(http.get("/api/customers", () => mockErrors.rateLimited(20)));
    renderOffice(<CustomerListScreen />, { role: "AGENT" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });

  it("역할 필터와 검색어와 보관 보기를 조회 조건으로 보낸다", async () => {
    const requests: string[] = [];
    server.use(
      http.get("/api/customers", ({ request }) => {
        requests.push(new URL(request.url).search);
        return HttpResponse.json({ items: [], page: 0, size: 25, totalElements: 0 });
      }),
    );
    const user = userEvent.setup();
    renderOffice(<CustomerListScreen />, { role: "AGENT" });
    await screen.findByText(/조건에 맞는 고객이 없습니다/);
    await user.selectOptions(screen.getByLabelText("역할"), "OWNER");
    await waitFor(() => expect(requests.some((item) => item.includes("role=OWNER"))).toBe(true));
    await user.type(screen.getByRole("searchbox"), "김");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() => expect(requests.some((item) => item.includes("keyword="))).toBe(true));
    await user.click(screen.getByRole("switch", { name: "보관 고객 보기" }));
    await waitFor(() => expect(requests.some((item) => item.includes("archived=true"))).toBe(true));
    expect(await screen.findByText("보관된 고객이 없습니다.")).not.toBeNull();
  });

  it("보관 고객 행에는 보관 배지를 표시한다", async () => {
    server.use(
      http.get("/api/customers", () =>
        HttpResponse.json({
          items: [
            {
              customerId: 400,
              name: "보관된고객",
              isCorporation: false,
              phone: null,
              roles: ["OTHER"],
              deletedAt: "2026-11-01T09:00:00+09:00",
              updatedAt: "2026-11-01T09:00:00+09:00",
              officeId: 12,
              createdAt: "2026-10-01T09:00:00+09:00",
              version: 2,
            },
          ],
          page: 0,
          size: 25,
          totalElements: 1,
        }),
      ),
    );
    renderOffice(<CustomerListScreen />, { role: "OWNER" });
    const row = (await screen.findByRole("link", { name: "보관된고객" })).closest(
      "tr",
    ) as HTMLElement;
    expect(within(row).getByText("보관")).not.toBeNull();
    expect(within(row).getByRole("checkbox").hasAttribute("disabled")).toBe(true);
  });

  it("대표가 두 고객을 고르면 병합 링크가 나타나고 세 번째 선택은 막힌다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerListScreen />, { role: "OWNER" });
    await screen.findByRole("link", { name: "박법인" });
    expect(screen.queryByRole("link", { name: "선택한 두 고객 병합" })).toBeNull();
    await user.click(screen.getAllByRole("checkbox", { name: "김수요 선택" })[0] as HTMLElement);
    await user.click(screen.getAllByRole("checkbox", { name: "김수요 선택" })[1] as HTMLElement);
    const merge = await screen.findByRole("link", { name: "선택한 두 고객 병합" });
    expect(merge.getAttribute("href")).toBe("/customers/merge?primary=301&merged=302");
    expect(screen.getByRole("checkbox", { name: "박법인 선택" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("대표가 아니면 병합 선택 칸이 없다", async () => {
    renderOffice(<CustomerListScreen />, { role: "AGENT" });
    await screen.findByRole("link", { name: "박법인" });
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
