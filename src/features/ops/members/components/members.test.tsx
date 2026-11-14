// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { mockMembers, resetOpsHomeMock } from "@/mocks/handlers/ops-home";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../../home/testing/render-ops-screen";
import type { OpsRole } from "../../model/roles";
import { toSeoulIso } from "../model/member-status";
import { MemberDetailScreen } from "./member-detail-screen";
import { MembersListScreen } from "./members-list-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/members",
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
  resetOpsHomeMock();
});
afterAll(() => stopServer());

function renderList(roles: OpsRole[]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<MembersListScreen />, roles);
}

function renderDetail(roles: OpsRole[], userId = 42) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<MemberDetailScreen userId={userId} />, roles);
}

function record(userId: number) {
  const found = mockMembers.items.find((item) => item.detail.userId === userId);
  if (!found) throw new Error("모의 회원이 없습니다.");
  return found;
}

async function openSuspendDialog() {
  await userEvent.click(await screen.findByRole("button", { name: "긴급 접근 중단" }));
  return screen.getByRole("dialog");
}

function fillReview(dialog: HTMLElement, date = "2031-01-15", time = "10:30") {
  fireEvent.change(within(dialog).getByLabelText(/^재검토 예정 날짜/), { target: { value: date } });
  fireEvent.change(within(dialog).getByLabelText(/^재검토 예정 시각/), { target: { value: time } });
}

describe("회원 목록", () => {
  it("회원과 계정 상태와 소속 사무소를 보인다", async () => {
    renderList(["SUPPORT"]);
    expect(await screen.findByText("홍길동")).not.toBeNull();
    expect(screen.getByText("김영희")).not.toBeNull();
    const table = within(screen.getByRole("table"));
    expect(table.getAllByText("정상").length).toBe(2);
    expect(table.getByText("탈퇴")).not.toBeNull();
    expect(table.getAllByText("소속 없음").length).toBe(2);
    expect(table.getByText("테스트중개 501")).not.toBeNull();
  });

  it("이름이 회원 상세 링크다", async () => {
    renderList(["SUPPORT"]);
    const link = await screen.findByRole("link", { name: "홍길동" });
    expect(link.getAttribute("href")).toBe("/ops/members/42");
  });

  it("검색어를 서버에 보내 결과를 거른다", async () => {
    renderList(["SUPPORT"]);
    await screen.findByText("홍길동");
    await userEvent.type(screen.getByLabelText("검색어"), "김영");
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("홍길동")).toBeNull());
    expect(screen.getByText("김영희")).not.toBeNull();
  });

  it("계정 상태 필터를 적용하고 초기화한다", async () => {
    renderList(["SUPPORT"]);
    await screen.findByText("홍길동");
    await userEvent.selectOptions(screen.getByLabelText("계정 상태"), "WITHDRAWN");
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("홍길동")).toBeNull());
    expect(screen.getByText("탈퇴회원")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByText("홍길동")).not.toBeNull();
  });

  it("결과가 없으면 빈 목록 안내를 보인다", async () => {
    renderList(["SUPPORT"]);
    await screen.findByText("홍길동");
    await userEvent.type(screen.getByLabelText("검색어"), "없는회원");
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 회원이 없습니다.")).not.toBeNull();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/ops/members", () => mockErrors.server(), { once: true }));
    renderList(["SUPPORT"]);
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("홍길동")).not.toBeNull();
  });

  it("경영조회는 회원 목록을 열 수 없고 API도 부르지 않는다", async () => {
    let called = false;
    server.use(
      http.get("/api/ops/members", () => {
        called = true;
        return mockErrors.forbidden();
      }),
    );
    renderList(["EXEC_VIEW"]);
    expect(screen.getByRole("alert").textContent).toContain(
      "이 화면을 볼 수 있는 운영 역할이 아닙니다",
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(called).toBe(false);
  });
});

