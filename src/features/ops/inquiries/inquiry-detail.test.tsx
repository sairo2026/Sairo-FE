// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { resetMockOpsSupport } from "@/mocks/handlers/ops-support";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { InquiryDetailScreen } from "./inquiry-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/inquiries/502",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;
let originalFetch: typeof fetch;

beforeAll(() => {
  stopServer = startMockServer();
  originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    if (init?.body instanceof FormData) {
      const file = init.body.get("file");
      const name = file instanceof File ? file.name : "";
      return originalFetch(input, {
        ...init,
        body: undefined,
        headers: {
          ...(init.headers as Record<string, string>),
          "x-mock-file-name": encodeURIComponent(name),
        },
      });
    }
    return originalFetch(input, init);
  };
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOpsSession();
  resetMockOpsSupport();
  vi.restoreAllMocks();
});
afterAll(() => {
  globalThis.fetch = originalFetch;
  stopServer();
});

function renderDetail(id: number, roles: OpsRole[] = ["SUPPORT"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<InquiryDetailScreen inquiryId={id} />, roles);
}

function isBlocked(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

const REPLY_BUTTON = "공개 답변 등록(고객에게 공개)";
const NOTE_BUTTON = "내부 메모 저장(고객에게 보이지 않음)";

describe("문의 상세 표시", () => {
  it("로딩 뒤 유형·사무소·작성자·담당·우선순위·시각을 보인다", async () => {
    renderDetail(502);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("인증")).toBeTruthy();
    for (const label of [
      "문의 유형",
      "사무소",
      "작성자",
      "담당",
      "우선순위",
      "접수 시각",
      "첫 답변 목표",
      "최근 공개 답변 시각",
      "마감 시각",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("북악부동산")).toBeTruthy();
    expect(screen.getByText("김지원", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("높음", { selector: "span" })).toBeTruthy();
  });

  it("문의 본문을 보인다", async () => {
    renderDetail(502);
    expect(await screen.findByText("인증 서류를 다시 제출했는데 반영이 안 됩니다.")).toBeTruthy();
  });

  it("공개 답변과 내부 메모를 다른 영역으로 구분해 보인다", async () => {
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    const memo = screen.getByRole("article", { name: "내부 메모" });
    expect(memo.getAttribute("data-visibility")).toBe("INTERNAL");
    expect(within(memo).getByText("내부 메모, 고객에게 보이지 않음")).toBeTruthy();
    expect(within(memo).getByText("심사팀에 재확인을 요청했습니다.")).toBeTruthy();
    const answers = screen.getAllByRole("article", { name: "공개 답변" });
    expect(answers).toHaveLength(2);
    for (const answer of answers) {
      expect(answer.getAttribute("data-visibility")).toBe("PUBLIC");
      expect(within(answer).getByText("고객에게 공개")).toBeTruthy();
      expect(within(answer).queryByText(/고객에게 보이지 않음/)).toBeNull();
    }
  });

  it("내부 메모와 공개 답변은 서로 다른 배경 스타일을 쓴다", async () => {
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    const memo = screen.getByRole("article", { name: "내부 메모" });
    const [answer] = screen.getAllByRole("article", { name: "공개 답변" });
    expect(memo.className).toContain("bg-tag-amber");
    expect(answer?.className).not.toContain("bg-tag-amber");
  });

  it("고객이 보낸 메시지는 고객 작성으로 구분한다", async () => {
    renderDetail(502);
    const customer = await screen.findByRole("article", { name: "고객 메시지" });
    expect(within(customer).getByText("고객 작성")).toBeTruthy();
    expect(within(customer).getByText("추가로 사업자등록증을 올렸습니다.")).toBeTruthy();
  });

  it("이전 공개 답변은 이력으로 보존되고 최근 답변과 구분한다", async () => {
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    const answers = screen.getAllByRole("article", { name: "공개 답변" });
    expect(within(answers[0] as HTMLElement).getByText("이전 공개 답변")).toBeTruthy();
    expect(within(answers[1] as HTMLElement).queryByText("이전 공개 답변")).toBeNull();
    expect(
      screen.getByText(/이전 공개 답변은 수정하거나 삭제하지 않고 이력으로 보존/),
    ).toBeTruthy();
  });

  it("첨부마다 공개 첨부인지 내부 첨부인지 표시한다", async () => {
    renderDetail(502);
    await screen.findByText("내부증빙.pdf", { exact: false });
    const memo = screen.getByRole("article", { name: "내부 메모" });
    expect(within(memo).getByText("내부 첨부, 고객에게 보이지 않음")).toBeTruthy();
    const answers = screen.getAllByRole("article", { name: "공개 답변" });
    expect(within(answers[1] as HTMLElement).getByText("공개 첨부, 고객에게 공개")).toBeTruthy();
  });

  it("연결된 메시지가 없는 첨부는 문의 본문 쪽에 공개 첨부로 보인다", async () => {
    renderDetail(501);
    expect(await screen.findByText("공개 첨부, 고객에게 공개")).toBeTruthy();
    expect(screen.getByText(/영수증\.pdf/)).toBeTruthy();
  });

  it("검사가 끝나지 않은 첨부는 내려받을 수 없다", async () => {
    renderDetail(502);
    const pending = await screen.findByRole("button", { name: "안내문.png 내려받기" });
    expect(isBlocked(pending)).toBe(true);
    const clean = screen.getByRole("button", { name: "내부증빙.pdf 내려받기" });
    expect(isBlocked(clean)).toBe(false);
  });

  it("검사 완료 첨부를 내려받으면 파일을 저장한다", async () => {
    const user = userEvent.setup();
    const createUrl = vi.fn(() => "blob:mock");
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderDetail(502);
    await user.click(await screen.findByRole("button", { name: "내부증빙.pdf 내려받기" }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(createUrl).toHaveBeenCalledTimes(1);
  });

  it("첨부 내려받기가 실패하면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/ops/support-inquiries/:id/attachments/:attachmentId", () =>
        mockErrors.notFound(),
      ),
    );
    renderDetail(502);
    await user.click(await screen.findByRole("button", { name: "내부증빙.pdf 내려받기" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("조회가 감사 로그에 남는다는 안내를 보인다", async () => {
    renderDetail(502);
    expect(await screen.findByText(/감사 로그에 남습니다/)).toBeTruthy();
  });
});

describe("공개 답변과 내부 메모 작성", () => {
  it("공개 답변 입력과 내부 메모 입력은 서로 다른 폼이고 제출 문구가 다르다", async () => {
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    const reply = screen.getByRole("form", { name: "공개 답변 작성" });
    const note = screen.getByRole("form", { name: "내부 메모 작성" });
    expect(reply).not.toBe(note);
    expect(within(reply).getByRole("button", { name: REPLY_BUTTON })).toBeTruthy();
    expect(within(note).getByRole("button", { name: NOTE_BUTTON })).toBeTruthy();
    expect(within(reply).queryByRole("button", { name: NOTE_BUTTON })).toBeNull();
    expect(within(note).queryByRole("button", { name: REPLY_BUTTON })).toBeNull();
  });

  it("공개 답변 폼에는 고객에게 공개된다는 안내가 있다", async () => {
    renderDetail(502);
    const reply = await screen.findByRole("form", { name: "공개 답변 작성" });
    expect(within(reply).getByText(/고객에게 공개되고 알림으로 전달/)).toBeTruthy();
    const note = screen.getByRole("form", { name: "내부 메모 작성" });
    expect(
      within(note).getByText(/운영자에게만 보이며 고객 화면과 알림에 포함되지 않습니다/),
    ).toBeTruthy();
  });

  it("내용이 비어 있으면 제출 버튼이 꺼져 있다", async () => {
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    expect(isBlocked(screen.getByRole("button", { name: REPLY_BUTTON }))).toBe(true);
    expect(isBlocked(screen.getByRole("button", { name: NOTE_BUTTON }))).toBe(true);
  });

  it("공백만 입력하면 제출할 수 없다", async () => {
    const user = userEvent.setup();
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.type(screen.getByLabelText("공개 답변 내용"), "   ");
    expect(isBlocked(screen.getByRole("button", { name: REPLY_BUTTON }))).toBe(true);
  });

  it("공개 답변을 등록하면 공개 답변 이력에 추가되고 이전 답변은 그대로다", async () => {
    const user = userEvent.setup();
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.type(screen.getByLabelText("공개 답변 내용"), "재심사 결과를 안내드립니다.");
    await user.click(screen.getByRole("button", { name: REPLY_BUTTON }));
    expect(await screen.findByText(/공개 답변을 등록했습니다/)).toBeTruthy();
    await waitFor(() =>
      expect(screen.getAllByRole("article", { name: "공개 답변" })).toHaveLength(3),
    );
    expect(screen.getByText("서류를 확인하고 있습니다.")).toBeTruthy();
    expect(screen.getByText("재심사 결과를 안내드립니다.")).toBeTruthy();
  });

  it("공개 답변은 내부 메모 영역에 섞이지 않는다", async () => {
    const user = userEvent.setup();
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.type(screen.getByLabelText("공개 답변 내용"), "공개로만 남깁니다.");
    await user.click(screen.getByRole("button", { name: REPLY_BUTTON }));
    await screen.findByText("공개로만 남깁니다.");
    const memos = screen.getAllByRole("article", { name: "내부 메모" });
    expect(memos).toHaveLength(1);
    expect(within(memos[0] as HTMLElement).queryByText("공개로만 남깁니다.")).toBeNull();
  });

  it("내부 메모를 저장하면 내부 메모 영역에만 추가된다", async () => {
    const user = userEvent.setup();
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.type(screen.getByLabelText("내부 메모 내용"), "결제팀과 공유했습니다.");
    await user.click(screen.getByRole("button", { name: NOTE_BUTTON }));
    expect(await screen.findByText(/내부 메모를 저장했습니다/)).toBeTruthy();
    await waitFor(() =>
      expect(screen.getAllByRole("article", { name: "내부 메모" })).toHaveLength(2),
    );
    const added = screen
      .getAllByRole("article", { name: "내부 메모" })
      .find((article) => within(article).queryByText("결제팀과 공유했습니다."));
    expect(added?.getAttribute("data-visibility")).toBe("INTERNAL");
    expect(screen.getAllByRole("article", { name: "공개 답변" })).toHaveLength(2);
  });

  it("한쪽 폼에 쓴 내용이 다른 쪽 폼에 들어가지 않는다", async () => {
    const user = userEvent.setup();
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.type(screen.getByLabelText("공개 답변 내용"), "공개 초안");
    expect((screen.getByLabelText("내부 메모 내용") as HTMLTextAreaElement).value).toBe("");
    expect(isBlocked(screen.getByRole("button", { name: NOTE_BUTTON }))).toBe(true);
  });

  it("고객 답변 필요로 등록하면 고객 답변 대기 상태가 된다", async () => {
    const user = userEvent.setup();
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    await user.type(screen.getByLabelText("공개 답변 내용"), "영수증을 다시 보내 주세요.");
    await user.click(screen.getByLabelText("고객 답변을 기다립니다"));
    await user.click(screen.getByRole("button", { name: REPLY_BUTTON }));
    expect(await screen.findByText("고객 답변 대기")).toBeTruthy();
  });

  it("답변 뒤 종료로 등록하면 문의가 종료되고 입력이 막힌다", async () => {
    const user = userEvent.setup();
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    await user.type(screen.getByLabelText("공개 답변 내용"), "환불 처리했습니다.");
    await user.click(screen.getByLabelText("답변 뒤 문의를 종료합니다"));
    await user.click(screen.getByRole("button", { name: REPLY_BUTTON }));
    await waitFor(() =>
      expect(screen.getByText("종료된 문의에는 답변할 수 없습니다.")).toBeTruthy(),
    );
    expect((screen.getByLabelText("공개 답변 내용") as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByLabelText("내부 메모 내용") as HTMLTextAreaElement).disabled).toBe(true);
  });

  it("이미 종료된 문의는 답변과 메모 입력이 막혀 있다", async () => {
    renderDetail(503);
    await screen.findByText("개인정보 열람을 요청합니다.");
    expect((screen.getByLabelText("공개 답변 내용") as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByText("종료된 문의에는 내부 메모를 추가할 수 없습니다.")).toBeTruthy();
    expect(isBlocked(screen.getByRole("button", { name: REPLY_BUTTON }))).toBe(true);
  });

  it("서버가 종료된 문의 답변을 거부하면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/support-inquiries/:id/answer", () =>
        errorResponse(409, "INVALID_TRANSITION", "종료"),
      ),
    );
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.type(screen.getByLabelText("공개 답변 내용"), "답변");
    await user.click(screen.getByRole("button", { name: REPLY_BUTTON }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("공개 답변 요청이 많으면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/support-inquiries/:id/answer", () => mockErrors.rateLimited(20)),
    );
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.type(screen.getByLabelText("공개 답변 내용"), "답변");
    await user.click(screen.getByRole("button", { name: REPLY_BUTTON }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("내부 메모 저장이 403이면 권한 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/support-inquiries/:id/notes", () => mockErrors.forbidden()));
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.type(screen.getByLabelText("내부 메모 내용"), "메모");
    await user.click(screen.getByRole("button", { name: NOTE_BUTTON }));
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });
});

describe("담당 배정과 우선순위", () => {
  it("운영자 목록에서 골라 배정하면 담당이 바뀐다", async () => {
    const user = userEvent.setup();
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    await screen.findByRole("option", { name: /이상담/ });
    await user.selectOptions(screen.getByLabelText("담당 운영자"), "9");
    await user.click(screen.getByRole("button", { name: "담당 배정" }));
    expect(await screen.findByText("담당을 배정했습니다.")).toBeTruthy();
    expect(await screen.findByText("이상담", { selector: "dd" })).toBeTruthy();
  });

  it("운영자를 고르지 않으면 담당 배정 버튼이 꺼져 있다", async () => {
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    expect(isBlocked(screen.getByRole("button", { name: "담당 배정" }))).toBe(true);
  });

  it("나에게 배정하면 로그인한 운영자가 담당이 된다", async () => {
    const user = userEvent.setup();
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    await user.click(screen.getByRole("button", { name: "나에게 배정" }));
    expect(await screen.findByText("운영 김사이", { selector: "dd" })).toBeTruthy();
  });

  it("활성 지원 운영자가 아니면 배정할 수 없다고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/ops/operators/options", () =>
        HttpResponse.json({ items: [{ operatorId: 99, name: "퇴사자", roles: ["OPS"] }] }),
      ),
    );
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    await screen.findByRole("option", { name: /퇴사자/ });
    await user.selectOptions(screen.getByLabelText("담당 운영자"), "99");
    await user.click(screen.getByRole("button", { name: "담당 배정" }));
    expect(await screen.findByText("활성 지원 담당 운영자가 아닙니다.")).toBeTruthy();
  });

  it("우선순위를 바꾸면 새 우선순위가 보인다", async () => {
    const user = userEvent.setup();
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    await user.selectOptions(screen.getByLabelText("우선순위"), "HIGH");
    await user.click(screen.getByRole("button", { name: "우선순위 변경" }));
    expect(await screen.findByText("우선순위를 바꿨습니다.")).toBeTruthy();
    expect(await screen.findByText("높음", { selector: "span" })).toBeTruthy();
  });

  it("우선순위를 그대로 두면 변경 버튼이 꺼져 있다", async () => {
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    expect(isBlocked(screen.getByRole("button", { name: "우선순위 변경" }))).toBe(true);
  });

  it("다른 운영자가 먼저 수정했으면 버전 충돌을 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.patch("/api/ops/support-inquiries/:id/priority", () => mockErrors.versionConflict(9)),
    );
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    await user.selectOptions(screen.getByLabelText("우선순위"), "LOW");
    await user.click(screen.getByRole("button", { name: "우선순위 변경" }));
    expect(await screen.findByText(/다른 운영자가 먼저 수정했습니다/)).toBeTruthy();
  });

  it("If-Match에 현재 버전을 담아 보낸다", async () => {
    const user = userEvent.setup();
    const seen: (string | null)[] = [];
    server.use(
      http.patch("/api/ops/support-inquiries/:id/priority", ({ request }) => {
        seen.push(request.headers.get("If-Match"));
        return mockErrors.versionConflict(3);
      }),
    );
    renderDetail(501);
    await screen.findByText("결제가 두 번 된 것 같습니다.");
    await user.selectOptions(screen.getByLabelText("우선순위"), "LOW");
    await user.click(screen.getByRole("button", { name: "우선순위 변경" }));
    await screen.findByText(/다른 운영자가 먼저 수정했습니다/);
    expect(seen).toEqual(["3"]);
  });

  it("종료된 문의는 우선순위를 바꿀 수 없다", async () => {
    renderDetail(503);
    await screen.findByText("개인정보 열람을 요청합니다.");
    expect((screen.getByLabelText("우선순위") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText("종료된 문의의 우선순위는 바꿀 수 없습니다.")).toBeTruthy();
  });
});

describe("운영자 첨부 올리기", () => {
  function fileInput() {
    return screen.getByLabelText("첨부 파일 선택") as HTMLInputElement;
  }

  it("문의당 5개, 파일당 20MB, PDF·JPG·PNG 제한을 안내한다", async () => {
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    expect(screen.getByText(/문의당 5개까지, 파일당 20MB 이하의 PDF, JPG, PNG만/)).toBeTruthy();
  });

  it("허용하지 않는 형식은 파일 항목 오류로 안내하고 올리지 않는다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.upload(
      fileInput(),
      new File(["x"], "악성.exe", { type: "application/x-msdownload" }),
    );
    expect(screen.getByText(/파일 항목 오류: PDF, JPG, PNG 파일만 올릴 수 있습니다/)).toBeTruthy();
  });

  it("20MB를 넘는 파일은 파일 항목 오류로 안내한다", async () => {
    const user = userEvent.setup();
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    const big = new File(["x"], "큰파일.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    await user.upload(fileInput(), big);
    expect(screen.getByText(/파일 항목 오류: 파일당 20MB 이하만 올릴 수 있습니다/)).toBeTruthy();
  });

  it("파일을 고르지 않고 올리면 선택을 요청한다", async () => {
    const user = userEvent.setup();
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.click(screen.getByRole("button", { name: "첨부 올리기" }));
    expect(screen.getByText(/올릴 파일을 선택해 주세요/)).toBeTruthy();
  });

  it("PDF를 올리면 첨부 목록에 내부 첨부로 추가된다", async () => {
    const user = userEvent.setup();
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.upload(fileInput(), new File(["x"], "새첨부.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "첨부 올리기" }));
    expect(await screen.findByText(/첨부를 올렸습니다/)).toBeTruthy();
    expect(await screen.findByText(/첨부\.pdf/)).toBeTruthy();
  });

  it("서버가 개수 초과를 파일 항목 오류로 돌려주면 그대로 안내한다", async () => {
    const user = userEvent.setup();
    renderDetail(504);
    await screen.findByText("화면이 멈춥니다.");
    await user.upload(fileInput(), new File(["x"], "여섯번째.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "첨부 올리기" }));
    expect(
      await screen.findByText(/파일 항목 오류: 운영자 첨부는 문의당 5개까지 올릴 수 있습니다/),
    ).toBeTruthy();
  });

  it("올리기가 429이면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/support-inquiries/:id/attachments", () => mockErrors.rateLimited(10)),
    );
    renderDetail(502);
    await screen.findByText("심사팀에 재확인을 요청했습니다.");
    await user.upload(fileInput(), new File(["x"], "새첨부.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "첨부 올리기" }));
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
      http.get("/api/ops/support-inquiries/:id", () => mockErrors.server(), { once: true }),
    );
    renderDetail(502);
    await user.click(await screen.findByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByText("인증 서류를 다시 제출했는데 반영이 안 됩니다.")).toBeTruthy();
  });

  it("서버가 403을 주면 접근 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/support-inquiries/:id", () => mockErrors.forbidden()));
    renderDetail(502);
    expect(await screen.findByText("접근 권한이 없습니다")).toBeTruthy();
  });

  it("지원 역할이 없으면 접근 불가 안내만 보이고 답변 폼이 없다", () => {
    renderDetail(502, ["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("form", { name: "공개 답변 작성" })).toBeNull();
  });
});
