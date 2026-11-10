// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockPrivacy } from "@/mocks/handlers/ops-privacy";
import { markMockStepUp, resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { DeletionDetailScreen } from "./deletion-detail";
import { DeletionQueueScreen } from "./deletion-queue-list";
import { phaseOf, toSeoulIso, validateExclude } from "./deletion-model";
import type { DeletionItem, ExcludeInput } from "./deletion-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/deletion-queue",
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
  resetMockPrivacy();
  vi.restoreAllMocks();
});
afterAll(() => stopServer());

const emptyPage = { items: [], page: 0, size: 25, totalElements: 0 };

function renderQueue(roles: OpsRole[] = ["PRIVACY"]) {
  return renderOpsScreen(<DeletionQueueScreen />, roles);
}

async function openDetail(queueId: number, anchor = "파기 건 정보") {
  renderOpsScreen(<DeletionDetailScreen queueId={queueId} />, ["PRIVACY"]);
  await screen.findByText(anchor);
  return userEvent.setup();
}

async function loadPreview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "미리보기 조회" }));
  await screen.findByText("파기 대상 건수");
}

function isDisabled(name: string | RegExp): boolean {
  return screen.getByRole("button", { name }).getAttribute("aria-disabled") === "true";
}

function rowOf(id: string) {
  const row = screen.getByRole("link", { name: id }).closest("tr");
  if (!row) throw new Error(`행을 찾을 수 없습니다: ${id}`);
  return within(row);
}

function confirmCancel(dialog: HTMLElement) {
  const button = within(dialog).getAllByRole("button", { name: "취소" }).at(-1);
  if (!button) throw new Error("취소 확인 버튼이 없습니다.");
  return button;
}

function item(patch: Partial<DeletionItem>): DeletionItem {
  return {
    queueId: 1,
    targetType: "CUSTOMER",
    targetId: 1,
    officeId: 1,
    reason: "보관 기한 만료",
    scheduledAt: "2026-11-12T00:00:00+09:00",
    executedAt: null,
    targetCount: 1,
    excludedCount: 0,
    result: null,
    storageResult: "PENDING",
    searchIndexResult: "PENDING",
    fileResult: "PENDING",
    temporaryExportResult: "PENDING",
    backupExpiresAt: null,
    retryCount: 0,
    verifiedAt: null,
    cancelledAt: null,
    createdAt: "2026-11-01T00:00:00+09:00",
    ...patch,
  };
}

const futureInput: ExcludeInput = {
  exclusionReason: "분쟁 보류",
  approverId: "9",
  holdDate: "2030-01-01",
  holdTime: "09:00",
  reviewDate: "2029-12-01",
  reviewTime: "09:00",
};

describe("파기 상태와 입력 규칙", () => {
  it("실행 전은 대기, 실행 뒤 검증 전은 검증 대기이고 검증 뒤에만 완료다", () => {
    expect(phaseOf(item({}))).toBe("PENDING");
    const executed = { executedAt: "2026-11-10T00:00:00+09:00", storageResult: "SUCCESS" as const };
    expect(phaseOf(item(executed))).toBe("AWAITING_VERIFICATION");
    expect(
      phaseOf(item({ ...executed, result: "SUCCESS", verifiedAt: "2026-11-10T01:00:00+09:00" })),
    ).toBe("COMPLETED");
    expect(
      phaseOf(item({ ...executed, result: "FAILED", verifiedAt: "2026-11-10T01:00:00+09:00" })),
    ).toBe("FAILED");
  });

  it("취소 시각이 있으면 취소됨이다", () => {
    expect(phaseOf(item({ cancelledAt: "2026-11-10T00:00:00+09:00" }))).toBe("CANCELLED");
  });

  it("서울 시각 날짜와 시각을 오프셋이 붙은 문자열로 합친다", () => {
    expect(toSeoulIso("2030-01-01", "09:00")).toBe("2030-01-01T09:00:00+09:00");
    expect(toSeoulIso("", "09:00")).toBeNull();
    expect(toSeoulIso("2030-01-01", "")).toBeNull();
  });

  it("보존 예외는 근거와 승인자와 만료와 재검토일이 모두 필요하다", () => {
    const empty: ExcludeInput = {
      exclusionReason: "",
      approverId: "",
      holdDate: "",
      holdTime: "",
      reviewDate: "",
      reviewTime: "",
    };
    expect(Object.keys(validateExclude(empty, 1, Date.now())).sort()).toEqual([
      "approverId",
      "exclusionReason",
      "holdDate",
      "reviewDate",
    ]);
    expect(validateExclude(futureInput, 1, Date.now())).toEqual({});
  });

  it("승인자는 실행하는 본인과 달라야 한다", () => {
    const errors = validateExclude({ ...futureInput, approverId: "1" }, 1, Date.now());
    expect(errors.approverId).toContain("실행자와 달라야");
  });

  it("만료와 재검토일은 지금 이후여야 하고 재검토가 만료보다 늦을 수 없다", () => {
    const past = validateExclude({ ...futureInput, holdDate: "2020-01-01" }, 1, Date.now());
    expect(past.holdDate).toContain("지금 이후");
    const late = validateExclude({ ...futureInput, reviewDate: "2031-01-01" }, 1, Date.now());
    expect(late.reviewDate).toContain("만료 시각 이전");
  });
});

