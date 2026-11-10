// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockPrivacy } from "@/mocks/handlers/ops-privacy";
import { markMockStepUp, resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { GrantsScreen } from "./grants-screen";
import { PrivacyDetailScreen } from "./privacy-detail";
import { grantStatus, unavailableReason, validateProcess, validateTransfer } from "./privacy-model";
import { PrivacyQueueScreen } from "./privacy-queue";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/privacy-requests",
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
  return renderOpsScreen(<PrivacyQueueScreen />, roles);
}

async function openDetail(requestId: number) {
  renderOpsScreen(<PrivacyDetailScreen requestId={requestId} />, ["PRIVACY"]);
  await screen.findByText("요청 정보");
  return userEvent.setup();
}

function closestRow(element: HTMLElement): HTMLElement {
  const row = element.closest("tr");
  if (!row) throw new Error("행을 찾을 수 없습니다.");
  return row;
}

function actionNames(): string[] {
  return within(screen.getByLabelText("처리 단계"))
    .getAllByRole("option")
    .map((option) => option.textContent ?? "");
}

describe("개인정보 요청 큐", () => {
  it("로딩 뒤 요청 목록을 보인다", async () => {
    renderQueue();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByRole("link", { name: "501" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "508" })).toBeTruthy();
  });

  it("요청 유형과 본인확인과 처리 상태와 근거를 보인다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "501" });
    expect(screen.getAllByText("열람").length).toBeGreaterThan(0);
    expect(screen.getAllByText("확인 대기").length).toBeGreaterThan(0);
    expect(screen.getAllByText("확인 완료").length).toBeGreaterThan(0);
    expect(screen.getAllByText("보완 대기").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/개인정보 보호법 제35조/).length).toBeGreaterThan(0);
  });

  it("책임 사무소가 없으면 사이로로 보이고 있으면 번호를 보인다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "502" });
    expect(screen.getAllByText("사이로").length).toBeGreaterThan(0);
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
  });

  it("법정 기한 임박과 초과를 구분해 표시하고 완료된 건은 표시하지 않는다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "502" });
    expect(screen.getAllByText("기한 임박")).toHaveLength(1);
    expect(screen.getAllByText("법정 기한 초과")).toHaveLength(1);
    expect(screen.getAllByText("정상").length).toBeGreaterThan(0);
    const completedRow = screen.getByRole("link", { name: "507" }).closest("tr");
    expect(
      completedRow && within(completedRow).queryByText(/기한 임박|법정 기한 초과|정상/),
    ).toBeNull();
  });

  it("보완 대기로 기한이 정지되지 않는다는 안내를 보인다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "501" });
    expect(screen.getByText(/보완 대기로 기한이 정지되지 않습니다/)).toBeTruthy();
  });

  it("법정 기한이 이른 순서로 정렬된다", async () => {
    renderQueue();
    await screen.findByRole("link", { name: "501" });
    const ids = screen.getAllByRole("link", { name: /^50\d$/ }).map((link) => link.textContent);
    expect(ids[0]).toBe("503");
  });

  it("요청 유형 필터로 삭제 요청만 조회한다", async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findByRole("link", { name: "501" });
    await user.selectOptions(screen.getByLabelText("요청 유형"), "DELETION");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "501" })).toBeNull());
    expect(screen.getByRole("link", { name: "502" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "505" })).toBeTruthy();
  });

  it("처리 상태 필터로 완료 건만 조회한다", async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findByRole("link", { name: "501" });
    await user.selectOptions(screen.getByLabelText("처리 상태"), "COMPLETED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByRole("link", { name: "507" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "501" })).toBeNull();
  });

  it("조건에 맞는 요청이 없으면 빈 목록 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findByRole("link", { name: "501" });
    await user.selectOptions(screen.getByLabelText("요청 유형"), "ACCESS");
    await user.selectOptions(screen.getByLabelText("처리 상태"), "COMPLETED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("처리할 개인정보 요청이 없습니다.")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/privacy-requests", () => (fail ? mockErrors.server() : undefined)),
    );
    renderQueue();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: "501" })).toBeTruthy();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/privacy-requests", () => mockErrors.rateLimited(30)));
    renderQueue();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 돌려주면 접근 불가를 알린다", async () => {
    server.use(http.get("/api/ops/privacy-requests", () => mockErrors.forbidden()));
    renderQueue();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("개인정보담당이 아니면 접근 불가 안내를 보인다", () => {
    renderQueue(["SUPPORT"]);
    expect(screen.getByRole("alert").textContent).toContain("개인정보담당");
  });
});

