// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { buildMockBatch, migrationState, resetMigrationState } from "@/mocks/handlers/migration";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { migrationKeys } from "../hooks/migration-queries";
import { ImportBatchScreen } from "./import-batch-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/import/302",
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

function openBatch(
  batchId: number,
  options: Parameters<typeof renderOffice>[1] = { role: "OWNER" },
) {
  return renderOffice(<ImportBatchScreen batchId={batchId} />, options);
}

async function fillSourceSystem(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/원본 시스템 이름/), "양셀-2026");
}

describe("매핑 검토", () => {
  it("추천 매핑과 샘플 값, 연결 안 된 열을 보여준다", async () => {
    openBatch(302);
    const row = (await screen.findByRole("rowheader", { name: "번호" })).closest(
      "tr",
    ) as HTMLElement;
    expect(within(row).getByText("P-1, P-2")).not.toBeNull();
    expect(within(row).getByText("95%")).not.toBeNull();
    expect((screen.getByLabelText("번호 열에 연결할 사이로 항목") as HTMLSelectElement).value).toBe(
      "propertySourceId",
    );
    expect(screen.getByText("연결되지 않은 열은 이전되지 않습니다.")).not.toBeNull();
  });

  it("원본 시스템 이름이 없으면 저장하지 않는다", async () => {
    const user = userEvent.setup();
    openBatch(302);
    await user.click(await screen.findByRole("button", { name: "매핑 확정하고 미리보기" }));
    expect(screen.getByText("원본 시스템 이름을 입력해 주세요.")).not.toBeNull();
    expect(migrationState.batches[1]?.mappingSaved).toBe(false);
  });

  it("필수 항목을 연결하지 않으면 항목 이름과 함께 알려 준다", async () => {
    const user = userEvent.setup();
    openBatch(302);
    await fillSourceSystem(user);
    await user.selectOptions(await screen.findByLabelText("건물명 열에 연결할 사이로 항목"), "");
    await user.click(screen.getByRole("button", { name: "매핑 확정하고 미리보기" }));
    expect(screen.getByText("매물명 항목을 한 열에 연결해 주세요.")).not.toBeNull();
  });

  it("같은 항목을 두 열에 연결하면 막는다", async () => {
    const user = userEvent.setup();
    openBatch(302);
    await fillSourceSystem(user);
    await user.selectOptions(
      await screen.findByLabelText("비고 열에 연결할 사이로 항목"),
      "propertyName",
    );
    await user.click(screen.getByRole("button", { name: "매핑 확정하고 미리보기" }));
    expect(
      screen.getByText("매물명 항목이 여러 열에 연결되어 있습니다. 한 열만 연결해 주세요."),
    ).not.toBeNull();
  });

  it("고객 이전이면 고객 항목을 고르게 한다", async () => {
    openBatch(302);
    expect(await screen.findByLabelText("번호 열에 연결할 사이로 항목")).not.toBeNull();
    cleanup();
    migrationState.batches.push(buildMockBatch({ batchId: 303, targetType: "CUSTOMER" }));
    openBatch(303);
    const select = (await screen.findByLabelText(
      "성명 열에 연결할 사이로 항목",
    )) as HTMLSelectElement;
    expect(within(select).getByRole("option", { name: "고객명 (필수)" })).not.toBeNull();
  });

  it("계약 종류는 연결할 항목이 없다는 안내를 보여준다", async () => {
    migrationState.batches.push(buildMockBatch({ batchId: 304, targetType: "CONTRACT" }));
    openBatch(304);
    expect(await screen.findByText(/연결할 수 있는 항목이 없습니다/)).not.toBeNull();
  });

  it("저장하면 미리보기 요약과 오류 행을 보여준다", async () => {
    const user = userEvent.setup();
    openBatch(302);
    await fillSourceSystem(user);
    await user.click(await screen.findByRole("button", { name: "매핑 확정하고 미리보기" }));
    expect(
      await screen.findByText("매핑을 저장했습니다. 미리보기를 확인해 주세요."),
    ).not.toBeNull();
    const summary = await screen.findByText("오류 행");
    expect(summary.nextElementSibling?.textContent).toBe("8");
    expect(screen.getByText("이 단계에서는 아무 데이터도 만들어지지 않습니다.")).not.toBeNull();
    expect(screen.getAllByText(/\[오류\] 고객명이 비어 있습니다./).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\[경고\]/).length).toBeGreaterThan(0);
    expect(screen.getByText(/오류가 있는 행은 실행할 때 이전되지 않고/)).not.toBeNull();
    expect(screen.getByText(/양셀-2026 C-11/)).not.toBeNull();
  });

  it("매핑 저장이 서버 검증에 실패하면 문구를 보여준다", async () => {
    server.use(
      http.put("/api/import-batches/:batchId/mapping", () => mockErrors.versionConflict(2)),
    );
    const user = userEvent.setup();
    openBatch(302);
    await fillSourceSystem(user);
    await user.click(await screen.findByRole("button", { name: "매핑 확정하고 미리보기" }));
    expect(await screen.findByText(/다른 곳에서 먼저 바뀌었습니다/)).not.toBeNull();
  });

  it("없는 파일이면 찾을 수 없음 화면을 보여준다", async () => {
    openBatch(9999);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("조회가 실패하면 다시 시도를 보여준다", async () => {
    server.use(http.get("/api/import-batches/:batchId", () => mockErrors.server()));
    openBatch(302);
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("대표가 아니면 권한 없음을 보여준다", () => {
    openBatch(302, { role: "AGENT" });
    expect(screen.getByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("유료 지원에 연결된 파일은 매핑과 실행을 잠그고 안내한다", async () => {
    const batch = migrationState.batches[1];
    if (batch) {
      batch.supportRequestId = 41;
      batch.supportRequestStatus = "PAID";
    }
    openBatch(302);
    expect(await screen.findByText(/유료 이전 지원 신청에 연결된 파일입니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "신청 보기" }).getAttribute("href")).toBe(
      "/import/support/41",
    );
    expect(
      screen.getByRole("button", { name: "매핑 확정하고 미리보기" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      (screen.getByLabelText("번호 열에 연결할 사이로 항목") as HTMLSelectElement).disabled,
    ).toBe(true);
  });

  it("지원 신청이 취소되면 다시 직접 작업할 수 있다", async () => {
    const batch = migrationState.batches[1];
    if (batch) {
      batch.supportRequestId = 41;
      batch.supportRequestStatus = "CANCELLED";
    }
    openBatch(302);
    await screen.findByLabelText("번호 열에 연결할 사이로 항목");
    expect(screen.queryByText(/유료 이전 지원 신청에 연결된 파일입니다/)).toBeNull();
  });

  it("읽기 전용이면 저장과 실행을 막고 안내한다", async () => {
    openBatch(302, { role: "OWNER", isReadOnly: true });
    expect(
      (await screen.findByRole("button", { name: "매핑 확정하고 미리보기" })).getAttribute(
        "aria-disabled",
      ),
    ).toBe("true");
    expect(screen.getByText(/읽기만 가능합니다/)).not.toBeNull();
  });
});

describe("시트 선택", () => {
  it("업로드 응답의 시트 목록으로 시트를 바꾸고 버전을 If-Match로 보낸다", async () => {
    const seen: Array<string | null> = [];
    server.use(
      http.put("/api/import-batches/:batchId/sheet", async ({ request }) => {
        seen.push(request.headers.get("If-Match"));
        return errorResponse(409, "VERSION_CONFLICT", "충돌", { currentVersion: 5 });
      }),
    );
    const user = userEvent.setup();
    const view = openBatch(302);
    view.queryClient.setQueryData(migrationKeys.sheets(302), {
      batchId: 302,
      status: "UPLOADED",
      fileName: "매물목록.csv",
      sheets: [
        { name: "고객", rowCount: 60, columnCount: 5 },
        { name: "메모", rowCount: 10, columnCount: 2 },
      ],
      selectedSheetName: "고객",
      officeId: 12,
      createdAt: "2026-11-10T09:00:00+09:00",
      updatedAt: "2026-11-10T09:00:00+09:00",
      version: 1,
    });
    await user.selectOptions(await screen.findByLabelText("이전할 시트"), "메모");
    await waitFor(() => expect(seen).toEqual(["1"]));
    expect(await screen.findByText(/다른 곳에서 먼저 바뀌었습니다/)).not.toBeNull();
  });
});

describe("시트 선택 다시 들어오기", () => {
  it("업로드 응답 없이 다시 열어도 상세 응답의 시트 목록으로 시트를 고를 수 있다", async () => {
    openBatch(302);
    const select = await screen.findByLabelText("이전할 시트");
    expect((select as HTMLSelectElement).value).toBe("고객");
  });

  it("매핑 확정에 상세 버전을 If-Match로 보낸다", async () => {
    const seen: Array<string | null> = [];
    server.use(
      http.put("/api/import-batches/:batchId/mapping", ({ request }) => {
        seen.push(request.headers.get("If-Match"));
        return errorResponse(409, "VERSION_CONFLICT", "충돌", { currentVersion: 5 });
      }),
    );
    const user = userEvent.setup();
    openBatch(302);
    await fillSourceSystem(user);
    await user.click(await screen.findByRole("button", { name: "매핑 확정하고 미리보기" }));
    await waitFor(() => expect(seen).toEqual(["1"]));
  });
});

describe("미리보기와 실행", () => {
  async function toPreview(user: ReturnType<typeof userEvent.setup>) {
    openBatch(302);
    await fillSourceSystem(user);
    await user.click(await screen.findByRole("button", { name: "매핑 확정하고 미리보기" }));
    await screen.findByText("이 단계에서는 아무 데이터도 만들어지지 않습니다.");
  }

  it("오류 행만 볼 수 있다", async () => {
    const user = userEvent.setup();
    await toPreview(user);
    const table = screen.getByRole("table", { name: "미리보기 행" });
    const before = within(table).getAllByRole("row").length;
    await user.click(screen.getByLabelText("오류 행만 보기 (현재 페이지)"));
    expect(within(table).getAllByRole("row").length).toBeLessThan(before);
    expect(within(table).queryByText(/\[경고\]/)).toBeNull();
  });

  it("페이지를 넘기면 다음 행을 불러온다", async () => {
    const user = userEvent.setup();
    await toPreview(user);
    expect(screen.getByText("2행")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /다음/ }));
    expect(await screen.findByText("27행")).not.toBeNull();
  });

  it("미리보기 조회가 실패하면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    openBatch(302);
    await fillSourceSystem(user);
    server.use(http.get("/api/import-batches/:batchId/preview", () => mockErrors.server()));
    await user.click(await screen.findByRole("button", { name: "매핑 확정하고 미리보기" }));
    expect(await screen.findAllByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("실행 전 확인을 거쳐 진행 상태가 갱신되고 완료 결과를 보여준다", async () => {
    const user = userEvent.setup();
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: "이전 실행" }));
    expect(
      screen.getByText(/60개 행을 이전합니다. 오류 행 8개는 이전되지 않습니다/),
    ).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "실행" }));
    const bar = await screen.findByRole("progressbar", { name: "이전 진행률" });
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeLessThan(100);
    expect(
      await screen.findByText("실패한 줄만 다시 처리", undefined, { timeout: 8000 }),
    ).not.toBeNull();
    expect(screen.getByText("실행 결과")).not.toBeNull();
    expect(migrationState.remainingThisMonth).toBe(2);
  }, 15000);

  it("횟수가 없으면 실행을 막고 안내한다", async () => {
    migrationState.remainingThisMonth = 0;
    const user = userEvent.setup();
    await toPreview(user);
    expect(await screen.findByText(/직접 실행 횟수를 모두 사용했습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "이전 실행" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("실행 요청이 한도 초과로 거절되면 문구를 보여준다", async () => {
    server.use(
      http.post("/api/import-batches/:batchId/execute", () =>
        errorResponse(429, "IMPORT_QUOTA_EXCEEDED", "한도"),
      ),
    );
    const user = userEvent.setup();
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: "이전 실행" }));
    await user.click(screen.getByRole("button", { name: "실행" }));
    expect(await screen.findByText(/이번 달 직접 실행 횟수를 모두 사용했습니다/)).not.toBeNull();
  });

  it("지원에 연결돼 거절되면 연결 안내를 보여준다", async () => {
    server.use(
      http.post("/api/import-batches/:batchId/execute", () =>
        errorResponse(409, "IMPORT_MANAGED_BY_SUPPORT", "지원"),
      ),
    );
    const user = userEvent.setup();
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: "이전 실행" }));
    await user.click(screen.getByRole("button", { name: "실행" }));
    expect(
      await screen.findByText(/유료 이전 지원에 연결된 파일이라 직접 매핑과 실행을 할 수 없습니다/),
    ).not.toBeNull();
  });
});

