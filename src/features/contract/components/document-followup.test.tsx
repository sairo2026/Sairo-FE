// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockContract,
  getMockContractState,
  resetMockContractState,
  setMockContractState,
} from "@/mocks/handlers/contract";
import {
  getMockContractExtraState,
  resetMockContractExtraState,
} from "@/mocks/handlers/contract-extra";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { validateDocumentFile } from "../model/document";
import { DocumentScreen } from "./document-screen";
import { FollowupScreen } from "./followup-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/contracts/9101/documents",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockContractState();
  resetMockContractExtraState();
});

afterAll(() => stopServer());

type User = ReturnType<typeof userEvent.setup>;

const document = (overrides: Record<string, unknown> = {}) => ({
  documentId: 1,
  documentType: "SALES_CONTRACT",
  versionNo: 1,
  contractRevisionId: 9101 * 10 + 1,
  writtenDate: "2026-10-01",
  deliveredDate: "2026-10-05",
  datePendingReason: null,
  retentionYears: 5,
  retentionEndDate: "2031-10-05",
  piiMaskingConfirmed: false,
  supersedesDocumentId: null,
  ...overrides,
});

function pdf(name = "계약서.pdf", size = 10) {
  const file = new File(["x"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

async function openUpload(user: User) {
  await user.click(await screen.findByRole("button", { name: "+ 서류 올리기" }));
  return screen.findByRole("dialog");
}

async function fillValid(user: User, dialog: HTMLElement, type = "SALES_CONTRACT") {
  await user.selectOptions(within(dialog).getByLabelText(/서류 종류/), type);
  await user.upload(within(dialog).getByLabelText(/^파일/), pdf());
  fireEvent.change(within(dialog).getByLabelText("작성일"), { target: { value: "2026-10-01" } });
  fireEvent.change(within(dialog).getByLabelText("교부일"), { target: { value: "2026-10-05" } });
  await user.click(within(dialog).getByRole("checkbox", { name: /개인정보 포함 여부를 확인/ }));
}

describe("서류 첨부", () => {
  it("미첨부 서류 경고와 보존기간 구분을 보여준다", async () => {
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    expect(
      await screen.findByText(/아직 첨부되지 않은 서류: 거래계약서, 중개대상물 확인·설명서/),
    ).not.toBeNull();
    expect(screen.getByText(/거래계약서 5년, 확인·설명서/)).not.toBeNull();
  });

  it("체결 후에만 올릴 수 있어 초안 계약에서는 버튼이 막힌다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 9101,
          contractStatus: "DRAFT",
          leasePeriodStatus: null,
          settlementStatus: "UNDECIDED",
          currentRevisionId: null,
        }),
      ],
    });
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText(/초안 계약에는 서류를 올릴 수 없습니다/)).not.toBeNull();
    expect(
      (screen.getByRole("button", { name: "+ 서류 올리기" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("파일과 종류 없이 올리면 항목별 오류를 보인다", async () => {
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openUpload(user);
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await within(dialog).findByText("서류 종류를 선택해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("올릴 파일을 선택해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText(/작성일과 교부일을 모두 입력하거나/)).not.toBeNull();
    expect(
      within(dialog).getByText("주민등록번호 등 포함 여부를 확인했는지 체크해 주세요."),
    ).not.toBeNull();
  });

  it("허용되지 않는 형식과 20MB 초과 파일은 사유를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openUpload(user);
    const input = within(dialog).getByLabelText(/^파일/);
    fireEvent.change(input, {
      target: { files: [new File(["x"], "문서.hwp", { type: "application/x-hwp" })] },
    });
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(
      await within(dialog).findByText("PDF, JPG, PNG 파일만 올릴 수 있습니다."),
    ).not.toBeNull();
    fireEvent.change(input, { target: { files: [pdf("큰파일.pdf", 21 * 1024 * 1024)] } });
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await within(dialog).findByText("파일은 한 개에 20MB 이하여야 합니다.")).not.toBeNull();
  });

  it("거래계약서를 올리면 문서 버전과 연결된 계약 버전이 표시된다", async () => {
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openUpload(user);
    await fillValid(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await screen.findByText("문서 버전 1")).not.toBeNull();
    expect(screen.getByText("최신")).not.toBeNull();
    expect(screen.getByText(/계약 버전 1/)).not.toBeNull();
    expect(getMockContractState().contracts[0]?.detail.documents).toHaveLength(1);
  });

  it("날짜를 모르면 사유를 입력해야 올릴 수 있다", async () => {
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openUpload(user);
    await user.selectOptions(within(dialog).getByLabelText(/서류 종류/), "SALES_CONTRACT");
    await user.upload(within(dialog).getByLabelText(/^파일/), pdf());
    await user.click(within(dialog).getByRole("checkbox", { name: /개인정보 포함 여부를 확인/ }));
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await within(dialog).findByText(/작성일과 교부일을 모두 입력하거나/)).not.toBeNull();
    await user.type(within(dialog).getByLabelText("날짜를 확인하지 못한 사유"), "교부일 확인 중");
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await screen.findByText("문서 버전 1")).not.toBeNull();
  });

  it("날짜가 확인되지 않은 서류는 보존 종료일 미정과 사유를 표시한다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 9101,
          documents: [
            document({
              deliveredDate: null,
              retentionEndDate: null,
              datePendingReason: "교부일 확인 중",
              piiMaskingConfirmed: true,
            }),
          ],
        }),
      ],
    });
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText(/보존 종료일 미정\(날짜 보완 필요\)/)).not.toBeNull();
    expect(screen.getByText(/날짜 미확인 사유: 교부일 확인 중/)).not.toBeNull();
    expect(screen.getByText("가린 사본")).not.toBeNull();
    expect(screen.getByText(/법정 원본 보존 완료로 표시하지 않습니다/)).not.toBeNull();
  });

  it("가린 사본을 고르면 법정 원본 보존 완료가 아니라는 안내가 보인다", async () => {
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openUpload(user);
    await user.click(
      within(dialog).getByRole("checkbox", { name: "주민등록번호를 가린 사본입니다" }),
    );
    expect(
      within(dialog).getByText(/가린 사본은 법정 원본 보존이 완료된 것으로 보지 않습니다/),
    ).not.toBeNull();
  });

  it("정정본은 새 버전으로 올라가고 이전 버전은 남는다", async () => {
    setMockContractState({
      contracts: [buildMockContract({ contractId: 9101, documents: [document()] })],
    });
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "거래계약서 정정본 올리기" }));
    const dialog = await screen.findByRole("dialog");
    await user.upload(within(dialog).getByLabelText(/^파일/), pdf("정정본.pdf"));
    fireEvent.change(within(dialog).getByLabelText("작성일"), { target: { value: "2026-10-10" } });
    fireEvent.change(within(dialog).getByLabelText("교부일"), { target: { value: "2026-10-12" } });
    await user.click(within(dialog).getByRole("checkbox", { name: /개인정보 포함 여부를 확인/ }));
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await screen.findByText("문서 버전 2")).not.toBeNull();
    expect(screen.getByText("문서 버전 1")).not.toBeNull();
    expect(screen.getAllByText("최신")).toHaveLength(1);
  });

  it("다운로드 링크를 받으면 만료 시각과 함께 보여준다", async () => {
    setMockContractState({
      contracts: [buildMockContract({ contractId: 9101, documents: [document()] })],
    });
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    await user.click(
      await screen.findByRole("button", { name: "거래계약서 버전 1 다운로드 링크 받기" }),
    );
    const link = await screen.findByRole("link", { name: "파일 열기" });
    expect(link.getAttribute("href")).toContain("/documents/1");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(screen.getByText(/만료 2026-11-10 09:10/)).not.toBeNull();
  });

  it("다운로드 링크 요청이 실패하면 안내한다", async () => {
    setMockContractState({
      contracts: [buildMockContract({ contractId: 9101, documents: [document()] })],
    });
    server.use(http.get("/api/contracts/9101/documents/1", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    await user.click(
      await screen.findByRole("button", { name: "거래계약서 버전 1 다운로드 링크 받기" }),
    );
    expect(await screen.findByText("이 작업을 할 권한이 없습니다.")).not.toBeNull();
  });

  it("계약 버전이 바뀌었거나 같은 버전이 있으면 서버 오류 안내를 보여준다", async () => {
    server.use(
      http.post("/api/contracts/9101/documents", () =>
        errorResponse(409, "CONTRACT_REVISION_CONFLICT", "충돌"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openUpload(user);
    await fillValid(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(
      await within(dialog).findByText(/다른 사용자가 먼저 계약 핵심정보를 정정했습니다/),
    ).not.toBeNull();
    server.use(
      http.post("/api/contracts/9101/documents", () =>
        errorResponse(409, "DOCUMENT_VERSION_CONFLICT", "중복"),
      ),
    );
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await within(dialog).findByText(/같은 서류 종류와 버전이 이미 있습니다/)).not.toBeNull();
    server.use(http.post("/api/contracts/9101/documents", () => mockErrors.rateLimited(10)));
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await within(dialog).findByText(/요청이 너무 많습니다/)).not.toBeNull();
  });

  it("서버가 파일 필드 오류를 돌려주면 파일 아래에 보인다", async () => {
    server.use(
      http.post("/api/contracts/9101/documents", () =>
        mockErrors.validation([{ field: "file", message: "서버: 파일이 올바르지 않습니다." }]),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<DocumentScreen contractId={9101} />, { role: "OWNER" });
    const dialog = await openUpload(user);
    await fillValid(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "올리기" }));
    expect(await within(dialog).findByText("서버: 파일이 올바르지 않습니다.")).not.toBeNull();
  });

  it("중개보조원은 접근 권한 화면을 보고 없는 계약은 찾을 수 없음이다", async () => {
    const first = renderOffice(<DocumentScreen contractId={9101} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    first.unmount();
    renderOffice(<DocumentScreen contractId={1} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("파일 검사 함수는 형식과 용량을 확인한다", () => {
    expect(validateDocumentFile(null)).toBeDefined();
    expect(validateDocumentFile(pdf())).toBeUndefined();
    expect(validateDocumentFile(new File(["x"], "a.png", { type: "" }))).toBeUndefined();
    expect(validateDocumentFile(new File(["x"], "a.exe", { type: "" }))).toBeDefined();
  });
});

describe("후속업무·신고 확인", () => {
  const task = (overrides: Record<string, unknown> = {}) => ({
    taskId: 71,
    taskType: "D90_FOLLOWUP",
    reportTarget: null,
    reportBasis: null,
    targetDate: null,
    submitted: false,
    submittedAt: null,
    officeId: 12,
    version: 1,
    ...overrides,
  });

  it("D90 후속업무를 임대 만기 90일 전 후속업무로 표시하고 기한이 없으면 비워 둔다", async () => {
    getMockContractExtraState().followups = { 9101: [task()] };
    renderOffice(<FollowupScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("임대 만기 90일 전 후속업무")).not.toBeNull();
    expect(screen.getByText("미제출")).not.toBeNull();
    expect(screen.getByText(/^기한\s*$/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "업무 목록" }).getAttribute("href")).toBe("/tasks");
  });

  it("제출 처리하면 제출 완료로 바뀌고 버튼이 사라진다", async () => {
    getMockContractExtraState().followups = {
      9101: [
        task({ reportTarget: "관할 기관", reportBasis: "근거 법령", targetDate: "2027-12-05" }),
      ],
    };
    const user = userEvent.setup();
    renderOffice(<FollowupScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText(/신고 대상 관할 기관 · 근거 근거 법령/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /제출 처리/ }));
    expect(await screen.findByText("제출 완료")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /제출 처리/ })).toBeNull();
    expect(screen.getByText(/제출 2026-11-10 09:00/)).not.toBeNull();
  });

  it("버전 충돌과 서버 오류를 안내한다", async () => {
    getMockContractExtraState().followups = { 9101: [task()] };
    server.use(http.patch("/api/contract-followup-tasks/71", () => mockErrors.versionConflict(3)));
    const user = userEvent.setup();
    renderOffice(<FollowupScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: /제출 처리/ }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("후속업무가 없으면 빈 안내를 보여준다", async () => {
    renderOffice(<FollowupScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("후속업무가 없습니다.")).not.toBeNull();
  });

  it("조회 오류와 403, 429, 중개보조원을 처리한다", async () => {
    server.use(http.get("/api/contracts/9101/followup-tasks", () => mockErrors.server()));
    const first = renderOffice(<FollowupScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    first.unmount();
    server.use(http.get("/api/contracts/9101/followup-tasks", () => mockErrors.forbidden()));
    const second = renderOffice(<FollowupScreen contractId={9101} />, { role: "AGENT" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    second.unmount();
    server.use(http.get("/api/contracts/9101/followup-tasks", () => mockErrors.rateLimited(10)));
    const third = renderOffice(<FollowupScreen contractId={9101} />, { role: "AGENT" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
    third.unmount();
    renderOffice(<FollowupScreen contractId={9101} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });
});
