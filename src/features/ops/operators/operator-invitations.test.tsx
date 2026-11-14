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
import { OperatorInvitationsScreen } from "./operator-invitations";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/operators/invitations",
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
        <OperatorInvitationsScreen />
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
}

async function loaded() {
  await screen.findByText("정수락");
}

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest("tr");
  if (!row) throw new Error("행을 찾을 수 없습니다.");
  return row;
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, email = "ops.new@sairo.example") {
  await user.type(screen.getByLabelText("이름"), "김운영");
  await user.type(screen.getByLabelText("이메일"), email);
  await user.click(screen.getByLabelText("심사담당"));
}

describe("운영자 초대 화면", () => {
  it("유효기간 72시간과 이메일 전달과 토큰 원문 없음과 재인증 안내를 보인다", async () => {
    renderScreen();
    await loaded();
    const text = document.body.textContent ?? "";
    expect(text).toContain("72시간");
    expect(text).toContain("이메일로만 전달");
    expect(text).toContain("토큰 원문이 없습니다");
    expect(text).toContain("5분 이내 재인증");
    expect(screen.getByRole("link", { name: "운영자 목록" }).getAttribute("href")).toBe(
      "/ops/operators",
    );
  });

  it("보안관리자가 아니면 접근 불가 안내를 보인다", () => {
    renderScreen(["REVIEW"]);
    expect(screen.getByRole("alert").textContent).toContain("보안관리자");
    expect(screen.queryByRole("button", { name: "초대 보내기" })).toBeNull();
  });

  it("초대 목록은 상태와 만료 시각과 초대한 사람을 보인다", async () => {
    renderScreen();
    await loaded();
    expect(within(rowOf("정수락")).getByText("수락")).toBeTruthy();
    expect(within(rowOf("한만료")).getByText("만료")).toBeTruthy();
    expect(within(rowOf("오취소")).getByText("취소")).toBeTruthy();
    expect(within(rowOf("정수락")).getByText("운영 김사이")).toBeTruthy();
    expect(screen.getAllByText("대기").length).toBeGreaterThan(0);
  });

  it("대기 초대에만 취소 버튼이 있다", async () => {
    renderScreen();
    await loaded();
    expect(screen.getAllByRole("button", { name: /초대 취소/ })).toHaveLength(1);
  });

  it("상태 필터로 취소된 초대만 본다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("상태"), "CANCELLED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("정수락")).toBeNull());
    expect(screen.getByText("오취소")).toBeTruthy();
  });

  it("초대가 없으면 빈 목록 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/operator-invitations", () =>
        HttpResponse.json({ items: [], page: 0, size: 25, totalElements: 0 }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("초대 내역이 없습니다.")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/operator-invitations", () => (fail ? mockErrors.server() : undefined)),
    );
    renderScreen();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await loaded();
  });

  it("목록 조회가 429나 403이면 안내한다", async () => {
    server.use(http.get("/api/ops/operator-invitations", () => mockErrors.rateLimited(10)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("초대 만들기", () => {
  it("비어 있으면 요청 없이 항목별로 알린다", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    server.use(http.post("/api/ops/operator-invitations", () => spy()));
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText("이름을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("이메일 형식을 확인해 주세요.")).toBeTruthy();
    expect(screen.getByText("부여할 역할을 하나 이상 선택해 주세요.")).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("이메일 형식이 틀리면 알린다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await fillForm(user, "not-an-email");
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText("이메일 형식을 확인해 주세요.")).toBeTruthy();
  });

  it("재인증 뒤 초대하면 안내하고 목록에 대기 초대가 생긴다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderScreen();
    await loaded();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText(/김운영님에게 초대 메일을 보냈습니다/)).toBeTruthy();
    expect(await screen.findByText("ops.new@sairo.example")).toBeTruthy();
    expect((screen.getByLabelText("이름") as HTMLInputElement).value).toBe("");
  });

  it("응답에 토큰 원문이 없다", async () => {
    markMockStepUp();
    renderScreen();
    await loaded();
    const response = await fetch("/api/ops/operator-invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteeName: "김운영",
        inviteeEmail: "a@sairo.example",
        roles: ["OPS"],
      }),
    });
    expect(response.status).toBe(201);
    const keys = Object.keys((await response.json()) as object);
    expect(keys.some((key) => /token/i.test(key))).toBe(false);
  });

  it("재인증이 없으면 초대하지 못하고 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText("본인 확인이 필요합니다.")).toBeTruthy();
  });

  it("같은 이메일로 대기 중인 초대가 있으면 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderScreen();
    await loaded();
    await fillForm(user, "new1@sairo.example");
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText(/같은 이메일로 대기 중인 초대가 이미 있습니다/)).toBeTruthy();
  });

  it("요청 한도 초과와 권한 오류를 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(http.post("/api/ops/operator-invitations", () => mockErrors.rateLimited(30)));
    renderScreen();
    await loaded();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
    server.use(http.post("/api/ops/operator-invitations", () => mockErrors.forbidden()));
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});

describe("초대 취소", () => {
  async function askCancel(user: ReturnType<typeof userEvent.setup>) {
    await loaded();
    await user.click(screen.getByRole("button", { name: "이신규 초대 취소" }));
    return screen.getByRole("dialog");
  }

  it("확인하면 대기 초대가 취소 상태가 된다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderScreen();
    const dialog = await askCancel(user);
    expect(dialog.textContent).toContain("5분 이내 재인증");
    await user.click(within(dialog).getByRole("button", { name: "초대 취소" }));
    expect(await screen.findByText("이신규님에 대한 초대를 취소했습니다.")).toBeTruthy();
    await waitFor(() => expect(within(rowOf("이신규")).getByText("취소")).toBeTruthy());
    expect(screen.queryByRole("button", { name: /초대 취소/ })).toBeNull();
  });

  it("목록의 버전을 If-Match로 보낸다", async () => {
    const user = userEvent.setup();
    let header: string | null = null;
    server.use(
      http.post("/api/ops/operator-invitations/:id/cancel", ({ request }) => {
        header = request.headers.get("If-Match");
        return mockErrors.notFound();
      }),
    );
    renderScreen();
    const dialog = await askCancel(user);
    await user.click(within(dialog).getByRole("button", { name: "초대 취소" }));
    await waitFor(() => expect(header).toBe("1"));
  });

  it("다른 운영자가 먼저 바꿨으면 버전 충돌을 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/operator-invitations/:id/cancel", () => mockErrors.versionConflict(2)),
    );
    renderScreen();
    const dialog = await askCancel(user);
    await user.click(within(dialog).getByRole("button", { name: "초대 취소" }));
    expect(await screen.findByText(/다른 운영자가 먼저 수정했습니다/)).toBeTruthy();
  });

  it("이미 수락되거나 만료된 초대는 상태 전이 오류를 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/operator-invitations/:id/cancel", () =>
        errorResponse(409, "INVALID_TRANSITION", "상태"),
      ),
    );
    renderScreen();
    const dialog = await askCancel(user);
    await user.click(within(dialog).getByRole("button", { name: "초대 취소" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("재인증이 없으면 취소하지 못하고 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await askCancel(user);
    await user.click(within(dialog).getByRole("button", { name: "초대 취소" }));
    expect(await screen.findByText("본인 확인이 필요합니다.")).toBeTruthy();
    expect(within(rowOf("이신규")).getByText("대기")).toBeTruthy();
  });

  it("대화상자에서 닫으면 취소하지 않는다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await askCancel(user);
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(rowOf("이신규")).getByText("대기")).toBeTruthy();
  });
});
