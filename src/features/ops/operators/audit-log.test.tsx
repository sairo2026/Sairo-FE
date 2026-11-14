// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOperators } from "@/mocks/handlers/ops-operators";
import { resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { OpsSessionProvider } from "../model/ops-session";
import type { OpsRole } from "../model/roles";
import { AuditLogScreen } from "./audit-log";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/audit-log",
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
  resetMockOperators();
});
afterAll(() => stopServer());

function renderScreen(roles: OpsRole[] = ["SECURITY_ADMIN"]) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <OpsSessionProvider value={{ operatorId: 1, name: "운영 김사이", roles }}>
        <AuditLogScreen />
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
}

async function loaded() {
  await screen.findAllByText("최보안");
}

function dataRows() {
  return screen.getAllByRole("row").slice(1);
}

const empty = { items: [], page: 0, size: 25, totalElements: 0 };

describe("감사 이력", () => {
  it("로딩 뒤 시각과 운영자와 행위와 대상과 상세를 보인다", async () => {
    renderScreen();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await loaded();
    const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(["기록 시각", "운영자", "행위", "대상", "상세"]);
    expect(dataRows()).toHaveLength(8);
    expect(dataRows().some((row) => row.textContent?.includes("원문 접근 회수"))).toBe(true);
    expect(screen.getAllByText("사무소 42").length).toBeGreaterThan(0);
  });

  it("최신 기록이 먼저 나온다", async () => {
    renderScreen();
    await loaded();
    expect(dataRows()[0]?.textContent).toContain("원문 접근 요청");
  });

  it("승인 이력은 원문 접근 여섯 가지 행위로 확인하도록 안내하고 고를 수 있다", async () => {
    renderScreen();
    await loaded();
    const select = screen.getByLabelText("행위 종류") as HTMLSelectElement;
    const labels = Array.from(select.options).map((option) => option.textContent);
    for (const label of [
      "원문 접근 요청",
      "원문 접근 승인",
      "원문 접근 거절",
      "원문 접근 실행",
      "원문 파일 다운로드",
      "원문 접근 회수",
    ]) {
      expect(labels).toContain(label);
    }
    expect(screen.getByText(/본인이 낸 요청은 본인이 승인할 수 없습니다/)).toBeTruthy();
  });

  it("보안관리자가 아니면 접근 불가 안내를 보인다", () => {
    renderScreen(["PRIVACY"]);
    expect(screen.getByRole("alert").textContent).toContain("보안관리자");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("행위 종류로 거른다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("행위 종류"), "RAW_ACCESS_APPROVED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    expect(dataRows()[0]?.textContent).toContain("박지원");
  });

  it("운영자와 대상으로 거른다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.type(screen.getByLabelText("운영자 ID"), "3");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    await user.selectOptions(screen.getByLabelText("대상 종류"), "OFFICE");
    await user.type(screen.getByLabelText("대상 ID"), "42");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    expect(dataRows()[0]?.textContent).toContain("원문 접근 회수");
  });

  it("기간은 서울 기준으로 바꿔 보내고 종료일은 다음 날 0시로 보낸다", async () => {
    const user = userEvent.setup();
    const seen: URL[] = [];
    server.use(
      http.get("/api/ops/audit-log", ({ request }) => {
        seen.push(new URL(request.url));
        return HttpResponse.json(empty);
      }),
    );
    renderScreen();
    await screen.findByText("조건에 맞는 감사 이력이 없습니다.");
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-01-05" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-01-31" } });
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() =>
      expect(seen.at(-1)?.searchParams.get("from")).toBe("2026-01-05T00:00:00+09:00"),
    );
    expect(seen.at(-1)?.searchParams.get("to")).toBe("2026-02-01T00:00:00+09:00");
  });

  it("시작일이 종료일보다 늦으면 요청 없이 알린다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-03-10" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-03-01" } });
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("시작일이 종료일보다 늦습니다.")).toBeTruthy();
    expect(dataRows()).toHaveLength(8);
  });

  it("해당 기간에 기록이 없으면 빈 목록 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2000-01-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2000-01-02" } });
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 감사 이력이 없습니다.")).toBeTruthy();
  });

  it("초기화하면 모든 조건이 지워진다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("행위 종류"), "RAW_ACCESS_APPROVED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "초기화" }));
    await waitFor(() => expect(dataRows()).toHaveLength(8));
    expect((screen.getByLabelText("행위 종류") as HTMLSelectElement).value).toBe("");
  });

  it("허용되지 않은 값이라는 400 응답을 안내한다", async () => {
    server.use(http.get("/api/ops/audit-log", () => mockErrors.validation([])));
    renderScreen();
    expect(await screen.findByText("입력값을 확인해 주세요.")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(http.get("/api/ops/audit-log", () => (fail ? mockErrors.server() : undefined)));
    renderScreen();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await loaded();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/audit-log", () => mockErrors.rateLimited(10)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 돌려주면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/audit-log", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});
