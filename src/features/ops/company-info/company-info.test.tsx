// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { opsPriceScheduleHandlers, resetMockOpsContent } from "@/mocks/handlers/ops-content";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { CompanyInfoScreen } from "./company-info-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/company-info",
  useSearchParams: () => new URLSearchParams(),
}));

const INTEGRATIONS = {
  items: [
    {
      integrationId: 1,
      environment: "TEST",
      provider: "예시 메일 공급자",
      functionCode: "EMAIL",
      enabled: true,
      secretReferenceId: "ref-1",
      maskedConnection: "****",
      processingRegion: "KR",
      retentionPolicy: "발송 후 90일",
      contractStatus: "SIGNED",
      consentStatus: "NOT_REQUIRED",
      contractNoticeReviewedAt: null,
      lastCheckResult: "SUCCESS",
      lastSuccessAt: null,
      assignedOperatorId: null,
      approvedByOperatorId: 1,
    },
    {
      integrationId: 2,
      environment: "PRODUCTION",
      provider: "예시 결제 공급자",
      functionCode: "PAYMENT",
      enabled: false,
      secretReferenceId: "ref-2",
      maskedConnection: "****",
      processingRegion: null,
      retentionPolicy: "5년",
      contractStatus: "PENDING",
      consentStatus: "PENDING",
      contractNoticeReviewedAt: null,
      lastCheckResult: "NOT_TESTED",
      lastSuccessAt: null,
      assignedOperatorId: null,
      approvedByOperatorId: 1,
    },
  ],
  page: 0,
  size: 25,
  totalElements: 2,
};

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
beforeEach(() => {
  server.use(
    ...opsPriceScheduleHandlers,
    http.get("/api/ops/integrations", () => Response.json(INTEGRATIONS)),
  );
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOpsSession();
  resetMockOpsContent();
});
afterAll(() => stopServer());

function renderScreen(roles: OpsRole[] = ["OPS"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<CompanyInfoScreen />, roles);
}

