// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { migrationState, resetMigrationState } from "@/mocks/handlers/migration";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ImportBatchScreen } from "./import-batch-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/import/301",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMigrationState();
});

afterAll(() => stopServer());

function openBatch(batchId = 301) {
  return renderOffice(<ImportBatchScreen batchId={batchId} />, { role: "OWNER" });
}

async function firstFailedRow(): Promise<HTMLElement> {
  const list = await screen.findByRole("list", { name: "실패한 줄" });
  return within(list).getAllByRole("listitem")[0] as HTMLElement;
}

describe("이전 결과 줄별 구분", () => {
  it("성공과 실패 건수를 한 문장으로 먼저 알려 준다", async () => {
    openBatch();
    expect(
      await screen.findByText("전체 60건 중 성공 55건, 실패 5건, 제외 0건입니다."),
    ).not.toBeNull();
    expect(screen.getByRole("tab", { name: "실패 5건" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("tab", { name: "성공 55건" })).not.toBeNull();
  });

  it("실패한 줄마다 파일 줄 번호와 원인, 고치는 방법을 보여 준다", async () => {
    openBatch();
    const first = await firstFailedRow();
    expect(within(first).getByText("파일 8행")).not.toBeNull();
    expect(within(first).getByText(/이메일: 이메일 형식이 올바르지 않습니다/)).not.toBeNull();
    expect(within(first).getByText(/고치는 방법: name@example.com/)).not.toBeNull();
  });

  it("성공 탭은 성공한 줄과 만들어진 고객 링크를 보여 준다", async () => {
    const user = userEvent.setup();
    openBatch();
    await user.click(await screen.findByRole("tab", { name: "성공 55건" }));
    const list = await screen.findByRole("list", { name: "성공한 줄" });
    expect(within(list).getAllByRole("link", { name: "고객 보기" })[0]?.getAttribute("href")).toBe(
      "/customers/1002",
    );
  });

  it("앱에서 고친 값을 저장하면 고침 저장됨으로 바뀌고 다시 처리하면 실패가 줄어든다", async () => {
    const user = userEvent.setup();
    openBatch();
    const first = await firstFailedRow();
    const input = within(first).getByLabelText("이메일");
    await user.clear(input);
    await user.type(input, "fixed@example.com");
    await user.click(within(first).getByRole("button", { name: "고친 값 저장" }));
    expect(await within(first).findByText("고침 저장됨")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "실패한 줄만 다시 처리" }));
    expect(
      await screen.findByText("전체 60건 중 성공 56건, 실패 4건, 제외 0건입니다."),
    ).not.toBeNull();
    expect(migrationState.remainingThisMonth).toBe(3);
  });

  it("값을 바꾸지 않고 저장하면 서버에 보내지 않고 안내한다", async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.put("/api/import-batches/:batchId/rows/:rowNumber/correction", () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    openBatch();
    const first = await firstFailedRow();
    await user.click(within(first).getByRole("button", { name: "고친 값 저장" }));
    expect(
      within(first).getByText("바꾼 값이 없습니다. 값을 고친 뒤 저장해 주세요."),
    ).not.toBeNull();
    expect(called).toBe(false);
  });

  it("여전히 틀린 값은 계속 실패로 남고 원인이 보인다", async () => {
    const user = userEvent.setup();
    openBatch();
    const first = await firstFailedRow();
    const input = within(first).getByLabelText("이메일");
    await user.clear(input);
    await user.type(input, "또틀림");
    await user.click(within(first).getByRole("button", { name: "고친 값 저장" }));
    await waitFor(() => expect(within(first).queryByText("고침 저장됨")).toBeNull());
    expect(within(first).getByText(/이메일 형식이 올바르지 않습니다/)).not.toBeNull();
  });

  it("저장이 실패하면 사유를 보여 준다", async () => {
    const user = userEvent.setup();
    server.use(
      http.put("/api/import-batches/:batchId/rows/:rowNumber/correction", () =>
        mockErrors.server(),
      ),
    );
    openBatch();
    const first = await firstFailedRow();
    const input = within(first).getByLabelText("이메일");
    await user.clear(input);
    await user.type(input, "a@b.co");
    await user.click(within(first).getByRole("button", { name: "고친 값 저장" }));
    expect(await within(first).findByRole("alert")).not.toBeNull();
  });

  it("실패한 줄을 CSV로 내려받는 링크를 준다", async () => {
    openBatch();
    const link = await screen.findByRole("link", { name: "실패한 줄 내려받기 (CSV)" });
    expect(link.getAttribute("href")).toBe("/api/import-batches/301/failed-rows.csv");
  });

  it("실패가 없으면 성공 탭을 먼저 보여 주고 내려받기 안내를 숨긴다", async () => {
    const batch = migrationState.batches[0];
    if (batch) {
      batch.failedRows = [];
      if (batch.detail.counts) {
        batch.detail.counts = { ...batch.detail.counts, succeeded: 60, failed: 0 };
      }
    }
    openBatch();
    expect(
      await screen.findByText("전체 60건 중 성공 60건, 실패 0건, 제외 0건입니다."),
    ).not.toBeNull();
    expect(screen.getByRole("tab", { name: "성공 60건" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.queryByRole("link", { name: "실패한 줄 내려받기 (CSV)" })).toBeNull();
  });

  it("줄별 결과를 불러오지 못하면 오류 화면을 보여 준다", async () => {
    server.use(http.get("/api/import-batches/:batchId/rows", () => mockErrors.server()));
    openBatch();
    expect(await screen.findAllByText("문제가 발생했습니다")).not.toBeNull();
  });
});
