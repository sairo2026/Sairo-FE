// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { resetMockOpsSupport } from "@/mocks/handlers/ops-support";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { DisputeScreen } from "./dispute-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/visit-review-disputes",
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

function renderScreen(roles: OpsRole[] = ["SUPPORT"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<DisputeScreen />, roles);
}

function isBlocked(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

async function openDetail(user: ReturnType<typeof userEvent.setup>, id: number) {
  await user.click(await screen.findByRole("button", { name: `이의 ${id} 상세 보기` }));
  return screen.findByRole("region", { name: `이의 ${id} 상세` });
}

async function filterBy(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.selectOptions(screen.getByLabelText("이의 상태"), value);
  await user.click(screen.getByRole("button", { name: "조회" }));
}

describe("평가 이의 목록", () => {
  it("로딩 뒤 열림 상태의 이의만 접수 시각 오름차순으로 보인다", async () => {
    renderScreen();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    const buttons = screen.getAllByRole("button", { name: /상세 보기/ });
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "이의 8201 상세 보기",
      "이의 8202 상세 보기",
    ]);
  });

  it("이의 번호·상태·사무소·중개사·사유·접수 시각·목표 처리일을 보인다", async () => {
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(
      expect.arrayContaining([
        "이의 번호",
        "상태",
        "사무소",
        "중개사",
        "사유",
        "접수 시각",
        "목표 처리일",
      ]),
    );
    expect(screen.getAllByText("예시 공인중개사사무소").length).toBe(2);
    expect(screen.getAllByText("김중개").length).toBe(2);
  });

  it("목표 처리일이 지난 열린 이의에만 목표일 경과를 표시한다", async () => {
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    expect(screen.getAllByText("목표일 경과")).toHaveLength(1);
  });

  it("평가 유지 필터로 결정된 이의를 조회한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    await filterBy(user, "UPHELD");
    expect(await screen.findByRole("button", { name: "이의 8203 상세 보기" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "이의 8201 상세 보기" })).toBeNull();
  });

  it("평가 삭제 필터로 삭제된 이의를 조회한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    await filterBy(user, "REMOVED");
    expect(await screen.findByRole("button", { name: "이의 8204 상세 보기" })).toBeTruthy();
  });

  it("전체 필터는 모든 상태를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    await filterBy(user, "OPEN,UPHELD,REMOVED");
    await screen.findByRole("button", { name: "이의 8204 상세 보기" });
    expect(screen.getAllByRole("button", { name: /상세 보기/ })).toHaveLength(4);
  });

  it("초기화하면 열림 상태로 돌아간다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    await filterBy(user, "REMOVED");
    await screen.findByRole("button", { name: "이의 8204 상세 보기" });
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByRole("button", { name: "이의 8201 상세 보기" })).toBeTruthy();
  });

  it("해당 이의가 없으면 빈 목록 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/visit-review-disputes", () =>
        HttpResponse.json({ page: 0, size: 25, totalElements: 0, items: [] }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("조건에 맞는 평가 이의가 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 안내하고 다시 시도하면 목록이 나온다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/ops/visit-review-disputes", () => mockErrors.server(), { once: true }),
    );
    renderScreen();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByRole("button", { name: "이의 8201 상세 보기" })).toBeTruthy();
  });

  it("목록 조회가 429이면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    server.use(http.get("/api/ops/visit-review-disputes", () => mockErrors.rateLimited(30)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("목록 조회가 403이면 처리 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/visit-review-disputes", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });
});

