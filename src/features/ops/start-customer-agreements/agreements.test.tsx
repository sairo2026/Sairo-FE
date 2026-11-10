// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsBilling } from "@/mocks/handlers/ops-billing";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { AgreementsScreen } from "./agreements-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/start-customer-agreements",
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
  resetMockOpsBilling();
});
afterAll(() => stopServer());

type User = ReturnType<typeof userEvent.setup>;

function renderScreen(roles: OpsRole[] = ["OPS", "BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<AgreementsScreen />, roles);
}

function isBlocked(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

async function loaded() {
  await screen.findByRole("list", { name: "이벤트별 승인 현황" });
  await screen.findByText("가온공인중개사사무소 (43)");
}

async function fillForm(
  user: User,
  values: { office?: string; event?: string; price?: string; reference?: string } = {},
) {
  await loaded();
  await user.type(screen.getByLabelText("대상 사무소 ID"), values.office ?? "8");
  await user.selectOptions(screen.getByLabelText("시작 고객 이벤트"), values.event ?? "7");
  await user.type(screen.getByLabelText("시작 고객 가격 버전 ID"), values.price ?? "14");
  fireEvent.change(screen.getByLabelText("체결일"), { target: { value: "2027-01-15" } });
  await user.type(screen.getByLabelText("합의서 참조번호"), values.reference ?? "SC-2027-100");
  await user.type(screen.getByLabelText("합의서 문안 버전"), "SC-2026-11");
  await user.click(screen.getByLabelText("주간 사용을 확인했습니다"));
  await user.click(screen.getByLabelText("월 1회 피드백 인터뷰를 확인했습니다"));
}

async function approve(user: User, agreementId: number) {
  await user.click(await screen.findByRole("button", { name: `합의 ${agreementId} 승인` }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
}

describe("합의 목록과 이벤트 현황", () => {
  it("이벤트별 승인 건수와 상한과 운영 목표를 보인다", async () => {
    renderScreen();
    const list = await screen.findByRole("list", { name: "이벤트별 승인 현황" });
    expect(within(list).getByText("시작 고객 2026-12~2027-01")).toBeTruthy();
    expect(within(list).getByText("승인 8건 / 상한 15건")).toBeTruthy();
    expect(within(list).getAllByText("운영 목표 10건").length).toBe(3);
  });

  it("상한에 도달한 이벤트는 더 승인할 수 없다고 안내한다", async () => {
    renderScreen();
    const list = await screen.findByRole("list", { name: "이벤트별 승인 현황" });
    expect(within(list).getByText("승인 10건 / 상한 10건")).toBeTruthy();
    expect(within(list).getAllByText("승인 상한에 도달해 더 승인할 수 없습니다.").length).toBe(1);
  });

  it("합의 목록에서 상태와 가격 보장 기간과 등록자를 보인다", async () => {
    renderScreen();
    await loaded();
    const table = screen.getByRole("table", { name: "시작 고객 합의 목록" });
    expect(within(table).getAllByText("등록됨").length).toBeGreaterThan(0);
    expect(within(table).getByText("승인됨")).toBeTruthy();
    expect(within(table).getByText("취소됨")).toBeTruthy();
    expect(within(table).getAllByText("2027-07-01 ~ 2028-07-01").length).toBeGreaterThan(0);
    expect(within(table).getByRole("columnheader", { name: "등록자" })).toBeTruthy();
  });

  it("상태 필터로 취소된 합의만 본다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("상태"), "REVOKED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("가온공인중개사사무소 (43)")).toBeNull());
    expect(screen.getByText("한빛공인중개사사무소 (7)")).toBeTruthy();
  });

  it("이벤트 필터로 같은 이벤트의 합의만 본다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("이벤트"), "8");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("가온공인중개사사무소 (43)")).toBeNull());
    expect(screen.getByText("다온공인중개사사무소 (45)")).toBeTruthy();
  });

  it("사무소 ID로 걸러내고 결과가 없으면 빈 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.type(screen.getByLabelText("사무소 ID"), "999");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 시작 고객 합의가 없습니다.")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/start-customer-agreements", () =>
        fail ? mockErrors.server() : undefined,
      ),
    );
    renderScreen();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("가온공인중개사사무소 (43)")).toBeTruthy();
  });

  it("목록 403과 429를 안내한다", async () => {
    server.use(http.get("/api/ops/start-customer-agreements", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
    cleanup();
    server.use(http.get("/api/ops/start-customer-agreements", () => mockErrors.rateLimited(5)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("역할별 표시", () => {
  it("경영조회와 지원 역할은 화면을 열 수 없다", () => {
    renderScreen(["EXEC_VIEW"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    cleanup();
    renderScreen(["SUPPORT"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("운영담당만 있으면 등록 폼은 보이고 승인과 취소 버튼은 없다", async () => {
    renderScreen(["OPS"]);
    await loaded();
    expect(screen.getByRole("button", { name: "합의 등록" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "합의 2 승인" })).toBeNull();
    expect(screen.queryByRole("button", { name: "합의 2 취소" })).toBeNull();
  });

  it("결제담당만 있으면 등록 폼은 숨기고 읽기 전용 안내와 승인 버튼을 보인다", async () => {
    renderScreen(["BILLING"]);
    await loaded();
    expect(screen.queryByRole("button", { name: "합의 등록" })).toBeNull();
    expect(screen.getByText(/합의 등록은 운영담당만 할 수 있습니다/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "합의 2 승인" })).toBeTruthy();
  });
});

describe("합의 등록", () => {
  it("빈 폼은 필드별 오류를 안내하고 요청하지 않는다", async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.post("/api/ops/start-customer-agreements", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(screen.getByText("대상 사무소 ID를 숫자로 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("시작 고객 이벤트를 선택해 주세요.")).toBeTruthy();
    expect(screen.getByText("체결일을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("주간 사용 확인이 필요합니다.")).toBeTruthy();
    expect(screen.getByText("월 1회 피드백 인터뷰 확인이 필요합니다.")).toBeTruthy();
    expect(called).toBe(false);
  });

  it("가격 보장 개월 수는 1에서 24까지만 받는다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillForm(user);
    const months = screen.getByLabelText("가격 보장 개월 수");
    await user.clear(months);
    await user.type(months, "25");
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(screen.getByText("가격 보장 개월 수는 1에서 24 사이로 입력해 주세요.")).toBeTruthy();
  });

  it("기본 보장 개월 수는 12이고 사례 공개 동의는 선택이다", async () => {
    const user = userEvent.setup();
    let sent: unknown = null;
    server.use(
      http.post("/api/ops/start-customer-agreements", async ({ request }) => {
        sent = await request.clone().json();
        return undefined;
      }),
    );
    renderScreen();
    await fillForm(user);
    expect((screen.getByLabelText("가격 보장 개월 수") as HTMLInputElement).value).toBe("12");
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    await screen.findByText(/등록만으로 무료 기간이나 가격이 바뀌지 않으며/);
    expect(sent).toMatchObject({
      officeId: 8,
      trialEventId: 7,
      priceScheduleId: 14,
      guaranteeMonths: 12,
      contractedOn: "2027-01-15",
      casePublicationConsent: false,
      weeklyUseConfirmed: true,
      monthlyInterviewConfirmed: true,
      agreementTextVersion: "SC-2026-11",
    });
  });

  it("등록하면 등록됨 합의가 목록에 생기고 폼이 비워진다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(await screen.findByText(/합의 \d+를 등록했습니다/)).toBeTruthy();
    expect(await screen.findByText("새봄공인중개사사무소 (8)")).toBeTruthy();
    expect((screen.getByLabelText("대상 사무소 ID") as HTMLInputElement).value).toBe("");
  });

  it("이미 합의가 있는 사무소는 409로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillForm(user, { office: "42" });
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(await screen.findByText("이미 같은 사무소의 시작 고객 합의가 있습니다.")).toBeTruthy();
  });

  it("가입 창이 닫힌 이벤트는 409로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillForm(user, { event: "9" });
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(
      await screen.findByText("시작 고객 이벤트의 가입 창이 닫혀 승인할 수 없습니다."),
    ).toBeTruthy();
  });

  it("시작 고객 전용이 아닌 가격 버전은 서버 400 메시지를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillForm(user, { price: "10" });
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(await screen.findByText("시작 고객 가격 버전을 확인해 주세요.")).toBeTruthy();
  });

  it("없는 사무소는 404로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillForm(user, { office: "999" });
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("등록 요청이 429이면 요청 한도 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/start-customer-agreements", () => mockErrors.rateLimited(30)));
    renderScreen();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("등록 요청이 403이면 권한 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/start-customer-agreements", () => mockErrors.forbidden()));
    renderScreen();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "합의 등록" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});

describe("합의 승인", () => {
  it("다른 운영자가 등록한 합의를 승인하면 구독 변경 요약을 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await approve(user, 2);
    const result = await screen.findByRole("status", { name: "승인 결과" });
    expect(within(result).getByText("합의 2를 승인했습니다.")).toBeTruthy();
    expect(within(result).getByText("이벤트 승인 9건 / 상한 15건")).toBeTruthy();
    expect(within(result).getByText(/구독 변경 요약: 구독 88 상태 TRIAL/)).toBeTruthy();
    expect(within(result).getByText(/시작 고객 이벤트 기준으로 늦췄습니다/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "합의 2 승인" })).toBeNull());
  });

  it("승인 요청에 합의 버전을 If-Match로 보낸다", async () => {
    const user = userEvent.setup();
    let header: string | null = null;
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", ({ request }) => {
        header = request.headers.get("If-Match");
        return undefined;
      }),
    );
    renderScreen();
    await loaded();
    await approve(user, 2);
    await screen.findByRole("status", { name: "승인 결과" });
    expect(header).toBe("1");
  });

  it("내가 등록한 합의는 승인 버튼이 꺼지고 안내한다", async () => {
    renderScreen();
    await loaded();
    expect(isBlocked(screen.getByRole("button", { name: "합의 3 승인" }))).toBe(true);
    expect(screen.getByText("등록한 운영자는 승인할 수 없습니다.")).toBeTruthy();
    expect(isBlocked(screen.getByRole("button", { name: "합의 2 승인" }))).toBe(false);
  });

  it("승인 상한에 도달한 이벤트는 409로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await approve(user, 4);
    expect(
      await screen.findByText("시작 고객 이벤트의 승인 상한을 넘어 승인할 수 없습니다."),
    ).toBeTruthy();
  });

  it("가입 창이 닫힌 이벤트는 409로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await approve(user, 5);
    expect(
      await screen.findByText("시작 고객 이벤트의 가입 창이 닫혀 승인할 수 없습니다."),
    ).toBeTruthy();
  });

  it("다른 운영자가 먼저 수정했으면 버전 충돌로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", () =>
        mockErrors.versionConflict(2),
      ),
    );
    renderScreen();
    await loaded();
    await approve(user, 2);
    expect(await screen.findByText(/다른 운영자가 먼저 수정했습니다/)).toBeTruthy();
  });

  it("이미 처리된 합의는 409로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    renderScreen();
    await loaded();
    await approve(user, 2);
    expect(await screen.findByText(/이미 처리되었거나/)).toBeTruthy();
  });

  it("서버가 본인 등록 건을 막으면 권한 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", () => mockErrors.forbidden()),
    );
    renderScreen();
    await loaded();
    await approve(user, 2);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("없는 합의는 404로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", () => mockErrors.notFound()),
    );
    renderScreen();
    await loaded();
    await approve(user, 2);
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("승인 요청이 429이면 요청 한도 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", () => mockErrors.rateLimited(30)),
    );
    renderScreen();
    await loaded();
    await approve(user, 2);
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("구독이 아직 없으면 변경된 구독이 없다고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", () =>
        HttpResponse.json({
          agreementId: 2,
          status: "APPROVED",
          approvedAt: "2027-01-16T10:00:00+09:00",
          approvedByOperatorId: 1,
          cohort: { trialEventId: 7, approvedCount: 9, maxOffices: 15 },
          subscription: null,
          version: 2,
        }),
      ),
    );
    renderScreen();
    await loaded();
    await approve(user, 2);
    expect(await screen.findByText(/사무소 구독이 아직 없어 변경된 구독이 없습니다/)).toBeTruthy();
  });

  it("무료 종료 시각이 바뀌지 않은 경우를 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", () =>
        HttpResponse.json({
          agreementId: 2,
          status: "APPROVED",
          approvedAt: "2027-01-16T10:00:00+09:00",
          approvedByOperatorId: 1,
          cohort: { trialEventId: 7, approvedCount: 9, maxOffices: 15 },
          subscription: {
            subscriptionId: 88,
            status: "ACTIVE",
            trialEndsAt: null,
            firstBillingScheduledAt: null,
            promoted: false,
          },
          version: 2,
        }),
      ),
    );
    renderScreen();
    await loaded();
    await approve(user, 2);
    expect(await screen.findByText(/무료 종료 시각은 바뀌지 않았습니다/)).toBeTruthy();
  });

  it("승인 확인을 취소하면 요청하지 않는다", async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.post("/api/ops/start-customer-agreements/2/approve", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "합의 2 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(called).toBe(false);
  });
});

