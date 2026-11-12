// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { server } from "@/mocks/server";
import {
  EMPTY_PAGE,
  installSystemTestLifecycle,
  isDisabled,
  renderWithMonitor,
} from "../system-common/system-testing";
import { AuthorityRequestsScreen } from "./authority-screen";
import {
  EMPTY_AUTHORITY_CREATE,
  EMPTY_CLOSE_INPUT,
  closeAvailability,
  toAuthorityCreateBody,
  toCloseBody,
  validateAuthorityCreate,
  validateClose,
} from "./authority-model";
import type { OpsRole } from "../model/roles";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/authority-requests",
  useSearchParams: () => new URLSearchParams(),
}));

installSystemTestLifecycle();

async function renderRequests(roles: OpsRole[] = ["PRIVACY", "SECURITY_ADMIN"]) {
  renderWithMonitor(<AuthorityRequestsScreen />, roles);
  await screen.findByRole("button", { name: "요청 72 종결" });
}

async function openClose(requestId: number, roles: OpsRole[] = ["PRIVACY", "SECURITY_ADMIN"]) {
  await renderRequests(roles);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: `요청 ${requestId} 종결` }));
  return { user, dialog: screen.getByRole("dialog") };
}

function chooseDecision(dialog: HTMLElement, decision: string, notice = "NOTIFIED") {
  fireEvent.change(within(dialog).getByRole("combobox", { name: /^제공 결정/ }), {
    target: { value: decision },
  });
  fireEvent.change(within(dialog).getByRole("combobox", { name: /^사무소 통지 검토 결과/ }), {
    target: { value: notice },
  });
}

function fillProvided(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText("제공한 자료의 범위"), {
    target: { value: "가입 정보" },
  });
  fireEvent.change(within(dialog).getByLabelText("제공 시각 날짜"), {
    target: { value: "2026-11-10" },
  });
  fireEvent.change(within(dialog).getByLabelText("제공 시각 시각"), { target: { value: "15:00" } });
}

function fillCreate() {
  fireEvent.change(screen.getByLabelText("요청을 받은 시각 날짜"), {
    target: { value: "2026-11-09" },
  });
  fireEvent.change(screen.getByLabelText("요청을 받은 시각 시각"), { target: { value: "09:00" } });
  fireEvent.change(screen.getByRole("combobox", { name: /^기관 종류/ }), {
    target: { value: "COURT" },
  });
  fireEvent.change(screen.getByLabelText(/^기관 이름/), { target: { value: "예시 법원" } });
  fireEvent.change(screen.getByLabelText("문서 번호"), { target: { value: "2026-1234" } });
  fireEvent.change(screen.getByLabelText("법적 근거 메모"), {
    target: { value: "검토 대상 법령 확인" },
  });
  fireEvent.change(screen.getByLabelText("대상 사무소 번호"), { target: { value: "12" } });
  fireEvent.change(screen.getByLabelText("요청 범위"), { target: { value: "가입 정보" } });
}

