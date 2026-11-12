// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { setMockCompanyInfoTested } from "@/mocks/handlers/ops-system-monitor";
import { server } from "@/mocks/server";
import {
  EMPTY_PAGE,
  installSystemTestLifecycle,
  isDisabled,
  renderWithMonitor,
} from "../system-common/system-testing";
import { IntegrationsScreen } from "./integrations-screen";
import {
  editInputOf,
  isDestinationChange,
  toIntegrationPatchBody,
  validateIntegrationEdit,
} from "./integrations-model";
import type { Integration } from "./integrations-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/integrations",
  useSearchParams: () => new URLSearchParams(),
}));

installSystemTestLifecycle();

function integration(patch: Partial<Integration>): Integration {
  return {
    integrationId: 1,
    environment: "PRODUCTION",
    provider: "TOSS_PAYMENTS",
    functionCode: "PAYMENT",
    enabled: false,
    secretReferenceId: "secret-ref-1",
    maskedConnection: "연결값 ****-4821",
    processingRegion: "KR",
    retentionPolicy: "법정 보관기간 뒤 파기",
    contractStatus: "PENDING",
    consentStatus: "NOT_REQUIRED",
    contractNoticeReviewedAt: null,
    lastCheckResult: null,
    lastSuccessAt: null,
    assignedOperatorId: null,
    approvedByOperatorId: 2,
    ...patch,
  };
}

async function renderList(roles: Parameters<typeof renderWithMonitor>[1] = ["OPS"]) {
  renderWithMonitor(<IntegrationsScreen />, roles);
  await screen.findByRole("button", { name: "연동 1 설정 변경" });
}

async function openEdit(id: number, roles: Parameters<typeof renderWithMonitor>[1] = ["OPS"]) {
  await renderList(roles);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: `연동 ${id} 설정 변경` }));
  return { user, dialog: screen.getByRole("dialog") };
}

describe("연동 모델", () => {
  it("바뀐 값만 변경 본문에 담는다", () => {
    const row = integration({});
    expect(toIntegrationPatchBody(row, editInputOf(row))).toEqual({ enabled: false });
    const body = toIntegrationPatchBody(row, {
      ...editInputOf(row),
      enabled: true,
      provider: "NEW_PG",
      contractStatus: "SIGNED",
      contractNoticeReviewed: true,
    });
    expect(body).toEqual({
      enabled: true,
      provider: "NEW_PG",
      contractStatus: "SIGNED",
      contractNoticeReviewed: true,
    });
  });

  it("계약·고지 점검을 체크하지 않으면 점검 값을 보내지 않는다", () => {
    const row = integration({});
    const body = toIntegrationPatchBody(row, editInputOf(row));
    expect("contractNoticeReviewed" in body).toBe(false);
  });

  it("활성화와 공급자·지역 변경을 점검 대상 변경으로 본다", () => {
    const row = integration({});
    expect(isDestinationChange(row, { enabled: true })).toBe(true);
    expect(isDestinationChange(row, { enabled: false })).toBe(false);
    expect(isDestinationChange(row, { enabled: false, provider: "X" } as never)).toBe(true);
    expect(isDestinationChange(row, { enabled: false, processingRegion: "JP" } as never)).toBe(
      true,
    );
  });

  it("공급자와 보유기간이 비면 검증 오류다", () => {
    const row = integration({});
    const errors = validateIntegrationEdit({
      ...editInputOf(row),
      provider: " ",
      retentionPolicy: "",
    });
    expect(errors.provider).toBeTruthy();
    expect(errors.retentionPolicy).toBeTruthy();
  });

  it("공급자가 100자를 넘으면 검증 오류다", () => {
    const row = integration({});
    expect(
      validateIntegrationEdit({ ...editInputOf(row), provider: "a".repeat(101) }).provider,
    ).toBeTruthy();
    expect(
      validateIntegrationEdit({ ...editInputOf(row), provider: "a".repeat(100) }).provider,
    ).toBeUndefined();
  });
});

