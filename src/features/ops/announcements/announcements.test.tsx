// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsContent } from "@/mocks/handlers/ops-content";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { AnnouncementsScreen } from "./announcements-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/announcements",
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
  return renderOpsScreen(<AnnouncementsScreen />, roles);
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function openDetail(name: string) {
  const user = userEvent.setup();
  renderScreen();
  await user.click(await screen.findByRole("button", { name }));
  await screen.findByRole("heading", { name: "공지 상세" });
  return user;
}

function fillValidForm(title = "신규 공지") {
  fill("제목", title);
  fill("본문", "본문 내용입니다.");
  fill("노출 시작 날짜", "2099-01-01");
  fill("노출 시작 시각", "09:00");
  fill("노출 종료 날짜", "2099-01-31");
  fill("노출 종료 시각", "18:00");
}

describe("목록", () => {
  it("공지 목록을 상태와 함께 보인다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "공지 목록" });
    await within(table).findByText("정기 점검 안내");
    expect(within(table).getAllByText("게시 중", { selector: "span" }).length).toBe(2);
    expect(within(table).getByText("초안")).toBeTruthy();
    expect(within(table).getByText("예약")).toBeTruthy();
    expect(within(table).getAllByText("종료", { selector: "span" }).length).toBe(1);
  });

  it("마케팅 여부와 대상을 보인다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "공지 목록" });
    await within(table).findByText("겨울 이벤트 소개");
    expect(within(table).getAllByText("마케팅").length).toBe(1);
    expect(within(table).getAllByText("필수 안내").length).toBeGreaterThan(1);
    expect(within(table).getByText("구독 상태: 유료 정상")).toBeTruthy();
  });

  it("마케팅 제외와 필수 안내 규칙을 안내한다", async () => {
    renderScreen();
    expect(
      await screen.findByText(/필수 안내는 마케팅 미동의자에게 선택 마케팅 경로로 보내지 않습니다/),
    ).toBeTruthy();
  });

  it("불러오는 동안 표가 바쁨 상태다", () => {
    server.use(http.get("/api/ops/announcements", () => delay("infinite")));
    const { container } = renderScreen();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("목록이 비어 있으면 빈 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/announcements", () =>
        Response.json({ items: [], page: 0, size: 25, totalElements: 0 }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("등록된 공지가 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/announcements", () => mockErrors.server(), { once: true }));
    renderScreen();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("정기 점검 안내")).toBeTruthy();
  });

  it("목록 조회가 429이면 한도 안내를 보인다", async () => {
    server.use(http.get("/api/ops/announcements", () => mockErrors.rateLimited(20)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("운영담당이 아니면 화면을 열 수 없다", () => {
    renderScreen(["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "새 공지 작성" })).toBeNull();
  });

  it("목록 조회가 403이면 오류를 보인다", async () => {
    server.use(http.get("/api/ops/announcements", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});

describe("상세", () => {
  it("본문과 대상, 노출 기간, 중요도를 보인다", async () => {
    await openDetail("정기 점검 안내 1판 상세 보기");
    const detail = screen
      .getByRole("heading", { name: "공지 상세" })
      .closest("section") as HTMLElement;
    expect(within(detail).getByText("이번 주 일요일 새벽에 정기 점검이 있습니다.")).toBeTruthy();
    expect(within(detail).getByText("전체 사무소")).toBeTruthy();
    expect(within(detail).getByText("중요")).toBeTruthy();
    expect(within(detail).getByText(/필수 안내이므로 마케팅 미동의자에게/)).toBeTruthy();
  });

  it("마케팅 공지는 수신 미동의 대상을 제외한다고 안내한다", async () => {
    await openDetail("겨울 이벤트 소개 1판 상세 보기");
    expect(screen.getByText(/마케팅 공지이므로 수신에 동의하지 않은 대상은 제외하고/)).toBeTruthy();
  });

  it("이전 버전을 연결해서 보여준다", async () => {
    const user = await openDetail("9월 점검 완료 안내 (수정) 2판 상세 보기");
    await user.click(screen.getByRole("button", { name: "이전 버전 보기" }));
    const detail = (await screen.findByRole("heading", { name: "공지 상세" })).closest(
      "section",
    ) as HTMLElement;
    await waitFor(() => expect(within(detail).getByText("9월 점검 완료 안내")).toBeTruthy());
    expect(within(detail).getByText("종료된 공지는 더 처리할 수 없습니다.")).toBeTruthy();
  });

  it("상태에 맞는 처리 버튼만 보인다", async () => {
    await openDetail("겨울 이벤트 소개 1판 상세 보기");
    expect(screen.getByRole("button", { name: "검토 요청" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "게시·예약" })).toBeNull();
    expect(screen.queryByRole("button", { name: "공지 종료" })).toBeNull();
  });
});

describe("초안에서 검토로", () => {
  it("검토 요청하면 게시 버튼이 나타난다", async () => {
    const user = await openDetail("겨울 이벤트 소개 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "검토 요청" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "검토 요청" }));
    expect(await screen.findByText(/공지를 검토 단계로 올렸습니다/)).toBeTruthy();
    expect(await screen.findByRole("button", { name: "게시·예약" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "검토 요청" })).toBeNull();
  });

  it("검토 요청이 409이면 상태 안내를 보인다", async () => {
    server.use(
      http.post("/api/ops/announcements/2/submit-review", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    const user = await openDetail("겨울 이벤트 소개 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "검토 요청" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "검토 요청" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("검토 요청이 404이면 대상을 찾을 수 없다고 안내한다", async () => {
    server.use(http.post("/api/ops/announcements/2/submit-review", () => mockErrors.notFound()));
    const user = await openDetail("겨울 이벤트 소개 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "검토 요청" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "검토 요청" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("검토 요청이 429이면 한도 안내를 보인다", async () => {
    server.use(
      http.post("/api/ops/announcements/2/submit-review", () => mockErrors.rateLimited(10)),
    );
    const user = await openDetail("겨울 이벤트 소개 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "검토 요청" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "검토 요청" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("대화상자를 취소하면 요청하지 않는다", async () => {
    let called = false;
    server.use(
      http.post("/api/ops/announcements/2/submit-review", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    const user = await openDetail("겨울 이벤트 소개 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "검토 요청" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(called).toBe(false);
  });
});

describe("게시와 예약", () => {
  async function openPublish() {
    const user = await openDetail("요금 안내 개편 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "게시·예약" }));
    return { user, dialog: screen.getByRole("dialog") };
  }

  it("지금 게시하면 게시 중이 된다", async () => {
    const { user, dialog } = await openPublish();
    await user.click(within(dialog).getByRole("button", { name: "게시" }));
    expect(await screen.findByText("공지를 게시했습니다.")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "공지 종료" })).toBeTruthy();
  });

  it("예약 시각을 지정하면 예약 상태가 된다", async () => {
    const { user, dialog } = await openPublish();
    await user.click(within(dialog).getByLabelText("예약 게시"));
    fill("예약 게시 날짜", "2099-01-01");
    fill("예약 게시 시각", "09:00");
    await user.click(within(dialog).getByRole("button", { name: "게시" }));
    expect(await screen.findByText(/게시하도록 예약했습니다/)).toBeTruthy();
    expect(await screen.findByRole("button", { name: "예약 취소(종료)" })).toBeTruthy();
  });

  it("예약 시각을 비우면 안내하고 요청하지 않는다", async () => {
    const { user, dialog } = await openPublish();
    await user.click(within(dialog).getByLabelText("예약 게시"));
    await user.click(within(dialog).getByRole("button", { name: "게시" }));
    expect(await screen.findByText("예약 게시 날짜와 시각을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("과거 시각은 예약할 수 없다", async () => {
    const { user, dialog } = await openPublish();
    await user.click(within(dialog).getByLabelText("예약 게시"));
    fill("예약 게시 날짜", "2000-01-01");
    fill("예약 게시 시각", "09:00");
    await user.click(within(dialog).getByRole("button", { name: "게시" }));
    expect(await screen.findByText("예약 시각은 현재 이후여야 합니다.")).toBeTruthy();
  });

  it("서버가 예약 시각을 거절하면 400 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/announcements/3/publish", () =>
        mockErrors.validation([
          { field: "scheduledAt", message: "예약 시각이 올바르지 않습니다." },
        ]),
      ),
    );
    const { user, dialog } = await openPublish();
    await user.click(within(dialog).getByRole("button", { name: "게시" }));
    expect(await screen.findByText("예약 시각이 올바르지 않습니다.")).toBeTruthy();
  });

  it("검토 단계가 아니면 409로 안내한다", async () => {
    server.use(
      http.post("/api/ops/announcements/3/publish", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    const { user, dialog } = await openPublish();
    await user.click(within(dialog).getByRole("button", { name: "게시" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("게시는 감사 로그에 남는다고 안내한다", async () => {
    const { dialog } = await openPublish();
    expect(within(dialog).getByText(/감사 로그에 남습니다/)).toBeTruthy();
  });
});

describe("종료", () => {
  it("게시 중인 공지를 종료한다", async () => {
    const user = await openDetail("정기 점검 안내 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "공지 종료" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/게시 중인 공지를 종료하면 더 이상 노출되지 않습니다/),
    ).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "종료" }));
    expect(await screen.findByText("공지를 종료했습니다.")).toBeTruthy();
    expect(await screen.findByText("종료된 공지는 더 처리할 수 없습니다.")).toBeTruthy();
  });

  it("예약 상태의 공지를 종료하면 예약 취소로 처리한다고 안내한다", async () => {
    const user = await openDetail("연말 휴무 안내 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "예약 취소(종료)" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/예약 취소로 처리되어 게시되지 않습니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "예약 취소" }));
    expect(await screen.findByText("예약을 취소하고 공지를 종료했습니다.")).toBeTruthy();
  });

  it("종료한 공지는 되돌릴 수 없다고 안내한다", async () => {
    const user = await openDetail("정기 점검 안내 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "공지 종료" }));
    expect(within(screen.getByRole("dialog")).getByText(/되돌릴 수 없고/)).toBeTruthy();
  });

  it("이미 종료된 공지를 종료하면 409로 안내한다", async () => {
    server.use(
      http.post("/api/ops/announcements/1/end", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    const user = await openDetail("정기 점검 안내 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "공지 종료" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "종료" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("종료 요청이 404이면 대상을 찾을 수 없다고 안내한다", async () => {
    server.use(http.post("/api/ops/announcements/1/end", () => mockErrors.notFound()));
    const user = await openDetail("정기 점검 안내 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "공지 종료" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "종료" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });
});

describe("미리보기", () => {
  it("대상 사무소 수와 모바일 미리보기를 보인다", async () => {
    const user = await openDetail("요금 안내 개편 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "게시 전 미리보기" }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("대상 사무소 40곳")).toBeTruthy();
    expect(within(dialog).getByText(/마케팅 수신 미동의로 제외되는 대상 0곳/)).toBeTruthy();
    expect(within(dialog).getByRole("group", { name: "모바일 미리보기" })).toBeTruthy();
  });

  it("마케팅 공지는 제외되는 대상 수를 보인다", async () => {
    const user = await openDetail("겨울 이벤트 소개 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "게시 전 미리보기" }));
    expect(await screen.findByText(/마케팅 수신 미동의로 제외되는 대상 18곳/)).toBeTruthy();
  });

  it("미리보기를 불러오지 못하면 다시 시도할 수 있다", async () => {
    server.use(
      http.get("/api/ops/announcements/2/preview", () => mockErrors.notFound(), { once: true }),
    );
    const user = await openDetail("겨울 이벤트 소개 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "게시 전 미리보기" }));
    expect(await screen.findByText("미리보기를 불러오지 못했습니다.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText(/대상 사무소 120곳/)).toBeTruthy();
  });
});

describe("새 버전 수정", () => {
  it("게시된 공지는 새 버전 초안으로 남기고 이전 버전과 연결한다", async () => {
    const user = await openDetail("정기 점검 안내 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "새 버전으로 수정" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/덮어쓰지 않고 새 버전 초안으로 남깁니다/)).toBeTruthy();
    expect((within(dialog).getByLabelText("제목") as HTMLInputElement).value).toBe(
      "정기 점검 안내",
    );
    fireEvent.change(within(dialog).getByLabelText("제목"), {
      target: { value: "정기 점검 안내(수정)" },
    });
    await user.click(within(dialog).getByRole("button", { name: "새 버전 초안 저장" }));
    expect(await screen.findByText("새 버전(2판) 초안을 만들었습니다.")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "이전 버전 보기" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("수정 내용이 잘못되면 저장하지 않고 안내한다", async () => {
    const user = await openDetail("정기 점검 안내 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "새 버전으로 수정" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("제목"), { target: { value: "" } });
    await user.click(within(dialog).getByRole("button", { name: "새 버전 초안 저장" }));
    expect(within(dialog).getByText("제목을 입력해 주세요.")).toBeTruthy();
  });

  it("원본이 게시본이 아니면 409로 안내한다", async () => {
    server.use(
      http.post("/api/ops/announcements/1/revisions", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    const user = await openDetail("정기 점검 안내 1판 상세 보기");
    await user.click(screen.getByRole("button", { name: "새 버전으로 수정" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "새 버전 초안 저장" }),
    );
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });
});

describe("작성", () => {
  async function openCreate() {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("정기 점검 안내");
    await user.click(screen.getByRole("button", { name: "새 공지 작성" }));
    return user;
  }

  it("초안으로 저장하고 목록에 나타난다", async () => {
    const user = await openCreate();
    fillValidForm("신규 공지");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText("공지 초안을 저장했습니다.")).toBeTruthy();
    const table = screen.getByRole("table", { name: "공지 목록" });
    expect(await within(table).findByText("신규 공지")).toBeTruthy();
  });

  it("보내는 값에 대상과 마케팅 여부가 들어간다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/announcements", async ({ request }) => {
        sent = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    const user = await openCreate();
    fillValidForm();
    await user.selectOptions(screen.getByLabelText("대상"), "OFFICE");
    fill("대상 사무소 ID", "42");
    await user.selectOptions(screen.getByLabelText("중요도"), "CRITICAL");
    fill("상세 링크(선택)", "https://example.com/notice");
    await user.click(screen.getByLabelText("마케팅 공지입니다"));
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    await screen.findByText("공지 초안을 저장했습니다.");
    expect(sent).toMatchObject({
      audienceType: "OFFICE",
      audienceOfficeId: 42,
      audienceStatus: null,
      importance: "CRITICAL",
      detailUrl: "https://example.com/notice",
      marketing: true,
      startsAt: "2099-01-01T09:00:00+09:00",
    });
  });

  it("비어 있으면 항목별로 안내한다", async () => {
    const user = await openCreate();
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(screen.getByText("제목을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("본문을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("노출 시작 날짜와 시각을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("노출 종료 날짜와 시각을 입력해 주세요.")).toBeTruthy();
  });

  it("종료가 시작보다 앞서면 안내한다", async () => {
    const user = await openCreate();
    fillValidForm();
    fill("노출 종료 날짜", "2098-01-01");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(screen.getByText("노출 종료는 시작보다 뒤여야 합니다.")).toBeTruthy();
  });

  it("구독 상태 대상은 상태를 골라야 한다", async () => {
    const user = await openCreate();
    fillValidForm();
    await user.selectOptions(screen.getByLabelText("대상"), "SUBSCRIPTION_STATUS");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(screen.getByText("대상 구독 상태를 선택해 주세요.")).toBeTruthy();
  });

  it("특정 사무소 대상은 사무소 ID가 숫자여야 한다", async () => {
    const user = await openCreate();
    fillValidForm();
    await user.selectOptions(screen.getByLabelText("대상"), "OFFICE");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(screen.getByText("대상 사무소 ID를 숫자로 입력해 주세요.")).toBeTruthy();
  });

  it("상세 링크 형식이 잘못되면 안내한다", async () => {
    const user = await openCreate();
    fillValidForm();
    fill("상세 링크(선택)", "http://example.com");
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(screen.getByText(/상세 링크는 https:\/\/ 로 시작하거나/)).toBeTruthy();
  });

  it("제목이 100자를 넘으면 안내한다", async () => {
    const user = await openCreate();
    fillValidForm("가".repeat(101));
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(screen.getByText("제목은 100자 이내로 입력해 주세요.")).toBeTruthy();
  });

  it("마케팅 체크에 따라 안내 문구가 바뀐다", async () => {
    const user = await openCreate();
    expect(
      screen.getAllByText(/필수 안내는 마케팅 미동의자에게 선택 마케팅 경로로 보내지 않습니다/)
        .length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByLabelText("마케팅 공지입니다"));
    expect(
      screen.getByText("마케팅 공지는 마케팅 수신에 동의하지 않은 대상을 제외하고 보냅니다."),
    ).toBeTruthy();
  });

  it("서버가 400을 돌려주면 필드 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/announcements", () =>
        mockErrors.validation([
          { field: "title", message: "제목에 사용할 수 없는 문구가 있습니다." },
        ]),
      ),
    );
    const user = await openCreate();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText("제목에 사용할 수 없는 문구가 있습니다.")).toBeTruthy();
  });

  it("저장이 403이면 역할 안내를 보인다", async () => {
    server.use(http.post("/api/ops/announcements", () => mockErrors.forbidden()));
    const user = await openCreate();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("저장이 422이면 서버 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/announcements", () =>
        errorResponse(422, "UNPROCESSABLE", "처리할 수 없는 공지입니다."),
      ),
    );
    const user = await openCreate();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText("처리할 수 없는 공지입니다.")).toBeTruthy();
  });

  it("저장이 429이면 한도 안내를 보인다", async () => {
    server.use(http.post("/api/ops/announcements", () => mockErrors.rateLimited(15)));
    const user = await openCreate();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("취소하면 작성 영역이 닫힌다", async () => {
    const user = await openCreate();
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("heading", { name: "새 공지 작성" })).toBeNull();
  });
});
