// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { server } from "@/mocks/server";
import {
  EMPTY_PAGE,
  installSystemTestLifecycle,
  isDisabled,
  renderWithMonitor,
} from "../system-common/system-testing";
import { RetentionRulesScreen } from "./retention-rules-screen";
import { canRetryKakao, toRuleBody, validateRuleEdit } from "./retention-model";
import type { KakaoEvent } from "./retention-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/retention-rules",
  useSearchParams: () => new URLSearchParams(),
}));

installSystemTestLifecycle();

const CODE = "GUEST_INPUT_AFTER_APPROVAL_END";

async function renderRules(roles: Parameters<typeof renderWithMonitor>[1] = ["PRIVACY"]) {
  renderWithMonitor(<RetentionRulesScreen />, roles);
  await screen.findByText(CODE);
}

async function openEdit(code = CODE) {
  await renderRules();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: `규칙 ${code} 수정` }));
  return { user, dialog: screen.getByRole("dialog") };
}

async function openKakao() {
  renderWithMonitor(<RetentionRulesScreen />, ["PRIVACY"]);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("tab", { name: "카카오 연결 끊기" }));
  await screen.findByText("KAKAO_TIMEOUT");
  return user;
}

function kakao(patch: Partial<KakaoEvent>): KakaoEvent {
  return {
    eventId: 1,
    direction: "OUTBOUND_CALL",
    status: "PENDING",
    attemptCount: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    referrerType: null,
    userId: 1,
    occurredAt: "2026-11-10T09:00:00+09:00",
    completedAt: null,
    ...patch,
  };
}

describe("보관 규칙 모델", () => {
  it("값 수정은 일수와 근거와 사유를 필수로 본다", () => {
    const errors = validateRuleEdit({
      retentionDays: "",
      basisNote: "",
      status: "ASSUMPTION",
      changeReason: "",
    });
    expect(errors.retentionDays).toBeTruthy();
    expect(errors.basisNote).toBeTruthy();
    expect(errors.changeReason).toBeTruthy();
  });

  it("보관 일수는 1 이상의 정수만 허용한다", () => {
    const base = { basisNote: "근거", status: "ASSUMPTION", changeReason: "사유" };
    expect(validateRuleEdit({ ...base, retentionDays: "0" }).retentionDays).toBeTruthy();
    expect(validateRuleEdit({ ...base, retentionDays: "-1" }).retentionDays).toBeTruthy();
    expect(validateRuleEdit({ ...base, retentionDays: "1.5" }).retentionDays).toBeTruthy();
    expect(validateRuleEdit({ ...base, retentionDays: "1" }).retentionDays).toBeUndefined();
  });

  it("수정 본문은 숫자 일수와 사유를 담는다", () => {
    expect(
      toRuleBody({
        retentionDays: " 120 ",
        basisNote: " 근거 ",
        status: "LAWYER_CONFIRMED",
        changeReason: " 사유 ",
      }),
    ).toEqual({
      retentionDays: 120,
      basisNote: "근거",
      status: "LAWYER_CONFIRMED",
      changeReason: "사유",
    });
  });

  it("호출 작업의 대기와 재시도 상태만 다시 시도할 수 있다", () => {
    expect(canRetryKakao(kakao({ status: "PENDING" }))).toBe(true);
    expect(canRetryKakao(kakao({ status: "FAILED_RETRYING" }))).toBe(true);
    expect(canRetryKakao(kakao({ status: "SUCCEEDED" }))).toBe(false);
    expect(canRetryKakao(kakao({ status: "ABANDONED" }))).toBe(false);
    expect(canRetryKakao(kakao({ direction: "INBOUND_WEBHOOK", status: "PENDING" }))).toBe(false);
  });
});