describe("연동 설정 목록", () => {
  it("환경과 공급자와 기능과 계약 상태를 보여준다", async () => {
    await renderList();
    expect(screen.getAllByText("TOSS_PAYMENTS").length).toBeGreaterThan(0);
    expect(screen.getByText("SES_MAIL")).toBeTruthy();
    expect(screen.getByText("EMAIL")).toBeTruthy();
    expect(screen.getByText("JP")).toBeTruthy();
    expect(screen.getAllByText("체결").length).toBeGreaterThan(0);
    expect(screen.getByText("체결 전")).toBeTruthy();
    expect(screen.getByText("동의 완료")).toBeTruthy();
    expect(screen.getByText("검사 전")).toBeTruthy();
  });

  it("활성화 승인자와 담당과 계약·고지 점검 시각을 보여준다", async () => {
    await renderList();
    expect(screen.getAllByText("운영자 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("운영자 5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("승인 전").length).toBeGreaterThan(0);
    expect(screen.getAllByText("미지정").length).toBeGreaterThan(0);
    expect(screen.getAllByText("점검 전").length).toBeGreaterThan(0);
  });

  it("비밀값은 저장소 참조 ID와 마스킹된 값만 보인다", async () => {
    await renderList();
    expect(screen.getByText("secret-ref-1")).toBeTruthy();
    expect(screen.getAllByText("연결값 ****-4821").length).toBeGreaterThan(0);
    expect(screen.getByText("발신 ****@sairo.example")).toBeTruthy();
  });

  it("응답에 원문 비밀값이 섞여 와도 화면에 내지 않는다", async () => {
    server.use(
      http.get("/api/ops/integrations", () =>
        HttpResponse.json({
          items: [{ ...integration({ environment: "TEST" }), secretValue: "sk_live_원문비밀값" }],
          page: 0,
          size: 25,
          totalElements: 1,
        }),
      ),
    );
    await renderList();
    expect(screen.queryByText(/sk_live/)).toBeNull();
    expect(document.body.textContent).not.toContain("원문비밀값");
  });

  it("시험 환경과 운영 환경 안내를 둔다", async () => {
    await renderList();
    expect(
      screen.getByText(/시험 환경에서는 실제 과금과 운영 고객 발송을 하지 않고 점검 호출만 합니다/),
    ).toBeTruthy();
    expect(
      screen.getByText(/공급자·처리지역 변경은 계약·고지 점검과 승인 뒤에 적용됩니다/),
    ).toBeTruthy();
  });

  it("목록이 비면 안내한다", async () => {
    server.use(http.get("/api/ops/integrations", () => HttpResponse.json(EMPTY_PAGE)));
    renderWithMonitor(<IntegrationsScreen />, ["OPS"]);
    expect(await screen.findByText("등록된 연동이 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/ops/integrations", () => {
        calls += 1;
        return calls === 1 ? mockErrors.server() : HttpResponse.json(EMPTY_PAGE);
      }),
    );
    renderWithMonitor(<IntegrationsScreen />, ["OPS"]);
    await userEvent.setup().click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("등록된 연동이 없습니다.")).toBeTruthy();
  });

  it("목록 조회가 403이면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/integrations", () => mockErrors.forbidden()));
    renderWithMonitor(<IntegrationsScreen />, ["OPS"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("목록 조회가 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.get("/api/ops/integrations", () => mockErrors.rateLimited(25)));
    renderWithMonitor(<IntegrationsScreen />, ["OPS"]);
    expect(await screen.findByText(/25초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("운영담당이 아니면 접근 불가 안내를 보인다", () => {
    renderWithMonitor(<IntegrationsScreen />, ["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("환경 필터로 운영 환경만 본다", async () => {
    await renderList();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("환경"), "PRODUCTION");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("PASS_IDENTITY")).toBeNull());
    expect(screen.getByText("SES_MAIL")).toBeTruthy();
  });
});

describe("연결 검사", () => {
  it("성공하면 결과 문구를 보이고 마지막 성공 시각을 갱신한다", async () => {
    await renderList();
    const before = screen.getAllByText("-").length;
    await userEvent.setup().click(screen.getByRole("button", { name: "연동 2 연결 검사" }));
    expect(await screen.findByText("연동 2 연결 검사 결과는 성공입니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("-").length).toBeLessThan(before));
  });

  it("실패하면 실패 결과를 오류로 안내한다", async () => {
    await renderList();
    await userEvent.setup().click(screen.getByRole("button", { name: "연동 4 연결 검사" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("연동 4 연결 검사 결과는 실패입니다.");
  });

  it("검사는 본문 없이 요청한다", async () => {
    let contentLength: string | null = "x";
    server.use(
      http.post("/api/ops/integrations/:id/check", ({ request }) => {
        contentLength = request.headers.get("content-length");
        return HttpResponse.json({
          integrationId: 1,
          lastCheckResult: "SUCCESS",
          lastSuccessAt: "2026-11-10T09:00:00+09:00",
        });
      }),
    );
    await renderList();
    await userEvent.setup().click(screen.getByRole("button", { name: "연동 1 연결 검사" }));
    await screen.findByText("연동 1 연결 검사 결과는 성공입니다.");
    expect(contentLength === null || contentLength === "0").toBe(true);
  });

  it("검사가 404이면 안내한다", async () => {
    server.use(http.post("/api/ops/integrations/:id/check", () => mockErrors.notFound()));
    await renderList();
    await userEvent.setup().click(screen.getByRole("button", { name: "연동 1 연결 검사" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("검사가 403이면 권한 안내를 보인다", async () => {
    server.use(http.post("/api/ops/integrations/:id/check", () => mockErrors.forbidden()));
    await renderList();
    await userEvent.setup().click(screen.getByRole("button", { name: "연동 1 연결 검사" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("검사가 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.post("/api/ops/integrations/:id/check", () => mockErrors.rateLimited(12)));
    await renderList();
    await userEvent.setup().click(screen.getByRole("button", { name: "연동 1 연결 검사" }));
    expect(await screen.findByText(/12초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("검사가 서버 오류이면 실패 문구를 보인다", async () => {
    server.use(http.post("/api/ops/integrations/:id/check", () => mockErrors.server()));
    await renderList();
    await userEvent.setup().click(screen.getByRole("button", { name: "연동 1 연결 검사" }));
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
  });
});

describe("계약서 사본 링크", () => {
  it("개인정보담당 역할이 있으면 행마다 사본 화면 링크를 보인다", async () => {
    await renderList(["OPS", "PRIVACY"]);
    const link = screen.getByRole("link", { name: "연동 3 계약서 사본" });
    expect(link.getAttribute("href")).toBe("/ops/integrations/3/contract-copies");
  });

  it("개인정보담당 역할이 없으면 링크를 숨긴다", async () => {
    await renderList(["OPS"]);
    expect(screen.queryByRole("link", { name: /계약서 사본/ })).toBeNull();
  });
});

describe("설정 변경", () => {
  it("시험 환경에서는 과금과 발송 차단 안내를 보인다", async () => {
    const { dialog } = await openEdit(1);
    expect(
      within(dialog).getByText(/시험 환경에서는 실제 과금과 운영 고객 발송이 차단됩니다/),
    ).toBeTruthy();
  });

  it("운영 환경에서는 점검과 승인 선행 안내를 보인다", async () => {
    const { dialog } = await openEdit(2);
    expect(within(dialog).getByText(/끝나지 않았으면 저장이 거절됩니다/)).toBeTruthy();
  });

  it("공급자를 비우면 저장하지 않고 오류를 보인다", async () => {
    const { user, dialog } = await openEdit(1);
    fireEvent.change(within(dialog).getByLabelText("공급자"), { target: { value: "" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("공급자를 입력해 주세요.")).toBeTruthy();
  });

  it("보유기간을 비우면 저장하지 않고 오류를 보인다", async () => {
    const { user, dialog } = await openEdit(1);
    fireEvent.change(within(dialog).getByLabelText("보유기간과 파기 기준"), {
      target: { value: "" },
    });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("보유기간과 파기 기준을 입력해 주세요.")).toBeTruthy();
  });

  it("점검이 끝나지 않은 운영 연동의 활성화는 409로 거절되고 안내를 보인다", async () => {
    const { user, dialog } = await openEdit(2);
    await user.click(within(dialog).getByRole("switch", { name: "연동 활성" }));
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText(
        /계약·동의·고지 점검과 승인, 회사 정보 게시·수신 시험이 끝나지 않아/,
      ),
    ).toBeTruthy();
  });

  it("점검이 비어 있으면 점검 체크 안내를 보인다", async () => {
    const { user, dialog } = await openEdit(2);
    await user.click(within(dialog).getByRole("switch", { name: "연동 활성" }));
    expect(within(dialog).getByText(/계약·고지 점검 시각이 비어 있습니다/)).toBeTruthy();
  });

  it("계약 체결과 점검을 마치면 운영 연동을 활성화한다", async () => {
    let body: Record<string, unknown> = {};
    const { user, dialog } = await openEdit(2);
    server.use(
      http.patch("/api/ops/integrations/:id", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...integration({ integrationId: 2, enabled: true, contractStatus: "SIGNED" }),
          contractNoticeReviewedAt: "2026-11-10T09:00:00+09:00",
        });
      }),
    );
    await user.click(within(dialog).getByRole("switch", { name: "연동 활성" }));
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "계약 상태" }), "SIGNED");
    await user.click(within(dialog).getByLabelText("계약·고지 점검을 마쳤습니다"));
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("연동 2의 설정을 저장했습니다.")).toBeTruthy();
    expect(body).toEqual({
      enabled: true,
      contractStatus: "SIGNED",
      contractNoticeReviewed: true,
    });
  });

  it("실제 모의 서버도 점검을 마친 활성화를 받아들인다", async () => {
    const { user, dialog } = await openEdit(2);
    await user.click(within(dialog).getByRole("switch", { name: "연동 활성" }));
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "계약 상태" }), "SIGNED");
    await user.click(within(dialog).getByLabelText("계약·고지 점검을 마쳤습니다"));
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("연동 2의 설정을 저장했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("회사 정보 게시·수신 시험이 끝나지 않았으면 점검을 마쳐도 거절된다", async () => {
    setMockCompanyInfoTested(false);
    const { user, dialog } = await openEdit(2);
    await user.click(within(dialog).getByRole("switch", { name: "연동 활성" }));
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "계약 상태" }), "SIGNED");
    await user.click(within(dialog).getByLabelText("계약·고지 점검을 마쳤습니다"));
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/회사 정보 게시·수신 시험이 끝나지 않아/)).toBeTruthy();
  });

  it("운영 연동의 처리지역 변경도 점검이 끝나지 않았으면 거절된다", async () => {
    setMockCompanyInfoTested(false);
    const { user, dialog } = await openEdit(3);
    fireEvent.change(within(dialog).getByLabelText("처리지역"), { target: { value: "KR" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText(/끝나지 않아 운영 환경 활성화와 변경을 할 수 없습니다/),
    ).toBeTruthy();
  });

  it("점검이 끝난 운영 연동의 공급자를 바꾸면 변경 값만 보낸다", async () => {
    let body: Record<string, unknown> = {};
    const { user, dialog } = await openEdit(3);
    server.use(
      http.patch("/api/ops/integrations/:id", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          integration({ integrationId: 3, enabled: true, provider: "NEW_MAIL" }),
        );
      }),
    );
    fireEvent.change(within(dialog).getByLabelText("공급자"), { target: { value: "NEW_MAIL" } });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    await screen.findByText("연동 3의 설정을 저장했습니다.");
    expect(body).toEqual({ enabled: true, provider: "NEW_MAIL" });
  });

  it("시험 환경 연동은 보유기간만 바꿔도 저장된다", async () => {
    const { user, dialog } = await openEdit(1);
    fireEvent.change(within(dialog).getByLabelText("보유기간과 파기 기준"), {
      target: { value: "1년 뒤 파기" },
    });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("연동 1의 설정을 저장했습니다.")).toBeTruthy();
    expect(await screen.findByText("1년 뒤 파기")).toBeTruthy();
  });

  it("저장이 404이면 안내한다", async () => {
    server.use(http.patch("/api/ops/integrations/:id", () => mockErrors.notFound()));
    const { user, dialog } = await openEdit(1);
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("저장이 403이면 권한 안내를 보인다", async () => {
    server.use(http.patch("/api/ops/integrations/:id", () => mockErrors.forbidden()));
    const { user, dialog } = await openEdit(1);
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText("이 처리를 할 수 있는 운영 역할이 아닙니다."),
    ).toBeTruthy();
  });

  it("저장이 400이면 서버 입력 오류를 보인다", async () => {
    server.use(
      http.patch("/api/ops/integrations/:id", () =>
        mockErrors.validation([{ field: "provider", message: "공급자 이름이 올바르지 않습니다." }]),
      ),
    );
    const { user, dialog } = await openEdit(1);
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/공급자 이름이 올바르지 않습니다/)).toBeTruthy();
  });

  it("저장이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.patch("/api/ops/integrations/:id", () => mockErrors.rateLimited(8)));
    const { user, dialog } = await openEdit(1);
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/8초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("닫기를 누르면 요청 없이 대화상자가 닫힌다", async () => {
    const { user, dialog } = await openEdit(1);
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(isDisabled(screen.getByRole("button", { name: "연동 1 설정 변경" }))).toBe(false);
  });
});