async function loaded(roles: OpsRole[] = ["OPS"]) {
  const view = renderScreen(roles);
  await screen.findByRole("heading", { name: "출시 준비 상태" });
  return view;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function value(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

function dayString(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

describe("출시 준비 상태", () => {
  it("수신 시험과 검토가 없으면 출시 활성화가 차단되고 빠진 항목을 보인다", async () => {
    await loaded();
    expect(screen.getByText("출시 활성화 차단")).toBeTruthy();
    const missing = screen.getByRole("list", { name: "빠진 항목" });
    expect(within(missing).getByText("실제 문의 수신 시험")).toBeTruthy();
    expect(within(missing).getByText("검토")).toBeTruthy();
    expect(screen.getByText(/필수 정보 게시와 실제 문의 수신 시험이 끝나기 전에는/)).toBeTruthy();
  });

  it("게시된 버전이 없으면 게시 버전이 빠졌다고 보이고 시험을 기록할 수 없다", async () => {
    server.use(
      http.get("/api/ops/company-service-info", () =>
        Response.json({
          items: [],
          launchReady: false,
          missingItems: ["PUBLISHED_VERSION"],
          page: 0,
          size: 100,
          totalElements: 0,
        }),
      ),
    );
    await loaded();
    expect(
      within(screen.getByRole("list", { name: "빠진 항목" })).getByText("게시된 회사 정보 버전"),
    ).toBeTruthy();
    expect(
      screen.getByText("게시된 회사 정보가 없습니다. 아래에서 먼저 게시해 주세요."),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "수신 시험 성공 기록" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "수신 시험 실패 기록" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(value("상호")).toBe("");
  });

  it("수신 시험 성공을 기록하면 출시 준비 완료가 된다", async () => {
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "수신 시험 성공 기록" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/support@example.com/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await screen.findByText("실제 문의 수신 시험 성공을 기록했습니다.")).toBeTruthy();
    expect(await screen.findByText("출시 준비 완료")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "빠진 항목" })).toBeNull();
  });

  it("수신 시험 실패를 기록하면 수신 시험이 계속 빠진다", async () => {
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "수신 시험 실패 기록" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "기록" }));
    expect(await screen.findByText(/수신 시험 실패를 기록했습니다/)).toBeTruthy();
    const missing = await screen.findByRole("list", { name: "빠진 항목" });
    expect(within(missing).getByText("실제 문의 수신 시험")).toBeTruthy();
    expect(within(missing).queryByText("검토")).toBeNull();
    expect(screen.getByText("출시 활성화 차단")).toBeTruthy();
  });

  it("시험 결과는 성공과 실패로 보낸다", async () => {
    let sent: unknown = null;
    server.use(
      http.post("/api/ops/company-service-info/1/inquiry-test", async ({ request }) => {
        sent = await request.clone().json();
        return undefined;
      }),
    );
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "수신 시험 성공 기록" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "기록" }));
    await screen.findByText("실제 문의 수신 시험 성공을 기록했습니다.");
    expect(sent).toEqual({ result: "SUCCESS" });
  });

  it("시험 기록이 404이면 안내한다", async () => {
    server.use(
      http.post("/api/ops/company-service-info/1/inquiry-test", () => mockErrors.notFound()),
    );
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "수신 시험 성공 기록" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "기록" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("시험 기록이 429이면 한도 안내를 보인다", async () => {
    server.use(
      http.post("/api/ops/company-service-info/1/inquiry-test", () => mockErrors.rateLimited(10)),
    );
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "수신 시험 성공 기록" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "기록" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("시험 기록 대화상자를 취소하면 요청하지 않는다", async () => {
    let called = false;
    server.use(
      http.post("/api/ops/company-service-info/1/inquiry-test", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "수신 시험 성공 기록" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(called).toBe(false);
  });
});

describe("로딩과 오류", () => {
  it("불러오는 동안 로딩 표시를 보인다", () => {
    server.use(http.get("/api/ops/company-service-info", () => delay("infinite")));
    renderScreen();
    expect(screen.getByText("회사 정보를 불러오는 중입니다")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/ops/company-service-info", () => mockErrors.server(), { once: true }),
    );
    renderScreen();
    expect(await screen.findByText("문제가 발생했습니다")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("heading", { name: "출시 준비 상태" })).toBeTruthy();
  });

  it("조회가 403이면 접근 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/company-service-info", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText("접근 권한이 없습니다")).toBeTruthy();
  });

  it("조회가 429이면 한도 안내를 보인다", async () => {
    server.use(http.get("/api/ops/company-service-info", () => mockErrors.rateLimited(30)));
    renderScreen();
    expect(await screen.findByText("요청이 너무 많습니다")).toBeTruthy();
  });

  it("운영담당이 아니면 화면을 열 수 없다", () => {
    renderScreen(["BILLING"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });
});

describe("입력 항목과 안내", () => {
  it("법률 문구의 항목명을 입력 필드로 보이고 현재 게시값으로 채운다", async () => {
    await loaded();
    expect(value("상호")).toBe("예시 주식회사");
    expect(value("대표자")).toBe("홍길동");
    expect(value("사업자등록번호")).toBe("000-00-00000");
    expect(value("통신판매업 신고번호(해당 시)")).toBe("");
    expect(value("주소")).toBe("서울특별시 예시구 예시로 1");
    expect(value("연락처(전화)")).toBe("02-0000-0000");
    expect(value("지원 이메일")).toBe("support@example.com");
    expect(value("운영시간")).toBe("평일 09:00-18:00");
    expect(value("긴급 연락 경로")).toBe("02-0000-0001");
    expect(value("개인정보 책임자")).toBe("예시 책임자");
    expect(value("개인정보 담당 연락처")).toBe("privacy@example.com");
    expect(value("권리 요청 접수 경로")).toBe("설정 > 개인정보 요청");
    expect(value("구독 해지 경로")).toBe("설정 > 구독 > 해지 예약");
  });

  it("공개 노출, 신고번호 생략, 변호사 검토 전 초안 안내를 보인다", async () => {
    await loaded();
    expect(
      screen.getByText("입력한 값은 공개 요금 페이지와 공개 사이트 하단에 그대로 노출됩니다."),
    ).toBeTruthy();
    expect(
      screen.getByText("통신판매업 신고번호가 비어 있으면 공개 하단에서 그 줄이 사라집니다."),
    ).toBeTruthy();
    expect(
      screen.getByText("필수 정보 게시와 실제 문의 수신 시험 전에는 출시 활성화가 차단됩니다."),
    ).toBeTruthy();
    expect(
      screen.getByText(/변호사 검토 전 초안이며 법적 효력과 적합성은 검토 뒤 확정합니다/),
    ).toBeTruthy();
  });

  it("신고번호가 비어 있으면 노출 미리보기에서 그 줄이 빠진다", async () => {
    await loaded();
    const preview = screen.getByLabelText("공개 하단 사업자 정보");
    expect(preview.textContent).toContain(
      "상호 예시 주식회사 | 대표 홍길동 | 사업자등록번호 000-00-00000",
    );
    expect(preview.textContent).toContain("이메일 support@example.com");
    expect(preview.textContent).not.toContain("통신판매업 신고번호");
  });

  it("신고번호를 입력하면 미리보기에 바로 나타난다", async () => {
    await loaded();
    fill("통신판매업 신고번호(해당 시)", "제0000-서울예시-0000호");
    expect(screen.getByLabelText("공개 하단 사업자 정보").textContent).toContain(
      "통신판매업 신고번호 제0000-서울예시-0000호",
    );
  });

  it("값을 바꾸면 미리보기가 따라 바뀐다", async () => {
    await loaded();
    fill("상호", "다른 예시 상호");
    expect(screen.getByLabelText("공개 하단 사업자 정보").textContent).toContain(
      "상호 다른 예시 상호",
    );
  });
});

describe("게시", () => {
  it("새 버전으로 게시하면 수신 시험과 검토를 다시 기록해야 한다", async () => {
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "수신 시험 성공 기록" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "기록" }));
    await screen.findByText("출시 준비 완료");
    fill("상호", "예시 주식회사 2");
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    expect(await screen.findByText(/회사 정보 2판을 게시했습니다/)).toBeTruthy();
    expect(await screen.findByText("출시 활성화 차단")).toBeTruthy();
    expect(screen.getByText("2판")).toBeTruthy();
  });

  it("신고번호를 비우면 null로 보낸다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/company-service-info", async ({ request }) => {
        sent = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    await screen.findByText(/회사 정보 2판을 게시했습니다/);
    expect(sent.ecommerceNotice).toBeNull();
    expect(sent.businessNumber).toBe("000-00-00000");
  });

  it("필수 항목이 비면 항목별로 안내하고 요청하지 않는다", async () => {
    const user = userEvent.setup();
    await loaded();
    fill("상호", "");
    fill("주소", "");
    fill("구독 해지 경로", "");
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    expect(screen.getByText("상호을(를) 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("주소을(를) 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("구독 해지 경로을(를) 입력해 주세요.")).toBeTruthy();
    expect(screen.queryByText(/회사 정보 2판을 게시했습니다/)).toBeNull();
  });

  it("사업자등록번호와 지원 이메일 형식을 검사한다", async () => {
    const user = userEvent.setup();
    await loaded();
    fill("사업자등록번호", "12-34");
    fill("지원 이메일", "support-at-example");
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    expect(screen.getByText("사업자등록번호는 숫자 10자리로 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("지원 이메일 형식이 올바르지 않습니다.")).toBeTruthy();
  });

  it("글자 수 제한을 검사한다", async () => {
    const user = userEvent.setup();
    await loaded();
    fill("대표자", "가".repeat(101));
    fill("통신판매업 신고번호(해당 시)", "나".repeat(101));
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    expect(screen.getByText("대표자은(는) 100자 이내로 입력해 주세요.")).toBeTruthy();
    expect(
      screen.getByText("통신판매업 신고번호(해당 시)은(는) 100자 이내로 입력해 주세요."),
    ).toBeTruthy();
  });

  it("서버 400이면 필드 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/company-service-info", () =>
        mockErrors.validation([{ field: "supportEmail", message: "지원 이메일을 확인해 주세요." }]),
      ),
    );
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    expect(await screen.findByText("지원 이메일을 확인해 주세요.")).toBeTruthy();
  });

  it("게시가 403이면 역할 안내를 보인다", async () => {
    server.use(http.post("/api/ops/company-service-info", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("게시가 422이면 서버 메시지를 보인다", async () => {
    server.use(
      http.post("/api/ops/company-service-info", () =>
        errorResponse(422, "UNPROCESSABLE", "게시할 수 없는 회사 정보입니다."),
      ),
    );
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    expect(await screen.findByText("게시할 수 없는 회사 정보입니다.")).toBeTruthy();
  });

  it("게시가 429이면 한도 안내를 보인다", async () => {
    server.use(http.post("/api/ops/company-service-info", () => mockErrors.rateLimited(10)));
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "새 버전으로 게시" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("수탁 정보", () => {
  it("연동 설정 값을 보여주고 편집은 연동 설정으로 안내한다", async () => {
    await loaded();
    const table = await screen.findByRole("table", { name: "수탁 정보 목록" });
    expect(await within(table).findByText("예시 메일 공급자")).toBeTruthy();
    expect(within(table).getByText("발송 후 90일")).toBeTruthy();
    expect(within(table).getByText("체결")).toBeTruthy();
    expect(within(table).getByText("동의 대기")).toBeTruthy();
    expect(within(table).getByText("KR")).toBeTruthy();
    expect(screen.getByRole("link", { name: "연동 설정" }).getAttribute("href")).toBe(
      "/ops/integrations",
    );
    expect(screen.queryByText("ref-1")).toBeNull();
  });

  it("연동 조회가 실패하면 표 안에서 오류와 다시 시도를 보인다", async () => {
    server.use(http.get("/api/ops/integrations", () => mockErrors.server()));
    await loaded();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
  });
});

describe("요금과 환불 안내", () => {
  it("결제담당이 없으면 요금표는 조회하지 못하지만 환불 안내는 보인다", async () => {
    await loaded(["OPS"]);
    expect(await screen.findByText("요금표는 결제담당만 조회할 수 있습니다.")).toBeTruthy();
    expect(
      await screen.findByText(/해지를 신청하면 다음 결제일부터 결제되지 않습니다/),
    ).toBeTruthy();
    expect(screen.getByText("게시 버전 1.0")).toBeTruthy();
  });

  it("결제담당이 있으면 시행 중인 요금표를 그대로 보인다", async () => {
    await loaded(["OPS", "BILLING"]);
    const section = screen.getByRole("region", { name: "시행 중인 요금" });
    expect(await within(section).findByText("2026-09-STD")).toBeTruthy();
    expect(within(section).getByText("39,900원")).toBeTruthy();
    expect(within(section).getByText("10,000원")).toBeTruthy();
    expect(within(section).getByText("8,000원")).toBeTruthy();
  });

  it("요금표 조회가 실패하면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/price-schedules", () => mockErrors.forbidden(), { once: true }));
    await loaded(["OPS", "BILLING"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "요금표 다시 시도" }));
    expect(await screen.findByText("2026-09-STD")).toBeTruthy();
  });

  it("게시된 환불 정책 문서가 없으면 안내한다", async () => {
    server.use(
      http.get("/api/ops/policy-documents", () =>
        Response.json({ items: [], page: 0, size: 100, totalElements: 0 }),
      ),
    );
    await loaded();
    expect(await screen.findByText("게시된 환불 정책 문서가 없습니다.")).toBeTruthy();
  });

  it("환불 정책 문서 조회가 실패하면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/policy-documents", () => mockErrors.server(), { once: true }));
    await loaded();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "환불 정책 다시 시도" }));
    expect(await screen.findByText(/해지를 신청하면/)).toBeTruthy();
  });

  it("입력하는 곳이 아니라고 안내한다", async () => {
    await loaded();
    expect(screen.getByText(/여기서 입력하지 않습니다/)).toBeTruthy();
  });
});

