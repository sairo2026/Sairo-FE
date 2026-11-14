// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { acceptMockLeadQuote, resetMockOpsSupport } from "@/mocks/handlers/ops-support";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { LeadDetailScreen } from "./lead-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/enterprise-leads/604",
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

function renderDetail(id: number, roles: OpsRole[] = ["SUPPORT"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<LeadDetailScreen leadId={id} />, roles);
}

function isBlocked(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

function action(name: string) {
  return screen.getByRole("button", { name });
}

function dialogButton(name: string) {
  return within(screen.getByRole("dialog")).getByRole("button", { name });
}

async function loaded(id: number, roles?: OpsRole[]) {
  renderDetail(id, roles);
  await screen.findByRole("heading", { name: "문의 정보" });
}

describe("기업 도입 문의 상세 표시", () => {
  it("로딩 뒤 기업 정보와 연락처, 담당, 접수 시각을 보인다", async () => {
    renderDetail(602);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("한빛공인중개", { exact: false })).toBeTruthy();
    expect(screen.getByText("박담당")).toBeTruthy();
    expect(screen.getByText("010-1234-5678")).toBeTruthy();
    expect(screen.getByText("manager@example.com")).toBeTruthy();
    expect(screen.getByText("운영 김사이", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText(/감사 로그에 남습니다/)).toBeTruthy();
  });

  it("접수부터 계약·종료까지 단계를 보이고 현재 단계를 표시한다", async () => {
    await loaded(602);
    const stages = within(screen.getByRole("list", { name: "진행 단계" })).getAllByRole("listitem");
    expect(stages.map((item) => item.textContent)).toEqual([
      "접수",
      "담당 배정 (현재)",
      "상담",
      "견적",
      "수락 또는 거절",
      "계약 또는 종료",
    ]);
    expect(stages[1]?.getAttribute("aria-current")).toBe("step");
  });

  it("종료된 문의는 종료 직전 단계를 알려 준다", async () => {
    await loaded(608);
    expect(screen.getByText("종료 직전 단계: 견적 발행")).toBeTruthy();
    expect(screen.getByText("고객이 철회")).toBeTruthy();
  });

  it("진행 이력을 사건·행위자·상태 변화와 함께 보인다", async () => {
    await loaded(602);
    const items = within(screen.getByRole("list", { name: "진행 이력" })).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain("문의 접수");
    expect(items[0]?.textContent).toContain("고객");
    expect(items[1]?.textContent).toContain("담당 배정");
    expect(items[1]?.textContent).toContain("담당 운영 김사이");
    expect(items[1]?.textContent).toContain("접수 → 담당 배정");
  });

  it("계약된 문의는 계약 번호와 체결 시각을 보인다", async () => {
    await loaded(607);
    expect(screen.getByText("C-2026-0042", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("계약 체결 시각")).toBeTruthy();
  });

  it("종료된 문의는 종료 사유 코드의 이름과 메모를 보인다", async () => {
    await loaded(606);
    expect(screen.getByText("고객 무응답")).toBeTruthy();
    expect(screen.getByText("14일간 회신 없음")).toBeTruthy();
  });
});

describe("견적 버전 표시", () => {
  it("견적 버전마다 사무소 수·인원·가격·범위·세금·납기·결제·환불·발행·유효기한을 보인다", async () => {
    await loaded(604);
    const latest = screen.getByRole("article", { name: "견적 버전 2" });
    for (const label of [
      "도입 사무소 수",
      "도입 인원",
      "견적 금액",
      "세금",
      "서비스 범위",
      "납기",
      "결제 방식",
      "환불 조건",
      "발행",
      "유효기한",
    ]) {
      expect(within(latest).getByText(label)).toBeTruthy();
    }
    expect(within(latest).getByText("11,000,000원")).toBeTruthy();
    expect(within(latest).getByText("1,100,000원")).toBeTruthy();
    expect(within(latest).getByText("계좌이체")).toBeTruthy();
  });

  it("이전 버전은 대체됨으로, 최신 버전은 유효로 표시한다", async () => {
    await loaded(604);
    expect(
      within(screen.getByRole("article", { name: "견적 버전 1" })).getByText("대체됨"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("article", { name: "견적 버전 2" })).getByText("유효"),
    ).toBeTruthy();
  });

  it("최신 버전이 맨 위에 온다", async () => {
    await loaded(604);
    const versions = within(screen.getByRole("list", { name: "견적 버전 목록" })).getAllByRole(
      "article",
    );
    expect(versions.map((item) => item.getAttribute("aria-label"))).toEqual([
      "견적 버전 2",
      "견적 버전 1",
    ]);
  });

  it("유효기한이 지난 견적은 만료로 표시한다", async () => {
    await loaded(608);
    expect(
      within(screen.getByRole("article", { name: "견적 버전 1" })).getByText("만료"),
    ).toBeTruthy();
  });

  it("고객이 수락한 견적은 수락으로 표시하고 서버가 만든 청구서 번호를 보인다", async () => {
    await loaded(605);
    const quote = screen.getByRole("article", { name: "견적 버전 1" });
    expect(within(quote).getByText("수락")).toBeTruthy();
    expect(within(quote).getByText("9001")).toBeTruthy();
    expect(within(quote).getByText(/일회성 청구서 번호/)).toBeTruthy();
  });

  it("수락 전 견적에는 청구서 번호가 없다", async () => {
    await loaded(604);
    expect(screen.queryByText(/일회성 청구서 번호/)).toBeNull();
  });

  it("견적을 수락하면 청구서 번호가 새로 보인다", async () => {
    acceptMockLeadQuote(604);
    await loaded(604);
    expect(screen.getByText("9704")).toBeTruthy();
    expect(
      within(screen.getByRole("article", { name: "견적 버전 2" })).getByText("수락"),
    ).toBeTruthy();
  });

  it("견적이 없으면 안내 문구를 보인다", async () => {
    await loaded(602);
    expect(screen.getByText("아직 발행한 견적이 없습니다.")).toBeTruthy();
  });
});

describe("지금 할 수 있는 처리만 활성", () => {
  it("접수 상태는 담당 배정과 종료만 활성이다", async () => {
    await loaded(601);
    expect(isBlocked(action("담당 배정"))).toBe(false);
    expect(isBlocked(action("종료"))).toBe(false);
    for (const name of ["상담 시작", "견적 발행", "계약 기록", "재개"]) {
      expect(isBlocked(action(name))).toBe(true);
    }
  });

  it("담당 배정 상태의 본인 문의는 상담 시작이 활성이다", async () => {
    await loaded(602);
    expect(isBlocked(action("상담 시작"))).toBe(false);
    expect(isBlocked(action("견적 발행"))).toBe(true);
  });

  it("다른 운영자가 맡은 문의는 상담·견적·종료 버튼이 꺼져 있다", async () => {
    await loaded(603);
    expect(isBlocked(action("담당 배정"))).toBe(false);
    for (const name of ["상담 시작", "견적 발행", "계약 기록", "종료"]) {
      expect(isBlocked(action(name))).toBe(true);
    }
  });

  it("견적 수락 상태는 계약 기록이 활성이다", async () => {
    await loaded(605);
    expect(isBlocked(action("계약 기록"))).toBe(false);
    expect(isBlocked(action("견적 발행"))).toBe(true);
  });

  it("계약된 문의는 모든 처리가 꺼져 있다", async () => {
    await loaded(607);
    for (const name of ["담당 배정", "상담 시작", "견적 발행", "계약 기록", "종료", "재개"]) {
      expect(isBlocked(action(name))).toBe(true);
    }
  });

  it("종료된 문의는 재개만 활성이다", async () => {
    await loaded(606);
    expect(isBlocked(action("재개"))).toBe(false);
    for (const name of ["담당 배정", "상담 시작", "견적 발행", "계약 기록", "종료"]) {
      expect(isBlocked(action(name))).toBe(true);
    }
  });
});

describe("처리 실행", () => {
  it("운영자 목록에서 골라 배정하면 담당과 단계가 바뀐다", async () => {
    const user = userEvent.setup();
    await loaded(601);
    await user.click(action("담당 배정"));
    expect(isBlocked(dialogButton("담당 배정"))).toBe(true);
    await screen.findByRole("option", { name: /이상담/ });
    await user.selectOptions(screen.getByLabelText("담당 운영자"), "9");
    await user.click(dialogButton("담당 배정"));
    expect(await screen.findByText("담당을 배정했습니다.")).toBeTruthy();
    expect(await screen.findByText("이상담", { selector: "dd" })).toBeTruthy();
    const current = screen.getByText("담당 배정 (현재)");
    expect(current.getAttribute("aria-current")).toBe("step");
  });

  it("나로 선택을 누르면 로그인한 운영자가 선택된다", async () => {
    const user = userEvent.setup();
    await loaded(601);
    await user.click(action("담당 배정"));
    await screen.findByRole("option", { name: /운영 김사이/ });
    await user.click(screen.getByRole("button", { name: "나로 선택" }));
    expect((screen.getByLabelText("담당 운영자") as HTMLSelectElement).value).toBe("1");
  });

  it("활성 지원 운영자가 아니면 배정할 수 없다고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/ops/operators/options", () =>
        HttpResponse.json({ items: [{ operatorId: 99, name: "퇴사자", roles: ["OPS"] }] }),
      ),
    );
    await loaded(601);
    await user.click(action("담당 배정"));
    await screen.findByRole("option", { name: /퇴사자/ });
    await user.selectOptions(screen.getByLabelText("담당 운영자"), "99");
    await user.click(dialogButton("담당 배정"));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toBeTruthy();
    expect(screen.getByText("활성 지원 운영자가 아닙니다.")).toBeTruthy();
  });

  it("상담 시작은 확인 뒤 상담 단계로 바뀐다", async () => {
    const user = userEvent.setup();
    await loaded(602);
    await user.click(action("상담 시작"));
    await user.click(dialogButton("상담 시작"));
    expect(await screen.findByText("상담을 시작했습니다.")).toBeTruthy();
    expect(await screen.findByText("상담 (현재)")).toBeTruthy();
    expect(isBlocked(action("견적 발행"))).toBe(false);
  });

  it("상담 시작이 서버에서 403이면 권한 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/enterprise-leads/:id/consultation-start", () => mockErrors.forbidden()),
    );
    await loaded(602);
    await user.click(action("상담 시작"));
    await user.click(dialogButton("상담 시작"));
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });

  it("If-Match에 현재 버전을 담아 보낸다", async () => {
    const user = userEvent.setup();
    const seen: (string | null)[] = [];
    server.use(
      http.post("/api/ops/enterprise-leads/:id/consultation-start", ({ request }) => {
        seen.push(request.headers.get("If-Match"));
        return mockErrors.versionConflict(5);
      }),
    );
    await loaded(602);
    await user.click(action("상담 시작"));
    await user.click(dialogButton("상담 시작"));
    await screen.findByText(/다른 운영자가 먼저 수정했습니다/);
    expect(seen).toEqual(["2"]);
  });

  it("처음 상담을 시작하고 견적을 발행하는 흐름을 끝까지 진행한다", async () => {
    const user = userEvent.setup();
    await loaded(602);
    await user.click(action("상담 시작"));
    await user.click(dialogButton("상담 시작"));
    await screen.findByText("상담 (현재)");
    await user.click(action("견적 발행"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/새 버전으로 발행하며 이전 버전은 대체됨/)).toBeTruthy();
    expect(isBlocked(dialogButton("견적 발행"))).toBe(true);
    await user.type(within(dialog).getByLabelText("견적 금액(원)"), "9000000");
    await user.type(within(dialog).getByLabelText("세금(원)"), "900000");
    fireEvent.change(within(dialog).getByLabelText("납기"), { target: { value: "2027-01-31" } });
    await user.type(within(dialog).getByLabelText("결제 방식"), "계좌이체");
    await user.type(within(dialog).getByLabelText("서비스 범위"), "2개 지점");
    await user.type(within(dialog).getByLabelText("환불 조건"), "계약서 별도 조항");
    await user.click(dialogButton("견적 발행"));
    expect(await screen.findByText("견적을 발행했습니다.")).toBeTruthy();
    const quote = await screen.findByRole("article", { name: "견적 버전 1" });
    expect(within(quote).getByText("9,000,000원")).toBeTruthy();
    expect(within(quote).getByText("유효")).toBeTruthy();
    expect(screen.getByText("견적 발행 (현재)")).toBeTruthy();
  });

  it("조건을 바꿔 다시 발행하면 새 버전이 생기고 이전 버전은 대체됨이 된다", async () => {
    const user = userEvent.setup();
    await loaded(604);
    await user.click(action("견적 발행"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "견적 새 버전 발행" })).toBeTruthy();
    const amount = within(dialog).getByLabelText("견적 금액(원)");
    await user.clear(amount);
    await user.type(amount, "10000000");
    await user.click(dialogButton("견적 발행"));
    const newest = await screen.findByRole("article", { name: "견적 버전 3" });
    expect(within(newest).getByText("10,000,000원")).toBeTruthy();
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "견적 버전 2" })).getByText("대체됨"),
      ).toBeTruthy(),
    );
  });

  it("견적 필수 항목을 비우면 발행 버튼이 꺼진다", async () => {
    const user = userEvent.setup();
    await loaded(604);
    await user.click(action("견적 발행"));
    expect(isBlocked(dialogButton("견적 발행"))).toBe(false);
    await user.clear(within(screen.getByRole("dialog")).getByLabelText("서비스 범위"));
    expect(isBlocked(dialogButton("견적 발행"))).toBe(true);
  });

  it("계약 기록은 계약 번호와 체결 시각이 있어야 하고 기록하면 계약 상태가 된다", async () => {
    const user = userEvent.setup();
    await loaded(605);
    await user.click(action("계약 기록"));
    const dialog = screen.getByRole("dialog");
    expect(isBlocked(dialogButton("계약 기록"))).toBe(true);
    await user.type(within(dialog).getByLabelText("계약 번호"), "C-2026-0099");
    fireEvent.change(within(dialog).getByLabelText("체결 날짜"), {
      target: { value: "2026-01-05" },
    });
    await user.click(dialogButton("계약 기록"));
    expect(await screen.findByText("계약을 기록했습니다.")).toBeTruthy();
    expect(await screen.findByText("C-2026-0099", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("계약 (현재)")).toBeTruthy();
    expect(isBlocked(action("종료"))).toBe(true);
  });

  it("체결 시각이 미래이면 기록할 수 없다", async () => {
    const user = userEvent.setup();
    await loaded(605);
    await user.click(action("계약 기록"));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("계약 번호"), "C-2026-0099");
    fireEvent.change(within(dialog).getByLabelText("체결 날짜"), {
      target: { value: "2099-01-05" },
    });
    expect(within(dialog).getByText("체결 시각은 지금 이전이어야 합니다.")).toBeTruthy();
    expect(isBlocked(dialogButton("계약 기록"))).toBe(true);
  });

  it("계약 번호가 100자를 넘으면 기록할 수 없다", async () => {
    const user = userEvent.setup();
    await loaded(605);
    await user.click(action("계약 기록"));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("계약 번호"), {
      target: { value: "가".repeat(101) },
    });
    fireEvent.change(within(dialog).getByLabelText("체결 날짜"), {
      target: { value: "2026-01-05" },
    });
    expect(isBlocked(dialogButton("계약 기록"))).toBe(true);
  });

  it("종료는 사유 코드를 고르고 기타는 메모가 있어야 한다", async () => {
    const user = userEvent.setup();
    await loaded(604);
    await user.click(action("종료"));
    const dialog = screen.getByRole("dialog");
    expect(isBlocked(dialogButton("문의 종료"))).toBe(true);
    await user.selectOptions(within(dialog).getByLabelText("종료 사유"), "OTHER");
    expect(isBlocked(dialogButton("문의 종료"))).toBe(true);
    await user.type(within(dialog).getByLabelText("종료 메모(필수)"), "고객 사정");
    expect(isBlocked(dialogButton("문의 종료"))).toBe(false);
  });

  it("종료하면 종료 상태와 사유가 보이고 재개만 활성이 된다", async () => {
    const user = userEvent.setup();
    await loaded(604);
    await user.click(action("종료"));
    await user.selectOptions(screen.getByLabelText("종료 사유"), "OUT_OF_SCOPE");
    await user.click(dialogButton("문의 종료"));
    expect(await screen.findByText("문의를 종료했습니다.")).toBeTruthy();
    expect(await screen.findByText("서비스 범위 밖")).toBeTruthy();
    expect(screen.getByText("종료 직전 단계: 견적 발행")).toBeTruthy();
    expect(isBlocked(action("재개"))).toBe(false);
  });

  it("재개 대화상자는 돌아갈 단계를 안내하고 사유가 있어야 한다", async () => {
    const user = userEvent.setup();
    await loaded(608);
    await user.click(action("재개"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/돌아갈 단계/)).toBeTruthy();
    expect(within(dialog).getByText("상담")).toBeTruthy();
    expect(within(dialog).getByText(/새 견적을 발행해야 합니다/)).toBeTruthy();
    expect(isBlocked(dialogButton("문의 재개"))).toBe(true);
    await user.type(within(dialog).getByLabelText("재개 사유"), "고객이 재문의함");
    await user.click(dialogButton("문의 재개"));
    expect(await screen.findByText("문의를 재개했습니다.")).toBeTruthy();
    expect(await screen.findByText("상담 (현재)")).toBeTruthy();
  });

  it("재개에 필요한 담당이 없으면 서버 안내를 보이고 담당을 넣으면 재개된다", async () => {
    const user = userEvent.setup();
    await loaded(606);
    await user.click(action("재개"));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("재개 사유"), "고객이 재문의함");
    await user.click(dialogButton("문의 재개"));
    expect(await within(dialog).findByText("재개하려면 담당 운영자가 필요합니다.")).toBeTruthy();
    await user.type(within(dialog).getByLabelText("재개 후 담당 운영자 번호(선택)"), "9");
    await user.click(dialogButton("문의 재개"));
    expect(await screen.findByText("문의를 재개했습니다.")).toBeTruthy();
    expect(await screen.findByText("이상담", { selector: "dd" })).toBeTruthy();
  });

  it("재개 때 부적격 담당을 지정하면 서버 안내를 보인다", async () => {
    const user = userEvent.setup();
    await loaded(606);
    await user.click(action("재개"));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("재개 사유"), "재문의");
    await user.type(within(dialog).getByLabelText("재개 후 담당 운영자 번호(선택)"), "99");
    await user.click(dialogButton("문의 재개"));
    expect(await within(dialog).findByText("활성 지원 운영자가 아닙니다.")).toBeTruthy();
  });

  it("버전 충돌이면 안내하고 최신 내용을 다시 불러온다", async () => {
    const user = userEvent.setup();
    let reads = 0;
    server.use(
      http.get("/api/ops/enterprise-leads/:id", () => {
        reads += 1;
        return undefined;
      }),
      http.post("/api/ops/enterprise-leads/:id/assign", () => mockErrors.versionConflict(8)),
    );
    await loaded(601);
    const before = reads;
    await user.click(action("담당 배정"));
    await screen.findByRole("option", { name: /이상담/ });
    await user.selectOptions(screen.getByLabelText("담당 운영자"), "9");
    await user.click(dialogButton("담당 배정"));
    expect(await screen.findByText(/다른 운영자가 먼저 수정했습니다/)).toBeTruthy();
    await waitFor(() => expect(reads).toBeGreaterThan(before));
  });

  it("지금 상태에서 할 수 없는 처리는 서버 409를 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/enterprise-leads/:id/consultation-start", () =>
        errorResponse(409, "INVALID_TRANSITION", "상태"),
      ),
    );
    await loaded(602);
    await user.click(action("상담 시작"));
    await user.click(dialogButton("상담 시작"));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("처리 요청이 429이면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/enterprise-leads/:id/consultation-start", () =>
        mockErrors.rateLimited(30),
      ),
    );
    await loaded(602);
    await user.click(action("상담 시작"));
    await user.click(dialogButton("상담 시작"));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("상세 조회 오류와 권한", () => {
  it("없는 문의는 찾을 수 없다고 안내한다", async () => {
    renderDetail(999);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/ops/enterprise-leads/:id", () => mockErrors.server(), { once: true }),
    );
    renderDetail(602);
    await user.click(await screen.findByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByRole("heading", { name: "문의 정보" })).toBeTruthy();
  });

  it("서버가 403을 주면 접근 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/enterprise-leads/:id", () => mockErrors.forbidden()));
    renderDetail(602);
    expect(await screen.findByText("접근 권한이 없습니다")).toBeTruthy();
  });

  it("지원 역할이 없으면 접근 불가 안내만 보인다", () => {
    renderDetail(602, ["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "상담 시작" })).toBeNull();
  });
});
