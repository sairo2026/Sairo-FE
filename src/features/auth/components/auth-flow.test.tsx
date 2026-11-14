// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import { MOCK_ACTIVE_CONTEXT, resetMockAuthState, setMockAuthContext } from "@/mocks/handlers/auth";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOpsSession, setMockOperator } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { apiFetch } from "@/shared/api/client";
import { createQueryClient } from "@/shared/api/query-client";
import { AccessNoticeScreen } from "./access-notice-screen";
import { AuthEventsProvider } from "./auth-events-provider";
import { OfficeAccessGate, OfficeAccessShell } from "./office-access-gate";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { OpsAccessGate } from "./ops-access-gate";
import { ReconsentNotice } from "./reconsent-notice";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: "/properties",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => navigation.pathname,
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

beforeEach(() => {
  navigation.pathname = "/properties";
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockAuthState();
  resetMockOpsSession();
  navigation.replace.mockClear();
});

afterAll(() => stopServer());

function renderWithQuery(ui: ReactNode) {
  const queryClient = createQueryClient();
  const view = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { queryClient, ...view };
}

function contextOf(overrides: Partial<AuthContextResponse>): AuthContextResponse {
  return { ...MOCK_ACTIVE_CONTEXT, ...overrides };
}

function AccessProbe() {
  const { role, isReadOnly } = useOfficeAccess();
  return (
    <p>
      업무 화면 {role} {isReadOnly ? "읽기전용" : "쓰기가능"}
    </p>
  );
}

describe("OfficeAccessGate", () => {
  it("판정 전에는 업무 화면을 숨기고 확인 중임을 알린다", () => {
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    expect(screen.getByText("접근 상태를 확인하는 중입니다.")).not.toBeNull();
    expect(screen.queryByText(/업무 화면/)).toBeNull();
  });

  it("활성 상태면 업무 화면과 역할을 보여준다", async () => {
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("업무 화면 AGENT 쓰기가능")).not.toBeNull());
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("미납이 길어진 상태는 읽기 전용으로 알린다", async () => {
    setMockAuthContext(contextOf({ accessCondition: "PAYMENT_OVERDUE" }));
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("업무 화면 AGENT 읽기전용")).not.toBeNull());
  });

  it("로그인하지 않았으면 로그인 화면으로 보낸다", async () => {
    setMockAuthContext(null);
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/login?next=%2Fproperties"),
    );
    expect(screen.queryByText(/업무 화면/)).toBeNull();
  });

  it.each([
    ["PRE_VERIFICATION", "/access"],
    ["OFFICE_UNDER_REVIEW", "/access"],
    ["VERIFIED_UNPAID", "/access"],
    ["AUTH_REVOKED", "/access"],
    ["REMOVED", "/access"],
    ["RETURN_EXPIRED", "/access"],
  ] as const)("%s 상태는 안내 화면으로 보낸다", async (condition, target) => {
    setMockAuthContext(contextOf({ accessCondition: condition }));
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(target));
    expect(screen.queryByText(/업무 화면/)).toBeNull();
  });

  it("재동의가 필요하면 재동의 화면으로 보낸다", async () => {
    setMockAuthContext(contextOf({ reconsentRequired: true }));
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/reconsent"));
  });

  it("역할이 맞지 않으면 권한 없음 화면을 보여준다", async () => {
    setMockAuthContext(contextOf({ role: "DEPUTY" }));
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "접근 권한이 없습니다" })).not.toBeNull(),
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("서버 오류는 오류 화면과 추적 번호를 보여주고 다시 시도하면 복구한다", async () => {
    let shouldFail = true;
    server.use(
      http.get("/api/auth/context", () =>
        shouldFail ? mockErrors.server() : Response.json(MOCK_ACTIVE_CONTEXT),
      ),
    );
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    await waitFor(
      () => expect(screen.getByRole("heading", { name: "문제가 발생했습니다" })).not.toBeNull(),
      { timeout: 4000 },
    );
    expect(screen.getByText("문의 번호: mock-trace-0001")).not.toBeNull();
    shouldFail = false;
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(screen.getByText("업무 화면 AGENT 쓰기가능")).not.toBeNull());
  });

  it("429는 대기 시간을 보여준다", async () => {
    server.use(http.get("/api/auth/context", () => mockErrors.rateLimited(30)));
    renderWithQuery(
      <OfficeAccessGate>
        <AccessProbe />
      </OfficeAccessGate>,
    );
    await waitFor(() =>
      expect(screen.getByText("30초 뒤에 다시 시도할 수 있습니다.")).not.toBeNull(),
    );
  });
});

