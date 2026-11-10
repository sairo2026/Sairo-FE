// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { migrationState, resetMigrationState } from "@/mocks/handlers/migration";
import { resetSupportState, supportState } from "@/mocks/handlers/migration-support";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ExportsScreen } from "./exports-screen";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMigrationState();
  resetSupportState();
});

afterAll(() => stopServer());

describe("데이터 내보내기", () => {
  it("안내 문구와 최근 내보내기 이력을 보여준다", async () => {
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    expect(
      await screen.findByText(/내려받은 파일에는 고객과 매물 소유자의 개인정보가 포함됩니다/),
    ).not.toBeNull();
    const table = await screen.findByRole("table", { name: "최근 내보내기" });
    expect(await within(table).findByText("완료")).not.toBeNull();
    expect(screen.getByText(/파일은 24시간 뒤 삭제되므로/)).not.toBeNull();
  });

  it("이력이 없으면 빈 안내를 보여준다", async () => {
    supportState.exports = [];
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    expect(await screen.findByText("최근 24시간 안에 만든 내보내기가 없습니다.")).not.toBeNull();
  });

  it("표 목록 조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/exports/allowed-tables", () => mockErrors.server()));
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("대표는 전체 내보내기를 만들고 진행 상태 뒤 내려받기 주소를 받는다", async () => {
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내보내기 만들기" }));
    expect(
      await screen.findByText(
        "내보내기를 만들고 있습니다. 완료되면 이 화면에서 내려받을 수 있습니다.",
      ),
    ).not.toBeNull();
    const link = await screen.findByRole("link", { name: "파일 내려받기" }, { timeout: 8000 });
    expect(link.getAttribute("href")).toBe("https://files.example.test/signed/910");
    expect(screen.getByText(/이 주소는 10분 뒤 만료됩니다/)).not.toBeNull();
  }, 15000);

  it("전체 내보내기는 본인 확인이 필요하면 안내한다", async () => {
    supportState.stepUpValid = false;
    server.use(
      http.post("/api/exports", () => errorResponse(401, "STEP_UP_REQUIRED", "본인 확인")),
    );
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내보내기 만들기" }));
    expect(await screen.findByText(/본인 확인이 필요합니다/)).not.toBeNull();
  });

  it("표를 고르지 않으면 오류를 보여주고 고르면 만든다", async () => {
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByLabelText(/표 선택/));
    await user.click(screen.getByRole("button", { name: "내보내기 만들기" }));
    expect(screen.getByText("내보낼 표를 하나 이상 선택해 주세요.")).not.toBeNull();
    await user.click(screen.getAllByLabelText("고객")[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: "내보내기 만들기" }));
    expect(await screen.findByText(/내보내기를 만들고 있습니다/)).not.toBeNull();
    expect(supportState.exports[0]?.scope).toBe("TABLES");
  });

  it("소속공인중개사는 허용된 표만 보고 전체 범위와 허용 설정은 보지 못한다", async () => {
    migrationState.callerRole = "AGENT";
    supportState.exportPolicy = ["CUSTOMER", "VISIT"];
    renderOffice(<ExportsScreen />, { role: "AGENT" });
    expect(await screen.findByLabelText("고객")).not.toBeNull();
    expect(screen.getByLabelText("방문")).not.toBeNull();
    expect(screen.queryByLabelText("계약")).toBeNull();
    expect(screen.queryByText(/전체 자료와 첨부 \(대표 전용/)).toBeNull();
    expect(screen.queryByText("소속공인중개사에게 허용할 표")).toBeNull();
  });

  it("허용된 표가 없으면 안내하고 만들기를 막는다", async () => {
    migrationState.callerRole = "AGENT";
    supportState.exportPolicy = [];
    renderOffice(<ExportsScreen />, { role: "AGENT" });
    expect(
      await screen.findByText(/대표가 허용한 표가 없어 내려받을 수 있는 데이터가 없습니다/),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "내보내기 만들기" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("중개보조원은 접근할 수 없다", () => {
    renderOffice(<ExportsScreen />, { role: "DEPUTY" });
    expect(screen.getByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("서버가 403으로 거절하면 권한 문구를 보여준다", async () => {
    server.use(http.post("/api/exports", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내보내기 만들기" }));
    expect(await screen.findByText("이 작업을 할 권한이 없습니다.")).not.toBeNull();
  });

  it("429를 받으면 기다리라는 안내를 보여준다", async () => {
    server.use(http.post("/api/exports", () => mockErrors.rateLimited(20)));
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내보내기 만들기" }));
    expect(await screen.findByText(/20초 뒤에 다시 시도/)).not.toBeNull();
  });

  it("이력에서 새 내려받기 주소를 받는다", async () => {
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내려받기 주소 받기" }));
    const link = await screen.findByRole("link", { name: "파일 내려받기" });
    expect(link.getAttribute("href")).toBe("https://files.example.test/signed/901");
  });

  it("만료된 내보내기는 다시 만들라고 안내한다", async () => {
    const first = supportState.exports[0];
    if (first) first.status = "EXPIRED";
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내려받기 주소 받기" }));
    expect(await screen.findByText(/내보내기 파일이 만료되어 삭제되었습니다/)).not.toBeNull();
  });

  it("생성에 실패한 내보내기는 사유와 함께 다시 만들라고 안내한다", async () => {
    const first = supportState.exports[0];
    if (first) {
      first.status = "FAILED";
      first.failureReason = "파일 생성 중 오류";
      first.downloadUrl = null;
    }
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "내려받기 주소 받기" }));
    expect(
      await screen.findByText(/내보내기를 만들지 못했습니다. 파일 생성 중 오류/),
    ).not.toBeNull();
  });

  it("대표는 소속공인중개사에게 허용할 표를 저장한다", async () => {
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByLabelText("매물 허용"));
    await user.click(screen.getByLabelText("방문 허용"));
    await user.click(screen.getByRole("button", { name: "허용 목록 저장" }));
    expect(
      await screen.findByText("허용 목록을 저장했습니다. 현재 허용: 매물, 방문"),
    ).not.toBeNull();
    await waitFor(() => expect(supportState.exportPolicy).toEqual(["PROPERTY", "VISIT"]));
  });

  it("허용 목록 저장이 거절되면 문구를 보여준다", async () => {
    server.use(http.put("/api/offices/current/export-policy", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<ExportsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "허용 목록 저장" }));
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
  });

  it("읽기 전용이면 만들기를 막는다", async () => {
    renderOffice(<ExportsScreen />, { role: "OWNER", isReadOnly: true });
    expect(
      (await screen.findByRole("button", { name: "내보내기 만들기" })).getAttribute(
        "aria-disabled",
      ),
    ).toBe("true");
  });
});