describe("실행 결과", () => {
  it("완료된 이전의 건수와 실패 사유를 보여준다", async () => {
    openBatch(301);
    expect(await screen.findByText("실행 결과")).not.toBeNull();
    expect(screen.getByText("55건")).not.toBeNull();
    expect(screen.getByText("5건이 형식 오류로 실패했습니다.")).not.toBeNull();
  });

  it("실패한 줄만 다시 처리하면 월 횟수를 더 쓰지 않는다", async () => {
    const user = userEvent.setup();
    openBatch(301);
    await user.click(await screen.findByRole("button", { name: "실패한 줄만 다시 처리" }));
    expect(await screen.findByText(/이번 달 실행 횟수는 더 사용하지 않습니다/)).not.toBeNull();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "실패한 줄만 다시 처리" })).toBeNull(),
    );
    expect(migrationState.remainingThisMonth).toBe(3);
  });

  it("취소하면 취소되지 않은 항목과 사유를 함께 보여준다", async () => {
    const user = userEvent.setup();
    openBatch(301);
    await user.click(await screen.findByRole("button", { name: "이전 취소" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "이전 취소" }));
    expect(await screen.findByText("55건을 취소했습니다.")).not.toBeNull();
    expect(screen.getByText(/고객 9001: 외부 연결이 생긴 항목/)).not.toBeNull();
  });

  it("취소할 수 없으면 사유 문구를 보여준다", async () => {
    server.use(
      http.post("/api/import-batches/:batchId/cancel", () =>
        errorResponse(409, "IMPORT_NOT_CANCELLABLE", "취소 불가"),
      ),
    );
    const user = userEvent.setup();
    openBatch(301);
    await user.click(await screen.findByRole("button", { name: "이전 취소" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "이전 취소" }));
    expect(await screen.findByText(/취소할 수 있는 기간이 지났거나/)).not.toBeNull();
  });

  it("취소 가능 시한이 지나면 취소 버튼을 막는다", async () => {
    const batch = migrationState.batches[0];
    if (batch) batch.detail.cancellableUntil = "2026-11-09T10:30:00+09:00";
    openBatch(301);
    expect(await screen.findByText("취소할 수 있는 기간이 지났습니다.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "이전 취소" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });
});