describe("OfficeAccessShell", () => {
  it("역할별 메뉴를 보여준다", async () => {
    setMockAuthContext(contextOf({ role: "OWNER" }));
    renderWithQuery(
      <OfficeAccessShell activeKey="home">
        <p>본문</p>
      </OfficeAccessShell>,
    );
    await waitFor(() => expect(screen.getByText("본문")).not.toBeNull());
    expect(screen.getByRole("link", { name: "사무소 관리" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "구독·결제" })).not.toBeNull();
  });

  it("중개보조원은 홈과 방문 조율만 본다", async () => {
    navigation.pathname = "/coordinations";
    setMockAuthContext(contextOf({ role: "DEPUTY" }));
    renderWithQuery(
      <OfficeAccessShell activeKey="coordinations">
        <p>본문</p>
      </OfficeAccessShell>,
    );
    await waitFor(() => expect(screen.getByText("본문")).not.toBeNull());
    expect(screen.queryByRole("link", { name: "매물 관리" })).toBeNull();
    expect(screen.getByRole("link", { name: "방문 조율" })).not.toBeNull();
  });

  it("미납 유예 중에는 유예 안내를 위에 띄운다", async () => {
    setMockAuthContext(contextOf({ graceUntil: "2026-12-01T00:00:00+09:00" }));
    renderWithQuery(
      <OfficeAccessShell>
        <p>본문</p>
      </OfficeAccessShell>,
    );
    expect(await screen.findByText(/결제가 확인되지 않았습니다/)).not.toBeNull();
  });
});

describe("OpsAccessGate", () => {
  it("운영자 확인 전에는 콘솔을 숨기고 로그인하지 않았으면 운영자 로그인으로 보낸다", async () => {
    setMockOperator(null);
    renderWithQuery(
      <OpsAccessGate>
        <p>운영 콘솔</p>
      </OpsAccessGate>,
    );
    expect(screen.queryByText("운영 콘솔")).toBeNull();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/ops/login"));
  });

  it("운영자로 확인되면 콘솔을 보여준다", async () => {
    server.use(
      http.get("/api/ops/me", () => Response.json({ operatorId: 1, name: "운영", roles: ["OPS"] })),
    );
    renderWithQuery(
      <OpsAccessGate>
        <p>운영 콘솔</p>
      </OpsAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("운영 콘솔")).not.toBeNull());
  });

  it("사무소 세션만 있는 사용자는 운영 콘솔을 열 수 없다", async () => {
    server.use(http.get("/api/ops/me", () => mockErrors.forbidden()));
    renderWithQuery(
      <OpsAccessGate>
        <p>운영 콘솔</p>
      </OpsAccessGate>,
    );
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/ops/login"));
    expect(screen.queryByText("운영 콘솔")).toBeNull();
  });
});

describe("AccessNoticeScreen", () => {
  it("접근 상태에 맞는 안내와 허용 동작을 보여준다", async () => {
    setMockAuthContext(contextOf({ accessCondition: "VERIFIED_UNPAID", role: "OWNER" }));
    renderWithQuery(<AccessNoticeScreen />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "결제를 기다리고 있습니다" })).not.toBeNull(),
    );
    expect(screen.getByRole("link", { name: "구독·결제" }).getAttribute("href")).toBe("/billing");
    expect(screen.getByRole("link", { name: "내 계정" })).not.toBeNull();
  });

  it("활성 상태면 홈으로 보내고 로그인하지 않았으면 로그인으로 보낸다", async () => {
    const { unmount } = renderWithQuery(<AccessNoticeScreen />);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/home"));
    unmount();
    navigation.replace.mockClear();
    setMockAuthContext(null);
    renderWithQuery(<AccessNoticeScreen />);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
  });

  it("로그아웃하면 로그인 화면으로 보낸다", async () => {
    setMockAuthContext(contextOf({ accessCondition: "REMOVED", removalReason: "REMOVED" }));
    renderWithQuery(<AccessNoticeScreen />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "사무소에서 내보내졌습니다" })).not.toBeNull(),
    );
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
  });
});