describe("회원 상세", () => {
  it("불러오는 동안 로딩 안내를 보인다", () => {
    renderDetail(["SUPPORT"]);
    expect(screen.getByText("회원 정보를 불러오는 중입니다.")).not.toBeNull();
  });

  it("계정 상태와 소속과 로그인 정보를 보이고 잠금이 없으면 잠금 해제 시각을 숨긴다", async () => {
    renderDetail(["SUPPORT"]);
    expect(await screen.findByText("테스트중개 501 · 중개사")).not.toBeNull();
    expect(screen.getByText("정상")).not.toBeNull();
    expect(screen.getByText("카카오")).not.toBeNull();
    expect(screen.getByText("마지막 로그인").nextElementSibling?.textContent).toBe(
      "2026-11-09 09:12",
    );
    expect(screen.queryByText("로그인 잠금 해제 시각")).toBeNull();
    expect(screen.getByText("탈퇴 일시").nextElementSibling?.textContent).toBe("-");
  });

  it("탈퇴한 회원은 탈퇴 일시를 보이고 소속이 없다고 알린다", async () => {
    renderDetail(["SUPPORT"], 44);
    expect(await screen.findByText("2026-10-01 09:00")).not.toBeNull();
    expect(screen.getByText("승인된 소속 없음")).not.toBeNull();
    expect(screen.getByText("탈퇴")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "소속 사무소 상세" })).toBeNull();
  });

  it("로그인이 잠긴 회원은 잠금 해제 시각을 보인다", async () => {
    record(42).detail.loginLockedUntil = "2026-11-10T12:00:00+09:00";
    renderDetail(["SUPPORT"]);
    expect(await screen.findByText("로그인 잠금 해제 시각")).not.toBeNull();
    expect(screen.getByText("2026-11-10 12:00")).not.toBeNull();
  });

  it("진행 중인 등록·참여 요청 요약을 보인다", async () => {
    record(43).detail.pendingRequestSummary = { type: "MEMBERSHIP", status: "PENDING" };
    renderDetail(["SUPPORT"], 43);
    expect(await screen.findByText("사무소 참여 요청 (PENDING)")).not.toBeNull();
  });

  it("활성 세션의 시작·마지막 요청·기기 요약을 보인다", async () => {
    renderDetail(["SUPPORT"]);
    const table = await screen.findByRole("table", { name: "활성 세션 목록" });
    expect(within(table).getByText("Chrome / Windows")).not.toBeNull();
    expect(within(table).getByText("2026-11-09 10:03")).not.toBeNull();
    expect(within(table).getByText("Safari / iPhone")).not.toBeNull();
  });

  it("활성 세션이 없으면 없다고 알린다", async () => {
    renderDetail(["SUPPORT"], 43);
    expect(await screen.findByText("활성 세션이 없습니다.")).not.toBeNull();
  });

  it("보안 사건이 없으면 기록이 없다고 알린다", async () => {
    renderDetail(["SUPPORT"]);
    expect(await screen.findByText("기록된 보안 사건이 없습니다.")).not.toBeNull();
  });

  it("최근 긴급 중단 기록의 사유와 범위와 재검토 예정 시각을 보인다", async () => {
    record(42).detail.securityEvents = [
      {
        eventType: "EMERGENCY_SUSPENDED",
        occurredAt: "2026-11-08T14:00:00+09:00",
        scope: "SPECIFIC_SESSION",
        reason: "계정 탈취 의심",
        reviewAt: "2026-11-15T10:00:00+09:00",
        actorOperatorName: "김보안",
      },
      {
        eventType: "EMERGENCY_SUSPENDED",
        occurredAt: "2026-10-01T14:00:00+09:00",
        scope: "ALL_SESSIONS",
        reason: "이전 사건 사유",
        reviewAt: "2026-10-08T10:00:00+09:00",
        actorOperatorName: "김보안",
      },
    ];
    renderDetail(["SUPPORT"]);
    const latest = await screen.findByRole("region", { name: "최근 긴급 중단 기록" });
    expect(within(latest).getByText("계정 탈취 의심")).not.toBeNull();
    expect(within(latest).getByText("특정 세션")).not.toBeNull();
    expect(within(latest).getByText("2026-11-15 10:00")).not.toBeNull();
    expect(within(latest).getByText("김보안")).not.toBeNull();
    expect(screen.getByText(/이전 사건 사유/)).not.toBeNull();
  });

  it("소속 사무소 상세 링크는 항상, 결제·환불 링크는 결제담당에게만 보인다", async () => {
    const { unmount } = renderDetail(["SUPPORT"]);
    const office = await screen.findByRole("link", { name: "소속 사무소 상세" });
    expect(office.getAttribute("href")).toBe("/ops/offices/501");
    expect(screen.queryByRole("link", { name: "결제·환불" })).toBeNull();
    unmount();
    cleanup();
    renderDetail(["BILLING"]);
    const billing = await screen.findByRole("link", { name: "결제·환불" });
    expect(billing.getAttribute("href")).toBe("/ops/billing");
  });

  it("보안관리자가 아니면 긴급 접근 중단 버튼이 없다", async () => {
    renderDetail(["SUPPORT", "BILLING", "OPS"]);
    await screen.findByText("테스트중개 501 · 중개사");
    expect(screen.queryByRole("button", { name: "긴급 접근 중단" })).toBeNull();
  });

  it("없는 회원은 찾을 수 없다고 안내한다", async () => {
    renderDetail(["SUPPORT"], 999);
    expect(
      await screen.findByRole("heading", { name: "페이지를 찾을 수 없습니다" }),
    ).not.toBeNull();
  });

  it("서버 오류는 다시 시도로 복구할 수 있다", async () => {
    server.use(http.get("/api/ops/members/:userId", () => mockErrors.server(), { once: true }));
    renderDetail(["SUPPORT"]);
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("테스트중개 501 · 중개사")).not.toBeNull();
  });

  it("경영조회는 회원 상세를 열 수 없고 API도 부르지 않는다", async () => {
    let called = false;
    server.use(
      http.get("/api/ops/members/:userId", () => {
        called = true;
        return mockErrors.forbidden();
      }),
    );
    renderDetail(["EXEC_VIEW"]);
    expect(screen.getByRole("alert").textContent).toContain(
      "이 화면을 볼 수 있는 운영 역할이 아닙니다",
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(called).toBe(false);
  });
});

