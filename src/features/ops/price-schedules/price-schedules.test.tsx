// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { opsPriceScheduleHandlers, resetMockOpsContent } from "@/mocks/handlers/ops-content";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { PriceSchedulesScreen } from "./price-schedules-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/price-schedules",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
beforeEach(() => {
  server.use(...opsPriceScheduleHandlers);
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOpsSession();
  resetMockOpsContent();
});
afterAll(() => stopServer());

function renderScreen(roles: OpsRole[] = ["BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<PriceSchedulesScreen />, roles);
}

async function loaded() {
  const table = await screen.findByRole("table", { name: "요금표 버전 목록" });
  await within(table).findByText("2027-02-STD");
  return table;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function dayString(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function fillValidForm(effectiveOffset = 90, noticeOffset = 50) {
  fill("Solo 기준액(원)", "39900");
  fill("2~4인 추가액(원)", "10000");
  fill("5인 이상 추가액(원)", "8000");
  fill("효력 날짜", dayString(effectiveOffset));
  fill("효력 시각", "00:00");
  fill("안내 날짜", dayString(noticeOffset));
  fill("안내 시각", "00:00");
}

describe("목록", () => {
  it("금액, 효력, 상태, 승인자를 보인다", async () => {
    renderScreen();
    const table = await loaded();
    expect(within(table).getByText("39,900원")).toBeTruthy();
    expect(within(table).getByText("시행 중")).toBeTruthy();
    expect(within(table).getAllByText("초안").length).toBe(2);
    expect(within(table).getAllByText("표준").length).toBe(3);
    expect(within(table).getByText("시작 고객")).toBeTruthy();
    expect(within(table).getAllByText("운영자 7").length).toBeGreaterThan(0);
  });

  it("시작 고객 합의와 가격 변경 안내 링크를 보인다", async () => {
    renderScreen();
    await loaded();
    expect(screen.getByRole("link", { name: "시작 고객 합의" }).getAttribute("href")).toBe(
      "/ops/start-customer-agreements",
    );
    expect(screen.getByRole("link", { name: "가격 변경 안내" }).getAttribute("href")).toBe(
      "/ops/price-changes",
    );
  });

  it("불러오는 동안 표가 바쁨 상태다", () => {
    server.use(http.get("/api/ops/price-schedules", () => delay("infinite")));
    const { container } = renderScreen();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("비어 있으면 빈 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/price-schedules", () =>
        Response.json({ items: [], page: 0, size: 25, totalElements: 0 }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("등록된 요금표가 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/price-schedules", () => mockErrors.server(), { once: true }));
    renderScreen();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await loaded();
  });

  it("조회가 429이면 한도 안내를 보인다", async () => {
    server.use(http.get("/api/ops/price-schedules", () => mockErrors.rateLimited(30)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("역할", () => {
  it("결제담당이 아니면 화면을 열 수 없다", () => {
    renderScreen(["OPS"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "요금표 저장" })).toBeNull();
  });

  it("결제담당만 가지면 정책 문서 동의 여부는 확인할 수 없고 이벤트 링크도 숨긴다", async () => {
    renderScreen(["BILLING"]);
    const table = await loaded();
    expect(
      within(table).getAllByText("요금표 정책 문서는 운영담당만 조회할 수 있습니다").length,
    ).toBe(4);
    expect(screen.queryByRole("link", { name: "체험 이벤트" })).toBeNull();
  });

  it("운영담당을 함께 가지면 같은 시행일 요금표 정책 문서의 필요 동의를 보이고 이벤트 링크도 보인다", async () => {
    renderScreen(["BILLING", "OPS"]);
    const table = await loaded();
    expect((await within(table).findAllByText("명시적 동의 불필요")).length).toBe(2);
    expect(within(table).getAllByText("같은 시행일의 요금표 정책 문서가 없습니다").length).toBe(2);
    expect(screen.getByRole("link", { name: "체험 이벤트" }).getAttribute("href")).toBe(
      "/ops/trial-events",
    );
  });

  it("정책 문서가 동의를 요구하면 명시적 동의 필요로 보인다", async () => {
    server.use(
      http.get("/api/ops/policy-documents", () =>
        Response.json({
          items: [
            {
              documentId: 9,
              docType: "PRICING",
              version: "x",
              status: "REVIEW",
              body: "본문",
              changeSummary: "요약",
              noticeAt: null,
              requiresConsent: true,
              effectiveAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
              publishedAt: null,
              reviewedByOperatorId: null,
              publishedByOperatorId: null,
            },
          ],
          page: 0,
          size: 100,
          totalElements: 1,
        }),
      ),
    );
    renderScreen(["BILLING", "OPS"]);
    const table = await loaded();
    expect((await within(table).findAllByText("명시적 동의 필요")).length).toBe(2);
  });

  it("정책 문서 조회가 실패하면 확인하지 못했다고 보인다", async () => {
    server.use(http.get("/api/ops/policy-documents", () => mockErrors.server()));
    renderScreen(["BILLING", "OPS"]);
    const table = await loaded();
    expect((await within(table).findAllByText("확인하지 못했습니다")).length).toBe(4);
  });
});

describe("새 버전 저장", () => {
  it("규칙 안내를 보인다", async () => {
    renderScreen();
    await loaded();
    expect(screen.getByText(/부가가치세를 포함한 월 금액/)).toBeTruthy();
    expect(screen.getByText(/시행 시각의 30일 전 이전이어야 합니다/)).toBeTruthy();
  });

  it("입력한 금액으로 인원별 월 금액 예시를 계산한다", async () => {
    renderScreen();
    await loaded();
    fillValidForm();
    const list = screen.getByRole("list", { name: "인원별 월 금액 예시" });
    expect(within(list).getByText("1명 39,900원")).toBeTruthy();
    expect(within(list).getByText("2명 49,900원")).toBeTruthy();
    expect(within(list).getByText("4명 69,900원")).toBeTruthy();
    expect(within(list).getByText("5명 77,900원")).toBeTruthy();
    expect(within(list).getByText("10명 117,900원")).toBeTruthy();
  });

  it("저장하면 초안 버전이 목록에 생긴다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(
      await screen.findByText(/버전을 저장했습니다. 작성자와 다른 결제담당의 승인이 필요합니다/),
    ).toBeTruthy();
    const table = screen.getByRole("table", { name: "요금표 버전 목록" });
    expect(await within(table).findByText(/-STD-100$/)).toBeTruthy();
  });

  it("시작 고객 대상을 보낸다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/price-schedules", async ({ request }) => {
        sent = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByLabelText("시작 고객"));
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    await screen.findByText(/버전을 저장했습니다/);
    expect(sent).toMatchObject({
      audience: "START_CUSTOMER",
      soloAmount: 39900,
      teamFirstExtra: 10000,
      teamAfterFourExtra: 8000,
    });
    expect(String(sent.effectiveAt)).toMatch(/T00:00:00\+09:00$/);
  });

  it("비어 있으면 항목별로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(screen.getByText("Solo 기준액을 1원 이상의 숫자로 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("2~4인 추가액을 0원 이상의 숫자로 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("5인 이상 추가액을 0원 이상의 숫자로 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("효력일 날짜와 시각을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("안내 날짜와 시각을 입력해 주세요.")).toBeTruthy();
  });

  it("효력일이 과거이면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    fill("효력 날짜", "2000-01-01");
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(screen.getByText("효력일은 현재 이후여야 합니다.")).toBeTruthy();
  });

  it("안내가 효력 30일 전보다 늦으면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm(90, 70);
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(screen.getByText("안내 시각은 효력 시각의 30일 전 이전이어야 합니다.")).toBeTruthy();
  });

  it("안내가 정확히 30일 전이면 저장된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm(90, 60);
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(await screen.findByText(/버전을 저장했습니다/)).toBeTruthy();
  });

  it("서버 400이면 필드 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/price-schedules", () =>
        mockErrors.validation([{ field: "soloAmount", message: "기준액이 범위를 벗어났습니다." }]),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(await screen.findByText("기준액이 범위를 벗어났습니다.")).toBeTruthy();
  });

  it("저장이 403이면 역할 안내를 보인다", async () => {
    server.use(http.post("/api/ops/price-schedules", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("저장이 422이면 서버 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/price-schedules", () =>
        errorResponse(422, "UNPROCESSABLE", "저장할 수 없는 요금표입니다."),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(await screen.findByText("저장할 수 없는 요금표입니다.")).toBeTruthy();
  });

  it("저장이 429이면 한도 안내를 보인다", async () => {
    server.use(http.post("/api/ops/price-schedules", () => mockErrors.rateLimited(10)));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "요금표 저장" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("승인", () => {
  it("초안·검토 상태에만 승인 버튼이 있다", async () => {
    renderScreen();
    await loaded();
    expect(screen.getByRole("button", { name: "2027-02-STD 승인" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "2026-09-STD 승인" })).toBeNull();
    expect(screen.queryByRole("button", { name: "2027-02-START 승인" })).toBeNull();
  });

  it("다른 사람이 만든 요금표를 승인하면 예약된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "2027-02-STD 승인" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/되돌릴 수 없습니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "승인" }));
    expect(
      await screen.findByText("2027-02-STD 요금표를 승인했습니다. 효력 시각에 맞춰 예약됩니다."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "2027-02-STD 승인" })).toBeNull();
  });

  it("작성자 본인은 승인할 수 없다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "2027-03-STD 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/작성자 본인은 승인할 수 없습니다/)).toBeTruthy();
  });

  it("상태가 맞지 않으면 409로 안내한다", async () => {
    server.use(
      http.post("/api/ops/price-schedules/22/approve", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "2027-02-STD 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("승인 대상이 없으면 404로 안내한다", async () => {
    server.use(http.post("/api/ops/price-schedules/22/approve", () => mockErrors.notFound()));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "2027-02-STD 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("승인이 429이면 한도 안내를 보인다", async () => {
    server.use(http.post("/api/ops/price-schedules/22/approve", () => mockErrors.rateLimited(10)));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "2027-02-STD 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("대화상자를 취소하면 요청하지 않는다", async () => {
    let called = false;
    server.use(
      http.post("/api/ops/price-schedules/22/approve", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "2027-02-STD 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(called).toBe(false);
  });
});
