// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOperators } from "@/mocks/handlers/ops-operators";
import { markMockStepUp, resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { OpsSessionProvider } from "../model/ops-session";
import type { OpsRole } from "../model/roles";
import { OperatorListScreen } from "./operator-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/operators",
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

function renderList(roles: OpsRole[] = ["SECURITY_ADMIN"]) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <OpsSessionProvider value={{ operatorId: 1, name: "운영 김사이", roles }}>
        <OperatorListScreen />
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
}

async function loaded() {
  await screen.findByText("박지원");
}

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest("tr");
  if (!row) throw new Error("행을 찾을 수 없습니다.");
  return row;
}

describe("운영자 목록", () => {
  it("로딩 뒤 이름과 상태와 역할을 보인다", async () => {
    renderList();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await loaded();
    expect(within(rowOf("박지원")).getByText("개인정보담당")).toBeTruthy();
    expect(within(rowOf("이퇴사")).getByText("비활성")).toBeTruthy();
    expect(within(rowOf("최보안")).getByText("활성")).toBeTruthy();
  });

  it("5분 이내 재인증이 필요하다는 안내와 이동 링크를 보인다", async () => {
    renderList();
    await loaded();
    expect(screen.getByText(/모두 5분 이내 재인증이 필요하고/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "운영자 초대 관리" }).getAttribute("href")).toBe(
      "/ops/operators/invitations",
    );
    expect(screen.getByRole("link", { name: "감사 이력" }).getAttribute("href")).toBe(
      "/ops/audit-log",
    );
  });

  it("보안관리자가 아니면 접근 불가 안내를 보인다", () => {
    renderList(["OPS"]);
    expect(screen.getByRole("alert").textContent).toContain("보안관리자");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("본인 계정에는 비활성화 버튼이 없다", async () => {
    renderList();
    await loaded();
    expect(within(rowOf("운영 김사이")).queryByRole("button", { name: /비활성화/ })).toBeNull();
    expect(within(rowOf("운영 김사이")).getByText("본인 계정")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(http.get("/api/ops/operators", () => (fail ? mockErrors.server() : undefined)));
    renderList();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await loaded();
  });

  it("운영자가 없으면 빈 목록 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/operators", () =>
        HttpResponse.json({ items: [], page: 0, size: 25, totalElements: 0 }),
      ),
    );
    renderList();
    expect(await screen.findByText("등록된 운영자가 없습니다.")).toBeTruthy();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/operators", () => mockErrors.rateLimited(10)));
    renderList();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 돌려주면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/operators", () => mockErrors.forbidden()));
    renderList();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});

describe("역할 지정", () => {
  async function openRoles(user: ReturnType<typeof userEvent.setup>, name: string) {
    await loaded();
    await user.click(screen.getByRole("button", { name: `${name} 역할 지정` }));
    return screen.getByRole("dialog");
  }

  it("현재 역할이 선택된 채 열리고 재인증 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    const dialog = await openRoles(user, "박지원");
    expect((within(dialog).getByLabelText("개인정보담당") as HTMLInputElement).checked).toBe(true);
    expect((within(dialog).getByLabelText("결제담당") as HTMLInputElement).checked).toBe(false);
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(8);
    expect(dialog.textContent).toContain("5분 이내 재인증");
  });

  it("역할을 바꿔 저장하면 목록에 반영된다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderList();
    const dialog = await openRoles(user, "박지원");
    await user.click(within(dialog).getByLabelText("결제담당"));
    await user.click(within(dialog).getByRole("button", { name: "역할 저장" }));
    expect(await screen.findByText("박지원 역할을 저장했습니다.")).toBeTruthy();
    await waitFor(() => expect(within(rowOf("박지원")).getByText("결제담당")).toBeTruthy());
  });

  it("역할이 하나도 없으면 요청 없이 안내한다", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    server.use(http.post("/api/ops/operators/:id/roles", () => spy()));
    renderList();
    const dialog = await openRoles(user, "박지원");
    await user.click(within(dialog).getByLabelText("개인정보담당"));
    await user.click(within(dialog).getByRole("button", { name: "역할 저장" }));
    expect(await within(dialog).findByText("역할을 하나 이상 선택해 주세요.")).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("재인증이 없으면 저장하지 못하고 안내한다", async () => {
    const user = userEvent.setup();
    renderList();
    const dialog = await openRoles(user, "박지원");
    await user.click(within(dialog).getByRole("button", { name: "역할 저장" }));
    expect(await within(dialog).findByText("본인 확인이 필요합니다.")).toBeTruthy();
  });

  it("마지막 보안관리자의 역할을 회수하려 하면 막고 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderList();
    await loaded();
    await user.click(screen.getByRole("button", { name: "최보안 비활성화" }));
    const reason = screen.getByRole("dialog");
    await user.type(within(reason).getByLabelText("비활성화 사유"), "퇴사 예정");
    await user.click(within(reason).getByRole("button", { name: "비활성화" }));
    await screen.findByText(/최보안 계정을 비활성화했습니다/);
    await user.click(screen.getByRole("button", { name: "운영 김사이 역할 지정" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText("보안관리자"));
    await user.click(within(dialog).getByRole("button", { name: "역할 저장" }));
    expect(
      await within(dialog).findByText(/마지막 활성 보안관리자의 역할은 회수하거나/),
    ).toBeTruthy();
  });

  it("서버 검증 실패와 404를 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(http.post("/api/ops/operators/:id/roles", () => mockErrors.notFound()));
    renderList();
    const dialog = await openRoles(user, "박지원");
    await user.click(within(dialog).getByRole("button", { name: "역할 저장" }));
    expect(await within(dialog).findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("취소하면 대화상자가 닫힌다", async () => {
    const user = userEvent.setup();
    renderList();
    const dialog = await openRoles(user, "박지원");
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("비활성화와 재활성화", () => {
  it("비활성화는 사유가 있어야 하고 종료한 세션 수와 무효화한 승인 수를 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderList();
    await loaded();
    await user.click(screen.getByRole("button", { name: "박지원 비활성화" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("5분 이내 재인증");
    const submit = within(dialog).getByRole("button", { name: "비활성화" });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    await user.type(within(dialog).getByLabelText("비활성화 사유"), "부서 이동");
    await user.click(submit);
    expect(await screen.findByText(/종료한 세션 2개, 무효화한 미실행 승인 3건입니다/)).toBeTruthy();
    await waitFor(() => expect(within(rowOf("박지원")).getByText("비활성")).toBeTruthy());
    expect(within(rowOf("박지원")).getByRole("button", { name: "박지원 재활성화" })).toBeTruthy();
  });

  it("재인증이 없으면 비활성화하지 못하고 안내한다", async () => {
    const user = userEvent.setup();
    renderList();
    await loaded();
    await user.click(screen.getByRole("button", { name: "박지원 비활성화" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("비활성화 사유"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "비활성화" }));
    expect(await within(dialog).findByText("본인 확인이 필요합니다.")).toBeTruthy();
  });

  it("마지막 보안관리자를 비활성화하려 하면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/operators/:id/disable", () =>
        errorResponse(409, "LAST_SECURITY_ADMIN", "마지막"),
      ),
    );
    renderList();
    await loaded();
    await user.click(screen.getByRole("button", { name: "최보안 비활성화" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("비활성화 사유"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "비활성화" }));
    expect(
      await within(dialog).findByText(/마지막 활성 보안관리자의 역할은 회수할 수 없습니다/),
    ).toBeTruthy();
  });

  it("재활성화는 사유 없이 확인만으로 처리한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderList();
    await loaded();
    await user.click(screen.getByRole("button", { name: "이퇴사 재활성화" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("textbox")).toBeNull();
    expect(dialog.textContent).toContain("5분 이내 재인증");
    await user.click(within(dialog).getByRole("button", { name: "재활성화" }));
    expect(await screen.findByText("이퇴사 계정을 다시 활성화했습니다.")).toBeTruthy();
    await waitFor(() => expect(within(rowOf("이퇴사")).getByText("활성")).toBeTruthy());
  });

  it("재활성화에 재인증이 없으면 안내한다", async () => {
    const user = userEvent.setup();
    renderList();
    await loaded();
    await user.click(screen.getByRole("button", { name: "이퇴사 재활성화" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재활성화" }));
    expect(await screen.findByText("본인 확인이 필요합니다.")).toBeTruthy();
  });

  it("이미 활성인 계정을 재활성화하면 상태 전이 오류를 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/operators/:id/enable", () =>
        errorResponse(409, "INVALID_TRANSITION", "활성"),
      ),
    );
    renderList();
    await loaded();
    await user.click(screen.getByRole("button", { name: "이퇴사 재활성화" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재활성화" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });
});
