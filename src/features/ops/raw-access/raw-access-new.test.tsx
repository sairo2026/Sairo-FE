// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockRawAccess } from "@/mocks/handlers/ops-raw-access";
import { resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { OpsSessionProvider } from "../model/ops-session";
import { RawAccessNewScreen } from "./raw-access-new";

const nav = vi.hoisted(() => ({ push: vi.fn(), search: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/raw-access/new",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
beforeEach(() => {
  nav.push.mockReset();
  nav.search = "";
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOpsSession();
  resetMockRawAccess();
});
afterAll(() => stopServer());

function renderForm() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <OpsSessionProvider value={{ operatorId: 1, name: "운영 김사이", roles: ["OPS"] }}>
        <RawAccessNewScreen />
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>, linked = "18") {
  await user.type(screen.getByLabelText(/^대상 ID/), "42");
  await user.type(screen.getByLabelText("열람 사유"), "고객 문의 대응");
  await user.type(screen.getByLabelText("범위"), "대표 연락처");
  await user.type(screen.getByLabelText("근거 내용"), "대표가 전화로 요청했습니다");
  if (linked) await user.type(screen.getByLabelText(/^연결 문의 ID/), linked);
  for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);
}

describe("원문 접근 요청 화면", () => {
  it("운영자 누구나 열 수 있고 안내 문구를 보인다", () => {
    renderForm();
    expect(screen.getByText(/종류별로 따로 요청하고 따로 승인받습니다/)).toBeTruthy();
    expect(screen.getByText(/최대 60분만 볼 수 있고/)).toBeTruthy();
    expect(screen.getByText(/직접 승인할 수 없습니다/)).toBeTruthy();
  });

  it("쿼리 파라미터로 대상과 연결 문의를 미리 채운다", () => {
    nav.search = "targetType=SUPPORT_INQUIRY&targetId=18&officeId=42&linkedInquiryId=18";
    renderForm();
    expect((screen.getByLabelText("대상 종류") as HTMLSelectElement).value).toBe("SUPPORT_INQUIRY");
    expect((screen.getByLabelText(/^대상 ID/) as HTMLInputElement).value).toBe("18");
    expect((screen.getByLabelText(/^대상 사무소 ID/) as HTMLInputElement).value).toBe("42");
    expect((screen.getByLabelText(/^연결 문의 ID/) as HTMLInputElement).value).toBe("18");
  });

  it("알 수 없는 대상 종류 파라미터는 무시한다", () => {
    nav.search = "targetType=UNKNOWN";
    renderForm();
    expect((screen.getByLabelText("대상 종류") as HTMLSelectElement).value).toBe("OFFICE");
  });

  it("비어 있으면 요청을 보내지 않고 항목별로 알린다", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    server.use(http.post("/api/ops/raw-access-requests", () => spy()));
    renderForm();
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText("대상 ID를 숫자로 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("열람 사유를 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("범위를 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("근거 내용을 입력해 주세요.")).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("보안 서약을 모두 확인하지 않으면 요청을 보내지 않는다", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    server.use(http.post("/api/ops/raw-access-requests", () => spy()));
    renderForm();
    await fillRequired(user);
    await user.click(screen.getAllByRole("checkbox")[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText("보안 서약을 확인해 주세요.")).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("만료 시간은 1분에서 60분만 받는다", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    const minutes = screen.getByLabelText("만료 시간(분)");
    await user.clear(minutes);
    await user.type(minutes, "61");
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText("만료 시간은 1분에서 60분 사이로 입력해 주세요.")).toBeTruthy();
    await user.clear(minutes);
    await user.type(minutes, "0");
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText("만료 시간은 1분에서 60분 사이로 입력해 주세요.")).toBeTruthy();
  });

  it("대표의 지원 요청 근거에는 연결 문의가 필수이고 법적 근거에는 아니다", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user, "");
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(
      await screen.findByText("대표의 지원 요청 근거에는 연결 문의 ID가 필요합니다."),
    ).toBeTruthy();
    await user.click(screen.getByLabelText("법적 근거 확인"));
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/ops/raw-access/20"));
  });

  it("성공하면 만들어진 요청 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/ops/raw-access/20"));
  });

  it("다운로드 요청은 요청 종류와 입력값을 그대로 보낸다", async () => {
    const user = userEvent.setup();
    let sent: unknown = null;
    server.use(
      http.post("/api/ops/raw-access-requests", async ({ request }) => {
        sent = await request.json();
        return errorResponse(500, "INTERNAL_ERROR", "중단");
      }),
    );
    renderForm();
    await user.click(screen.getByLabelText("다운로드"));
    await fillRequired(user);
    await user.type(screen.getByLabelText(/^수혜자 운영자 ID/), "3");
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent).toMatchObject({
      requestType: "RAW_DOWNLOAD",
      targetType: "OFFICE",
      targetId: 42,
      requestedExpiresMinutes: 60,
      basisType: "REPRESENTATIVE_REQUEST",
      linkedInquiryId: 18,
      beneficiaryOperatorId: 3,
      officeId: null,
    });
  });

  it("없는 연결 문의는 요청이 만들어지지 않았다고 안내한다", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user, "999");
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText(/요청이 만들어지지 않았습니다/)).toBeTruthy();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("없는 대상 사무소도 같은 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/^대상 사무소 ID/), "9999");
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText(/요청이 만들어지지 않았습니다/)).toBeTruthy();
  });

  it("서버 검증 오류를 보여준다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/raw-access-requests", () =>
        mockErrors.validation([{ field: "scope", message: "범위가 너무 넓습니다." }]),
      ),
    );
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText("범위가 너무 넓습니다.")).toBeTruthy();
  });

  it("권한 오류와 요청 한도 초과를 안내한다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/raw-access-requests", () => mockErrors.forbidden()));
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
    server.use(http.post("/api/ops/raw-access-requests", () => mockErrors.rateLimited(20)));
    await user.click(screen.getByRole("button", { name: "승인 요청" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});