describe("보관 기간 규칙 표", () => {
  it("규칙 코드와 데이터군과 일수와 기산점과 확인 상태를 보여준다", async () => {
    await renderRules();
    expect(screen.getByText("비회원 링크 입력 데이터와 승인자 개인정보")).toBeTruthy();
    expect(screen.getByText("90일")).toBeTruthy();
    expect(screen.getByText("승인 종료")).toBeTruthy();
    expect(screen.getAllByText("내부 권장안").length).toBeGreaterThan(0);
    expect(screen.getByText("변호사 확인")).toBeTruthy();
    expect(screen.getByText("자문 확인")).toBeTruthy();
  });

  it("변호사 검토 전 초안 안내를 둔다", async () => {
    await renderRules();
    expect(
      screen.getByText(/변호사 검토 전 초안이며 법적 효력과 적합성은 검토 뒤 확정합니다/),
    ).toBeTruthy();
  });

  it("목록이 비면 안내한다", async () => {
    server.use(http.get("/api/ops/retention-rules", () => HttpResponse.json({ items: [] })));
    renderWithMonitor(<RetentionRulesScreen />, ["PRIVACY"]);
    expect(await screen.findByText("등록된 보관 기간 규칙이 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/ops/retention-rules", () => {
        calls += 1;
        return calls === 1 ? mockErrors.server() : HttpResponse.json({ items: [] });
      }),
    );
    renderWithMonitor(<RetentionRulesScreen />, ["PRIVACY"]);
    await userEvent.setup().click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("등록된 보관 기간 규칙이 없습니다.")).toBeTruthy();
  });

  it("목록이 403이면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/retention-rules", () => mockErrors.forbidden()));
    renderWithMonitor(<RetentionRulesScreen />, ["PRIVACY"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("목록이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.get("/api/ops/retention-rules", () => mockErrors.rateLimited(33)));
    renderWithMonitor(<RetentionRulesScreen />, ["PRIVACY"]);
    expect(await screen.findByText(/33초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("개인정보담당이 아니면 접근 불가 안내를 보인다", () => {
    renderWithMonitor(<RetentionRulesScreen />, ["OPS"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });
});

describe("보관 규칙 수정", () => {
  it("변경 사유가 비면 저장하지 않고 오류를 보인다", async () => {
    const calls = vi.fn();
    server.use(
      http.put("/api/ops/retention-rules/:code", () => {
        calls();
        return mockErrors.server();
      }),
    );
    const { user, dialog } = await openEdit();
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("변경 사유를 입력해 주세요.")).toBeTruthy();
    expect(calls).not.toHaveBeenCalled();
  });

  it("보관 일수가 0이면 오류를 보인다", async () => {
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText(/^보관 일수/), { target: { value: "0" } });
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText("보관 일수는 1 이상의 정수로 입력해 주세요."),
    ).toBeTruthy();
  });

  it("근거 메모를 비우면 오류를 보인다", async () => {
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("근거 메모"), { target: { value: "" } });
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("근거 메모를 입력해 주세요.")).toBeTruthy();
  });

  it("적용 시점과 감사 기록 안내를 둔다", async () => {
    const { dialog } = await openEdit();
    expect(within(dialog).getByText(/이미 정한 삭제 예정일은 다시 계산하지 않습니다/)).toBeTruthy();
    expect(within(dialog).getByText(/변경 사유는 감사 로그에 기록됩니다/)).toBeTruthy();
  });

  it("저장하면 If-Match에 현재 버전을 보내고 표를 갱신한다", async () => {
    let ifMatch: string | null = null;
    let body: Record<string, unknown> = {};
    server.use(
      http.put("/api/ops/retention-rules/:code", async ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ruleCode: CODE,
          dataGroupLabel: "비회원 링크 입력 데이터와 승인자 개인정보",
          retentionDays: 60,
          anchorEvent: "APPROVAL_END",
          basisNote: "변호사 확인 반영",
          status: "LAWYER_CONFIRMED",
          effectiveFrom: "2026-12-01",
          version: 2,
        });
      }),
    );
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText(/^보관 일수/), { target: { value: "60" } });
    fireEvent.change(within(dialog).getByLabelText("근거 메모"), {
      target: { value: "변호사 확인 반영" },
    });
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "확인 상태" }),
      "LAWYER_CONFIRMED",
    );
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), {
      target: { value: "변호사 답변 반영" },
    });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText(`규칙 ${CODE}의 값을 저장했습니다.`)).toBeTruthy();
    expect(ifMatch).toBe("1");
    expect(body).toEqual({
      retentionDays: 60,
      basisNote: "변호사 확인 반영",
      status: "LAWYER_CONFIRMED",
      changeReason: "변호사 답변 반영",
    });
  });

  it("모의 서버에 저장하면 새 일수가 표에 나타난다", async () => {
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText(/^보관 일수/), { target: { value: "45" } });
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("45일")).toBeTruthy();
  });

  it("다른 운영자가 먼저 수정했으면 409 안내와 최신 값 불러오기를 보인다", async () => {
    server.use(
      http.put("/api/ops/retention-rules/:code", () =>
        errorResponse(409, "VERSION_CONFLICT", "충돌", { currentVersion: 5 }),
      ),
    );
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/다른 운영자가 먼저 수정했습니다/)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "최신 값 불러오기" })).toBeTruthy();
  });

  it("최신 값 불러오기를 누르면 입력이 서버 값으로 돌아간다", async () => {
    const { user, dialog } = await openEdit();
    server.use(
      http.put("/api/ops/retention-rules/:code", () =>
        errorResponse(409, "VERSION_CONFLICT", "충돌", { currentVersion: 5 }),
      ),
    );
    fireEvent.change(within(dialog).getByLabelText(/^보관 일수/), { target: { value: "10" } });
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    await user.click(await within(dialog).findByRole("button", { name: "최신 값 불러오기" }));
    expect((within(dialog).getByLabelText(/^보관 일수/) as HTMLInputElement).value).toBe("90");
    expect(within(dialog).queryByRole("button", { name: "최신 값 불러오기" })).toBeNull();
  });

  it("버전이 어긋난 요청은 모의 서버도 409로 거절한다", async () => {
    const { user, dialog } = await openEdit();
    server.use(http.put("/api/ops/retention-rules/:code", () => mockErrors.versionConflict(3)));
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText(/최신 내용을 불러온 뒤 다시 시도해 주세요/),
    ).toBeTruthy();
  });

  it("저장이 404이면 안내한다", async () => {
    server.use(http.put("/api/ops/retention-rules/:code", () => mockErrors.notFound()));
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("저장이 403이면 권한 안내를 보인다", async () => {
    server.use(http.put("/api/ops/retention-rules/:code", () => mockErrors.forbidden()));
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText("이 처리를 할 수 있는 운영 역할이 아닙니다."),
    ).toBeTruthy();
  });

  it("저장이 400이면 서버 입력 오류를 보인다", async () => {
    server.use(
      http.put("/api/ops/retention-rules/:code", () =>
        mockErrors.validation([{ field: "retentionDays", message: "범위를 벗어났습니다." }]),
      ),
    );
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/범위를 벗어났습니다/)).toBeTruthy();
  });

  it("저장이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.put("/api/ops/retention-rules/:code", () => mockErrors.rateLimited(7)));
    const { user, dialog } = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("변경 사유"), { target: { value: "사유" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/7초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });
});