describe("이의 상세", () => {
  it("방문 일시·세 항목 응답·입력과 수정 시각·수정 횟수·승인자 유형을 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    for (const label of [
      "방문 일시",
      "평가 최초 입력",
      "평가 마지막 입력·수정",
      "평가 수정 횟수",
      "승인자 유형",
      "이의 접수 시각",
      "처리 목표일",
    ]) {
      expect(within(detail).getByText(label)).toBeTruthy();
    }
    expect(within(detail).getByText("0회")).toBeTruthy();
    expect(within(detail).getByText("소유자")).toBeTruthy();
    const answers = within(detail).getByRole("region", { name: "평가 응답" });
    expect(within(answers).getByText("약속 시간을 지켰는가: 아니오")).toBeTruthy();
    expect(within(answers).getByText("사전에 연락했는가: 아니오")).toBeTruthy();
    expect(within(answers).getByText("요청한 대로 안내했는가: 예")).toBeTruthy();
  });

  it("링크 발급자가 평가받은 중개사와 같으면 같음과 판정 참고 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    expect(within(detail).getByText("같음")).toBeTruthy();
    expect(within(detail).getByText(/평가를 자동으로 제외하지 않습니다/)).toBeTruthy();
  });

  it("링크 발급자가 다르면 다름으로 보이고 참고 안내는 없다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8202);
    expect(within(detail).getByText("다름")).toBeTruthy();
    expect(within(detail).getByText("점유자")).toBeTruthy();
    expect(within(detail).getByText("2회")).toBeTruthy();
    expect(within(detail).queryByText(/평가를 자동으로 제외하지 않습니다/)).toBeNull();
  });

  it("이의 사유 코드와 설명을 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8202);
    const reason = within(detail).getByRole("region", { name: "이의 사유" });
    expect(
      within(reason).getByText(/평가 대상이 잘못됨 · 다른 중개사의 방문이었습니다\./),
    ).toBeTruthy();
  });

  it("승인자 이름·연락처·매물 주소는 없고 원문 접근 요청으로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    expect(within(detail).queryByText("승인자 이름")).toBeNull();
    expect(within(detail).queryByText("매물 주소")).toBeNull();
    expect(within(detail).getByText(/이 화면에 나오지 않습니다/)).toBeTruthy();
    const link = within(detail).getByRole("link", { name: "원문 접근 요청" });
    expect(link.getAttribute("href")).toBe("/ops/raw-access/new");
  });

  it("결정이 되돌릴 수 없고 감사 로그에 남는다는 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    expect(within(detail).getByText(/결정은 되돌릴 수 없습니다/)).toBeTruthy();
    expect(within(detail).getByText(/운영자 감사 로그에 남습니다/)).toBeTruthy();
  });

  it("이미 결정된 이의는 결정 결과와 메모를 보이고 결정 버튼이 없다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    await filterBy(user, "UPHELD");
    const detail = await openDetail(user, 8203);
    expect(within(detail).getByText("연락 기록이 확인되지 않아 평가를 유지합니다.")).toBeTruthy();
    expect(within(detail).queryByRole("button", { name: "평가 삭제" })).toBeNull();
    expect(within(detail).queryByLabelText("결정 사유 메모")).toBeNull();
  });
});

