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
import { PolicyDocumentsScreen } from "./policy-documents-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/policy-documents",
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
  return renderOpsScreen(<PolicyDocumentsScreen />, roles);
}

async function loaded() {
  const table = await screen.findByRole("table", { name: "정책 문서 목록" });
  await within(table).findByText("1.1");
  return table;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValidForm(version = "3.0") {
  fill("버전", version);
  fill("본문", "새 본문입니다.");
  fill("변경 요약", "문구 정리");
  fill("공지일 날짜", "2099-01-01");
  fill("공지일 시각", "09:00");
  fill("시행일 날짜", "2099-02-01");
  fill("시행일 시각", "09:00");
}

describe("목록", () => {
  it("문서 종류, 버전, 상태, 검토자, 게시자를 보인다", async () => {
    renderScreen();
    const table = await loaded();
    expect(within(table).getAllByText("이용약관").length).toBe(2);
    expect(within(table).getByText("개인정보처리방침")).toBeTruthy();
    expect(within(table).getByText("환불 안내")).toBeTruthy();
    expect(within(table).getAllByText("요금표").length).toBe(2);
    expect(within(table).getAllByText("게시", { selector: "span" }).length).toBe(2);
    expect(within(table).getAllByText("운영자 7").length).toBeGreaterThan(0);
    expect(within(table).getByRole("columnheader", { name: "게시자" })).toBeTruthy();
    expect(within(table).getAllByText("필요").length).toBeGreaterThan(0);
  });

  it("불러오는 동안 표가 바쁨 상태다", () => {
    server.use(http.get("/api/ops/policy-documents", () => delay("infinite")));
    const { container } = renderScreen();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("비어 있으면 빈 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/policy-documents", () =>
        Response.json({ items: [], page: 0, size: 25, totalElements: 0 }),
      ),
    );
    renderScreen();
    expect(await screen.findByText("등록된 정책 문서가 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/policy-documents", () => mockErrors.server(), { once: true }));
    renderScreen();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await loaded();
  });

  it("운영담당이 아니면 화면을 열 수 없다", () => {
    renderScreen(["SUPPORT"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("조회가 429이면 한도 안내를 보인다", async () => {
    server.use(http.get("/api/ops/policy-documents", () => mockErrors.rateLimited(30)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("본문 보기", () => {
  it("본문과 변경 요약을 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "이용약관 1.0 본문 보기" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/제1조 목적/)).toBeTruthy();
    expect(within(dialog).getByText("최초 게시")).toBeTruthy();
  });
});

describe("상태 전이", () => {
  it("초안은 검토 요청만, 검토는 게시만 할 수 있다", async () => {
    renderScreen();
    await loaded();
    expect(screen.getByRole("button", { name: "이용약관 1.1 검토 요청" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "이용약관 1.1 게시" })).toBeNull();
    expect(screen.getByRole("button", { name: "개인정보처리방침 2.0 게시" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "개인정보처리방침 2.0 검토 요청" })).toBeNull();
    expect(screen.queryByRole("button", { name: "이용약관 1.0 게시" })).toBeNull();
  });

  it("초안을 검토 단계로 올리면 게시할 수 있게 된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "이용약관 1.1 검토 요청" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "검토 요청" }));
    expect(await screen.findByText(/1\.1 문서를 검토 단계로 올렸습니다/)).toBeTruthy();
    expect(await screen.findByRole("button", { name: "이용약관 1.1 게시" })).toBeTruthy();
  });

  it("검토 단계 문서를 게시한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "개인정보처리방침 2.0 게시" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/덮어쓸 수 없고 게시자로 기록됩니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "게시" }));
    expect(await screen.findByText(/2\.0 문서를 시행일에 맞춰 예약했습니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "개인정보처리방침 2.0 게시" })).toBeNull();
  });

  it("검토 단계가 아니면 409로 안내한다", async () => {
    server.use(
      http.post("/api/ops/policy-documents/3/publish", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "개인정보처리방침 2.0 게시" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "게시" }));
    expect(await screen.findByText(/검토 단계의 문서만 게시할 수 있습니다/)).toBeTruthy();
  });

  it("요금 변경은 시행 30일 전이 지나면 게시할 수 없다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "요금표 2026-12 게시" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/시행까지 30일 미만이면 게시할 수 없습니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "게시" }));
    expect(await within(dialog).findByText(/시행일과 공지일을 확인해 주세요/)).toBeTruthy();
  });

  it("시행 30일 이상 남은 요금 문서는 예약된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "요금표 2027-02 게시" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "게시" }));
    expect(await screen.findByText(/2027-02 문서를 시행일에 맞춰 예약했습니다/)).toBeTruthy();
  });

  it("게시 대상이 없으면 404로 안내한다", async () => {
    server.use(http.post("/api/ops/policy-documents/3/publish", () => mockErrors.notFound()));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "개인정보처리방침 2.0 게시" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "게시" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("검토 요청이 429이면 한도 안내를 보인다", async () => {
    server.use(
      http.post("/api/ops/policy-documents/2/submit-review", () => mockErrors.rateLimited(10)),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "이용약관 1.1 검토 요청" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "검토 요청" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("검토 요청이 403이면 역할 안내를 보인다", async () => {
    server.use(
      http.post("/api/ops/policy-documents/2/submit-review", () => mockErrors.forbidden()),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "이용약관 1.1 검토 요청" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "검토 요청" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});

describe("새 버전 등록", () => {
  it("게시본을 덮어쓰지 않는다고 안내한다", async () => {
    renderScreen();
    await loaded();
    expect(screen.getByText(/게시한 문서는 덮어쓰지 않습니다/)).toBeTruthy();
  });

  it("초안으로 등록한다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/policy-documents", async ({ request }) => {
        sent = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm("3.0");
    await user.click(screen.getByLabelText("시행 전에 이용자 동의가 필요합니다"));
    await user.click(screen.getByRole("button", { name: "초안 등록" }));
    expect(await screen.findByText("이용약관 3.0 초안을 등록했습니다.")).toBeTruthy();
    expect(sent).toMatchObject({
      docType: "TERMS",
      version: "3.0",
      requiresConsent: true,
      noticeAt: "2099-01-01T09:00:00+09:00",
      effectiveAt: "2099-02-01T09:00:00+09:00",
    });
    expect(await screen.findByText("3.0")).toBeTruthy();
  });

  it("비어 있으면 항목별로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    await user.click(screen.getByRole("button", { name: "초안 등록" }));
    expect(screen.getByText("버전을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("본문을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("변경 요약을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("공지일 날짜와 시각을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("시행일 날짜와 시각을 입력해 주세요.")).toBeTruthy();
  });

  it("공지일이 시행일보다 늦으면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    fill("공지일 날짜", "2099-03-01");
    await user.click(screen.getByRole("button", { name: "초안 등록" }));
    expect(screen.getByText("공지일은 시행일보다 늦을 수 없습니다.")).toBeTruthy();
  });

  it("요금표를 고르면 30일 전 규칙을 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    expect(screen.queryByText(/시행까지 30일 미만이면 게시할 수 없습니다/)).toBeNull();
    await user.selectOptions(screen.getByLabelText("문서 종류"), "PRICING");
    expect(screen.getByText(/시행까지 30일 미만이면 게시할 수 없습니다/)).toBeTruthy();
  });

  it("같은 버전이 있으면 409 메시지를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm("1.0");
    await user.click(screen.getByRole("button", { name: "초안 등록" }));
    expect(await screen.findByText(/같은 종류와 버전의 문서가 이미 있습니다/)).toBeTruthy();
  });

  it("서버 400이면 필드 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/policy-documents", () =>
        mockErrors.validation([{ field: "version", message: "버전 형식이 올바르지 않습니다." }]),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "초안 등록" }));
    expect(await screen.findByText("버전 형식이 올바르지 않습니다.")).toBeTruthy();
  });

  it("등록이 422이면 서버 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/policy-documents", () =>
        errorResponse(422, "UNPROCESSABLE", "등록할 수 없는 문서입니다."),
      ),
    );
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "초안 등록" }));
    expect(await screen.findByText("등록할 수 없는 문서입니다.")).toBeTruthy();
  });

  it("등록이 429이면 한도 안내를 보인다", async () => {
    server.use(http.post("/api/ops/policy-documents", () => mockErrors.rateLimited(5)));
    const user = userEvent.setup();
    renderScreen();
    await loaded();
    fillValidForm();
    await user.click(screen.getByRole("button", { name: "초안 등록" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});
