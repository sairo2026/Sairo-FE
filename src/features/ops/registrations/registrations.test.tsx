// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockRegistrations } from "@/mocks/handlers/ops-registrations";
import { resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { OpsSessionProvider } from "../model/ops-session";
import type { OpsRole } from "../model/roles";
import { RegistrationDetailScreen } from "./registration-detail";
import { RegistrationQueueScreen } from "./registration-queue";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/registrations",
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
  resetMockRegistrations();
  vi.restoreAllMocks();
});
afterAll(() => stopServer());

function renderOps(ui: ReactNode, roles: OpsRole[] = ["REVIEW"]) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <OpsSessionProvider value={{ operatorId: 1, name: "운영 김사이", roles }}>
        {ui}
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
}

describe("인증 심사 큐", () => {
  it("로딩 뒤 심사 대기 신청만 보인다", async () => {
    renderOps(<RegistrationQueueScreen />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("한강공인중개사사무소")).toBeTruthy();
    expect(screen.getByText("북악부동산")).toBeTruthy();
    expect(screen.queryByText("남산공인중개사")).toBeNull();
  });

  it("상태를 고르지 않으면 오래된 신청이 먼저 나온다", async () => {
    renderOps(<RegistrationQueueScreen />);
    await screen.findByText("한강공인중개사사무소");
    const names = screen.getAllByRole("link").map((link) => link.textContent);
    expect(names).toEqual(["101", "102"]);
  });

  it("접수 후 72시간이 지난 심사 대기 건에만 기한 초과를 표시한다", async () => {
    renderOps(<RegistrationQueueScreen />);
    await screen.findByText("한강공인중개사사무소");
    expect(screen.getAllByText("기한 초과")).toHaveLength(1);
  });

  it("상태 필터로 보완 요청 건을 조회한다", async () => {
    const user = userEvent.setup();
    renderOps(<RegistrationQueueScreen />);
    await screen.findByText("한강공인중개사사무소");
    await user.selectOptions(screen.getByLabelText("상태"), "SUPPLEMENT_REQUESTED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("남산공인중개사")).toBeTruthy();
    expect(screen.queryByText("한강공인중개사사무소")).toBeNull();
  });

  it("해당 신청이 없으면 빈 목록 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderOps(<RegistrationQueueScreen />);
    await screen.findByText("한강공인중개사사무소");
    await user.selectOptions(screen.getByLabelText("상태"), "CANCELLED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("심사할 인증 신청이 없습니다.")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/office-registrations", () => (fail ? mockErrors.server() : undefined)),
    );
    renderOps(<RegistrationQueueScreen />);
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("한강공인중개사사무소")).toBeTruthy();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/office-registrations", () => mockErrors.rateLimited(30)));
    renderOps(<RegistrationQueueScreen />);
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("심사담당이 아니면 화면 대신 접근 불가 안내를 보인다", () => {
    renderOps(<RegistrationQueueScreen />, ["SUPPORT"]);
    expect(screen.getByRole("alert").textContent).toContain("심사담당");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("서버가 403을 돌려주면 접근 불가를 알린다", async () => {
    server.use(http.get("/api/ops/office-registrations", () => mockErrors.forbidden()));
    renderOps(<RegistrationQueueScreen />);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});

describe("사무소 정보 변경 신청 탭", () => {
  async function openTab() {
    const user = userEvent.setup();
    renderOps(<RegistrationQueueScreen />);
    await user.click(await screen.findByRole("tab", { name: "사무소 정보 변경 신청" }));
    return user;
  }

  it("변경 종류와 신청 값을 보인다", async () => {
    await openTab();
    expect(await screen.findByText("주소")).toBeTruthy();
    expect(screen.getByText(/서울특별시 종로구 새주소 1/)).toBeTruthy();
    expect(screen.getByText("대표자")).toBeTruthy();
  });

  it("승인하면 목록에서 사라지고 안내한다", async () => {
    const user = await openTab();
    await screen.findByText(/새주소 1/);
    await user.click(screen.getByRole("button", { name: "변경 신청 301 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("변경 신청을 승인했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/새주소 1/)).toBeNull());
  });

  it("반려는 사유가 있어야 하고 처리하면 안내한다", async () => {
    const user = await openTab();
    await screen.findByText(/새주소 1/);
    await user.click(screen.getByRole("button", { name: "변경 신청 301 반려" }));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "반려" });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    await user.type(within(dialog).getByLabelText("반려 사유(고객 공개)"), "증빙이 부족합니다");
    await user.click(submit);
    expect(await screen.findByText("변경 신청을 반려했습니다.")).toBeTruthy();
  });

  it("이미 처리된 신청을 승인하면 상태 전이 오류를 안내한다", async () => {
    server.use(
      http.post("/api/ops/office-change-requests/:id/approve", () =>
        errorResponse(409, "INVALID_TRANSITION", "처리됨"),
      ),
    );
    const user = await openTab();
    await screen.findByText(/새주소 1/);
    await user.click(screen.getByRole("button", { name: "변경 신청 301 승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("승인된 상태로 조회하면 처리 버튼이 없다", async () => {
    const user = await openTab();
    await screen.findByText(/새주소 1/);
    await user.selectOptions(screen.getByLabelText("처리 상태"), "APPROVED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("등록정보")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /변경 신청 .* 승인/ })).toBeNull();
  });
});

describe("인증 심사 상세", () => {
  it("신청 정보와 증빙 종류와 확인 항목 다섯 개를 보인다", async () => {
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    expect(await screen.findByText("한강공인중개사사무소")).toBeTruthy();
    expect(screen.getByText("중개사무소 개설등록증")).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
    expect(screen.getByText(/조회 결과는 저장하지 않고/)).toBeTruthy();
  });

  it("없는 신청은 찾을 수 없음 화면을 보인다", async () => {
    renderOps(<RegistrationDetailScreen registrationId={999} />);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("확인 상태는 서버에 저장돼 다시 열어도 유지된다", async () => {
    const user = userEvent.setup();
    const first = renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByLabelText("제출 버전 확인"));
    await waitFor(() =>
      expect((screen.getByLabelText("제출 버전 확인") as HTMLInputElement).checked).toBe(true),
    );
    first.unmount();
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    expect((screen.getByLabelText("제출 버전 확인") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("고용명부 대조") as HTMLInputElement).checked).toBe(false);
  });

  it("다섯 항목을 모두 확인하기 전에는 승인 버튼이 꺼져 있다", async () => {
    const user = userEvent.setup();
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    const approve = screen.getByRole("button", { name: "승인" });
    expect(approve.getAttribute("aria-disabled")).toBe("true");
    for (const label of ["제출 버전 확인", "확인 출처 조회", "등록관계 확인", "자격·교육 확인"]) {
      await user.click(screen.getByLabelText(label));
      await waitFor(() =>
        expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(true),
      );
    }
    expect(screen.getByRole("button", { name: "승인" }).getAttribute("aria-disabled")).toBe("true");
    await user.click(screen.getByLabelText("고용명부 대조"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "승인" }).getAttribute("aria-disabled")).toBeNull(),
    );
  });

  it("확인을 마친 신청은 승인할 수 있다", async () => {
    const user = userEvent.setup();
    renderOps(<RegistrationDetailScreen registrationId={102} />);
    await screen.findByText("북악부동산");
    await user.click(screen.getByRole("button", { name: "승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("인증 신청을 승인했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("승인").length).toBeGreaterThan(0));
    expect(screen.getByText("인증 회수는 고객사 상세에서 합니다.")).toBeTruthy();
  });

  it("서버가 필수 확인 미완료로 막으면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/office-registrations/:id/approve", () =>
        errorResponse(403, "REVIEW_CHECKLIST_INCOMPLETE", "미완료"),
      ),
    );
    renderOps(<RegistrationDetailScreen registrationId={102} />);
    await screen.findByText("북악부동산");
    await user.click(screen.getByRole("button", { name: "승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/필수 확인 항목을 모두 확인한 뒤/)).toBeTruthy();
  });

  it("승인 중 상태 전이 충돌은 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/office-registrations/:id/approve", () =>
        errorResponse(409, "INVALID_TRANSITION", "충돌"),
      ),
    );
    renderOps(<RegistrationDetailScreen registrationId={102} />);
    await screen.findByText("북악부동산");
    await user.click(screen.getByRole("button", { name: "승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("확인 항목 저장이 429로 막히면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.put("/api/ops/office-registrations/:id/checklist", () => mockErrors.rateLimited(10)),
    );
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByLabelText("제출 버전 확인"));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("보완 요청 상태의 신청은 확인 항목을 바꿀 수 없다", async () => {
    renderOps(<RegistrationDetailScreen registrationId={103} />);
    await screen.findByText("남산공인중개사");
    expect((screen.getByLabelText("제출 버전 확인") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "승인" }).getAttribute("aria-disabled")).toBe("true");
  });
});

describe("증빙 서류 받기", () => {
  it("심사 대기 상태에서는 받을 수 있고 새 창으로만 연다", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByRole("button", { name: "중개사무소 개설등록증 받기" }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open).toHaveBeenCalledWith(
      "https://files.example.test/evidence/101/BROKERAGE_LICENSE",
      "_blank",
      "noopener,noreferrer",
    );
    expect(screen.queryByText(/files\.example\.test/)).toBeNull();
  });

  it("보완 요청 상태에서도 받을 수 있다", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderOps(<RegistrationDetailScreen registrationId={103} />);
    await screen.findByText("남산공인중개사");
    await user.click(screen.getByRole("button", { name: "중개사무소 개설등록증 받기" }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
  });

  it("승인된 신청은 서류 받기가 꺼져 있다", async () => {
    renderOps(<RegistrationDetailScreen registrationId={104} />);
    await screen.findByText("청계공인중개사");
    const button = screen.getByRole("button", { name: "중개사무소 개설등록증 받기" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("note").textContent).toContain("받을 수 없습니다");
  });

  it("증빙이 없는 신청은 안내한다", async () => {
    renderOps(<RegistrationDetailScreen registrationId={105} />);
    await screen.findByText("서촌부동산");
    expect(screen.getByRole("note").textContent).toContain("제출된 증빙 서류가 없습니다");
  });

  it("증빙을 찾지 못하면 안내한다", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    server.use(
      http.post("/api/ops/office-registrations/:id/evidence/download-url", () =>
        errorResponse(404, "EVIDENCE_NOT_FOUND", "없음"),
      ),
    );
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByRole("button", { name: "사업자등록증 받기" }));
    expect(await screen.findByText(/증빙 서류를 찾을 수 없습니다/)).toBeTruthy();
    expect(open).not.toHaveBeenCalled();
  });

  it("상태가 바뀌어 409가 오면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/office-registrations/:id/evidence/download-url", () =>
        errorResponse(409, "INVALID_TRANSITION", "상태"),
      ),
    );
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByRole("button", { name: "사업자등록증 받기" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });
});

describe("보완 요청·반려·회수", () => {
  it("보완 요청은 사유와 지금 이후의 기한이 있어야 한다", async () => {
    const user = userEvent.setup();
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByRole("button", { name: "보완 요청" }));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "보완 요청" });
    await user.type(
      within(dialog).getByLabelText("보완 사유(고객 공개)"),
      "서류를 다시 올려 주세요",
    );
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(within(dialog).getByLabelText("보완 기한 날짜"), {
      target: { value: "2020-01-01" },
    });
    expect(await within(dialog).findByText("보완 기한은 지금 이후여야 합니다.")).toBeTruthy();
    expect(submit.getAttribute("aria-disabled")).toBe("true");
  });

  it("사유와 미래 기한을 넣으면 보완을 요청한다", async () => {
    const user = userEvent.setup();
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByRole("button", { name: "보완 요청" }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("보완 사유(고객 공개)"),
      "서류를 다시 올려 주세요",
    );
    fireEvent.change(within(dialog).getByLabelText("보완 기한 날짜"), {
      target: { value: "2099-12-31" },
    });
    await user.click(within(dialog).getByRole("button", { name: "보완 요청" }));
    expect(await screen.findByText("보완을 요청했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("보완 요청").length).toBeGreaterThan(0));
  });

  it("반려는 고객 공개 사유가 있어야 한다", async () => {
    const user = userEvent.setup();
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByRole("button", { name: "반려" }));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "반려" });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    await user.type(
      within(dialog).getByLabelText("반려 사유(고객 공개)"),
      "등록증이 확인되지 않습니다",
    );
    await user.click(submit);
    expect(await screen.findByText("인증 신청을 반려했습니다.")).toBeTruthy();
    expect((await screen.findAllByText(/등록증이 확인되지 않습니다/)).length).toBeGreaterThan(0);
  });

  it("반려 처리 중 서버 검증 실패는 대화상자에 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/office-registrations/:id/reject", () =>
        mockErrors.validation([{ field: "reason", message: "사유가 너무 깁니다." }]),
      ),
    );
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    await user.click(screen.getByRole("button", { name: "반려" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("반려 사유(고객 공개)"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "반려" }));
    expect(await within(dialog).findByRole("alert")).toBeTruthy();
  });

  it("승인된 신청은 사무소 번호를 모르므로 고객사 상세에서 회수하도록 안내한다", async () => {
    renderOps(<RegistrationDetailScreen registrationId={104} />);
    await screen.findByText("청계공인중개사");
    expect(screen.queryByRole("button", { name: "사무소 인증 회수" })).toBeNull();
    expect(screen.getByText("인증 회수는 고객사 상세에서 합니다.")).toBeTruthy();
  });

  it("승인되지 않은 신청에는 회수 버튼이 없다", async () => {
    renderOps(<RegistrationDetailScreen registrationId={101} />);
    await screen.findByText("한강공인중개사사무소");
    expect(screen.queryByRole("button", { name: "사무소 인증 회수" })).toBeNull();
  });

  it("이미 처리된 신청은 반려 버튼이 꺼져 있다", async () => {
    renderOps(<RegistrationDetailScreen registrationId={105} />);
    await screen.findByText("서촌부동산");
    expect(screen.getByRole("button", { name: "반려" }).hasAttribute("disabled")).toBe(true);
  });
});
