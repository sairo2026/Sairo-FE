// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsBilling } from "@/mocks/handlers/ops-billing";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { PriceChangesScreen } from "./price-changes-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/price-changes",
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

function renderScreen(roles: OpsRole[] = ["BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<PriceChangesScreen />, roles);
}

async function loaded() {
  await screen.findByText("예시공인중개사사무소 (42)");
  await waitFor(() =>
    expect(
      within(screen.getByLabelText("새 가격 버전") as HTMLElement).getAllByRole("option").length,
    ).toBeGreaterThan(1),
  );
}

async function createFor(user: ReturnType<typeof userEvent.setup>, scheduleId: string) {
  await loaded();
  await user.selectOptions(screen.getByLabelText("새 가격 버전"), scheduleId);
  await user.click(screen.getByRole("button", { name: "안내 생성" }));
  const dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "안내 생성" }));
}

describe("결정 현황", () => {
  it("결정별 건수를 보인다", async () => {
    renderScreen();
    const summary = await screen.findByRole("list", { name: "결정별 건수" });
    expect(within(summary).getByText("응답 대기 2건")).toBeTruthy();
    expect(within(summary).getByText("동의 1건")).toBeTruthy();
    expect(within(summary).getByText("거절 1건")).toBeTruthy();
    expect(within(summary).getByText("안내만 1건")).toBeTruthy();
    expect(within(summary).getByText("무응답 종료 1건")).toBeTruthy();
  });

  it("사무소별 응답 기한과 결정을 보인다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "가격 변경 안내 목록" });
    await within(table).findByText("예시공인중개사사무소 (42)");
    expect(within(table).getByRole("columnheader", { name: "응답 기한" })).toBeTruthy();
    expect(within(table).getAllByText("응답 대기").length).toBeGreaterThan(0);
    expect(within(table).getByText("동의")).toBeTruthy();
    expect(within(table).getByText("거절")).toBeTruthy();
    expect(within(table).getByText("안내만")).toBeTruthy();
    expect(within(table).getByText("무응답 종료")).toBeTruthy();
  });

  it("시작 고객 가격 보장 종료 안내도 같은 목록에 있다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "가격 변경 안내 목록" });
    await within(table).findByText("2027-07-START");
    expect(screen.getByText(/시작 고객 가격 보장 종료 안내도 같은 목록/)).toBeTruthy();
  });

  it("결정 필터로 거절한 사무소만 본다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("예시공인중개사사무소 (42)");
    await user.selectOptions(screen.getByLabelText("결정"), "DECLINED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("예시공인중개사사무소 (42)")).toBeNull());
    expect(screen.getByText("새봄공인중개사사무소 (8)")).toBeTruthy();
  });

  it("가격 버전 필터를 걸면 건수도 그 버전 기준으로 바뀐다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("가격 버전"), "12");
    await user.click(screen.getByRole("button", { name: "조회" }));
    const summary = await screen.findByRole("list", { name: "결정별 건수" });
    await waitFor(() => expect(within(summary).getByText("응답 대기 1건")).toBeTruthy());
    expect(within(summary).getByText("동의 0건")).toBeTruthy();
  });

  it("사무소 ID로 걸러내고 결과가 없으면 빈 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("예시공인중개사사무소 (42)");
    await user.type(screen.getByLabelText("사무소 ID"), "999");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 가격 변경 안내가 없습니다.")).toBeTruthy();
  });

  it("초기화하면 전체 목록으로 돌아간다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("예시공인중개사사무소 (42)");
    await user.type(screen.getByLabelText("사무소 ID"), "999");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await screen.findByText("조건에 맞는 가격 변경 안내가 없습니다.");
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByText("예시공인중개사사무소 (42)")).toBeTruthy();
  });

  it("목록 서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/price-change-notices", () => (fail ? mockErrors.server() : undefined)),
    );
    renderScreen();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("예시공인중개사사무소 (42)")).toBeTruthy();
  });

  it("목록 403과 429를 안내한다", async () => {
    server.use(http.get("/api/ops/price-change-notices", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
    cleanup();
    server.use(http.get("/api/ops/price-change-notices", () => mockErrors.rateLimited(5)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("결제담당만 쓸 수 있다", () => {
    renderScreen(["OPS"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "안내 생성" })).toBeNull();
  });

  it("경영조회는 쓸 수 없다", () => {
    renderScreen(["EXEC_VIEW"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });
});

describe("안내 생성", () => {
  it("선택할 수 있는 가격 버전은 예약 상태의 표준 요금표뿐이다", async () => {
    renderScreen();
    await loaded();
    const select = screen.getByLabelText("새 가격 버전");
    const options = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options.some((text) => text?.startsWith("2027-01-STD"))).toBe(true);
    expect(options.some((text) => text?.startsWith("2027-04-STD"))).toBe(false);
    expect(options.some((text) => text?.startsWith("2027-07-START"))).toBe(false);
  });

  it("30일 규칙 안내를 보인다", async () => {
    renderScreen();
    expect(await screen.findByText(/30일 뒤 정각은 허용합니다/)).toBeTruthy();
  });

  it("버전을 고르지 않으면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "안내 생성" }));
    expect(screen.getByText("안내를 만들 새 가격 버전을 선택해 주세요.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("사무소 ID 형식이 잘못되면 확인 전에 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("새 가격 버전"), "10");
    await user.type(screen.getByLabelText("사무소 ID 목록(선택)"), "42, abc");
    await user.click(screen.getByRole("button", { name: "안내 생성" }));
    expect(screen.getByText(/쉼표로 구분해 500개 이내/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("효력 시각이 30일 뒤 정각이면 만들고 건너뛴 사무소와 사유를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await createFor(user, "12");
    expect(await screen.findByText("안내 4건을 만들고 2곳을 건너뛰었습니다.")).toBeTruthy();
    const skipped = screen.getByRole("list", { name: "건너뛴 사무소" });
    expect(within(skipped).getByText(/사무소 43: 시작 고객 가격 보장 기간 안/)).toBeTruthy();
    expect(within(skipped).getByText(/사무소 44: 체험·결제 전 상태이거나 구독 없음/)).toBeTruthy();
  });

  it("생성하면 목록과 건수가 새로 고쳐진다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await createFor(user, "12");
    await screen.findByText("안내 4건을 만들고 2곳을 건너뛰었습니다.");
    const summary = screen.getByRole("list", { name: "결정별 건수" });
    await waitFor(() => expect(within(summary).getByText("응답 대기 6건")).toBeTruthy());
  });

  it("효력 시각이 30일 뒤보다 앞서면 422 오류를 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await createFor(user, "11");
    expect(await screen.findByText(/30일 뒤보다 앞서 안내를 만들 수 없습니다/)).toBeTruthy();
    expect(screen.queryByText(/안내 \d+건을 만들고/)).toBeNull();
  });

  it("이미 안내가 있는 사무소는 건너뛴다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await createFor(user, "10");
    expect(await screen.findByText("안내 0건을 만들고 6곳을 건너뛰었습니다.")).toBeTruthy();
    expect(screen.getAllByText(/같은 새 가격 버전 안내가 이미 있음/).length).toBeGreaterThan(0);
  });

  it("사무소 ID 목록을 보내면 그 사무소만 대상으로 한다", async () => {
    const user = userEvent.setup();
    let sent: unknown = null;
    server.use(
      http.post("/api/ops/price-schedules/12/notices", async ({ request }) => {
        sent = await request.clone().json();
        return undefined;
      }),
    );
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("새 가격 버전"), "12");
    await user.type(screen.getByLabelText("사무소 ID 목록(선택)"), "42, 43");
    await user.click(screen.getByRole("button", { name: "안내 생성" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "안내 생성" }));
    expect(await screen.findByText("안내 1건을 만들고 1곳을 건너뛰었습니다.")).toBeTruthy();
    expect(sent).toEqual({ officeIds: [42, 43] });
  });

  it("예약 상태가 아니면 409로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/price-schedules/10/notices", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    renderScreen();
    await createFor(user, "10");
    expect(await screen.findByText(/예약 상태의 표준 요금표 버전에만/)).toBeTruthy();
  });

  it("없는 가격 버전은 404로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/price-schedules/10/notices", () => mockErrors.notFound()));
    renderScreen();
    await createFor(user, "10");
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("서버 400 오류는 서버 메시지를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/price-schedules/10/notices", () =>
        mockErrors.validation([
          { field: "officeIds", message: "사무소 ID 형식이 잘못되었습니다." },
        ]),
      ),
    );
    renderScreen();
    await createFor(user, "10");
    expect(await screen.findByText("사무소 ID 형식이 잘못되었습니다.")).toBeTruthy();
  });

  it("생성 요청이 429이면 요청 한도 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/price-schedules/10/notices", () => mockErrors.rateLimited(30)));
    renderScreen();
    await createFor(user, "10");
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("확인 대화상자를 취소하면 요청하지 않는다", async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.post("/api/ops/price-schedules/12/notices", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    renderScreen();
    await loaded();
    await user.selectOptions(screen.getByLabelText("새 가격 버전"), "12");
    await user.click(screen.getByRole("button", { name: "안내 생성" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(called).toBe(false);
  });

  it("가격 버전 목록을 불러오지 못하면 안내한다", async () => {
    server.use(http.get("/api/ops/price-schedules", () => mockErrors.server()));
    renderScreen();
    expect(await screen.findByText("가격 버전을 불러오지 못했습니다.")).toBeTruthy();
  });
});
