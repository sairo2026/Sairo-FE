// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockRawAccess } from "@/mocks/handlers/ops-raw-access";
import {
  markMockStepUp,
  resetMockOpsSession,
  setMockOperatorRoles,
} from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { OpsSessionProvider } from "../model/ops-session";
import type { OpsRole } from "../model/roles";
import { RawAccessDetailScreen } from "./raw-access-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/raw-access/1",
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
  resetMockRawAccess();
  vi.restoreAllMocks();
});
afterAll(() => stopServer());

function renderDetail(requestId: number, roles: OpsRole[], operatorId = 1) {
  setMockOperatorRoles(roles);
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <OpsSessionProvider value={{ operatorId, name: "운영 김사이", roles }}>
        <RawAccessDetailScreen requestId={requestId} />
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
}

function button(name: string) {
  return screen.getByRole("button", { name });
}

function isBlocked(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

describe("승인과 거절", () => {
  it("승인 기록과 사유와 근거를 보인다", async () => {
    renderDetail(3, ["OPS"]);
    expect(await screen.findByText("고객 문의 대응")).toBeTruthy();
    expect(screen.getByText("대표의 지원 요청·승인")).toBeTruthy();
    expect(screen.getByText("대표가 전화로 확인을 요청했습니다.")).toBeTruthy();
    expect(screen.getAllByText("운영 김사이").length).toBeGreaterThan(0);
    expect(screen.getByText("박지원")).toBeTruthy();
    expect(screen.getByText("승인 시각")).toBeTruthy();
  });

  it("개인정보담당은 다른 사람의 요청을 승인할 수 있다", async () => {
    const user = userEvent.setup();
    renderDetail(1, ["PRIVACY"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("승인"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("요청을 승인했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("button", { name: "실행" })).toBeTruthy());
  });

  it("본인이 낸 요청은 승인과 거절 버튼이 꺼지고 안내한다", async () => {
    renderDetail(2, ["PRIVACY"]);
    await screen.findByText("고객 문의 대응");
    expect(isBlocked(button("승인"))).toBe(true);
    expect(isBlocked(button("거절"))).toBe(true);
    expect(screen.getByRole("note").textContent).toContain("직접 승인하거나 거절할 수 없습니다");
  });

  it("개인정보담당과 보안관리자를 함께 가져도 본인 건은 승인할 수 없다", async () => {
    renderDetail(2, ["PRIVACY", "SECURITY_ADMIN"]);
    await screen.findByText("고객 문의 대응");
    expect(isBlocked(button("승인"))).toBe(true);
  });

  it("수혜자로 지정된 개인정보담당도 승인할 수 없다", async () => {
    renderDetail(12, ["PRIVACY"], 3);
    await screen.findByText("고객 문의 대응");
    expect(isBlocked(button("승인"))).toBe(true);
  });

  it("서버가 자기 승인을 막으면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/raw-access-requests/:id/approve", () =>
        errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "본인"),
      ),
    );
    renderDetail(1, ["PRIVACY"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("승인"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/직접 승인할 수 없습니다/)).toBeTruthy();
  });

  it("개인정보담당이 아니면 승인 버튼 없이 대기 안내만 본다", async () => {
    renderDetail(2, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
    expect(screen.getByText("개인정보담당의 승인을 기다리고 있습니다.")).toBeTruthy();
  });

  it("거절은 사유가 있어야 하고 처리하면 거절 사유가 남는다", async () => {
    const user = userEvent.setup();
    renderDetail(1, ["PRIVACY"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("거절"));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "거절" });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    await user.type(within(dialog).getByLabelText("거절 사유"), "근거가 부족합니다");
    await user.click(submit);
    expect(await screen.findByText("요청을 거절했습니다.")).toBeTruthy();
    expect(await screen.findByText("근거가 부족합니다")).toBeTruthy();
  });

  it("거절된 요청은 거절한 사람과 사유를 보인다", async () => {
    renderDetail(11, ["OPS"]);
    expect(await screen.findByText("근거가 부족합니다.")).toBeTruthy();
    expect(screen.getByText("거절 사유")).toBeTruthy();
    expect(screen.getByText("더 처리할 수 있는 작업이 없습니다.")).toBeTruthy();
  });

  it("이미 처리된 요청을 승인하면 상태 전이 오류를 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/raw-access-requests/:id/approve", () =>
        errorResponse(409, "INVALID_TRANSITION", "처리됨"),
      ),
    );
    renderDetail(1, ["PRIVACY"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("승인"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("없는 요청은 찾을 수 없음 화면을 보인다", async () => {
    renderDetail(999, ["OPS"]);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("조회 권한이 없는 요청은 접근 권한 화면을 보인다", async () => {
    renderDetail(12, ["OPS"]);
    expect(await screen.findByText("접근 권한이 없습니다")).toBeTruthy();
  });

  it("조회가 429로 막히면 안내한다", async () => {
    server.use(http.get("/api/ops/raw-access-requests/:id", () => mockErrors.rateLimited(30)));
    renderDetail(1, ["OPS"]);
    expect(await screen.findByText("요청이 너무 많습니다")).toBeTruthy();
  });

  it("무효가 된 승인은 안내한다", async () => {
    renderDetail(13, ["OPS"]);
    expect(await screen.findByText(/승인이 무효가 되었습니다/)).toBeTruthy();
  });
});

describe("실행", () => {
  it("열람 승인을 실행하면 남은 접근 시간을 접근 창 만료 시각 기준으로 보인다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(3, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    expect(screen.getByText(/5분 이내 재인증이 필요하며 승인 1건은 한 번만/)).toBeTruthy();
    await user.click(button("실행"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    expect(await screen.findByText("실행했습니다. 접근 창이 열렸습니다.")).toBeTruthy();
    expect(await screen.findByText(/남은 접근 시간 (59|60)분/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "실행" })).toBeNull();
  });

  it("이미 실행한 승인은 다시 실행할 수 없다", async () => {
    markMockStepUp();
    renderDetail(6, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    expect(screen.queryByRole("button", { name: "실행" })).toBeNull();
    const response = await fetch("/api/ops/raw-access-requests/6/execute", { method: "POST" });
    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe("INVALID_TRANSITION");
  });

  it("재인증이 없으면 실행하지 못하고 안내한다", async () => {
    const user = userEvent.setup();
    renderDetail(3, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("실행"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    expect(await screen.findByText("본인 확인이 필요합니다.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "실행" })).toBeTruthy();
  });

  it("승인이 무효가 되었으면 실행 직전에 막고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/raw-access-requests/:id/execute", () =>
        errorResponse(409, "APPROVAL_INVALIDATED", "무효"),
      ),
    );
    renderDetail(3, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("실행"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    expect(
      await screen.findByText(/승인이 만료되었거나 승인자의 권한이 회수되어 실행할 수 없습니다/),
    ).toBeTruthy();
  });

  it("승인 유효기간이 지난 요청은 실행 버튼이 꺼진다", async () => {
    renderDetail(5, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    expect(isBlocked(button("실행"))).toBe(true);
    expect(screen.getByRole("note").textContent).toContain("실행할 수 없습니다");
    const response = await fetch("/api/ops/raw-access-requests/5/execute", { method: "POST" });
    expect(response.status).toBe(401);
    markMockStepUp();
    const second = await fetch("/api/ops/raw-access-requests/5/execute", { method: "POST" });
    expect(second.status).toBe(409);
    expect(((await second.json()) as { code: string }).code).toBe("APPROVAL_INVALIDATED");
  });

  it("수혜자가 아닌 운영자는 실행할 수 없다", async () => {
    renderDetail(3, ["OPS"], 9);
    await screen.findByText("고객 문의 대응");
    expect(screen.getByText("수혜자 본인만 실행할 수 있습니다.")).toBeTruthy();
    expect(isBlocked(button("실행"))).toBe(true);
  });

  it("다운로드 승인을 실행하면 크기와 해시와 한 번만 받는다는 안내를 보인다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(4, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("실행"));
    expect(screen.getByRole("dialog").textContent).toContain("한 번만 받을 수 있습니다");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    expect(await screen.findByText("20,480 바이트")).toBeTruthy();
    expect(screen.getByText(/^9f86d081/)).toBeTruthy();
    expect(
      screen.getByText(/파일은 한 번만 받을 수 있습니다. 받기 직전에 5분 이내 재인증/),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "파일 받기" })).toBeTruthy();
  });
});

describe("원문 보기", () => {
  it("열람 승인을 실행한 운영자는 재인증 뒤 원문을 읽는다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(6, ["OPS"]);
    await user.click(await screen.findByRole("button", { name: "원문 보기" }));
    expect(await screen.findByText("사무소 예시")).toBeTruthy();
    expect(screen.getByText("읽은 시각")).toBeTruthy();
  });

  it("재인증이 없으면 읽지 못하고 안내한다", async () => {
    const user = userEvent.setup();
    renderDetail(6, ["OPS"]);
    await user.click(await screen.findByRole("button", { name: "원문 보기" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("회수된 접근은 원문을 읽을 수 없다고 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(9, ["OPS"]);
    await user.click(await screen.findByRole("button", { name: "원문 보기" }));
    expect(await screen.findByText("회수된 접근이라 받을 수 없습니다.")).toBeTruthy();
  });

  it("다운로드 승인에는 원문 보기가 없다", async () => {
    renderDetail(7, ["OPS"]);
    await screen.findByText("파일 해시(SHA-256)");
    expect(screen.queryByRole("button", { name: "원문 보기" })).toBeNull();
  });
});

describe("파일 받기", () => {
  it("한 번 받으면 다시 받을 수 없다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    const createUrl = vi.fn(() => "blob:mock");
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderDetail(7, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("파일 받기"));
    expect(await screen.findByText(/파일을 받았습니다/)).toBeTruthy();
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/이미 받은 파일입니다/)).toBeTruthy());
    expect(isBlocked(button("파일 받기"))).toBe(true);
  });

  it("재인증이 없으면 받지 못하고 안내한다", async () => {
    const user = userEvent.setup();
    renderDetail(7, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("파일 받기"));
    expect(await screen.findByText("본인 확인이 필요합니다.")).toBeTruthy();
  });

  it("이미 받은 파일은 안내하고 버튼이 꺼진다", async () => {
    renderDetail(8, ["OPS"]);
    expect(await screen.findByText(/이미 받은 파일입니다/)).toBeTruthy();
    expect(isBlocked(button("파일 받기"))).toBe(true);
  });

  it("서버가 이미 전달한 파일을 막으면 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.get("/api/ops/raw-access-grants/:id/file", () =>
        errorResponse(409, "RAW_DOWNLOAD_ALREADY_USED", "사용됨"),
      ),
    );
    renderDetail(7, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    await user.click(button("파일 받기"));
    expect(
      await screen.findByText(/이미 받은 파일입니다. 파일은 한 번만 받을 수 있습니다./),
    ).toBeTruthy();
  });

  it("서버가 만료와 회수와 다운로드 미승인을 막으면 각각 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    const cases: [number, string, string][] = [
      [409, "RAW_ACCESS_EXPIRED", "접근 시간 60분이 지나 더 받을 수 없습니다."],
      [409, "RAW_ACCESS_REVOKED", "회수된 접근이라 받을 수 없습니다."],
      [403, "DOWNLOAD_NOT_APPROVED", "다운로드 승인을 받은 접근이 아니라 파일을 받을 수 없습니다."],
    ];
    renderDetail(7, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    for (const [status, code, text] of cases) {
      server.use(
        http.get("/api/ops/raw-access-grants/:id/file", () => errorResponse(status, code, "x")),
      );
      await user.click(button("파일 받기"));
      expect(await screen.findByText(text)).toBeTruthy();
    }
  });

  it("열람 승인에는 파일 받기가 없다", async () => {
    renderDetail(6, ["OPS"]);
    await screen.findByText("고객 문의 대응");
    expect(screen.queryByRole("button", { name: "파일 받기" })).toBeNull();
  });

  it("수혜자가 아니면 파일 받기 버튼이 없다", async () => {
    renderDetail(7, ["OPS"], 9);
    await screen.findByText("고객 문의 대응");
    expect(screen.queryByRole("button", { name: "파일 받기" })).toBeNull();
  });
});

describe("접근 창 상태와 회수", () => {
  it("실행한 열람의 남은 접근 시간을 보인다", async () => {
    renderDetail(6, ["OPS"]);
    expect(await screen.findByText(/남은 접근 시간 (49|50)분/)).toBeTruthy();
  });

  it("접근 시간이 지난 기록은 만료로 안내하고 회수 버튼이 없다", async () => {
    renderDetail(10, ["SECURITY_ADMIN"]);
    expect(await screen.findByText(/지나 만료되었습니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "접근 회수" })).toBeNull();
  });

  it("회수된 기록은 회수 시각과 사유를 보인다", async () => {
    renderDetail(9, ["SECURITY_ADMIN"]);
    expect(await screen.findByText(/회수된 접근입니다/)).toBeTruthy();
    expect(screen.getByText("요청 철회")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "접근 회수" })).toBeNull();
  });

  it("보안관리자만 회수 버튼을 본다", async () => {
    renderDetail(6, ["OPS", "PRIVACY"]);
    await screen.findByText(/남은 접근 시간/);
    expect(screen.queryByRole("button", { name: "접근 회수" })).toBeNull();
  });

  it("회수는 사유가 있어야 하고 처리하면 회수 상태로 바뀐다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(6, ["SECURITY_ADMIN"]);
    await screen.findByText(/남은 접근 시간/);
    await user.click(button("접근 회수"));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("5분 이내 재인증");
    const submit = within(dialog).getByRole("button", { name: "접근 회수" });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    await user.type(within(dialog).getByLabelText("회수 사유"), "요청자 퇴사");
    await user.click(submit);
    expect(await screen.findByText("접근을 회수했습니다.")).toBeTruthy();
    expect(await screen.findByText(/회수된 접근입니다/)).toBeTruthy();
  });

  it("재인증이 없으면 회수하지 못하고 대화상자에 안내한다", async () => {
    const user = userEvent.setup();
    renderDetail(6, ["SECURITY_ADMIN"]);
    await screen.findByText(/남은 접근 시간/);
    await user.click(button("접근 회수"));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("회수 사유"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "접근 회수" }));
    expect(await within(dialog).findByText("본인 확인이 필요합니다.")).toBeTruthy();
  });

  it("이미 만료되거나 회수된 접근을 회수하면 상태 전이 오류를 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/raw-access-grants/:id/revoke", () =>
        errorResponse(409, "INVALID_TRANSITION", "상태"),
      ),
    );
    renderDetail(6, ["SECURITY_ADMIN"]);
    await screen.findByText(/남은 접근 시간/);
    await user.click(button("접근 회수"));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("회수 사유"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "접근 회수" }));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });
});