describe("합의 취소", () => {
  it("취소 사유가 있어야 취소할 수 있다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "합의 2 취소" }));
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "합의 취소" });
    expect(isBlocked(confirm)).toBe(true);
    await user.type(within(dialog).getByLabelText("취소 사유"), "대표가 철회했습니다.");
    expect(isBlocked(confirm)).toBe(false);
  });

  it("취소하면 취소됨으로 바뀌고 무료 기간 유지를 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "합의 2 취소" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("취소 사유"), "대표가 철회했습니다.");
    await user.click(within(dialog).getByRole("button", { name: "합의 취소" }));
    expect(await screen.findByText(/이미 부여한 무료 기간은 그대로 유지됩니다/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "합의 2 취소" })).toBeNull());
  });

  it("승인된 합의도 취소할 수 있다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "합의 1 취소" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("취소 사유"), "계약 해지");
    await user.click(within(dialog).getByRole("button", { name: "합의 취소" }));
    expect(await screen.findByText("합의 1를 취소했습니다.", { exact: false })).toBeTruthy();
  });

  it("이미 취소된 합의에는 취소 버튼이 없다", async () => {
    renderScreen();
    await loaded();
    expect(screen.queryByRole("button", { name: "합의 6 취소" })).toBeNull();
    expect(screen.queryByRole("button", { name: "합의 6 승인" })).toBeNull();
  });

  it("취소 요청의 409는 대화상자에서 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/revoke", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "합의 2 취소" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("취소 사유"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "합의 취소" }));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("취소 요청이 429이면 요청 한도 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/start-customer-agreements/2/revoke", () => mockErrors.rateLimited(30)),
    );
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "합의 2 취소" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("취소 사유"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "합의 취소" }));
    expect(await within(dialog).findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});