describe("카카오 연결 끊기 탭", () => {
  it("방향과 상태와 시도 횟수와 마지막 오류와 다음 시도를 보여준다", async () => {
    await openKakao();
    expect(screen.getAllByText("호출").length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole("table", { name: "카카오 연결 끊기 사건" })).getByText("재시도 중"),
    ).toBeTruthy();
    expect(screen.getByText("3회")).toBeTruthy();
    expect(screen.getByText("KAKAO_TIMEOUT")).toBeTruthy();
    expect(screen.getAllByText("수신").length).toBeGreaterThan(1);
  });

  it("식별자 원문과 암호문 열이 없다", async () => {
    server.use(
      http.get("/api/ops/kakao-unlink-events", () =>
        HttpResponse.json({
          items: [
            {
              ...kakao({ eventId: 7, status: "FAILED_RETRYING", lastErrorCode: "KAKAO_TIMEOUT" }),
              kakaoIdCiphertext: "암호문ABC",
            },
          ],
          page: 0,
          size: 25,
          totalElements: 1,
        }),
      ),
    );
    await openKakao();
    expect(document.body.textContent).not.toContain("암호문ABC");
    expect(screen.getByText(/식별자 원문과 암호문은 표시하지 않습니다/)).toBeTruthy();
  });

  it("대기와 재시도 상태의 호출 작업에만 다시 시도 버튼이 있다", async () => {
    await openKakao();
    expect(screen.getByRole("button", { name: "사건 91 다시 시도" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "사건 92 다시 시도" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "사건 93 다시 시도" })).toBeNull();
    expect(screen.queryByRole("button", { name: "사건 94 다시 시도" })).toBeNull();
    expect(screen.queryByRole("button", { name: "사건 95 다시 시도" })).toBeNull();
  });

  it("다시 시도하면 예약 안내를 보인다", async () => {
    const user = await openKakao();
    await user.click(screen.getByRole("button", { name: "사건 91 다시 시도" }));
    expect(await screen.findByText(/사건 91를 다시 시도하도록 예약했습니다/)).toBeTruthy();
    const table = screen.getByRole("table", { name: "카카오 연결 끊기 사건" });
    await waitFor(() => expect(within(table).queryByText("재시도 중")).toBeNull());
  });

  it("다시 시도가 409이면 상태 안내를 보인다", async () => {
    server.use(
      http.post("/api/ops/kakao-unlink-events/:id/retry", () =>
        errorResponse(409, "INVALID_TRANSITION", "상태 변경"),
      ),
    );
    const user = await openKakao();
    await user.click(screen.getByRole("button", { name: "사건 91 다시 시도" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("다시 시도가 404이면 안내한다", async () => {
    server.use(http.post("/api/ops/kakao-unlink-events/:id/retry", () => mockErrors.notFound()));
    const user = await openKakao();
    await user.click(screen.getByRole("button", { name: "사건 91 다시 시도" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("다시 시도가 403이면 권한 안내를 보인다", async () => {
    server.use(http.post("/api/ops/kakao-unlink-events/:id/retry", () => mockErrors.forbidden()));
    const user = await openKakao();
    await user.click(screen.getByRole("button", { name: "사건 91 다시 시도" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("다시 시도가 429이면 기다릴 시간을 안내한다", async () => {
    server.use(
      http.post("/api/ops/kakao-unlink-events/:id/retry", () => mockErrors.rateLimited(11)),
    );
    const user = await openKakao();
    await user.click(screen.getByRole("button", { name: "사건 91 다시 시도" }));
    expect(await screen.findByText(/11초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("방향 필터를 적용한다", async () => {
    const user = await openKakao();
    await user.selectOptions(screen.getByLabelText("방향"), "INBOUND_WEBHOOK");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("KAKAO_TIMEOUT")).toBeNull());
    expect(screen.getByText("UNLINK_FROM_KAKAO")).toBeTruthy();
  });

  it("상태 필터를 적용한다", async () => {
    const user = await openKakao();
    await user.selectOptions(screen.getByLabelText("상태"), "ABANDONED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("KAKAO_TIMEOUT")).toBeNull());
    expect(screen.getByText("KAKAO_REJECTED")).toBeTruthy();
  });

  it("목록이 비면 안내한다", async () => {
    server.use(http.get("/api/ops/kakao-unlink-events", () => HttpResponse.json(EMPTY_PAGE)));
    renderWithMonitor(<RetentionRulesScreen />, ["PRIVACY"]);
    await userEvent.setup().click(await screen.findByRole("tab", { name: "카카오 연결 끊기" }));
    expect(await screen.findByText("조건에 맞는 사건이 없습니다.")).toBeTruthy();
  });

  it("목록이 서버 오류이면 다시 시도할 수 있다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/ops/kakao-unlink-events", () => {
        calls += 1;
        return calls === 1 ? mockErrors.server() : HttpResponse.json(EMPTY_PAGE);
      }),
    );
    renderWithMonitor(<RetentionRulesScreen />, ["PRIVACY"]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: "카카오 연결 끊기" }));
    await user.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("조건에 맞는 사건이 없습니다.")).toBeTruthy();
    expect(isDisabled(screen.getByRole("button", { name: "조회" }))).toBe(false);
  });
});
