// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsSupport } from "@/mocks/handlers/ops-support";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { InquiryListScreen } from "./inquiry-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/inquiries",
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
  resetMockOpsSupport();
});
afterAll(() => stopServer());

function renderList(roles: OpsRole[] = ["SUPPORT"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<InquiryListScreen />, roles);
}

async function apply(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "조회" }));
}

describe("문의 목록", () => {
  it("로딩 뒤 문의를 유형·사무소·작성자·담당·우선순위·시각과 함께 보인다", async () => {
    renderList();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("한강공인중개사사무소")).toBeTruthy();
    const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(
      expect.arrayContaining([
        "문의 번호",
        "유형",
        "사무소",
        "작성자",
        "상태",
        "우선순위",
        "담당",
        "접수 시각",
        "첫 답변 목표",
      ]),
    );
    expect(screen.getByText("북악부동산")).toBeTruthy();
    expect(screen.getAllByText("홍*동").length).toBeGreaterThan(0);
  });

  it("담당이 없는 문의는 미배정으로 보인다", async () => {
    renderList();
    const row = (await screen.findByText("한강공인중개사사무소")).closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("미배정")).toBeTruthy();
  });

  it("사무소가 없는 문의는 사무소 없음으로 보인다", async () => {
    renderList();
    expect(await screen.findByText("사무소 없음")).toBeTruthy();
  });

  it("문의 번호는 상세 화면 링크다", async () => {
    renderList();
    const link = await screen.findByRole("link", { name: "501" });
    expect(link.getAttribute("href")).toBe("/ops/inquiries/501");
  });

  it("첫 답변 목표가 지났는데 공개 답변이 없는 문의에만 기한 초과를 표시한다", async () => {
    renderList();
    await screen.findByText("한강공인중개사사무소");
    expect(screen.getAllByText("기한 초과")).toHaveLength(1);
  });

  it("유형 필터로 결제 문의만 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("북악부동산");
    await user.selectOptions(screen.getByLabelText("문의 유형"), "BILLING");
    await apply(user);
    expect(await screen.findByText("한강공인중개사사무소")).toBeTruthy();
    expect(screen.queryByText("북악부동산")).toBeNull();
  });

  it("상태 필터로 종료 문의만 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("북악부동산");
    await user.selectOptions(screen.getByLabelText("상태"), "CLOSED");
    await apply(user);
    expect(await screen.findByText("사무소 없음")).toBeTruthy();
    expect(screen.queryByText("북악부동산")).toBeNull();
  });

  it("우선순위 필터로 높음 문의만 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("한강공인중개사사무소");
    await user.selectOptions(screen.getByLabelText("우선순위"), "HIGH");
    await apply(user);
    expect(await screen.findByText("북악부동산")).toBeTruthy();
    expect(screen.queryByText("한강공인중개사사무소")).toBeNull();
  });

  it("미배정만 체크하면 담당이 없는 문의만 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("북악부동산");
    await user.click(screen.getByLabelText("미배정만"));
    await apply(user);
    expect(await screen.findByText("한강공인중개사사무소")).toBeTruthy();
    expect(screen.queryByText("북악부동산")).toBeNull();
  });

  it("기한 초과만 체크하면 초과 문의만 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("북악부동산");
    await user.click(screen.getByLabelText("기한 초과만"));
    await apply(user);
    expect(await screen.findByText("한강공인중개사사무소")).toBeTruthy();
    expect(screen.queryByText("북악부동산")).toBeNull();
    expect(screen.queryByText("남산공인중개사")).toBeNull();
  });

  it("담당 운영자 번호와 사무소 번호로 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("북악부동산");
    await user.type(screen.getByLabelText("담당 운영자 번호"), "7");
    await apply(user);
    expect(await screen.findByText("북악부동산")).toBeTruthy();
    expect(screen.queryByText("남산공인중개사")).toBeNull();
    await user.clear(screen.getByLabelText("담당 운영자 번호"));
    await user.type(screen.getByLabelText("사무소 번호"), "9");
    await apply(user);
    expect(await screen.findByText("남산공인중개사")).toBeTruthy();
    expect(screen.queryByText("북악부동산")).toBeNull();
  });

  it("초기화하면 모든 문의가 다시 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("북악부동산");
    await user.selectOptions(screen.getByLabelText("문의 유형"), "BILLING");
    await apply(user);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByText("북악부동산")).toBeTruthy();
  });

  it("조건에 맞는 문의가 없으면 빈 목록 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("북악부동산");
    await user.selectOptions(screen.getByLabelText("문의 유형"), "SIGNUP");
    await apply(user);
    expect(await screen.findByText("조건에 맞는 문의가 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 안내하고 다시 시도하면 목록이 나온다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/support-inquiries", () => mockErrors.server(), { once: true }));
    renderList();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByText("한강공인중개사사무소")).toBeTruthy();
  });

  it("요청이 많으면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    server.use(http.get("/api/ops/support-inquiries", () => mockErrors.rateLimited(30)));
    renderList();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 주면 처리 권한 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/support-inquiries", () =>
        errorResponse(403, "FORBIDDEN", "권한이 없습니다."),
      ),
    );
    renderList();
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });

  it("지원 역할이 없으면 화면 대신 접근 불가 안내를 보인다", () => {
    renderList(["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("search")).toBeNull();
  });
});