describe("처리 기록 검증 규칙", () => {
  it("제한과 거절은 결정 사유가 필수다", () => {
    expect(validateProcess("RESTRICT", " ", "").note).toContain("결정 사유");
    expect(validateProcess("REJECT", "", "").note).toContain("요청자에게 안내");
    expect(validateProcess("APPROVE", "", "").note).toBeUndefined();
  });

  it("완료는 증빙이 필수다", () => {
    expect(validateProcess("COMPLETE", "", "").evidence).toContain("증빙");
    expect(validateProcess("COMPLETE", "", "PRV-1").evidence).toBeUndefined();
  });

  it("승인과 제한만 본인확인이 필요하다", () => {
    expect(unavailableReason("APPROVE", "RECEIVED", "PENDING")).toBe("identity");
    expect(unavailableReason("RESTRICT", "REVIEWING", "FAILED")).toBe("identity");
    expect(unavailableReason("REJECT", "RECEIVED", "PENDING")).toBeNull();
    expect(unavailableReason("APPROVE", "COMPLETED", "VERIFIED")).toBe("status");
    expect(unavailableReason("EXECUTE", "RECEIVED", "VERIFIED")).toBe("status");
  });

  it("권한자 변경은 모든 증빙이 필요하고 보관권한은 계약 참조도 필요하다", () => {
    const empty = {
      newGranteeUserId: "",
      identityEvidenceReference: "",
      registrationRelationReference: "",
      contractReference: "",
    };
    expect(Object.keys(validateTransfer("return", empty)).sort()).toEqual([
      "identityEvidenceReference",
      "newGranteeUserId",
      "registrationRelationReference",
    ]);
    expect(Object.keys(validateTransfer("archive", empty))).toContain("contractReference");
    expect(
      validateTransfer("return", { ...empty, newGranteeUserId: "0" }).newGranteeUserId,
    ).toContain("숫자");
  });

  it("종료됐거나 만료된 권한은 변경할 수 없는 상태다", () => {
    const now = Date.parse("2026-11-10T00:00:00+09:00");
    const future = "2026-12-10T00:00:00+09:00";
    const past = "2026-10-10T00:00:00+09:00";
    expect(grantStatus("return", { expiresAt: future, revokedAt: null }, now)).toBe("ACTIVE");
    expect(grantStatus("return", { expiresAt: future, revokedAt: past }, now)).toBe("ENDED");
    expect(grantStatus("return", { expiresAt: past, revokedAt: null }, now)).toBe("EXPIRED");
    expect(grantStatus("archive", { expiresAt: null, terminatedAt: null }, now)).toBe("ACTIVE");
    expect(grantStatus("archive", { expiresAt: null, terminatedAt: past }, now)).toBe("ENDED");
  });
});