describe("ReconsentNotice", () => {
  it("바뀐 약관을 보여주고 동의하면 홈으로 보낸다", async () => {
    setMockAuthContext(contextOf({ reconsentRequired: true }));
    renderWithQuery(<ReconsentNotice />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "사이로 이용약관이 바뀌었습니다" }),
      ).not.toBeNull(),
    );
    expect(screen.getByText("자동결제 안내 문구가 추가되었습니다")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "동의하고 계속" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/home"));
  });

  it("재동의할 항목이 없으면 홈으로 보낸다", async () => {
    renderWithQuery(<ReconsentNotice />);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/home"));
  });

  it("그 사이 약관이 다시 바뀌면 알리고 목록을 다시 불러온다", async () => {
    setMockAuthContext(contextOf({ reconsentRequired: true }));
    let reads = 0;
    server.use(
      http.post("/api/me/terms-agreements", () =>
        Response.json(
          { code: "TERMS_VERSION_CHANGED", message: "바뀜", changedItems: [] },
          { status: 409 },
        ),
      ),
    );
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/api/me/terms-reconsent")) reads += 1;
    });
    renderWithQuery(<ReconsentNotice />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "동의하고 계속" })).not.toBeNull(),
    );
    await userEvent.click(screen.getByRole("button", { name: "동의하고 계속" }));
    await waitFor(() =>
      expect(screen.getByText(/그 사이 약관이 다시 바뀌었습니다/)).not.toBeNull(),
    );
    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(2));
  });
});

describe("AuthEventsProvider", () => {
  function renderProvider() {
    return renderWithQuery(
      <AuthEventsProvider>
        <p>화면</p>
      </AuthEventsProvider>,
    );
  }

  it("로그인 중이던 사용자의 세션이 만료되면 대화상자를 보이고 확인하면 로그인으로 보낸다", async () => {
    const { queryClient } = renderProvider();
    queryClient.setQueryData(["auth", "context"], MOCK_ACTIVE_CONTEXT);
    server.use(http.get("/api/work", () => mockErrors.unauthenticated()));
    await expect(apiFetch("/api/work")).rejects.toMatchObject({ status: 401 });
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "로그인 시간이 끝났습니다" })).not.toBeNull(),
    );
    await userEvent.click(screen.getByRole("button", { name: "로그인하기" }));
    expect(navigation.replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("로그인한 적이 없으면 대화상자 없이 로그인으로 보낸다", async () => {
    renderProvider();
    server.use(http.get("/api/work", () => mockErrors.unauthenticated()));
    await expect(apiFetch("/api/work")).rejects.toMatchObject({ status: 401 });
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("403 RECONSENT_REQUIRED를 받으면 재동의 화면으로 보낸다", async () => {
    renderProvider();
    server.use(http.get("/api/work", () => mockErrors.reconsentRequired()));
    await expect(apiFetch("/api/work")).rejects.toMatchObject({ status: 403 });
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/reconsent"));
  });

  it("재인증 대화상자에서 비밀번호를 확인하면 막혔던 요청이 이어서 성공한다", async () => {
    renderProvider();
    let calls = 0;
    server.use(
      http.post("/api/payment-method", () => {
        calls += 1;
        return calls === 1 ? mockErrors.stepUpRequired() : Response.json({ changed: true });
      }),
    );
    const request = apiFetch("/api/payment-method", { method: "POST" });
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "본인 확인이 필요합니다" })).not.toBeNull(),
    );
    await userEvent.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    await expect(request).resolves.toEqual({ changed: true });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls).toBe(2);
  });

  it("비밀번호를 비워 두면 서버에 묻지 않고 안내한다", async () => {
    renderProvider();
    let calls = 0;
    server.use(
      http.post("/api/payment-method", () => {
        calls += 1;
        return mockErrors.stepUpRequired();
      }),
      http.post("/api/auth/step-up/password", () => {
        calls += 100;
        return mockErrors.invalidCredentials();
      }),
    );
    const settled = apiFetch("/api/payment-method", { method: "POST" }).catch(
      (error: unknown) => error,
    );
    await waitFor(() => expect(screen.getByRole("dialog")).not.toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText("비밀번호를 입력해 주세요.")).not.toBeNull();
    expect(calls).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    await settled;
  });

  it("비밀번호가 틀리면 대화상자에 오류를 보이고 취소하면 원래 오류가 난다", async () => {
    renderProvider();
    server.use(http.post("/api/payment-method", () => mockErrors.stepUpRequired()));
    const request = apiFetch("/api/payment-method", { method: "POST" });
    const settled = request.catch((error: unknown) => error);
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "본인 확인이 필요합니다" })).not.toBeNull(),
    );
    await userEvent.type(screen.getByLabelText("비밀번호"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(screen.getByText("비밀번호가 맞지 않습니다.")).not.toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    await expect(settled).resolves.toMatchObject({ code: "STEP_UP_REQUIRED" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