describe("수사기관 요청 모델", () => {
  it("등록 검증은 필수 입력을 확인한다", () => {
    const errors = validateAuthorityCreate(EMPTY_AUTHORITY_CREATE);
    expect(errors.receivedDate).toBeTruthy();
    expect(errors.agencyType).toBeTruthy();
    expect(errors.agencyName).toBeTruthy();
    expect(errors.legalBasisNote).toBeTruthy();
    expect(errors.requestedItems).toBeTruthy();
    expect(errors.documentReference).toBeUndefined();
  });

  it("기관 이름 200자와 문서 번호 100자를 넘으면 오류다", () => {
    const base = {
      ...EMPTY_AUTHORITY_CREATE,
      receivedDate: "2026-11-09",
      receivedTime: "09:00",
      agencyType: "COURT",
      legalBasisNote: "근거",
      requestedItems: "범위",
    };
    expect(
      validateAuthorityCreate({ ...base, agencyName: "가".repeat(201) }).agencyName,
    ).toBeTruthy();
    expect(
      validateAuthorityCreate({ ...base, agencyName: "가", documentReference: "1".repeat(101) })
        .documentReference,
    ).toBeTruthy();
    expect(validateAuthorityCreate({ ...base, agencyName: "가".repeat(200) })).toEqual({});
  });

  it("종결 검증은 제공 결정이면 범위와 시각을 필수로 본다", () => {
    const errors = validateClose({
      ...EMPTY_CLOSE_INPUT,
      decision: "PROVIDED",
      officeNoticeStatus: "NOTIFIED",
    });
    expect(errors.providedItems).toBeTruthy();
    expect(errors.providedDate).toBeTruthy();
    expect(
      validateClose({ ...EMPTY_CLOSE_INPUT, decision: "REFUSED", officeNoticeStatus: "NOTIFIED" }),
    ).toEqual({});
  });

  it("사무소 통지 검토 결과는 검토 전 값을 고를 수 없다", () => {
    expect(
      validateClose({
        ...EMPTY_CLOSE_INPUT,
        decision: "REFUSED",
        officeNoticeStatus: "NOT_REVIEWED",
      }).officeNoticeStatus,
    ).toBeTruthy();
  });

  it("거절 종결 본문에는 제공 범위와 시각이 없다", () => {
    expect(
      toCloseBody({
        ...EMPTY_CLOSE_INPUT,
        decision: "REFUSED",
        officeNoticeStatus: "NOT_ALLOWED",
        closeNote: " 메모 ",
      }),
    ).toEqual({ decision: "REFUSED", officeNoticeStatus: "NOT_ALLOWED", closeNote: "메모" });
  });

  it("등록 본문은 비운 선택 값을 뺀다", () => {
    expect(
      toAuthorityCreateBody({
        ...EMPTY_AUTHORITY_CREATE,
        receivedDate: "2026-11-09",
        receivedTime: "09:00",
        agencyType: "COURT",
        agencyName: "법원",
        legalBasisNote: "근거",
        requestedItems: "범위",
      }),
    ).toEqual({
      receivedAt: "2026-11-09T09:00:00+09:00",
      agencyType: "COURT",
      agencyName: "법원",
      legalBasisNote: "근거",
      requestedItems: "범위",
    });
  });

  it("제공 결정은 보안관리자이고 기록자와 달라야 종결할 수 있다", () => {
    expect(closeAvailability("REFUSED", { isSecurityAdmin: false, isSelfRecorded: true })).toBe(
      "OK",
    );
    expect(closeAvailability("PROVIDED", { isSecurityAdmin: false, isSelfRecorded: false })).toBe(
      "NO_SECURITY_ADMIN",
    );
    expect(
      closeAvailability("PARTIALLY_PROVIDED", { isSecurityAdmin: true, isSelfRecorded: true }),
    ).toBe("SELF_RECORDED");
    expect(closeAvailability("PROVIDED", { isSecurityAdmin: true, isSelfRecorded: false })).toBe(
      "OK",
    );
  });
});