describe("개인정보 요청 상세", () => {
  it("범위와 근거와 기한과 처리 이력을 보인다", async () => {
    await openDetail(502);
    expect(screen.getAllByText("본인 계정 정보").length).toBeGreaterThan(0);
    expect(screen.getByText("처리 이력")).toBeTruthy();
    expect(screen.getByText(/요청 접수/)).toBeTruthy();
    expect(screen.getByText("기한 임박")).toBeTruthy();
    expect(screen.getAllByText("박개인").length).toBeGreaterThan(0);
  });

  it("요청자의 개인 식별 값은 표시하지 않는다는 안내를 둔다", async () => {
    await openDetail(502);
    expect(screen.getByText(/요청자의 이름과 연락처는 표시하지 않습니다/)).toBeTruthy();
  });

  it("보완 대기로 기한이 정지되지 않는다는 안내를 둔다", async () => {
    await openDetail(504);
    expect(screen.getByText(/보완 대기로 기한이 정지되지 않습니다/)).toBeTruthy();
  });

  it("결정 사유는 요청자에게 안내되는 문구로 작성한다는 안내를 둔다", async () => {
    await openDetail(502);
    expect(screen.getByLabelText("결정 사유(요청자에게 안내되는 문구)")).toBeTruthy();
    expect(screen.getByText(/요청자가 읽는 문장으로 작성해 주세요/)).toBeTruthy();
  });

  it("본인확인이 끝나지 않으면 승인과 제한을 고를 수 없고 안내한다", async () => {
    await openDetail(501);
    const names = actionNames();
    expect(names).toContain("승인 (본인확인 필요)");
    expect(names).toContain("일부 제한 (본인확인 필요)");
    const option = within(screen.getByLabelText("처리 단계")).getByRole("option", {
      name: "승인 (본인확인 필요)",
    }) as HTMLOptionElement;
    expect(option.disabled).toBe(true);
    expect(
      screen.getByText(/본인확인이 완료되지 않아 승인과 일부 제한은 할 수 없습니다/),
    ).toBeTruthy();
  });

  it("본인확인이 끝난 요청은 승인과 제한을 고를 수 있다", async () => {
    await openDetail(502);
    const option = within(screen.getByLabelText("처리 단계")).getByRole("option", {
      name: "승인",
    }) as HTMLOptionElement;
    expect(option.disabled).toBe(false);
  });

  it("승인된 요청은 실행만 고를 수 있고 결정 단계는 없다", async () => {
    await openDetail(505);
    const names = actionNames();
    expect(names).toContain("실행 시작");
    expect(names).not.toContain("승인");
    expect(names).not.toContain("거절");
  });

  it("실행 중인 요청은 완료 처리를 고를 수 있다", async () => {
    await openDetail(506);
    expect(actionNames()).toContain("완료 처리");
    expect(actionNames()).not.toContain("실행 시작");
  });

  it("완료한 요청은 완료 증빙을 보이고 처리 영역이 없다", async () => {
    await openDetail(507);
    expect(screen.getAllByText("PRV-2026-0911-03").length).toBeGreaterThan(0);
    expect(screen.getByText("완료하거나 거절한 요청은 더 처리할 수 없습니다.")).toBeTruthy();
    expect(screen.queryByLabelText("처리 단계")).toBeNull();
  });

  it("거절한 요청은 결정 사유를 보이고 처리 영역이 없다", async () => {
    await openDetail(508);
    expect(screen.getAllByText("요청 내용을 확인할 수 없어 거절합니다.").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("처리 단계")).toBeNull();
  });

  it("일부 제한은 결정 사유 없이 기록하지 않는다", async () => {
    const user = await openDetail(502);
    await user.selectOptions(screen.getByLabelText("처리 단계"), "RESTRICT");
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    expect(await screen.findByText(/결정 사유를 입력해 주세요/)).toBeTruthy();
  });

  it("완료 처리는 증빙 없이 기록하지 않는다", async () => {
    const user = await openDetail(506);
    await user.selectOptions(screen.getByLabelText("처리 단계"), "COMPLETE");
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    expect(await screen.findByText("완료 증빙 위치를 입력해 주세요.")).toBeTruthy();
  });

  it("전달을 기록하면 담당 운영자가 기록되고 이력이 늘어난다", async () => {
    const user = await openDetail(501);
    await user.selectOptions(screen.getByLabelText("처리 단계"), "FORWARD");
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    expect(await screen.findByText("책임 사무소에 전달을(를) 기록했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("운영 김사이").length).toBeGreaterThan(0));
    expect(screen.getAllByText(/전달됨/).length).toBeGreaterThan(0);
  });

  it("승인을 기록하면 상태와 결정 사유가 반영된다", async () => {
    const user = await openDetail(502);
    await user.selectOptions(screen.getByLabelText("처리 단계"), "APPROVE");
    await user.type(
      screen.getByLabelText("결정 사유(요청자에게 안내되는 문구)"),
      "삭제 요청을 승인합니다.",
    );
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    expect(await screen.findByText("승인을(를) 기록했습니다.")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getAllByText("삭제 요청을 승인합니다.").length).toBeGreaterThan(0),
    );
    expect(actionNames()).toContain("실행 시작");
  });

  it("거절은 되돌릴 수 없음 확인을 거친다", async () => {
    const user = await openDetail(502);
    await user.selectOptions(screen.getByLabelText("처리 단계"), "REJECT");
    await user.type(
      screen.getByLabelText("결정 사유(요청자에게 안내되는 문구)"),
      "법정 보존 대상입니다.",
    );
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/되돌릴 수 없고/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await screen.findByText("거절을(를) 기록했습니다.")).toBeTruthy();
    expect(await screen.findByText("완료하거나 거절한 요청은 더 처리할 수 없습니다.")).toBeTruthy();
  });

  it("완료 처리는 증빙과 함께 기록하면 완료된다", async () => {
    const user = await openDetail(506);
    await user.selectOptions(screen.getByLabelText("처리 단계"), "COMPLETE");
    await user.type(screen.getByLabelText(/완료 증빙 위치/), "PRV-2026-1110-01");
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "기록" }));
    expect(await screen.findByText("완료 처리을(를) 기록했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("PRV-2026-1110-01").length).toBeGreaterThan(0));
  });

  it("본인확인이 안 된 승인이 서버에서 거부되면 안내한다", async () => {
    server.use(
      http.post("/api/ops/privacy-requests/:id/process", () =>
        errorResponse(409, "IDENTITY_NOT_VERIFIED", "본인확인 전"),
      ),
    );
    const user = await openDetail(502);
    await user.selectOptions(screen.getByLabelText("처리 단계"), "APPROVE");
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    expect(
      await screen.findByText(/본인확인이 완료되지 않아 승인과 일부 제한을 할 수 없습니다/),
    ).toBeTruthy();
  });

  it("이미 처리된 요청이면 상태 전이 오류를 안내한다", async () => {
    server.use(
      http.post("/api/ops/privacy-requests/:id/process", () =>
        errorResponse(409, "INVALID_TRANSITION", "처리됨"),
      ),
    );
    const user = await openDetail(502);
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("다른 운영자가 먼저 수정했으면 버전 충돌을 안내한다", async () => {
    server.use(
      http.post("/api/ops/privacy-requests/:id/process", () => mockErrors.versionConflict(9)),
    );
    const user = await openDetail(502);
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    expect(await screen.findByText(/다른 운영자가 먼저 수정했습니다/)).toBeTruthy();
  });

  it("처리 요청이 한도를 넘으면 안내한다", async () => {
    server.use(
      http.post("/api/ops/privacy-requests/:id/process", () => mockErrors.rateLimited(10)),
    );
    const user = await openDetail(502);
    await user.click(screen.getByRole("button", { name: "처리 기록" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("없는 요청은 찾을 수 없음 화면을 보인다", async () => {
    renderOpsScreen(<PrivacyDetailScreen requestId={999} />, ["PRIVACY"]);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("상세 로딩 중에는 로딩 표시를 보인다", () => {
    renderOpsScreen(<PrivacyDetailScreen requestId={502} />, ["PRIVACY"]);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("상세가 서버 오류면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/privacy-requests/:id", () => (fail ? mockErrors.server() : undefined)),
    );
    renderOpsScreen(<PrivacyDetailScreen requestId={502} />, ["PRIVACY"]);
    const retry = await screen.findByRole("button", { name: "다시 시도" });
    fail = false;
    await user.click(retry);
    expect(await screen.findByText("요청 정보")).toBeTruthy();
  });

  it("상세가 403이면 접근 불가 화면을 보인다", async () => {
    server.use(http.get("/api/ops/privacy-requests/:id", () => mockErrors.forbidden()));
    renderOpsScreen(<PrivacyDetailScreen requestId={502} />, ["PRIVACY"]);
    expect(await screen.findByRole("heading", { name: /접근|권한/ })).toBeTruthy();
    expect(screen.queryByText("요청 정보")).toBeNull();
  });

  it("개인정보담당이 아니면 상세 대신 접근 불가 안내를 보인다", () => {
    renderOpsScreen(<PrivacyDetailScreen requestId={502} />, ["SUPPORT"]);
    expect(screen.getByRole("alert").textContent).toContain("개인정보담당");
  });
});

describe("반환·보관 권한", () => {
  function renderGrants(roles: OpsRole[] = ["PRIVACY"]) {
    return renderOpsScreen(<GrantsScreen />, roles);
  }

  it("반환권한 탭이 먼저 열리고 유효·종료·만료 상태를 구분한다", async () => {
    renderGrants();
    await screen.findByText("유효");
    const rowOf = (grantId: number) =>
      within(closestRow(screen.getByRole("button", { name: `반환권한 ${grantId} 권한자 변경` })));
    expect(rowOf(12).getByText("유효")).toBeTruthy();
    expect(rowOf(11).getByText("종료")).toBeTruthy();
    expect(rowOf(10).getByText("만료")).toBeTruthy();
  });

  it("종료됐거나 만료된 권한은 권한자 변경이 막혀 있다", async () => {
    renderGrants();
    await screen.findByRole("button", { name: "반환권한 12 권한자 변경" });
    expect(
      screen.getByRole("button", { name: "반환권한 12 권한자 변경" }).getAttribute("aria-disabled"),
    ).not.toBe("true");
    expect(
      screen.getByRole("button", { name: "반환권한 11 권한자 변경" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "반환권한 10 권한자 변경" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("보관권한 탭은 보관계약 참조와 기한 없는 권한을 보인다", async () => {
    const user = userEvent.setup();
    renderGrants();
    await screen.findByRole("table", { name: "반환권한 현황" });
    await user.click(screen.getByRole("tab", { name: "보관권한" }));
    expect(await screen.findByRole("table", { name: "보관권한 현황" })).toBeTruthy();
    expect(screen.getByText("ARC-2026-001")).toBeTruthy();
    expect(screen.getAllByText("기한 없음").length).toBeGreaterThan(0);
  });

  it("권한자 변경 대화상자는 회수와 발급이 함께 실행되고 재인증이 필요함을 안내한다", async () => {
    const user = userEvent.setup();
    renderGrants();
    await user.click(await screen.findByRole("button", { name: "반환권한 12 권한자 변경" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/회수하는 처리와 새 권한 발급이 한 번에/)).toBeTruthy();
    expect(within(dialog).getByText(/5분 이내에 재인증/)).toBeTruthy();
    expect(within(dialog).getByText(/30일 동안 유효/)).toBeTruthy();
  });

  it("증빙이 하나라도 비어 있으면 권한자 변경을 실행할 수 없다", async () => {
    const user = userEvent.setup();
    renderGrants();
    await user.click(await screen.findByRole("button", { name: "반환권한 12 권한자 변경" }));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "권한자 변경" });
    await user.type(within(dialog).getByLabelText("새 권한자 회원 번호"), "77");
    await user.type(within(dialog).getByLabelText("본인확인 증빙 참조"), "ID-1");
    await user.type(within(dialog).getByLabelText("변경 사유"), "대표 변경");
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    expect(await within(dialog).findByText("등록관계 증빙 참조를 입력해 주세요.")).toBeTruthy();
    await user.type(within(dialog).getByLabelText("등록관계 증빙 참조"), "REL-1");
    await waitFor(() => expect(submit.getAttribute("aria-disabled")).not.toBe("true"));
  });

  it("반환권한 변경에 성공하면 기존 권한 회수와 새 권한 발급을 안내한다", async () => {
    markMockStepUp();
    const user = userEvent.setup();
    renderGrants();
    await user.click(await screen.findByRole("button", { name: "반환권한 12 권한자 변경" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("새 권한자 회원 번호"), "77");
    await user.type(within(dialog).getByLabelText("본인확인 증빙 참조"), "ID-1");
    await user.type(within(dialog).getByLabelText("등록관계 증빙 참조"), "REL-1");
    await user.type(within(dialog).getByLabelText("변경 사유"), "대표 변경");
    await user.click(within(dialog).getByRole("button", { name: "권한자 변경" }));
    expect(
      await screen.findByText("반환권한 12을(를) 회수하고 새 권한 100을(를) 발급했습니다."),
    ).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByRole("button", { name: "반환권한 100 권한자 변경" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "반환권한 12 권한자 변경" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("보관권한 변경은 새 보관계약 참조도 요구한다", async () => {
    markMockStepUp();
    const user = userEvent.setup();
    renderGrants();
    await user.click(await screen.findByRole("tab", { name: "보관권한" }));
    await user.click(await screen.findByRole("button", { name: "보관권한 4 권한자 변경" }));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "권한자 변경" });
    await user.type(within(dialog).getByLabelText("새 권한자 회원 번호"), "88");
    await user.type(within(dialog).getByLabelText("본인확인 증빙 참조"), "ID-2");
    await user.type(within(dialog).getByLabelText("등록관계 증빙 참조"), "REL-2");
    await user.type(within(dialog).getByLabelText("변경 사유"), "대표 변경");
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    await user.type(within(dialog).getByLabelText("새 보관계약 참조"), "ARC-2026-009");
    await user.click(submit);
    expect(
      await screen.findByText("보관권한 4을(를) 종료하고 새 권한 100을(를) 발급했습니다."),
    ).toBeTruthy();
  });

  it("이미 회수된 권한이면 상태 전이 오류를 안내한다", async () => {
    server.use(
      http.post("/api/ops/return-grants/:id/transfer", () =>
        errorResponse(409, "INVALID_TRANSITION", "이미 회수됨"),
      ),
    );
    const user = userEvent.setup();
    renderGrants();
    await user.click(await screen.findByRole("button", { name: "반환권한 12 권한자 변경" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("새 권한자 회원 번호"), "77");
    await user.type(within(dialog).getByLabelText("본인확인 증빙 참조"), "ID-1");
    await user.type(within(dialog).getByLabelText("등록관계 증빙 참조"), "REL-1");
    await user.type(within(dialog).getByLabelText("변경 사유"), "대표 변경");
    await user.click(within(dialog).getByRole("button", { name: "권한자 변경" }));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("권한 현황이 비어 있으면 빈 목록 안내를 보인다", async () => {
    server.use(http.get("/api/ops/return-grants", () => HttpResponse.json(emptyPage)));
    renderGrants();
    expect(await screen.findByText("발급된 반환권한이 없습니다.")).toBeTruthy();
  });

  it("권한 현황이 서버 오류면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(http.get("/api/ops/return-grants", () => (fail ? mockErrors.server() : undefined)));
    renderGrants();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("table", { name: "반환권한 현황" })).toBeTruthy();
  });

  it("권한 현황이 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/return-grants", () => mockErrors.rateLimited(20)));
    renderGrants();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("권한 현황이 403이면 접근 불가를 알린다", async () => {
    server.use(http.get("/api/ops/return-grants", () => mockErrors.forbidden()));
    renderGrants();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("개인정보담당이 아니면 접근 불가 안내를 보인다", () => {
    renderGrants(["MIGRATION"]);
    expect(screen.getByRole("alert").textContent).toContain("개인정보담당");
    expect(screen.queryByRole("tab")).toBeNull();
  });
});
