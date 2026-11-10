// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { migrationState, resetMigrationState } from "@/mocks/handlers/migration";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ImportUploadScreen } from "./import-upload-screen";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/import",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMigrationState();
  push.mockClear();
});

afterAll(() => stopServer());

async function choose(user: ReturnType<typeof userEvent.setup>, file: File, type = "고객") {
  await user.selectOptions(await screen.findByLabelText("이전할 자료"), type);
  await user.upload(screen.getByLabelText(/파일 \(XLS/), file);
}

describe("데이터 이전 업로드 화면", () => {
  it("불러오는 동안 로딩을 보여주고 이력과 남은 횟수를 보여준다", async () => {
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByRole("link", { name: "고객목록.xlsx" })).not.toBeNull();
    expect(screen.getByText("이번 달 직접 실행 3회 남음 (월 5회)")).not.toBeNull();
    expect(screen.getByText("데이터 이전 업로드 안내")).not.toBeNull();
  });

  it("이력이 없으면 빈 안내를 보여준다", async () => {
    migrationState.batches = [];
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    expect(await screen.findByText("아직 올린 이전 파일이 없습니다.")).not.toBeNull();
  });

  it("조회가 실패하면 오류와 다시 시도를 보여준다", async () => {
    server.use(http.get("/api/import-batches", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: "고객목록.xlsx" })).not.toBeNull();
  });

  it("대표가 아니면 접근 권한 없음을 보여준다", () => {
    renderOffice(<ImportUploadScreen />, { role: "AGENT" });
    expect(screen.getByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("서버가 403을 돌려주면 권한 오류 화면을 보여준다", async () => {
    migrationState.callerRole = "AGENT";
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("횟수를 모두 쓰면 안내하되 파일은 올릴 수 있다", async () => {
    migrationState.remainingThisMonth = 0;
    const user = userEvent.setup();
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    expect(await screen.findByText(/직접 실행만 막힙니다/)).not.toBeNull();
    await choose(user, new File(["a"], "list.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: "올리고 매핑하러 가기" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/import/400"));
  });

  it("파일과 종류를 고르지 않으면 항목별 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "올리고 매핑하러 가기" }));
    expect(screen.getByText("올릴 파일을 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("이전할 자료의 종류를 선택해 주세요.")).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("엑셀이나 CSV가 아닌 파일은 올리기 전에 막는다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    await choose(user, new File(["a"], "memo.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "올리고 매핑하러 가기" }));
    expect(
      await screen.findAllByText("엑셀(XLS, XLSX) 또는 CSV 파일만 올릴 수 있습니다."),
    ).not.toBeNull();
  });

  it("20MB를 넘는 파일은 올리기 전에 막는다", async () => {
    const user = userEvent.setup();
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    const big = new File(["a"], "big.xlsx");
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    await choose(user, big);
    await user.click(screen.getByRole("button", { name: "올리고 매핑하러 가기" }));
    expect(await screen.findByText("파일 크기는 20MB를 넘을 수 없습니다.")).not.toBeNull();
  });

  it("올리면 매핑 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    await choose(user, new File(["a"], "new.xlsx"));
    await user.click(screen.getByRole("button", { name: "올리고 매핑하러 가기" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/import/400"));
  });

  it.each([
    [400, "ENCRYPTED_FILE_REJECTED", "암호가 걸린 파일은 올릴 수 없습니다"],
    [413, "FILE_TOO_LARGE", "파일 크기는 20MB를 넘을 수 없습니다."],
    [400, "IMPORT_LIMIT_EXCEEDED", "시트당 1만 행, 100열을 넘는 파일은 올릴 수 없습니다"],
    [400, "UNSUPPORTED_FILE_TYPE", "엑셀(XLS, XLSX) 또는 CSV 파일만 올릴 수 있습니다"],
  ])("서버가 %i %s로 거절하면 원인별 문구를 보여준다", async (status, code, text) => {
    server.use(http.post("/api/import-batches", () => errorResponse(status, code, "거절")));
    const user = userEvent.setup();
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    await choose(user, new File(["a"], "x.xlsx"));
    await user.click(screen.getByRole("button", { name: "올리고 매핑하러 가기" }));
    expect(await screen.findByText((content) => content.includes(text))).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("429를 받으면 기다리라는 안내를 보여준다", async () => {
    server.use(http.post("/api/import-batches", () => mockErrors.rateLimited(30)));
    const user = userEvent.setup();
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    await choose(user, new File(["a"], "x.xlsx"));
    await user.click(screen.getByRole("button", { name: "올리고 매핑하러 가기" }));
    expect(await screen.findByText(/30초 뒤에 다시 시도/)).not.toBeNull();
  });

  it("서버 오류는 일시적 오류 안내로 보여준다", async () => {
    server.use(
      http.post("/api/import-batches", () => errorResponse(500, "INTERNAL_ERROR", "내부 오류")),
    );
    const user = userEvent.setup();
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    await choose(user, new File(["a"], "x.xlsx"));
    await user.click(screen.getByRole("button", { name: "올리고 매핑하러 가기" }));
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
  });

  it("유료 지원에 연결된 파일은 직접 작업 불가를 표시한다", async () => {
    const batch = migrationState.batches[1];
    if (batch) {
      batch.supportRequestId = 41;
      batch.supportRequestStatus = "QUOTED";
    }
    renderOffice(<ImportUploadScreen />, { role: "OWNER" });
    expect(await screen.findByRole("link", { name: /견적 도착/ })).not.toBeNull();
    expect(screen.getByText(/직접 작업 불가/)).not.toBeNull();
  });

  it("읽기 전용 상태에서는 올리기를 막는다", async () => {
    renderOffice(<ImportUploadScreen />, { role: "OWNER", isReadOnly: true });
    await screen.findByRole("link", { name: "고객목록.xlsx" });
    expect(screen.getByLabelText("이전할 자료")).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "올리고 매핑하러 가기" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });
});
