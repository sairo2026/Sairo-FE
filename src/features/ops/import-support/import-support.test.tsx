// @vitest-environment jsdom
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { finishMockImportExecution, resetMockImportSupport } from "@/mocks/handlers/ops-migration";
import { resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { ImportSupportDetailScreen } from "./import-support-detail";
import { ImportSupportListScreen } from "./import-support-list";
import { validateMapping, validateQuote } from "./import-support-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/import-support",
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
  resetMockImportSupport();
  vi.restoreAllMocks();
});
afterAll(() => stopServer());

function renderList(roles: OpsRole[] = ["MIGRATION"]) {
  return renderOpsScreen(<ImportSupportListScreen />, roles);
}

function renderDetail(requestId: number, roles: OpsRole[] = ["MIGRATION"]) {
  return renderOpsScreen(<ImportSupportDetailScreen requestId={requestId} />, roles);
}

async function openDetail(requestId: number) {
  const view = renderDetail(requestId);
  await screen.findByText("신청 정보");
  return { user: userEvent.setup(), ...view };
}

describe("이전 지원 목록", () => {
  it("로딩 뒤 신청 목록을 보인다", async () => {
    renderList();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByRole("link", { name: "401" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "412" })).toBeTruthy();
  });

  it("견적 금액은 천 단위와 원으로 보이고 없으면 대시다", async () => {
    renderList();
    await screen.findByRole("link", { name: "402" });
    expect(screen.getAllByText("220,000원").length).toBeGreaterThan(0);
  });

  it("상태 필터로 결제 완료 건만 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "401" });
    await user.selectOptions(screen.getByLabelText("상태"), "PAID");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByRole("link", { name: "404" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "401" })).toBeNull();
  });

  it("내가 담당 필터는 담당 건만 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "401" });
    await user.selectOptions(screen.getByLabelText("담당"), "true");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByRole("link", { name: "405" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "404" })).toBeNull();
    expect(screen.queryByRole("link", { name: "412" })).toBeNull();
  });

  it("해당 신청이 없으면 빈 목록 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "401" });
    await user.selectOptions(screen.getByLabelText("상태"), "CANCELLED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 이전 지원 신청이 없습니다.")).toBeTruthy();
  });

  it("초기화하면 필터가 풀린다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "401" });
    await user.selectOptions(screen.getByLabelText("상태"), "PAID");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await screen.findByRole("link", { name: "404" });
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByRole("link", { name: "401" })).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/import-support-requests", () => (fail ? mockErrors.server() : undefined)),
    );
    renderList();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: "401" })).toBeTruthy();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/import-support-requests", () => mockErrors.rateLimited(30)));
    renderList();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 돌려주면 접근 불가를 알린다", async () => {
    server.use(http.get("/api/ops/import-support-requests", () => mockErrors.forbidden()));
    renderList();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("이전담당이 아니면 화면 대신 접근 불가 안내를 보인다", () => {
    renderList(["SUPPORT"]);
    expect(screen.getByRole("alert").textContent).toContain("이전담당");
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("견적 입력 검증", () => {
  it("빈 금액과 숫자가 아닌 금액과 0원을 거른다", () => {
    expect(validateQuote({ amount: "", scopeNote: "" }).amount).toContain("입력");
    expect(validateQuote({ amount: "22만", scopeNote: "" }).amount).toContain("숫자");
    expect(validateQuote({ amount: "0", scopeNote: "" }).amount).toContain("0원보다");
    expect(validateQuote({ amount: "999999999999", scopeNote: "" }).amount).toContain(
      "너무 큽니다",
    );
  });

  it("쉼표가 섞인 금액은 숫자로 읽고 범위 비고 길이를 제한한다", () => {
    expect(validateQuote({ amount: "220,000", scopeNote: "" }).value).toBe(220000);
    const long = validateQuote({ amount: "1000", scopeNote: "가".repeat(501) });
    expect(long.scopeNote).toContain("500자");
    expect(long.value).toBeNull();
  });

  it("매핑은 필수 대상 필드와 중복 연결을 검사한다", () => {
    expect(validateMapping({ 성명: "customerName" }, "CUSTOMER")).toEqual([
      "원본 고객 ID은 반드시 한 열에 연결해야 합니다.",
    ]);
    const problems = validateMapping(
      { 고객번호: "customerSourceId", 성명: "customerName", 이름: "customerName" },
      "CUSTOMER",
    );
    expect(problems).toEqual(["고객명에 연결된 원본 열이 둘 이상입니다."]);
    expect(
      validateMapping({ 고객번호: "customerSourceId", 성명: "customerName" }, "CUSTOMER"),
    ).toEqual([]);
  });
});

describe("요청 단계 상세", () => {
  it("매핑 확정 전이라 업로드 행 수가 비어 있어도 상세를 연다", async () => {
    await openDetail(401);
    const row = screen.getByText("업로드 행 수").parentElement;
    expect(row?.textContent).toContain("-");
  });
});

describe("견적 제시", () => {
  it("요청됨 상태는 기본 22만 원과 표준 범위 안내를 보인다", async () => {
    await openDetail(401);
    expect((screen.getByLabelText("견적 금액(원, VAT 포함)") as HTMLInputElement).value).toBe(
      "220000",
    );
    expect(screen.getByText(/원본 시스템 1종, 최대 5만 레코드, 수정요청 1회입니다/)).toBeTruthy();
    expect(screen.getByText(/부가세 포함 220,000원/)).toBeTruthy();
  });

  it("금액이 비어 있으면 서버에 보내지 않고 안내한다", async () => {
    const { user } = await openDetail(401);
    const spy = vi.fn();
    server.use(
      http.post("/api/ops/import-support-requests/:id/quote", () => {
        spy();
        return undefined;
      }),
    );
    await user.clear(screen.getByLabelText("견적 금액(원, VAT 포함)"));
    await user.click(screen.getByRole("button", { name: "견적 제시" }));
    expect(await screen.findByText("견적 금액을 입력해 주세요.")).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("숫자가 아닌 글자는 입력되지 않아 빈 금액으로 안내한다", async () => {
    const { user } = await openDetail(401);
    await user.clear(screen.getByLabelText("견적 금액(원, VAT 포함)"));
    await user.type(screen.getByLabelText("견적 금액(원, VAT 포함)"), "abc");
    await user.click(screen.getByRole("button", { name: "견적 제시" }));
    expect(await screen.findByText("견적 금액을 입력해 주세요.")).toBeTruthy();
  });

  it("견적을 제시하면 안내하고 상태가 견적됨으로 바뀐다", async () => {
    const { user } = await openDetail(401);
    await user.clear(screen.getByLabelText("견적 금액(원, VAT 포함)"));
    await user.type(screen.getByLabelText("견적 금액(원, VAT 포함)"), "330000");
    await user.click(screen.getByRole("button", { name: "견적 제시" }));
    expect(await screen.findByText(/견적을 제시했습니다/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText("330,000원")).toBeTruthy());
    expect(screen.getByRole("button", { name: "견적 다시 제시" })).toBeTruthy();
  });

  it("견적됨 상태에서도 다시 제시할 수 있고 현재 견적이 채워진다", async () => {
    await openDetail(402);
    expect((screen.getByLabelText("견적 금액(원, VAT 포함)") as HTMLInputElement).value).toBe(
      "220000",
    );
    expect(screen.getByRole("button", { name: "견적 다시 제시" })).toBeTruthy();
  });

  it("견적 수락 뒤 신청은 견적과 거절 영역이 없다", async () => {
    await openDetail(403);
    expect(screen.queryByRole("button", { name: /견적/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "신청 거절" })).toBeNull();
  });

  it("서버가 상태 전이 오류를 주면 안내한다", async () => {
    server.use(
      http.post("/api/ops/import-support-requests/:id/quote", () =>
        errorResponse(409, "INVALID_TRANSITION", "이미 수락됨"),
      ),
    );
    const { user } = await openDetail(401);
    await user.click(screen.getByRole("button", { name: "견적 제시" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("다른 운영자가 먼저 수정했으면 버전 충돌을 안내한다", async () => {
    server.use(
      http.post("/api/ops/import-support-requests/:id/quote", () => mockErrors.versionConflict(9)),
    );
    const { user } = await openDetail(401);
    await user.click(screen.getByRole("button", { name: "견적 제시" }));
    expect(await screen.findByText(/다른 운영자가 먼저 수정했습니다/)).toBeTruthy();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(
      http.post("/api/ops/import-support-requests/:id/quote", () => mockErrors.rateLimited(20)),
    );
    const { user } = await openDetail(401);
    await user.click(screen.getByRole("button", { name: "견적 제시" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("신청 거절", () => {
  it("거절하면 대표의 직접 권한이 돌아온다는 안내를 보인다", async () => {
    await openDetail(401);
    expect(screen.getByText(/대표의 직접 매핑·실행\s*권한이 바로 돌아옵니다/)).toBeTruthy();
  });

  it("사유가 없으면 거절 버튼이 막히고 사유를 쓰면 거절된다", async () => {
    const { user } = await openDetail(401);
    await user.click(screen.getByRole("button", { name: "신청 거절" }));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "거절" });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    expect(within(dialog).getByText(/대표에게 바로 돌아옵니다/)).toBeTruthy();
    await user.type(within(dialog).getByLabelText("거절 사유(대표에게 표시)"), "범위를 넘습니다");
    await user.click(submit);
    expect(await screen.findByText(/신청을 거절했습니다/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText("범위를 넘습니다")).toBeTruthy());
  });

  it("이미 수락된 신청이면 409를 안내한다", async () => {
    server.use(
      http.post("/api/ops/import-support-requests/:id/reject", () =>
        errorResponse(409, "INVALID_TRANSITION", "수락됨"),
      ),
    );
    const { user } = await openDetail(402);
    await user.click(screen.getByRole("button", { name: "신청 거절" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("거절 사유(대표에게 표시)"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "거절" }));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("거절된 건은 거절 사유를 보이고 처리 영역이 없다", async () => {
    await openDetail(411);
    expect(screen.getAllByText("표준 범위를 넘는 이전 요청입니다.").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "신청 거절" })).toBeNull();
    expect(screen.queryByRole("button", { name: "처리 시작" })).toBeNull();
  });
});

describe("처리 시작과 매핑 편집", () => {
  it("결제 완료 건은 처리 시작 뒤 매핑 편집이 열린다", async () => {
    const { user } = await openDetail(404);
    await user.click(screen.getByRole("button", { name: "처리 시작" }));
    expect(await screen.findByText("처리를 시작했습니다.")).toBeTruthy();
    expect(await screen.findByLabelText("원본 열 성명")).toBeTruthy();
    expect(screen.getAllByText("운영 김사이").length).toBeGreaterThan(0);
  });

  it("처리 시작이 실패하면 안내한다", async () => {
    server.use(
      http.post("/api/ops/import-support-requests/:id/start", () =>
        errorResponse(409, "INVALID_TRANSITION", "결제 전"),
      ),
    );
    const { user } = await openDetail(404);
    await user.click(screen.getByRole("button", { name: "처리 시작" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("원본 열은 상세 응답의 열 이름 목록으로 만든다", async () => {
    await openDetail(405);
    for (const column of ["고객번호", "성명", "연락처", "메모"]) {
      expect(screen.getByLabelText(`원본 열 ${column}`)).toBeTruthy();
    }
    expect((screen.getByLabelText("원본 열 성명") as HTMLSelectElement).value).toBe("customerName");
  });

  it("필수 필드를 연결하지 않으면 저장하지 않고 안내한다", async () => {
    const { user } = await openDetail(405);
    await user.selectOptions(screen.getByLabelText("원본 열 고객번호"), "");
    await user.click(screen.getByRole("button", { name: "매핑 저장" }));
    expect(await screen.findByText(/원본 고객 ID은 반드시 한 열에 연결해야 합니다/)).toBeTruthy();
  });

  it("같은 대상 필드에 두 열을 연결하면 안내한다", async () => {
    const { user } = await openDetail(405);
    await user.selectOptions(screen.getByLabelText("원본 열 메모"), "customerName");
    await user.click(screen.getByRole("button", { name: "매핑 저장" }));
    expect(await screen.findByText("고객명에 연결된 원본 열이 둘 이상입니다.")).toBeTruthy();
  });

  it("저장하면 새 매핑 버전이 이력에 쌓인다", async () => {
    const { user } = await openDetail(405);
    expect(screen.getByText(/버전 1 ·/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("원본 열 메모"), "customerMemo");
    await user.click(screen.getByRole("button", { name: "매핑 저장" }));
    expect(await screen.findByText("새 매핑 버전을 저장했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/버전 2 ·/)).toBeTruthy());
    expect(screen.getByText(/버전 1 ·/)).toBeTruthy();
  });

  it("대상 종류를 바꾸면 연결이 비워지고 대상 필드 목록이 바뀐다", async () => {
    const { user } = await openDetail(405);
    await user.selectOptions(screen.getByLabelText("대상 종류"), "PROPERTY");
    expect((screen.getByLabelText("원본 열 성명") as HTMLSelectElement).value).toBe("");
    const options = within(screen.getByLabelText("원본 열 성명")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toContain("매물명 (필수)");
  });

  it("저장 중 버전 충돌은 안내한다", async () => {
    server.use(
      http.put("/api/ops/import-support-requests/:id/mapping", () => mockErrors.versionConflict(9)),
    );
    const { user } = await openDetail(405);
    await user.click(screen.getByRole("button", { name: "매핑 저장" }));
    expect(await screen.findByText(/다른 운영자가 먼저 수정했습니다/)).toBeTruthy();
  });

  it("서버가 허용하지 않은 대상 필드는 입력 오류로 안내한다", async () => {
    server.use(
      http.put("/api/ops/import-support-requests/:id/mapping", () =>
        mockErrors.validation([
          { field: "mappings[].targetField", message: "허용되지 않는 대상 필드입니다." },
        ]),
      ),
    );
    const { user } = await openDetail(405);
    await user.click(screen.getByRole("button", { name: "매핑 저장" }));
    expect(await screen.findByText("입력값을 확인해 주세요.")).toBeTruthy();
  });

  it("담당이 아닌 건은 편집 대신 안내만 보인다", async () => {
    await openDetail(412);
    expect(screen.getByText("담당 운영자만 매핑을 편집할 수 있습니다.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "매핑 저장" })).toBeNull();
    expect(screen.queryByRole("button", { name: "검수 제출" })).toBeNull();
  });
});

describe("미리보기 요약", () => {
  it("요약 건수를 보이고 원본 값은 표시하지 않는다는 안내를 둔다", async () => {
    await openDetail(405);
    expect(screen.getByText("대상 행 수")).toBeTruthy();
    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getAllByText(/원본 값은/).length).toBeGreaterThan(0);
  });

  it("값 열람은 원문 접근 승인 요청 화면으로 연결한다", async () => {
    await openDetail(405);
    const link = screen.getByRole("link", { name: "원문 접근 승인 요청" });
    expect(link.getAttribute("href")).toBe(
      "/ops/raw-access/new?targetType=IMPORT_BATCH&targetId=35",
    );
  });

  it("매핑이 없으면 미리보기가 없다고 안내한다", async () => {
    const { user } = await openDetail(404);
    await user.click(screen.getByRole("button", { name: "처리 시작" }));
    expect(await screen.findByText("아직 미리보기가 만들어지지 않았습니다.")).toBeTruthy();
  });
});

describe("대표 검수", () => {
  it("검수 제출 뒤에는 매핑 편집이 잠기고 안내를 보인다", async () => {
    const { user } = await openDetail(405);
    await user.click(screen.getByRole("button", { name: "검수 제출" }));
    expect(await screen.findByText("대표 검수에 제출했습니다.")).toBeTruthy();
    expect(await screen.findByText(/대표 검수 중에는 매핑을 편집할 수 없습니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "매핑 저장" })).toBeNull();
  });

  it("매핑이 없으면 검수 제출을 막고 안내한다", async () => {
    server.use(
      http.post("/api/ops/import-support-requests/:id/submit-review", () =>
        errorResponse(409, "MAPPING_REQUIRED", "확정된 매핑이 없습니다."),
      ),
    );
    const { user } = await openDetail(405);
    await user.click(screen.getByRole("button", { name: "검수 제출" }));
    expect(await screen.findByText("확정된 매핑이 없습니다.")).toBeTruthy();
  });

  it("대표의 수정 요청 내용과 횟수를 보인다", async () => {
    await openDetail(406);
    expect(screen.getByText("대표의 수정 요청")).toBeTruthy();
    expect(screen.getByText("연락처 열을 보조 연락처로 바꿔 주세요.")).toBeTruthy();
    expect(screen.getByText("1회 (표준 범위는 1회)")).toBeTruthy();
  });

  it("수정 요청이 없으면 수정 요청 영역이 없다", async () => {
    await openDetail(405);
    expect(screen.queryByText("대표의 수정 요청")).toBeNull();
  });
});

describe("승인 뒤 실행과 납품", () => {
  it("승인한 뒤에는 매핑 편집이 막힌다는 안내와 승인 버전을 보인다", async () => {
    await openDetail(408);
    expect(screen.getByText(/대표가 승인한 뒤에는 매핑을 편집할 수 없습니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "매핑 저장" })).toBeNull();
    expect(screen.getByRole("table", { name: "현재 매핑" })).toBeTruthy();
  });

  it("승인한 버전으로 실행하면 실행 중 상태를 보이고 납품은 아직 막혀 있다", async () => {
    const { user } = await openDetail(408);
    await user.click(screen.getByRole("button", { name: "승인한 버전으로 실행" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/매핑 버전 1으로 이전을 실행합니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "실행" }));
    expect(await screen.findByText("이전 실행을 시작했습니다.")).toBeTruthy();
    expect(await screen.findByText(/이전을 실행하는 중입니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "승인한 버전으로 실행" })).toBeNull();
    expect(screen.queryByRole("button", { name: "납품 확인" })).toBeNull();
  });

  it("실행이 끝나면 납품 확인 버튼이 열린다", async () => {
    const { user, queryClient } = await openDetail(408);
    await user.click(screen.getByRole("button", { name: "승인한 버전으로 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    await screen.findByText(/이전을 실행하는 중입니다/);
    finishMockImportExecution(408);
    await act(async () => {
      await queryClient.invalidateQueries();
    });
    expect(await screen.findByRole("button", { name: "납품 확인" })).toBeTruthy();
  });

  it("승인한 매핑 버전과 다르면 실행 거부를 안내한다", async () => {
    server.use(
      http.post("/api/ops/import-support-requests/:id/execute", () =>
        errorResponse(409, "APPROVED_MAPPING_MISMATCH", "승인한 버전과 최신 버전이 다릅니다."),
      ),
    );
    const { user } = await openDetail(408);
    await user.click(screen.getByRole("button", { name: "승인한 버전으로 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "실행" }));
    expect(await screen.findByText("승인한 버전과 최신 버전이 다릅니다.")).toBeTruthy();
  });

  it("실행 완료 건은 납품을 확인하면 납품 완료가 된다", async () => {
    const { user } = await openDetail(409);
    expect(screen.getByText("실행 완료")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "납품 확인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "납품 확인" }));
    expect(await screen.findByText("납품을 확인했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "납품 확인" })).toBeNull());
    expect(screen.getAllByText("납품 완료").length).toBeGreaterThan(0);
  });

  it("납품 확인이 409면 상태 전이 오류를 안내한다", async () => {
    server.use(
      http.post("/api/ops/import-support-requests/:id/deliver", () =>
        errorResponse(409, "INVALID_TRANSITION", "실행 중"),
      ),
    );
    const { user } = await openDetail(409);
    await user.click(screen.getByRole("button", { name: "납품 확인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "납품 확인" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리/)).toBeTruthy();
  });

  it("납품 완료 건은 처리 버튼이 없다", async () => {
    await openDetail(410);
    expect(screen.queryByRole("button", { name: "납품 확인" })).toBeNull();
    expect(screen.queryByRole("button", { name: "승인한 버전으로 실행" })).toBeNull();
  });
});

describe("이전 지원 상세 상태", () => {
  it("로딩 중에는 로딩 표시를 보인다", () => {
    renderDetail(405);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("없는 신청은 찾을 수 없음 화면을 보인다", async () => {
    renderDetail(999);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("서버 오류는 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/import-support-requests/:id", () =>
        fail ? mockErrors.server() : undefined,
      ),
    );
    renderDetail(405);
    await user.click(await screen.findByRole("button", { name: "다시 시도" }));
    fail = false;
    await user.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("신청 정보")).toBeTruthy();
  });

  it("요청 한도를 넘으면 안내한다", async () => {
    server.use(http.get("/api/ops/import-support-requests/:id", () => mockErrors.rateLimited(30)));
    renderDetail(405);
    expect((await screen.findAllByText(/너무 많습니다/)).length).toBeGreaterThan(0);
  });

  it("서버가 403을 돌려주면 접근 불가 화면을 보인다", async () => {
    server.use(http.get("/api/ops/import-support-requests/:id", () => mockErrors.forbidden()));
    renderDetail(405);
    expect(await screen.findByRole("heading", { name: /접근|권한/ })).toBeTruthy();
  });

  it("이전담당이 아니면 상세 대신 접근 불가 안내를 보인다", () => {
    renderDetail(405, ["REVIEW"]);
    expect(screen.getByRole("alert").textContent).toContain("이전담당");
  });
});