describe("영업일 달력", () => {
  async function openCalendar() {
    const user = userEvent.setup();
    await loaded();
    const table = await screen.findByRole("table", { name: "영업일 달력" });
    await within(table).findByText("임시 영업(토요일)");
    return { user, table };
  }

  it("날짜별 영업일과 휴무, 사유를 보인다", async () => {
    const { table } = await openCalendar();
    expect(within(table).getByText("영업일")).toBeTruthy();
    expect(within(table).getAllByText("휴무").length).toBe(2);
    expect(within(table).getByText("연말 휴무")).toBeTruthy();
    expect(within(table).getByText(dayString(3))).toBeTruthy();
  });

  it("영업일을 휴무로 바꾸고 사유를 남긴다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.put("/api/ops/business-calendar/:date", async ({ request }) => {
        sent = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    const { user, table } = await openCalendar();
    await user.click(within(table).getByRole("button", { name: `${dayString(3)} 변경` }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText("휴무"));
    fireEvent.change(within(dialog).getByLabelText("사유(선택)"), {
      target: { value: "임시 휴무" },
    });
    await user.click(within(dialog).getByRole("button", { name: "반영" }));
    expect(await screen.findByText(`${dayString(3)}을(를) 휴무로 반영했습니다.`)).toBeTruthy();
    expect(sent).toEqual({ isBusinessDay: false, reason: "임시 휴무" });
    expect(await within(table).findByText("임시 휴무")).toBeTruthy();
  });

  it("사유를 비우면 null로 보낸다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.put("/api/ops/business-calendar/:date", async ({ request }) => {
        sent = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    const { user, table } = await openCalendar();
    await user.click(within(table).getByRole("button", { name: `${dayString(31)} 변경` }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText("영업일"));
    await user.click(within(dialog).getByRole("button", { name: "반영" }));
    await screen.findByText(`${dayString(31)}을(를) 영업일로 반영했습니다.`);
    expect(sent).toEqual({ isBusinessDay: true, reason: null });
  });

  it("사유가 201자이면 안내하고 요청하지 않는다", async () => {
    let called = false;
    server.use(
      http.put("/api/ops/business-calendar/:date", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    const { user, table } = await openCalendar();
    await user.click(within(table).getByRole("button", { name: `${dayString(30)} 변경` }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("사유(선택)"), {
      target: { value: "가".repeat(201) },
    });
    await user.click(within(dialog).getByRole("button", { name: "반영" }));
    expect(within(dialog).getByText("사유는 200자 이내로 입력해 주세요.")).toBeTruthy();
    expect(called).toBe(false);
  });

  it("사유가 정확히 200자이면 반영한다", async () => {
    const { user, table } = await openCalendar();
    await user.click(within(table).getByRole("button", { name: `${dayString(30)} 변경` }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("사유(선택)"), {
      target: { value: "가".repeat(200) },
    });
    await user.click(within(dialog).getByRole("button", { name: "반영" }));
    expect(await screen.findByText(`${dayString(30)}을(를) 휴무로 반영했습니다.`)).toBeTruthy();
  });

  it("날짜를 추가한다", async () => {
    const { user, table } = await openCalendar();
    await user.click(screen.getByRole("button", { name: "날짜 추가" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("날짜"), { target: { value: "2099-05-05" } });
    await user.click(within(dialog).getByLabelText("휴무"));
    fireEvent.change(within(dialog).getByLabelText("사유(선택)"), {
      target: { value: "어린이날" },
    });
    await user.click(within(dialog).getByRole("button", { name: "반영" }));
    expect(await screen.findByText("2099-05-05을(를) 휴무로 반영했습니다.")).toBeTruthy();
    expect(await within(table).findByText("어린이날")).toBeTruthy();
  });

  it("날짜를 비우면 안내한다", async () => {
    const { user } = await openCalendar();
    await user.click(screen.getByRole("button", { name: "날짜 추가" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "반영" }));
    expect(screen.getByText("날짜를 입력해 주세요.")).toBeTruthy();
  });

  it("서버 400이면 메시지를 보인다", async () => {
    server.use(
      http.put("/api/ops/business-calendar/:date", () =>
        mockErrors.validation([{ field: "reason", message: "사유 형식이 올바르지 않습니다." }]),
      ),
    );
    const { user, table } = await openCalendar();
    await user.click(within(table).getByRole("button", { name: `${dayString(30)} 변경` }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "반영" }));
    expect(await screen.findByText("사유 형식이 올바르지 않습니다.")).toBeTruthy();
  });

  it("반영이 403이면 역할 안내를 보인다", async () => {
    server.use(http.put("/api/ops/business-calendar/:date", () => mockErrors.forbidden()));
    const { user, table } = await openCalendar();
    await user.click(within(table).getByRole("button", { name: `${dayString(30)} 변경` }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "반영" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("반영이 429이면 한도 안내를 보인다", async () => {
    server.use(http.put("/api/ops/business-calendar/:date", () => mockErrors.rateLimited(10)));
    const { user, table } = await openCalendar();
    await user.click(within(table).getByRole("button", { name: `${dayString(30)} 변경` }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "반영" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("달력이 비어 있으면 빈 안내를 보인다", async () => {
    server.use(
      http.get("/api/ops/business-calendar", () =>
        Response.json({ items: [], page: 0, size: 25, totalElements: 0 }),
      ),
    );
    await loaded();
    expect(await screen.findByText("등록된 영업일·휴무일이 없습니다.")).toBeTruthy();
  });

  it("달력 조회가 실패하면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/business-calendar", () => mockErrors.server(), { once: true }));
    await loaded();
    const retry = await screen.findByRole("button", { name: "다시 시도" });
    await user.click(retry);
    expect(await screen.findByText("임시 영업(토요일)")).toBeTruthy();
  });
});