describe("수사기관 요청 목록", () => {
  it("기관과 문서 번호와 제공 결정과 통지 검토를 보여준다", async () => {
    await renderRequests();
    const table = screen.getByRole("table", { name: "자료 요청 목록" });
    expect(within(table).getAllByText("예시 수사기관").length).toBe(3);
    expect(within(table).getByText("문서 71")).toBeTruthy();
    expect(within(table).getAllByText("결정 전").length).toBe(2);
    expect(within(table).getByText("거절")).toBeTruthy();
    expect(within(table).getByText("통지 불가")).toBeTruthy();
    expect(within(table).getAllByText("미종결").length).toBe(2);
  });

  it("출시 후 확장과 변호사 검토 전 초안 안내를 둔다", async () => {
    await renderRequests();
    expect(screen.getByText(/출시 후 확장 기능입니다\. 변호사 검토 전 초안이며/)).toBeTruthy();
  });

  it("이미 종결한 요청의 종결 버튼은 비활성이다", async () => {
    await renderRequests();
    expect(isDisabled(screen.getByRole("button", { name: "요청 73 종결" }))).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: "요청 72 종결" }))).toBe(false);
  });

  it("로딩 중에는 표를 바쁨 상태로 표시한다", async () => {
    server.use(
      http.get("/api/ops/authority-requests", async () => {
        await delay("infinite");
        return HttpResponse.json(EMPTY_PAGE);
      }),
    );
    renderWithMonitor(<AuthorityRequestsScreen />, ["PRIVACY"]);
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).not.toBeNull());
  });

  it("목록이 비면 안내한다", async () => {
    server.use(http.get("/api/ops/authority-requests", () => HttpResponse.json(EMPTY_PAGE)));
    renderWithMonitor(<AuthorityRequestsScreen />, ["PRIVACY"]);
    expect(await screen.findByText("기록된 자료 요청이 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/ops/authority-requests", () => {
        calls += 1;
        return calls === 1 ? mockErrors.server() : HttpResponse.json(EMPTY_PAGE);
      }),
    );
    renderWithMonitor(<AuthorityRequestsScreen />, ["PRIVACY"]);
    await userEvent.setup().click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("기록된 자료 요청이 없습니다.")).toBeTruthy();
  });

  it("목록이 403이면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/authority-requests", () => mockErrors.forbidden()));
    renderWithMonitor(<AuthorityRequestsScreen />, ["PRIVACY"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("목록이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.get("/api/ops/authority-requests", () => mockErrors.rateLimited(18)));
    renderWithMonitor(<AuthorityRequestsScreen />, ["PRIVACY"]);
    expect(await screen.findByText(/18초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("개인정보담당이나 보안관리자가 아니면 접근 불가 안내를 보인다", () => {
    renderWithMonitor(<AuthorityRequestsScreen />, ["REVIEW"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("보안관리자는 목록과 종결만 쓰고 접수 기록 폼은 보지 않는다", async () => {
    renderWithMonitor(<AuthorityRequestsScreen />, ["SECURITY_ADMIN"]);
    expect(await screen.findByRole("button", { name: "요청 72 종결" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "요청 기록" })).toBeNull();
  });

  it("미종결만 보기 필터를 적용한다", async () => {
    await renderRequests();
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("미종결만"));
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "요청 73 종결" })).toBeNull());
    expect(screen.getByRole("button", { name: "요청 71 종결" })).toBeTruthy();
  });

  it("제공 결정 필터를 적용한다", async () => {
    await renderRequests();
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText("제공 결정")[0] as HTMLElement, "REFUSED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "요청 72 종결" })).toBeNull());
    expect(screen.getByRole("button", { name: "요청 73 종결" })).toBeTruthy();
  });
});

describe("자료 요청 기록", () => {
  it("필수 입력이 비면 기록하지 않고 오류를 보인다", async () => {
    const calls = vi.fn();
    server.use(
      http.post("/api/ops/authority-requests", () => {
        calls();
        return mockErrors.server();
      }),
    );
    await renderRequests();
    await userEvent.setup().click(screen.getByRole("button", { name: "요청 기록" }));
    expect(await screen.findByText("요청을 받은 시각을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("기관 종류를 선택해 주세요.")).toBeTruthy();
    expect(screen.getByText("기관 이름을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("확인한 법적 근거 메모를 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("요청받은 자료의 범위를 입력해 주세요.")).toBeTruthy();
    expect(calls).not.toHaveBeenCalled();
  });

  it("기록하면 목록에 나타나고 기록자 정보를 모의 서버가 지정한다", async () => {
    await renderRequests();
    fillCreate();
    await userEvent.setup().click(screen.getByRole("button", { name: "요청 기록" }));
    expect(await screen.findByText("요청 74를 기록했습니다.")).toBeTruthy();
    expect(await screen.findByText("예시 법원")).toBeTruthy();
  });

  it("기록 본문에 서울 시각과 선택 값을 담는다", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/authority-requests", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            requestId: 80,
            receivedAt: "2026-11-09T09:00:00+09:00",
            agencyType: "COURT",
            agencyName: "예시 법원",
            documentReference: "2026-1234",
            legalBasisNote: "검토 대상 법령 확인",
            targetOfficeId: 12,
            targetUserId: null,
            requestedItems: "가입 정보",
            decision: "PENDING",
            providedItems: null,
            providedAt: null,
            officeNoticeStatus: "NOT_REVIEWED",
            recordedByOperatorId: 1,
            approvedByOperatorId: null,
            closedAt: null,
            retentionUntil: null,
          },
          { status: 201 },
        );
      }),
    );
    await renderRequests();
    fillCreate();
    await userEvent.setup().click(screen.getByRole("button", { name: "요청 기록" }));
    await screen.findByText("요청 80를 기록했습니다.");
    expect(body).toEqual({
      receivedAt: "2026-11-09T09:00:00+09:00",
      agencyType: "COURT",
      agencyName: "예시 법원",
      documentReference: "2026-1234",
      legalBasisNote: "검토 대상 법령 확인",
      targetOfficeId: 12,
      requestedItems: "가입 정보",
    });
  });

  it("기록이 400이면 서버 입력 오류를 보인다", async () => {
    server.use(
      http.post("/api/ops/authority-requests", () =>
        mockErrors.validation([{ field: "agencyName", message: "기관 이름을 확인해 주세요." }]),
      ),
    );
    await renderRequests();
    fillCreate();
    await userEvent.setup().click(screen.getByRole("button", { name: "요청 기록" }));
    expect(await screen.findByText(/기관 이름을 확인해 주세요/)).toBeTruthy();
  });

  it("기록이 403이면 권한 안내를 보인다", async () => {
    server.use(http.post("/api/ops/authority-requests", () => mockErrors.forbidden()));
    await renderRequests();
    fillCreate();
    await userEvent.setup().click(screen.getByRole("button", { name: "요청 기록" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("기록이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.post("/api/ops/authority-requests", () => mockErrors.rateLimited(21)));
    await renderRequests();
    fillCreate();
    await userEvent.setup().click(screen.getByRole("button", { name: "요청 기록" }));
    expect(await screen.findByText(/21초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });
});

describe("종결", () => {
  it("종결은 되돌릴 수 없고 감사 로그에 남는다는 안내를 둔다", async () => {
    const { dialog } = await openClose(72);
    expect(
      within(dialog).getByText(/종결하면 되돌릴 수 없고 기록은 삭제 예정일까지 보관됩니다/),
    ).toBeTruthy();
  });

  it("필수 선택이 비면 종결하지 않고 오류를 보인다", async () => {
    const { user, dialog } = await openClose(72);
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await within(dialog).findByText("제공 결정을 선택해 주세요.")).toBeTruthy();
    expect(within(dialog).getByText("사무소 통지 검토 결과를 선택해 주세요.")).toBeTruthy();
  });

  it("거절로 종결하면 삭제 예정일을 안내한다", async () => {
    const { user, dialog } = await openClose(72);
    chooseDecision(dialog, "REFUSED", "NOT_ALLOWED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(
      await screen.findByText(/요청 72를 종결했습니다. 기록 삭제 예정일은 .+입니다/),
    ).toBeTruthy();
    expect(
      (await screen.findAllByText(/^\d{4}\. ?\d{1,2}\. ?\d{1,2}\.?$|^\d{4}-\d{2}-\d{2}$/)).length,
    ).toBeGreaterThan(0);
  });

  it("종결한 요청은 목록에서 종결 버튼이 비활성이 된다", async () => {
    const { user, dialog } = await openClose(72);
    chooseDecision(dialog, "FORWARDED_TO_OFFICE", "DEFERRED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    await screen.findByText(/요청 72를 종결했습니다/);
    await waitFor(() =>
      expect(isDisabled(screen.getByRole("button", { name: "요청 72 종결" }))).toBe(true),
    );
  });

  it("거절 종결은 보안관리자 역할이 없는 개인정보담당도 할 수 있다", async () => {
    const { user, dialog } = await openClose(72, ["PRIVACY"]);
    chooseDecision(dialog, "REFUSED", "NOT_ALLOWED");
    expect(isDisabled(within(dialog).getByRole("button", { name: "종결" }))).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await screen.findByText(/요청 72를 종결했습니다/)).toBeTruthy();
  });

  it("제공 결정은 보안관리자 역할이 없으면 안내하고 버튼을 비활성으로 둔다", async () => {
    const { dialog } = await openClose(72, ["PRIVACY"]);
    chooseDecision(dialog, "PROVIDED");
    expect(
      within(dialog).getByText("제공 결정은 기록자와 다른 보안관리자만 종결할 수 있습니다."),
    ).toBeTruthy();
    expect(isDisabled(within(dialog).getByRole("button", { name: "종결" }))).toBe(true);
  });

  it("제공 결정은 제공 범위와 시각을 필수로 요구한다", async () => {
    const { user, dialog } = await openClose(72);
    chooseDecision(dialog, "PROVIDED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await within(dialog).findByText("제공한 자료의 범위를 입력해 주세요.")).toBeTruthy();
    expect(within(dialog).getByText("제공 시각을 입력해 주세요.")).toBeTruthy();
  });

  it("기록자와 다른 보안관리자는 제공 결정으로 종결한다", async () => {
    let body: Record<string, unknown> = {};
    const { user, dialog } = await openClose(72);
    server.use(
      http.post("/api/ops/authority-requests/:id/close", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          requestId: 72,
          receivedAt: "2026-11-05T09:00:00+09:00",
          agencyType: "INVESTIGATION",
          agencyName: "예시 수사기관",
          documentReference: null,
          legalBasisNote: "근거",
          targetOfficeId: null,
          targetUserId: null,
          requestedItems: "범위",
          decision: "PROVIDED",
          providedItems: "가입 정보",
          providedAt: "2026-11-10T15:00:00+09:00",
          officeNoticeStatus: "NOTIFIED",
          recordedByOperatorId: 3,
          approvedByOperatorId: 1,
          closedAt: "2026-11-10T15:10:00+09:00",
          retentionUntil: "2027-11-10",
        });
      }),
    );
    chooseDecision(dialog, "PROVIDED", "NOTIFIED");
    fillProvided(dialog);
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await screen.findByText(/요청 72를 종결했습니다. 기록 삭제 예정일은/)).toBeTruthy();
    expect(body).toEqual({
      decision: "PROVIDED",
      officeNoticeStatus: "NOTIFIED",
      providedItems: "가입 정보",
      providedAt: "2026-11-10T15:00:00+09:00",
    });
  });

  it("목록의 기록자가 본인이면 제공 결정을 처음부터 막는다", async () => {
    const { dialog } = await openClose(71);
    chooseDecision(dialog, "PROVIDED");
    fillProvided(dialog);
    expect(isDisabled(within(dialog).getByRole("button", { name: "종결" }))).toBe(true);
    expect(
      within(dialog).getByText(/본인이 기록한 요청의 제공 결정은 직접 승인할 수 없습니다/),
    ).toBeTruthy();
  });

  it("서버가 본인 승인으로 거절하면 안내하고 버튼을 비활성으로 바꾼다", async () => {
    const { user, dialog } = await openClose(72);
    server.use(
      http.post("/api/ops/authority-requests/:id/close", () =>
        errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "본인 승인"),
      ),
    );
    chooseDecision(dialog, "PROVIDED");
    fillProvided(dialog);
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(
      await within(dialog).findByText("본인이 요청하거나 수혜하는 건은 직접 승인할 수 없습니다."),
    ).toBeTruthy();
    await waitFor(() =>
      expect(isDisabled(within(dialog).getByRole("button", { name: "종결" }))).toBe(true),
    );
  });

  it("이 화면에서 직접 기록한 요청은 처음부터 제공 결정을 막는다", async () => {
    const calls = vi.fn();
    await renderRequests();
    fillCreate();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "요청 기록" }));
    await screen.findByText("요청 74를 기록했습니다.");
    server.use(
      http.post("/api/ops/authority-requests/:id/close", () => {
        calls();
        return mockErrors.server();
      }),
    );
    await user.click(await screen.findByRole("button", { name: "요청 74 종결" }));
    const dialog = screen.getByRole("dialog");
    chooseDecision(dialog, "PARTIALLY_PROVIDED");
    expect(
      within(dialog).getByText(/본인이 기록한 요청의 제공 결정은 직접 승인할 수 없습니다/),
    ).toBeTruthy();
    expect(isDisabled(within(dialog).getByRole("button", { name: "종결" }))).toBe(true);
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(calls).not.toHaveBeenCalled();
  });

  it("본인이 기록한 요청도 거절로는 종결할 수 있다", async () => {
    const { user, dialog } = await openClose(71);
    chooseDecision(dialog, "REFUSED", "NOT_ALLOWED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await screen.findByText(/요청 71를 종결했습니다/)).toBeTruthy();
  });

  it("이미 종결된 요청이면 409 안내를 보인다", async () => {
    server.use(
      http.post("/api/ops/authority-requests/:id/close", () =>
        errorResponse(409, "INVALID_TRANSITION", "이미 종결"),
      ),
    );
    const { user, dialog } = await openClose(72);
    chooseDecision(dialog, "REFUSED", "NOT_ALLOWED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("종결 대상이 없으면 404 안내를 보인다", async () => {
    server.use(http.post("/api/ops/authority-requests/:id/close", () => mockErrors.notFound()));
    const { user, dialog } = await openClose(72);
    chooseDecision(dialog, "REFUSED", "NOT_ALLOWED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await within(dialog).findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("종결이 403이면 권한 안내를 보인다", async () => {
    server.use(http.post("/api/ops/authority-requests/:id/close", () => mockErrors.forbidden()));
    const { user, dialog } = await openClose(72);
    chooseDecision(dialog, "REFUSED", "NOT_ALLOWED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(
      await within(dialog).findByText("이 처리를 할 수 있는 운영 역할이 아닙니다."),
    ).toBeTruthy();
  });

  it("종결이 400이면 서버 입력 오류를 보인다", async () => {
    server.use(
      http.post("/api/ops/authority-requests/:id/close", () =>
        mockErrors.validation([{ field: "decision", message: "결정 값이 올바르지 않습니다." }]),
      ),
    );
    const { user, dialog } = await openClose(72);
    chooseDecision(dialog, "REFUSED", "NOT_ALLOWED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await within(dialog).findByText(/결정 값이 올바르지 않습니다/)).toBeTruthy();
  });

  it("종결이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(
      http.post("/api/ops/authority-requests/:id/close", () => mockErrors.rateLimited(14)),
    );
    const { user, dialog } = await openClose(72);
    chooseDecision(dialog, "REFUSED", "NOT_ALLOWED");
    await user.click(within(dialog).getByRole("button", { name: "종결" }));
    expect(await within(dialog).findByText(/14초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("닫기를 누르면 요청 없이 대화상자가 닫힌다", async () => {
    const { user, dialog } = await openClose(72);
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