describe("이의 결정", () => {
  it("결정 사유 메모가 없으면 결정 버튼이 꺼져 있다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    expect(isBlocked(within(detail).getByRole("button", { name: "평가 유지" }))).toBe(true);
    expect(isBlocked(within(detail).getByRole("button", { name: "평가 삭제" }))).toBe(true);
  });

  it("공백만 입력하면 결정 버튼이 꺼져 있다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(within(detail).getByLabelText("결정 사유 메모"), "   ");
    expect(isBlocked(within(detail).getByRole("button", { name: "평가 유지" }))).toBe(true);
  });

  it("메모는 500자까지 받고 중개사 화면에 보인다고 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    const memo = within(detail).getByLabelText("결정 사유 메모");
    expect(memo.getAttribute("maxlength")).toBe("500");
    expect(within(detail).getByText(/중개사 화면에 보입니다/)).toBeTruthy();
  });

  it("메모를 쓰면 결정 버튼이 활성이 된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(within(detail).getByLabelText("결정 사유 메모"), "근거를 확인했습니다");
    expect(isBlocked(within(detail).getByRole("button", { name: "평가 유지" }))).toBe(false);
    expect(isBlocked(within(detail).getByRole("button", { name: "평가 삭제" }))).toBe(false);
  });

  it("평가 유지는 되돌릴 수 없다는 확인을 거친 뒤 결정된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(
      within(detail).getByLabelText("결정 사유 메모"),
      "기록으로 사실이 확인되지 않습니다",
    );
    await user.click(within(detail).getByRole("button", { name: "평가 유지" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/결정은 되돌릴 수 없고/)).toBeTruthy();
    expect(within(dialog).getByText(/감사 로그에 남습니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "평가 유지로 결정" }));
    expect(await screen.findByText("이의 8201번을 평가 유지로 결정했습니다.")).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "이의 8201 상세 보기" })).toBeNull(),
    );
    expect(screen.queryByRole("region", { name: "이의 8201 상세" })).toBeNull();
  });

  it("평가 삭제는 복구할 수 없다는 안내 뒤 결정되고 평가 삭제 목록에 나온다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8202);
    await user.type(
      within(detail).getByLabelText("결정 사유 메모"),
      "다른 중개사의 방문이 맞습니다",
    );
    await user.click(within(detail).getByRole("button", { name: "평가 삭제" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/삭제한 평가는 복구할 수 없습니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "평가 삭제로 결정" }));
    expect(await screen.findByText("이의 8202번을 평가 삭제로 결정했습니다.")).toBeTruthy();
    await filterBy(user, "REMOVED");
    expect(await screen.findByRole("button", { name: "이의 8202 상세 보기" })).toBeTruthy();
  });

  it("확인 대화상자에서 취소하면 결정하지 않는다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(within(detail).getByLabelText("결정 사유 메모"), "메모");
    await user.click(within(detail).getByRole("button", { name: "평가 유지" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "이의 8201 상세 보기" })).toBeTruthy();
  });

  it("요청에 결정 값과 메모를 담아 보낸다", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.post("/api/ops/visit-review-disputes/:id/decision", async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined;
      }),
    );
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(within(detail).getByLabelText("결정 사유 메모"), "  메모 내용  ");
    await user.click(within(detail).getByRole("button", { name: "평가 삭제" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "평가 삭제로 결정" }),
    );
    await screen.findByText("이의 8201번을 평가 삭제로 결정했습니다.");
    expect(bodies).toEqual([{ decision: "REMOVED", decisionNote: "메모 내용" }]);
  });

  it("이미 결정된 이의면 상태 변경 불가 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/visit-review-disputes/:id/decision", () =>
        errorResponse(409, "INVALID_TRANSITION", "이미 결정"),
      ),
    );
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(within(detail).getByLabelText("결정 사유 메모"), "메모");
    await user.click(within(detail).getByRole("button", { name: "평가 유지" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "평가 유지로 결정" }),
    );
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("결정이 403이면 권한 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/visit-review-disputes/:id/decision", () => mockErrors.forbidden()),
    );
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(within(detail).getByLabelText("결정 사유 메모"), "메모");
    await user.click(within(detail).getByRole("button", { name: "평가 유지" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "평가 유지로 결정" }),
    );
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });

  it("결정 대상이 없으면 404 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/visit-review-disputes/:id/decision", () => mockErrors.notFound()),
    );
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(within(detail).getByLabelText("결정 사유 메모"), "메모");
    await user.click(within(detail).getByRole("button", { name: "평가 유지" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "평가 유지로 결정" }),
    );
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("결정 요청이 429이면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/visit-review-disputes/:id/decision", () => mockErrors.rateLimited(15)),
    );
    renderScreen();
    const detail = await openDetail(user, 8201);
    await user.type(within(detail).getByLabelText("결정 사유 메모"), "메모");
    await user.click(within(detail).getByRole("button", { name: "평가 유지" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "평가 유지로 결정" }),
    );
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("이의 없는 직권 삭제", () => {
  async function fillRemove(
    user: ReturnType<typeof userEvent.setup>,
    reviewId: string,
    reason = "LEGAL_REQUEST",
    note = "법적 요청에 따라 삭제합니다",
  ) {
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    await user.type(screen.getByLabelText("평가 번호"), reviewId);
    if (reason) await user.selectOptions(screen.getByLabelText("삭제 사유 코드"), reason);
    if (note) await user.type(screen.getByLabelText("직권 삭제 메모"), note);
  }

  it("평가 번호·사유 코드·메모가 모두 있어야 버튼이 활성이 된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    const button = screen.getByRole("button", { name: "평가 직권 삭제" });
    expect(isBlocked(button)).toBe(true);
    await user.type(screen.getByLabelText("평가 번호"), "8105");
    expect(isBlocked(button)).toBe(true);
    await user.selectOptions(screen.getByLabelText("삭제 사유 코드"), "PRIVACY_REQUEST");
    expect(isBlocked(button)).toBe(true);
    await user.type(screen.getByLabelText("직권 삭제 메모"), "개인정보 요청");
    expect(isBlocked(button)).toBe(false);
  });

  it("사유 코드는 법적 요청·개인정보 요청·운영 재량이다", async () => {
    renderScreen();
    await screen.findByRole("button", { name: "이의 8201 상세 보기" });
    const select = screen.getByLabelText("삭제 사유 코드");
    const labels = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(labels).toEqual(["사유를 선택해 주세요", "법적 요청", "개인정보 요청", "운영 재량"]);
  });

  it("되돌릴 수 없다는 확인 뒤 직권 삭제하고 완료를 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillRemove(user, "8105");
    await user.click(screen.getByRole("button", { name: "평가 직권 삭제" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/되돌릴 수 없고/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "직권 삭제" }));
    expect(await screen.findByText("평가 8105번을 직권 삭제했습니다.")).toBeTruthy();
    expect((screen.getByLabelText("평가 번호") as HTMLInputElement).value).toBe("");
  });

  it("요청에 사유 코드와 메모를 담아 보낸다", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.post("/api/ops/visit-reviews/:id/remove", async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined;
      }),
    );
    renderScreen();
    await fillRemove(user, "8105", "OPERATOR_DISCRETION", "운영 판단");
    await user.click(screen.getByRole("button", { name: "평가 직권 삭제" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "직권 삭제" }));
    await screen.findByText("평가 8105번을 직권 삭제했습니다.");
    expect(bodies).toEqual([{ reasonCode: "OPERATOR_DISCRETION", decisionNote: "운영 판단" }]);
  });

  it("열린 이의가 있는 평가를 직권 삭제하면 이의도 함께 닫힌다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillRemove(user, "8101");
    await user.click(screen.getByRole("button", { name: "평가 직권 삭제" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "직권 삭제" }));
    await screen.findByText("평가 8101번을 직권 삭제했습니다.");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "이의 8201 상세 보기" })).toBeNull(),
    );
  });

  it("이미 삭제된 평가는 상태 변경 불가 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillRemove(user, "8106");
    await user.click(screen.getByRole("button", { name: "평가 직권 삭제" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "직권 삭제" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("없는 평가 번호는 404 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillRemove(user, "7777");
    await user.click(screen.getByRole("button", { name: "평가 직권 삭제" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "직권 삭제" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("직권 삭제가 403이면 권한 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/visit-reviews/:id/remove", () => mockErrors.forbidden()));
    renderScreen();
    await fillRemove(user, "8105");
    await user.click(screen.getByRole("button", { name: "평가 직권 삭제" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "직권 삭제" }));
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });

  it("직권 삭제가 429이면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/visit-reviews/:id/remove", () => mockErrors.rateLimited(9)));
    renderScreen();
    await fillRemove(user, "8105");
    await user.click(screen.getByRole("button", { name: "평가 직권 삭제" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "직권 삭제" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("역할별 표시", () => {
  it("지원 역할이 없으면 접근 불가 안내만 보이고 결정과 삭제 버튼이 없다", () => {
    renderScreen(["OPS"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "평가 유지" })).toBeNull();
    expect(screen.queryByRole("button", { name: "평가 직권 삭제" })).toBeNull();
  });

  it("열람 전용 역할도 결정 버튼을 볼 수 없다", () => {
    renderScreen(["EXEC_VIEW"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByLabelText("결정 사유 메모")).toBeNull();
  });

  it("지원 역할이 있으면 직권 삭제 영역을 보인다", async () => {
    renderScreen(["SUPPORT", "OPS"]);
    expect(await screen.findByRole("heading", { name: "이의 없이 평가 직권 삭제" })).toBeTruthy();
  });
});