describe("파기 큐", () => {
  it("로딩 뒤 대상과 근거와 예정일을 보인다", async () => {
    renderQueue();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByRole("link", { name: "701" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "707" })).toBeTruthy();
    expect(screen.getAllByText("고객 801").length).toBeGreaterThan(0);
    expect(screen.getAllByText("보관 기한 만료").length).toBeGreaterThan(0);
  });

  it("저장소별 결과 열을 모두 보인다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "701" });
    for (const header of [
      "운영 저장소",
      "검색 색인",
      "파일",
      "임시 내보내기",
      "백업 만료",
      "재시도",
      "취소 시각",
    ]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }
  });

  it("상태를 실행 대기와 검증 대기와 완료와 취소됨으로 구분한다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "701" });
    expect(rowOf("701").getByText("실행 대기")).toBeTruthy();
    expect(rowOf("703").getByText("검증 대기")).toBeTruthy();
    expect(rowOf("705").getByText("완료")).toBeTruthy();
    expect(rowOf("706").getByText("취소됨")).toBeTruthy();
  });

  it("실행을 마쳤어도 검증 전에는 완료로 표시하지 않는다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "703" });
    const row = rowOf("703");
    expect(row.queryByText("완료")).toBeNull();
    expect(screen.getByText(/검증하기 전에는 완료로 표시하지/)).toBeTruthy();
  });

  it("실패한 저장소와 재시도 횟수를 보인다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "707" });
    const row = rowOf("707");
    expect(row.getByText("실패")).toBeTruthy();
    expect(row.getByText("2회")).toBeTruthy();
  });

  it("취소한 건은 취소 시각을 보이고 다른 건은 대시다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "706" });
    const cancelled = rowOf("706");
    expect(cancelled.getAllByText("-")).toHaveLength(1);
    const pending = rowOf("701");
    expect(pending.getAllByText("-")).toHaveLength(2);
  });

  it("검증을 마친 건은 백업 만료 시각을 보인다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "705" });
    const row = rowOf("705");
    expect(row.getAllByText("-")).toHaveLength(1);
  });

  it("대상이 없으면 빈 목록 안내를 보인다", async () => {
    server.use(http.get("/api/ops/deletion-queue", () => HttpResponse.json(emptyPage)));
    renderQueue();
    expect(await screen.findByText("파기할 대상이 없습니다.")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(http.get("/api/ops/deletion-queue", () => (fail ? mockErrors.server() : undefined)));
    renderQueue();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: "701" })).toBeTruthy();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/deletion-queue", () => mockErrors.rateLimited(30)));
    renderQueue();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 돌려주면 접근 불가를 알린다", async () => {
    server.use(http.get("/api/ops/deletion-queue", () => mockErrors.forbidden()));
    renderQueue();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("개인정보담당이 아니면 접근 불가 안내를 보인다", () => {
    renderQueue(["SUPPORT"]);
    expect(screen.getByRole("alert").textContent).toContain("개인정보담당");
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("파기 미리보기와 실행", () => {
  it("실행 대기 건은 미리보기를 보기 전에는 실행 버튼이 꺼져 있다", async () => {
    await openDetail(701);
    expect(isDisabled("파기 실행")).toBe(true);
    expect(screen.getByText("미리보기를 조회하면 실행 버튼이 켜집니다.")).toBeTruthy();
  });

  it("미리보기는 대상 건수와 보존 제외분과 제외 사유를 보인다", async () => {
    const user = await openDetail(701);
    await loadPreview(user);
    expect(screen.getByText("24건")).toBeTruthy();
    expect(screen.getByText("3건")).toBeTruthy();
    expect(screen.getByText("법정 보존 기간이 남은 계약 서류")).toBeTruthy();
    expect(screen.getAllByText("고객 801").length).toBeGreaterThan(1);
    expect(isDisabled("파기 실행")).toBe(false);
  });

  it("미리보기가 실패하면 안내하고 실행은 계속 꺼져 있다", async () => {
    server.use(http.get("/api/ops/deletion-queue/:id/preview", () => mockErrors.server()));
    const user = await openDetail(701);
    await user.click(screen.getByRole("button", { name: "미리보기 조회" }));
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    expect(isDisabled("파기 실행")).toBe(true);
  });

  it("실행 확인 대화상자에 5분 재인증과 되돌릴 수 없음을 안내한다", async () => {
    const user = await openDetail(701);
    expect(screen.getByText(/5분 이내에 재인증을 마쳐야 하고 되돌릴 수 없습니다/)).toBeTruthy();
    await loadPreview(user);
    await user.click(screen.getByRole("button", { name: "파기 실행" }));
    expect(within(screen.getByRole("dialog")).getByText(/5분 이내 재인증이 필요하고/)).toBeTruthy();
  });

  it("실행하면 검증 대기가 되고 완료로 표시하지 않는다", async () => {
    markMockStepUp();
    const user = await openDetail(701);
    await loadPreview(user);
    await user.click(screen.getByRole("button", { name: "파기 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    expect(await screen.findByText(/파기를 실행했습니다/)).toBeTruthy();
    expect(await screen.findByText("파기 결과 검증")).toBeTruthy();
    expect(screen.getAllByText("검증 대기").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "파기 실행" })).toBeNull();
    expect(screen.queryByRole("button", { name: "대기 건 취소" })).toBeNull();
    expect(screen.getByText("검증 전")).toBeTruthy();
  });

  it("취소한 건에 실행하면 서버가 409로 거부한 것을 안내한다", async () => {
    server.use(
      http.post("/api/ops/deletion-queue/:id/execute", () =>
        errorResponse(409, "INVALID_TRANSITION", "취소됨"),
      ),
    );
    const user = await openDetail(701);
    await loadPreview(user);
    await user.click(screen.getByRole("button", { name: "파기 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("실행 요청이 한도를 넘으면 안내한다", async () => {
    server.use(http.post("/api/ops/deletion-queue/:id/execute", () => mockErrors.rateLimited(15)));
    const user = await openDetail(701);
    await loadPreview(user);
    await user.click(screen.getByRole("button", { name: "파기 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("파기 취소", () => {
  it("취소 사유가 없으면 취소할 수 없다", async () => {
    const user = await openDetail(701);
    await user.click(screen.getByRole("button", { name: "대기 건 취소" }));
    const dialog = screen.getByRole("dialog");
    const submit = confirmCancel(dialog);
    expect(submit.getAttribute("aria-disabled")).toBe("true");
  });

  it("사유를 적어 취소하면 취소 시각이 보이고 실행할 수 없다", async () => {
    const user = await openDetail(701);
    await user.click(screen.getByRole("button", { name: "대기 건 취소" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("취소 사유"), "대상 확인이 필요합니다");
    await user.click(confirmCancel(dialog));
    expect(await screen.findByText("파기 대기 건을 취소했습니다.")).toBeTruthy();
    expect(await screen.findByText(/취소한 건은 실행할 수 없습니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "파기 실행" })).toBeNull();
    expect(screen.queryByRole("button", { name: "대기 건 취소" })).toBeNull();
    const label = screen.getByText("취소 시각");
    expect(label.nextElementSibling?.textContent).not.toBe("-");
  });

  it("실행을 시작한 건은 취소할 수 없다는 안내를 보인다", async () => {
    await openDetail(703);
    expect(screen.getByText(/실행을 시작한 건은 취소할 수 없습니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "대기 건 취소" })).toBeNull();
  });

  it("이미 취소한 건은 실행 영역 없이 취소 시각을 보인다", async () => {
    await openDetail(706);
    expect(screen.getByText(/취소한 건은 실행할 수 없습니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "파기 실행" })).toBeNull();
    expect(screen.queryByRole("button", { name: "미리보기 조회" })).toBeNull();
  });

  it("서버가 이미 실행·취소된 건이라고 하면 상태 전이 오류를 안내한다", async () => {
    server.use(
      http.post("/api/ops/deletion-queue/:id/cancel", () =>
        errorResponse(409, "INVALID_TRANSITION", "이미 취소됨"),
      ),
    );
    const user = await openDetail(701);
    await user.click(screen.getByRole("button", { name: "대기 건 취소" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("취소 사유"), "사유");
    await user.click(confirmCancel(dialog));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });
});

describe("보존 예외", () => {
  function fillDates(input: ExcludeInput) {
    fireEvent.change(screen.getByLabelText("보류 만료 날짜"), {
      target: { value: input.holdDate },
    });
    fireEvent.change(screen.getByLabelText("보류 만료 시각"), {
      target: { value: input.holdTime },
    });
    fireEvent.change(screen.getByLabelText("재검토 예정 날짜"), {
      target: { value: input.reviewDate },
    });
    fireEvent.change(screen.getByLabelText("재검토 예정 시각"), {
      target: { value: input.reviewTime },
    });
  }

  it("승인자는 실행자와 달라야 한다는 안내를 둔다", async () => {
    await openDetail(701);
    expect(screen.getByText(/승인자는 실행자와 달라야 하며/)).toBeTruthy();
  });

  it("빈 입력은 서버에 보내지 않고 필수 항목을 안내한다", async () => {
    const spy = vi.fn();
    server.use(
      http.post("/api/ops/deletion-queue/:id/exclude", () => {
        spy();
        return undefined;
      }),
    );
    const user = await openDetail(701);
    await user.click(screen.getByRole("button", { name: "보존 예외 등록" }));
    expect(await screen.findByText("보존 근거를 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("승인자 운영자 번호를 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("보존·분쟁 보류 만료 시각을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("재검토 예정일을 입력해 주세요.")).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("본인을 승인자로 지정하면 거른다", async () => {
    const user = await openDetail(701);
    await user.type(screen.getByLabelText("보존 근거"), "분쟁 보류");
    await user.type(screen.getByLabelText("승인자 운영자 번호"), "1");
    fillDates(futureInput);
    await user.click(screen.getByRole("button", { name: "보존 예외 등록" }));
    expect(await screen.findByText(/승인자는 실행자와 달라야 합니다. 본인은/)).toBeTruthy();
  });

  it("서버가 자기 승인을 거부하면 안내한다", async () => {
    server.use(
      http.post("/api/ops/deletion-queue/:id/exclude", () =>
        errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "자기 승인"),
      ),
    );
    const user = await openDetail(701);
    await user.type(screen.getByLabelText("보존 근거"), "분쟁 보류");
    await user.type(screen.getByLabelText("승인자 운영자 번호"), "9");
    fillDates(futureInput);
    await user.click(screen.getByRole("button", { name: "보존 예외 등록" }));
    expect(await screen.findByText(/실행자와 다른 운영자가 처리해 주세요/)).toBeTruthy();
  });

  it("다른 승인자로 등록하면 제외 건수가 늘어난다", async () => {
    const user = await openDetail(701);
    await loadPreview(user);
    expect(screen.getByText("3건")).toBeTruthy();
    await user.type(screen.getByLabelText("보존 근거"), "분쟁 보류");
    await user.type(screen.getByLabelText("승인자 운영자 번호"), "9");
    fillDates(futureInput);
    await user.click(screen.getByRole("button", { name: "보존 예외 등록" }));
    expect(await screen.findByText(/보존 예외를 등록했습니다/)).toBeTruthy();
    expect(await screen.findByText("4건")).toBeTruthy();
  });

  it("실행을 시작한 건에는 보존 예외 영역이 없다", async () => {
    await openDetail(703);
    expect(screen.queryByRole("button", { name: "보존 예외 등록" })).toBeNull();
  });
});

describe("파기 검증", () => {
  async function fillResults(user: ReturnType<typeof userEvent.setup>, value = "SUCCESS") {
    for (const label of ["운영 저장소 결과", "검색 색인 결과", "파일 결과", "임시 내보내기 결과"]) {
      await user.selectOptions(screen.getByLabelText(label), value);
    }
  }

  it("검증 전에는 완료로 표시하지 않는다는 안내를 둔다", async () => {
    await openDetail(704);
    expect(screen.getByText(/검증을 마치기 전에는 이 건을 완료로 표시하지 않습니다/)).toBeTruthy();
    expect(screen.getAllByText("검증 대기").length).toBeGreaterThan(0);
  });

  it("증빙이 없으면 검증을 보내지 않는다", async () => {
    const spy = vi.fn();
    server.use(
      http.post("/api/ops/deletion-queue/:id/verify", () => {
        spy();
        return undefined;
      }),
    );
    const user = await openDetail(704);
    await fillResults(user);
    await user.click(screen.getByRole("button", { name: "검증 기록" }));
    expect(await screen.findByText("검증 증빙을 입력해 주세요.")).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("결과가 빠지면 검증 미완료 안내를 보이고 완료로 바뀌지 않는다", async () => {
    const user = await openDetail(704);
    await user.selectOptions(screen.getByLabelText("운영 저장소 결과"), "SUCCESS");
    await user.type(screen.getByLabelText("검증 증빙"), "저장소 점검 기록");
    await user.click(screen.getByRole("button", { name: "검증 기록" }));
    expect(await screen.findByText(/검증 미완료/)).toBeTruthy();
    expect(screen.queryByText("검증을 마쳤습니다. 이 파기 건은 완료로 표시됩니다.")).toBeNull();
    expect(screen.getAllByText("검증 대기").length).toBeGreaterThan(0);
  });

  it("실행자와 다른 운영자가 모든 결과와 증빙을 입력하면 완료로 바뀐다", async () => {
    const user = await openDetail(704);
    await fillResults(user);
    fireEvent.change(screen.getByLabelText("백업 만료일"), { target: { value: "2027-01-31" } });
    await user.type(screen.getByLabelText("검증 증빙"), "저장소 점검 기록");
    await user.click(screen.getByRole("button", { name: "검증 기록" }));
    expect(
      await screen.findByText("검증을 마쳤습니다. 이 파기 건은 완료로 표시됩니다."),
    ).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("파기 결과 검증")).toBeNull());
    expect(screen.getAllByText("완료").length).toBeGreaterThan(0);
  });

  it("실패한 저장소가 있으면 검증해도 완료로 표시하지 않는다", async () => {
    const user = await openDetail(704);
    await fillResults(user);
    await user.selectOptions(screen.getByLabelText("파일 결과"), "FAILED");
    await user.type(screen.getByLabelText("검증 증빙"), "파일 삭제 실패 확인");
    await user.click(screen.getByRole("button", { name: "검증 기록" }));
    expect(await screen.findByText(/실패한 저장소가 있어 완료로 표시되지 않습니다/)).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("실패").length).toBeGreaterThan(0));
  });

  it("본인이 실행한 건은 검증할 수 없고 상태가 그대로다", async () => {
    const user = await openDetail(703);
    await fillResults(user);
    await user.type(screen.getByLabelText("검증 증빙"), "점검");
    await user.click(screen.getByRole("button", { name: "검증 기록" }));
    expect(
      await screen.findByText(
        /본인이 실행한 건이거나 본인이 승인자로 지정된 건은 직접 처리할 수 없습니다/,
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("검증 대기").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "검증 기록" })).toBeTruthy();
  });

  it("검증을 마친 건은 검증 일시를 보이고 검증 영역이 없다", async () => {
    await openDetail(705);
    expect(screen.queryByText("파기 결과 검증")).toBeNull();
    expect(screen.queryByText("검증 전")).toBeNull();
    expect(screen.getAllByText("완료").length).toBeGreaterThan(0);
  });

  it("검증 요청이 한도를 넘으면 안내한다", async () => {
    server.use(http.post("/api/ops/deletion-queue/:id/verify", () => mockErrors.rateLimited(20)));
    const user = await openDetail(704);
    await user.type(screen.getByLabelText("검증 증빙"), "점검");
    await user.click(screen.getByRole("button", { name: "검증 기록" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("파기 건 상세 상태", () => {
  it("로딩 중에는 로딩 표시를 보인다", () => {
    renderOpsScreen(<DeletionDetailScreen queueId={701} />, ["PRIVACY"]);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("없는 건은 찾을 수 없음 화면을 보인다", async () => {
    renderOpsScreen(<DeletionDetailScreen queueId={999} />, ["PRIVACY"]);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("서버 오류는 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(http.get("/api/ops/deletion-queue", () => (fail ? mockErrors.server() : undefined)));
    renderOpsScreen(<DeletionDetailScreen queueId={701} />, ["PRIVACY"]);
    const retry = await screen.findByRole("button", { name: "다시 시도" });
    fail = false;
    await user.click(retry);
    expect(await screen.findByText("파기 건 정보")).toBeTruthy();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/deletion-queue", () => mockErrors.rateLimited(30)));
    renderOpsScreen(<DeletionDetailScreen queueId={701} />, ["PRIVACY"]);
    expect((await screen.findAllByText(/너무 많습니다/)).length).toBeGreaterThan(0);
  });

  it("403이면 접근 불가 화면을 보인다", async () => {
    server.use(http.get("/api/ops/deletion-queue", () => mockErrors.forbidden()));
    renderOpsScreen(<DeletionDetailScreen queueId={701} />, ["PRIVACY"]);
    expect(await screen.findByRole("heading", { name: /접근|권한/ })).toBeTruthy();
  });

  it("개인정보담당이 아니면 상세 대신 접근 불가 안내를 보인다", () => {
    renderOpsScreen(<DeletionDetailScreen queueId={701} />, ["MIGRATION"]);
    expect(screen.getByRole("alert").textContent).toContain("개인정보담당");
  });
});
