// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockRawAccess } from "@/mocks/handlers/ops-raw-access";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { OpsSessionProvider } from "../model/ops-session";
import type { OpsRole } from "../model/roles";
import { RawAccessListScreen } from "./raw-access-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/raw-access",
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
  resetMockRawAccess();
});
afterAll(() => stopServer());

function renderList(roles: OpsRole[]) {
  setMockOperatorRoles(roles);
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <OpsSessionProvider value={{ operatorId: 1, name: "운영 김사이", roles }}>
        <RawAccessListScreen />
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
}

describe("원문 접근 요청 목록", () => {
  it("로딩 뒤 내 요청을 종류·대상·목적·범위·상태·승인 만료와 함께 보인다", async () => {
    renderList(["OPS"]);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await screen.findAllByText("고객 문의 대응");
    expect(screen.getAllByRole("row").length).toBeGreaterThan(5);
    const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(
      expect.arrayContaining(["종류", "대상", "목적", "범위", "상태", "승인 만료"]),
    );
    expect(screen.getAllByText("고객 문의 대응").length).toBeGreaterThan(0);
    expect(screen.getAllByText("사무소 42").length).toBeGreaterThan(0);
  });

  it("내 요청에는 다른 운영자의 요청이 없다", async () => {
    renderList(["OPS"]);
    await screen.findAllByText("고객 문의 대응");
    expect(screen.queryByRole("link", { name: "1" })).toBeNull();
    expect(screen.getByRole("link", { name: "2" })).toBeTruthy();
  });

  it("운영자 누구나 열 수 있고 새 요청 링크가 있다", async () => {
    renderList(["EXEC_VIEW"]);
    expect(await screen.findAllByText("고객 문의 대응")).toBeTruthy();
    expect(screen.getByRole("link", { name: "새 요청 만들기" }).getAttribute("href")).toBe(
      "/ops/raw-access/new",
    );
  });

  it("개인정보담당이 아니면 승인할 요청 탭이 없다", async () => {
    renderList(["OPS"]);
    await screen.findAllByText("고객 문의 대응");
    expect(screen.queryByRole("tab", { name: "승인할 요청" })).toBeNull();
    expect(screen.getByRole("tab", { name: "내 요청" })).toBeTruthy();
  });

  it("개인정보담당은 본인이 아닌 요청자의 대기 건만 승인할 요청에서 본다", async () => {
    const user = userEvent.setup();
    renderList(["PRIVACY"]);
    await user.click(await screen.findByRole("tab", { name: "승인할 요청" }));
    expect(await screen.findByRole("link", { name: "1" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "12" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "2" })).toBeNull();
  });

  it("상태 필터로 거절된 요청만 본다", async () => {
    const user = userEvent.setup();
    renderList(["OPS"]);
    await screen.findAllByText("고객 문의 대응");
    await user.selectOptions(screen.getByLabelText("상태"), "REJECTED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    const link = await screen.findByRole("link", { name: "11" });
    expect(link).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /^\d+$/ })).toHaveLength(1);
  });

  it("해당 요청이 없으면 빈 목록 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList(["OPS"]);
    await screen.findAllByText("고객 문의 대응");
    await user.selectOptions(screen.getByLabelText("상태"), "EXPIRED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("내가 요청하거나 수혜하는 요청이 없습니다.")).toBeTruthy();
  });

  it("승인 만료 시각은 승인된 건에만 보인다", async () => {
    renderList(["OPS"]);
    const row = (await screen.findByRole("link", { name: "3" })).closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("승인")).toBeTruthy();
    const pending = screen.getByRole("link", { name: "2" }).closest("tr") as HTMLElement;
    expect(within(pending).getByText("-")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/raw-access-requests", () => (fail ? mockErrors.server() : undefined)),
    );
    renderList(["OPS"]);
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect((await screen.findAllByText("고객 문의 대응")).length).toBeGreaterThan(0);
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/raw-access-requests", () => mockErrors.rateLimited(10)));
    renderList(["OPS"]);
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 돌려주면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/raw-access-requests", () => mockErrors.forbidden()));
    renderList(["OPS"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});
