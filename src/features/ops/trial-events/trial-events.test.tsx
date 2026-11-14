// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsContent } from "@/mocks/handlers/ops-content";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { TrialEventsScreen } from "./trial-events-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/trial-events",
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
  resetMockOpsContent();
});
afterAll(() => stopServer());

function renderScreen(roles: OpsRole[] = ["OPS"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<TrialEventsScreen />, roles);
}

async function loaded() {
  const table = await screen.findByRole("table", { name: "체험 이벤트 목록" });
  await within(table).findByText("가을 체험 이벤트");
  return table;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function dayString(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function fillWindow(startOffset: number, endOffset: number, name = "새 이벤트") {
  fill("이벤트명", name);
  fill("시작 날짜", dayString(startOffset));
  fill("시작 시각", "00:00");
  fill("종료 날짜", dayString(endOffset));
  fill("종료 시각", "00:00");
}

describe("목록", () => {
  it("기간, 대상 조건, 무료 종료 방식, 상태를 보인다", async () => {
    renderScreen();
    const table = await loaded();
    expect(within(table).getByText("겨울 체험 이벤트")).toBeTruthy();
    expect(within(table).getAllByText("기간 내 사무소 생성, 기간 내 최초 인증 신청").length).toBe(
      5,
    );
    expect(within(table).getByText(/고정 종료 시각 \(/)).toBeTruthy();
    expect(within(table).getByText("진행 중")).toBeTruthy();
    expect(within(table).getAllByText("승인 대기").length).toBe(2);
    expect(within(table).getAllByText("시작 고객").length).toBe(2);
    expect(within(table).getByText("30곳")).toBeTruthy();
  });

  it("승인자를 보인다", async () => {
    renderScreen();
    const table = await loaded();
    expect(within(table).getAllByText("운영자 7").length).toBeGreaterThan(0);
  });

  it("홈 화면이 쓰는 조회 형식에도 응답한다", async () => {
    const response = await fetch("/api/ops/trial-events?page=0&size=100");
    const body = (await response.json()) as { items: unknown[]; size: number };
    expect(response.status).toBe(200);
    expect(body.size).toBe(100);
    expect(body.items.length).toBe(5);
  });

  it("불러오는 동안 표가 바쁨 상태다", () => {
    server.use(http.get("/api/ops/trial-events", () => delay("infinite")));
    const { container } = renderScreen();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("비어 있으면 빈 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/trial-events", () =>
        Response.json({ items: [], page: 0, size: 25, totalElements: 0 }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("등록된 체험 이벤트가 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/trial-events", () => mockErrors.server(), { once: true }));
    renderScreen();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await loaded();
  });

  it("조회가 403이면 역할 안내를 보인다", async () => {
    server.use(http.get("/api/ops/trial-events", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});

describe("역할", () => {
  it("운영담당이 아니면 화면을 열 수 없다", () => {
    renderScreen(["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "이벤트 등록" })).toBeNull();
  });

  it("결제담당을 함께 가진 운영담당에게만 요금표 링크를 보인다", async () => {
    renderScreen(["OPS", "BILLING"]);
    await loaded();
    expect(screen.getByRole("link", { name: "요금표" }).getAttribute("href")).toBe(
      "/ops/price-schedules",
    );
  });

  it("운영담당만 가지면 요금표 링크를 숨긴다", async () => {
    renderScreen(["OPS"]);
    await loaded();
    expect(screen.queryByRole("link", { name: "요금표" })).toBeNull();
  });
});

describe("등록", () => {
  it("규칙 안내를 보인다", async () => {
    renderScreen();
    await loaded();
    expect(screen.getByText(/60×24시간을 유지합니다/)).toBeTruthy();
    expect(screen.getByText(/이미 부여된 체험은 취소하지 않습니다/)).toBeTruthy();
    expect(screen.getByText(/시작 시각은 포함하고 종료 시각은 제외하며/)).toBeTruthy();
  });

  it("대상 조건 기본값은 둘 다 요구다", async () => {
    renderScreen();
    await loaded();
    expect(
      (screen.getByLabelText("기간 안에 사무소를 만든 경우만 대상으로 합니다") as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (
        screen.getByLabelText(
          "기간 안에 처음 인증을 신청한 경우만 대상으로 합니다",
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it("기간 방식 이벤트를 등록하고 결과를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260, "봄 체험 이벤트");
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    const result = await screen.findByText(/봄 체험 이벤트 이벤트를 등록했습니다/);
    expect(result).toBeTruthy();
    const box = result.closest("div") as HTMLElement;
    expect(within(box).getByText("기간 방식")).toBeTruthy();
    expect(within(box).getByText("일반")).toBeTruthy();
    const table = screen.getByRole("table", { name: "체험 이벤트 목록" });
    expect(await within(table).findByText("봄 체험 이벤트")).toBeTruthy();
  });

  it("고정 종료 방식은 고정 종료 시각과 함께 보낸다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/trial-events", async ({ request }) => {
        sent = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260);
    await user.click(screen.getByLabelText("고정 종료 시각"));
    fill("고정 무료 종료 날짜", dayString(300));
    fill("고정 무료 종료 시각", "00:00");
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    const result = await screen.findByText(/이벤트를 등록했습니다/);
    expect(sent).toMatchObject({ freeEndMode: "FIXED_END", audience: "GENERAL", maxOffices: null });
    expect(typeof sent.fixedFreeEndsAt).toBe("string");
    const box = result.closest("div") as HTMLElement;
    expect(within(box).getByText("고정 종료 시각")).toBeTruthy();
    expect(within(box).getByText("고정 무료 종료 시각")).toBeTruthy();
  });

  it("고정 종료 방식인데 시각이 없으면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260);
    await user.click(screen.getByLabelText("고정 종료 시각"));
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(screen.getByText("고정 무료 종료 날짜와 시각을 입력해 주세요.")).toBeTruthy();
  });

  it("고정 종료가 이벤트 종료보다 앞서면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260);
    await user.click(screen.getByLabelText("고정 종료 시각"));
    fill("고정 무료 종료 날짜", dayString(210));
    fill("고정 무료 종료 시각", "00:00");
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(screen.getByText(/이벤트 종료 시각 이후여야 합니다/)).toBeTruthy();
  });

  it("시작 고객 이벤트는 상한을 입력해야 한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260);
    await user.click(screen.getByLabelText("시작 고객"));
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(screen.getByText(/승인 사무소 상한을 1 이상의 숫자로 입력해 주세요/)).toBeTruthy();
  });

  it("시작 고객 이벤트의 상한을 보낸다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/trial-events", async ({ request }) => {
        sent = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260);
    await user.click(screen.getByLabelText("시작 고객"));
    fill("승인 사무소 상한", "15");
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    const result = await screen.findByText(/이벤트를 등록했습니다/);
    expect(sent).toMatchObject({ audience: "START_CUSTOMER", maxOffices: 15 });
    expect(within(result.closest("div") as HTMLElement).getByText("15곳")).toBeTruthy();
  });

  it("비어 있거나 종료가 시작보다 앞서면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(screen.getByText("이벤트명을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("시작 날짜와 시각을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("종료 날짜와 시각을 입력해 주세요.")).toBeTruthy();
    fillWindow(260, 200);
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(screen.getByText("종료 시각은 시작 시각보다 뒤여야 합니다.")).toBeTruthy();
  });

  it("가입 창이 겹치면 409 오류를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(10, 50);
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(await screen.findByText(/가입 창이 겹쳐 저장할 수 없습니다/)).toBeTruthy();
  });

  it("시작 고객 이벤트는 가입 창이 겹쳐도 저장된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(10, 50);
    await user.click(screen.getByLabelText("시작 고객"));
    fill("승인 사무소 상한", "5");
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(await screen.findByText(/이벤트를 등록했습니다/)).toBeTruthy();
  });

  it("서버 400이면 필드 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/trial-events", () =>
        mockErrors.validation([{ field: "name", message: "이벤트명이 중복됩니다." }]),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260);
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(await screen.findByText("이벤트명이 중복됩니다.")).toBeTruthy();
  });

  it("등록이 429이면 한도 안내를 보인다", async () => {
    server.use(http.post("/api/ops/trial-events", () => mockErrors.rateLimited(10)));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260);
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("등록이 422이면 서버 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/trial-events", () =>
        errorResponse(422, "UNPROCESSABLE", "등록할 수 없는 이벤트입니다."),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillWindow(200, 260);
    await user.click(screen.getByRole("button", { name: "이벤트 등록" }));
    expect(await screen.findByText("등록할 수 없는 이벤트입니다.")).toBeTruthy();
  });
});

describe("대상 미리보기", () => {
  it("대상 수와 중복 수혜 사무소를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "겨울 체험 이벤트 대상 미리보기" }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("대상 사무소 85곳")).toBeTruthy();
    expect(within(dialog).getByText("중복 수혜 2곳")).toBeTruthy();
    expect(within(dialog).getByText("예시공인중개사사무소 (42)")).toBeTruthy();
  });

  it("중복이 없으면 없다고 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "가을 체험 이벤트 대상 미리보기" }));
    expect(await screen.findByText("중복 수혜가 없습니다.")).toBeTruthy();
  });

  it("불러오지 못하면 다시 시도할 수 있다", async () => {
    server.use(
      http.get("/api/ops/trial-events/2/preview", () => mockErrors.notFound(), { once: true }),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "겨울 체험 이벤트 대상 미리보기" }));
    expect(await screen.findByText("대상 미리보기를 불러오지 못했습니다.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("대상 사무소 85곳")).toBeTruthy();
  });
});

describe("승인", () => {
  it("승인 대기 이벤트에만 승인 버튼이 있다", async () => {
    renderScreen();
    await loaded();
    expect(screen.getByRole("button", { name: "겨울 체험 이벤트 승인" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "가을 체험 이벤트 승인" })).toBeNull();
    expect(screen.queryByRole("button", { name: "여름 체험 이벤트 승인" })).toBeNull();
  });

  it("다른 사람이 만든 이벤트를 승인하면 예약된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "겨울 체험 이벤트 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/시작 시각에 맞춰 예약됩니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "겨울 체험 이벤트 승인" })).toBeNull();
    expect(screen.getByRole("button", { name: "겨울 체험 이벤트 중단" })).toBeTruthy();
  });

  it("작성자 본인은 승인할 수 없다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "시작 고객 모집 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/작성자 본인은 승인할 수 없습니다/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "시작 고객 모집 승인" })).toBeTruthy();
  });

  it("승인 대기가 아니면 409로 안내한다", async () => {
    server.use(
      http.post("/api/ops/trial-events/2/approve", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "겨울 체험 이벤트 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("승인 대상이 없으면 404로 안내한다", async () => {
    server.use(http.post("/api/ops/trial-events/2/approve", () => mockErrors.notFound()));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "겨울 체험 이벤트 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("승인이 429이면 한도 안내를 보인다", async () => {
    server.use(http.post("/api/ops/trial-events/2/approve", () => mockErrors.rateLimited(10)));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "겨울 체험 이벤트 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("중단", () => {
  it("소급 변경이 없다고 안내하고 중단한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "가을 체험 이벤트 중단" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/이미 부여한 체험은 소급해서 바꾸지 않습니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "중단" }));
    expect(await screen.findByText("가을 체험 이벤트 이벤트를 중단했습니다.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "가을 체험 이벤트 중단" })).toBeNull();
  });

  it("예약·진행 중이 아니면 중단 버튼이 없다", async () => {
    renderScreen();
    await loaded();
    expect(screen.queryByRole("button", { name: "여름 체험 이벤트 중단" })).toBeNull();
    expect(screen.queryByRole("button", { name: "겨울 체험 이벤트 중단" })).toBeNull();
    expect(screen.getByRole("button", { name: "시작 고객 고정 종료 중단" })).toBeTruthy();
  });

  it("중단이 409이면 안내한다", async () => {
    server.use(
      http.post("/api/ops/trial-events/1/stop", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "가을 체험 이벤트 중단" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "중단" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("중단이 403이면 역할 안내를 보인다", async () => {
    server.use(http.post("/api/ops/trial-events/1/stop", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "가을 체험 이벤트 중단" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "중단" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});