describe("긴급 접근 중단", () => {
  it("대표 통지와 감사 로그 안내를 보이고 필수 입력 전에는 실행할 수 없다", async () => {
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    expect(within(dialog).getByText(/소속 사무소 대표에게 통지가 나갑니다/)).not.toBeNull();
    expect(within(dialog).getByText(/감사 로그에 남으며 되돌릴 수 없습니다/)).not.toBeNull();
    const confirm = within(dialog).getByRole("button", { name: "접근 중단 실행" });
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "계정 탈취 의심");
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    fillReview(dialog);
    expect(confirm.getAttribute("aria-disabled")).toBeNull();
  });

  it("사유가 공백뿐이면 실행할 수 없다", async () => {
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "   ");
    fillReview(dialog);
    expect(
      within(dialog).getByRole("button", { name: "접근 중단 실행" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("재검토 예정 시각이 과거이면 안내하고 실행할 수 없다", async () => {
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "사유");
    fillReview(dialog, "2020-01-01", "09:00");
    expect(within(dialog).getByText("재검토 예정 시각은 지금보다 뒤여야 합니다.")).not.toBeNull();
    expect(
      within(dialog).getByRole("button", { name: "접근 중단 실행" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("전체 세션 중단을 실행하면 통지 안내와 갱신된 기록을 보인다", async () => {
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "계정 탈취 의심 정황");
    fillReview(dialog);
    await userEvent.click(within(dialog).getByRole("button", { name: "접근 중단 실행" }));
    expect((await screen.findByRole("status")).textContent).toContain("대표에게 통지가 나갑니다");
    await waitFor(() => expect(screen.getByText("활성 세션이 없습니다.")).not.toBeNull());
    const latest = await screen.findByRole("region", { name: "최근 긴급 중단 기록" });
    expect(within(latest).getByText("계정 탈취 의심 정황")).not.toBeNull();
    const saved = record(42).detail.securityEvents[0];
    expect(saved).toMatchObject({ scope: "ALL_SESSIONS", reviewAt: "2031-01-15T10:30:00+09:00" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("특정 세션을 고르면 활성 세션 목록에서 종료할 세션을 선택해야 한다", async () => {
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.click(within(dialog).getByRole("radio", { name: "특정 세션" }));
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "의심 기기 차단");
    fillReview(dialog);
    const confirm = within(dialog).getByRole("button", { name: "접근 중단 실행" });
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    const select = within(dialog).getByLabelText(/종료할 세션/);
    expect(within(select).getAllByRole("option")).toHaveLength(3);
    await userEvent.selectOptions(select, "s-2b9c04");
    expect(confirm.getAttribute("aria-disabled")).toBeNull();
    await userEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const detail = record(42).detail;
    expect(detail.securityEvents[0]).toMatchObject({ scope: "SPECIFIC_SESSION" });
    expect(detail.sessions.map((session) => session.sessionId)).toEqual(["s-7f3a91"]);
  });

  it("범위를 전체 세션으로 되돌리면 세션 선택 칸이 사라진다", async () => {
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.click(within(dialog).getByRole("radio", { name: "특정 세션" }));
    expect(within(dialog).getByLabelText(/종료할 세션/)).not.toBeNull();
    await userEvent.click(within(dialog).getByRole("radio", { name: "전체 세션" }));
    expect(within(dialog).queryByLabelText(/종료할 세션/)).toBeNull();
  });

  it("활성 세션이 없으면 특정 세션 범위를 고를 수 없다", async () => {
    renderDetail(["SECURITY_ADMIN"], 43);
    const dialog = await openSuspendDialog();
    expect(
      (within(dialog).getByRole("radio", { name: "특정 세션" }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      within(dialog).getByText(/활성 세션이 없어 특정 세션은 선택할 수 없습니다/),
    ).not.toBeNull();
  });

  it("입력 검증 실패(400)는 서버 문구로 안내하고 대화상자를 유지한다", async () => {
    server.use(
      http.post("/api/ops/members/:userId/emergency-suspend", () =>
        mockErrors.validation([{ field: "sessionId", message: "세션이 이미 종료되었습니다." }]),
      ),
    );
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "사유");
    fillReview(dialog);
    await userEvent.click(within(dialog).getByRole("button", { name: "접근 중단 실행" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "세션이 이미 종료되었습니다.",
    );
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  it("권한이 없다는 응답은 역할 안내로 보이고 기록은 바뀌지 않는다", async () => {
    server.use(
      http.post("/api/ops/members/:userId/emergency-suspend", () => mockErrors.forbidden()),
    );
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "사유");
    fillReview(dialog);
    await userEvent.click(within(dialog).getByRole("button", { name: "접근 중단 실행" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "운영 역할이 아닙니다",
    );
    expect(record(42).detail.securityEvents).toHaveLength(0);
  });

  it("대상 회원이 없으면(404) 오류를 안내한다", async () => {
    server.use(
      http.post("/api/ops/members/:userId/emergency-suspend", () => mockErrors.notFound()),
    );
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "사유");
    fillReview(dialog);
    await userEvent.click(within(dialog).getByRole("button", { name: "접근 중단 실행" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "대상을 찾을 수 없습니다",
    );
  });

  it("서버가 일시 오류를 돌려주면 다시 실행할 수 있게 대화상자를 유지한다", async () => {
    server.use(
      http.post(
        "/api/ops/members/:userId/emergency-suspend",
        () => errorResponse(500, "INTERNAL_ERROR", "일시적인 오류가 발생했습니다."),
        { once: true },
      ),
    );
    renderDetail(["SECURITY_ADMIN"]);
    const dialog = await openSuspendDialog();
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "사유");
    fillReview(dialog);
    const confirm = within(dialog).getByRole("button", { name: "접근 중단 실행" });
    await userEvent.click(confirm);
    expect((await within(dialog).findByRole("alert")).textContent).toContain("일시적인 오류");
    await userEvent.click(within(dialog).getByRole("button", { name: "접근 중단 실행" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("취소하면 아무 것도 바뀌지 않고 다시 열면 입력이 비어 있다", async () => {
    renderDetail(["SECURITY_ADMIN"]);
    let dialog = await openSuspendDialog();
    await userEvent.type(within(dialog).getByLabelText(/^중단 사유/), "임시 사유");
    await userEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    dialog = await openSuspendDialog();
    expect((within(dialog).getByLabelText(/^중단 사유/) as HTMLTextAreaElement).value).toBe("");
    expect(record(42).detail.securityEvents).toHaveLength(0);
  });
});

describe("재검토 시각 변환", () => {
  it("날짜와 시각을 한국 시간 ISO 문자열로 합친다", () => {
    expect(toSeoulIso("2031-01-15", "10:30")).toBe("2031-01-15T10:30:00+09:00");
  });

  it("입력이 비었거나 형식이 틀리면 null이다", () => {
    expect(toSeoulIso("", "10:30")).toBeNull();
    expect(toSeoulIso("2031-01-15", "")).toBeNull();
    expect(toSeoulIso("2031/01/15", "10:30")).toBeNull();
  });
});
