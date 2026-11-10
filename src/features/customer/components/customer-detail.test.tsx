// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockCustomer,
  getMockCustomerState,
  resetMockCustomerState,
  setMockCustomerState,
} from "@/mocks/handlers/customer";
import { resetMockPropertyState } from "@/mocks/handlers/property";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CustomerDetailScreen } from "./customer-detail-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/customers/301",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockCustomerState();
  resetMockPropertyState();
  navigation.push.mockClear();
});

afterAll(() => stopServer());

function conflict(code: string) {
  return errorResponse(409, code, "충돌");
}

async function openTab(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("tab", { name }));
}

describe("고객 상세", () => {
  it("불러오는 동안 로딩을 보여주고 기본 정보와 개인정보 수집 안내를 표시한다", async () => {
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    expect(screen.getByText("고객 정보를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByRole("heading", { name: "김수요" })).not.toBeNull();
    expect(screen.getByText("010-1234-5678")).not.toBeNull();
    expect(await screen.findByText("이중개")).not.toBeNull();
    expect(screen.getByText("동의")).not.toBeNull();
    expect(screen.getByText("방문상담")).not.toBeNull();
    expect(screen.getByText("2029-11-10")).not.toBeNull();
    expect(screen.getByText(/소유 · 국민대 앞 아파트/)).not.toBeNull();
  });

  it("없는 고객이면 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<CustomerDetailScreen customerId={9999} />, { role: "AGENT" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("서버 오류가 나면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/customers/301", () => mockErrors.server()));
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("병합된 고객은 병합됨 안내와 남은 고객 링크만 보여준다", async () => {
    setMockCustomerState({
      customers: [
        buildMockCustomer({
          customerId: 302,
          name: "병합된고객",
          status: "MERGED",
          mergedIntoCustomerId: 301,
        }),
      ],
    });
    renderOffice(<CustomerDetailScreen customerId={302} />, { role: "AGENT" });
    expect(await screen.findByText(/다른 고객으로 병합된 고객입니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "남은 고객으로 이동" }).getAttribute("href")).toBe(
      "/customers/301",
    );
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("link", { name: "수정" })).toBeNull();
  });

  it("계약과 방문·업무 탭에 지난 기록을 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "계약");
    expect(screen.getByText(/국민대 앞 아파트 · 전세 · 초안/)).not.toBeNull();
    expect(screen.getByText("지난 계약")).not.toBeNull();
    await openTab(user, "방문·업무");
    expect(screen.getByText(/확정 · 2026-11-12 ~ 2026-11-14 · 후보 매물 3개/)).not.toBeNull();
    expect(screen.getByText(/계약서 초안 확인 · 기한 2026-11-15 · 할 일/)).not.toBeNull();
  });
});

describe("고객 보관·삭제·복원", () => {
  it("참조가 있는 고객은 보관 안내를 보여주고 보관하면 목록으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "보관" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/삭제하지 않고 보관합니다/)).not.toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "보관" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/customers"));
    expect(getMockCustomerState().customers[0]?.deletedAt).toBeTruthy();
  });

  it("참조가 없는 고객은 오입력 삭제 안내를 보여주고 삭제한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={302} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "오입력 삭제" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/완전히 삭제됩니다/)).not.toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/customers"));
    expect(getMockCustomerState().customers.some((item) => item.customerId === 302)).toBe(false);
  });

  it("처리에 실패하면 대화상자 안에 오류를 보여준다", async () => {
    server.use(http.delete("/api/customers/301", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "보관" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "보관" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).not.toBeNull();
  });

  it("보관된 고객은 복원 버튼만 보이고 복원하면 안내를 보여준다", async () => {
    setMockCustomerState({
      customers: [
        buildMockCustomer({
          customerId: 301,
          name: "보관고객",
          status: "ARCHIVED",
          deletedAt: "2026-11-01T09:00:00+09:00",
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    expect(await screen.findByText("보관됨")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "수정" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "복원" }));
    expect(await screen.findByText("고객을 복원했습니다.")).not.toBeNull();
  });

  it("이미 사용 중인 고객을 복원하면 충돌 문구를 보여준다", async () => {
    setMockCustomerState({
      customers: [
        buildMockCustomer({
          customerId: 301,
          name: "보관고객",
          status: "ARCHIVED",
          deletedAt: "2026-11-01T09:00:00+09:00",
        }),
      ],
    });
    server.use(http.post("/api/customers/301/restore", () => conflict("CUSTOMER_NOT_ARCHIVED")));
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "복원" }));
    expect(await screen.findByText(/이미 사용 중인 고객입니다/)).not.toBeNull();
  });

  it("읽기 전용 상태에서는 보관 버튼이 막힌다", async () => {
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT", isReadOnly: true });
    expect((await screen.findByRole("button", { name: "보관" })).hasAttribute("disabled")).toBe(
      true,
    );
  });
});

describe("관련 매물", () => {
  it("관심·소유 관계를 매물 링크와 기간으로 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "관련 매물");
    expect(screen.getByRole("link", { name: "정릉 상가" }).getAttribute("href")).toBe(
      "/properties/502",
    );
    expect(screen.getByText(/메모: 가격 협의 가능/)).not.toBeNull();
    expect(screen.getByText(/2024-01-01 ~ 현재/)).not.toBeNull();
  });

  it("종료일이 시작일보다 앞서면 저장하지 않고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "관련 매물");
    const row = screen.getByRole("link", { name: "정릉 상가" }).closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "종료일·메모 수정" }));
    await user.type(within(row).getByLabelText("종료일"), "2026-01-01");
    await user.click(within(row).getByRole("button", { name: "저장" }));
    expect(await within(row).findByText("종료일은 시작일보다 앞설 수 없습니다.")).not.toBeNull();
  });

  it("관심 매물의 종료일과 메모를 고쳐 저장하면 고객 버전을 함께 보낸다", async () => {
    let ifMatch: string | null = null;
    server.use(
      http.patch("/api/customer-property-interests/61", ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return errorResponse(429, "RATE_LIMITED", "많음", { retryAfterSeconds: 10 });
      }),
    );
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "관련 매물");
    const row = screen.getByRole("link", { name: "정릉 상가" }).closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "종료일·메모 수정" }));
    await user.type(within(row).getByLabelText("종료일"), "2026-12-31");
    await user.click(within(row).getByRole("button", { name: "저장" }));
    expect(await within(row).findByText(/요청이 너무 많습니다/)).not.toBeNull();
    expect(ifMatch).toBe("1");
  });

  it("종료일을 정상으로 저장하면 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "관련 매물");
    const row = screen.getByRole("link", { name: "정릉 상가" }).closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "종료일·메모 수정" }));
    await user.type(within(row).getByLabelText("종료일"), "2026-12-31");
    await user.click(within(row).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("관계를 수정했습니다.")).not.toBeNull();
  });

  it("매물을 검색해 관심 매물로 연결한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "관련 매물");
    await user.click(screen.getByRole("button", { name: "연결 추가" }));
    expect(await screen.findByText("연결할 매물을 선택해 주세요.")).not.toBeNull();
    await user.type(screen.getByLabelText("매물 검색"), "국민대");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.click(await screen.findByRole("radio", { name: /국민대 앞 아파트/ }));
    await user.click(screen.getByRole("button", { name: "연결 추가" }));
    expect(await screen.findByText("관계를 추가했습니다.")).not.toBeNull();
    expect(
      getMockCustomerState().customers[0]?.relatedProperties.some(
        (item) => item.role === "INTEREST" && item.propertyId === 501,
      ),
    ).toBe(true);
  });

  it("소유 관계는 담당자가 확인한 기록이라는 안내와 함께 추가한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "관련 매물");
    await user.selectOptions(screen.getByLabelText("관계"), "OCCUPANT");
    expect(screen.getByText(/계약 체결이 자동으로 바꾸지 않습니다/)).not.toBeNull();
    await user.type(screen.getByLabelText("매물 검색"), "정릉");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.click(await screen.findByRole("radio", { name: /정릉 상가/ }));
    await user.click(screen.getByRole("button", { name: "연결 추가" }));
    expect(await screen.findByText("관계를 추가했습니다.")).not.toBeNull();
  });

  it("검색 결과가 없으면 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "관련 매물");
    await user.type(screen.getByLabelText("매물 검색"), "없는이름");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByText("검색 결과가 없습니다.")).not.toBeNull();
  });
});

describe("희망조건", () => {
  it("등록된 희망조건을 범위로 보여주고 후보 매물에 보증하지 않는다는 문구를 함께 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "희망조건");
    expect(screen.getByText("1,000만원 ~ 3,000만원")).not.toBeNull();
    expect(screen.getByText("40㎡ ~ 80㎡")).not.toBeNull();
    expect(screen.getByText("성북구")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "후보 매물 보기" }));
    expect(await screen.findByText(/적합성을 보증하지 않습니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "국민대 앞 아파트" })).not.toBeNull();
  });

  it("하한이 상한보다 크면 저장하지 않고 항목에 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={302} />, { role: "AGENT" });
    await openTab(user, "희망조건");
    await user.click(await screen.findByRole("button", { name: "희망조건 추가" }));
    await user.type(screen.getByLabelText("보증금 하한 (만원)"), "5000");
    await user.type(screen.getByLabelText("보증금 상한 (만원)"), "1000");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("보증금 하한이 상한보다 클 수 없습니다.")).not.toBeNull();
    expect(
      getMockCustomerState().customers.find((item) => item.customerId === 302)?.demandConditions,
    ).toHaveLength(0);
  });

  it("서버가 범위 오류를 알려 오면 문구를 보여준다", async () => {
    server.use(
      http.post("/api/customers/302/demand-conditions", () =>
        errorResponse(400, "INVALID_RANGE", "범위"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={302} />, { role: "AGENT" });
    await openTab(user, "희망조건");
    await user.click(await screen.findByRole("button", { name: "희망조건 추가" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText(/하한이 상한보다 클 수 없고/)).not.toBeNull();
  });

  it("희망조건을 등록하면 안내를 보여주고 수요 고객 역할이 생긴다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={302} />, { role: "AGENT" });
    await openTab(user, "희망조건");
    await user.click(await screen.findByRole("button", { name: "희망조건 추가" }));
    await user.selectOptions(screen.getByLabelText("거래유형"), "SALE");
    await user.type(screen.getByLabelText("매매가 하한 (만원)"), "10000");
    await user.type(screen.getByLabelText("희망 지역"), "성북구, 종로구");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("희망조건을 등록했습니다.")).not.toBeNull();
    const saved = getMockCustomerState().customers.find((item) => item.customerId === 302);
    expect(saved?.demandConditions[0]?.priceMin).toBe(100_000_000);
    expect(saved?.demandConditions[0]?.regions).toHaveLength(2);
  });

  it("희망조건을 수정할 때 조건 버전을 보내고 충돌을 안내한다", async () => {
    let ifMatch: string | null = null;
    server.use(
      http.patch("/api/demand-conditions/81", ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return mockErrors.versionConflict(5);
      }),
    );
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "희망조건");
    await user.click(screen.getByRole("button", { name: "희망조건 수정" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
    expect(ifMatch).toBe("1");
  });
});

describe("상담 이력", () => {
  it("최신 상담부터 작성자와 구분을 보여주고 정정된 상담은 이력을 열 수 있다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "상담 이력");
    expect(await screen.findByText("역세권 원룸을 찾는다고 문의했다.")).not.toBeNull();
    expect(screen.getAllByText(/작성 이중개/)).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "정정됨 1회" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/사유: 유형 오입력 정정/)).not.toBeNull();
    expect(within(dialog).getByText(/이전 내용: 문의 내용/)).not.toBeNull();
  });

  it("상담을 등록하면 목록에 나타난다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "상담 이력");
    await screen.findByText("예산을 다시 확인했다.");
    await user.click(screen.getByRole("button", { name: "상담 등록" }));
    expect(await screen.findByText("상담 내용을 입력해 주세요.")).not.toBeNull();
    await user.type(screen.getByLabelText("상담 내용"), "계약 일정을 조율했다.");
    await user.click(screen.getByRole("button", { name: "상담 등록" }));
    expect(await screen.findByText("상담 이력을 등록했습니다.")).not.toBeNull();
    expect(await screen.findByText("계약 일정을 조율했다.")).not.toBeNull();
  });

  it("작성자 입력란이 없고 자동 기록된다는 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "상담 이력");
    expect(await screen.findByText(/로그인한 구성원이 자동으로 기록됩니다/)).not.toBeNull();
    expect(screen.queryByLabelText(/작성자/)).toBeNull();
  });

  it("이미 최초문의가 있는 고객에게 최초문의를 등록하면 충돌을 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "상담 이력");
    await screen.findByText("예산을 다시 확인했다.");
    await user.selectOptions(screen.getByLabelText("상담 구분"), "FIRST_INQUIRY");
    await user.type(screen.getByLabelText("상담 내용"), "또 최초문의");
    await user.click(screen.getByRole("button", { name: "상담 등록" }));
    expect(await screen.findByText(/이미 최초문의가 있습니다/)).not.toBeNull();
  });

  it("상담 정정에는 사유가 필요하고 정정하면 이력 횟수가 늘어난다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "상담 이력");
    const item = (await screen.findByText("예산을 다시 확인했다.")).closest("li") as HTMLElement;
    await user.click(within(item).getByRole("button", { name: "정정" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "정정 저장" }));
    expect(await within(dialog).findByText("정정 사유를 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText(/정정 사유/), "내용 보완");
    await user.click(within(dialog).getByRole("button", { name: "정정 저장" }));
    expect(await screen.findByText(/이전 값은 정정 이력에 남습니다/)).not.toBeNull();
    expect(await screen.findAllByRole("button", { name: /정정됨/ })).toHaveLength(2);
  });

  it("정정이 충돌하면 대화상자 안에 안내한다", async () => {
    server.use(http.patch("/api/customer-consultations/2", () => mockErrors.versionConflict(3)));
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "상담 이력");
    const item = (await screen.findByText("예산을 다시 확인했다.")).closest("li") as HTMLElement;
    await user.click(within(item).getByRole("button", { name: "정정" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/정정 사유/), "사유");
    await user.click(within(dialog).getByRole("button", { name: "정정 저장" }));
    expect(await within(dialog).findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("상담 목록 조회가 실패하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/customers/301/consultations", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<CustomerDetailScreen customerId={301} />, { role: "AGENT" });
    await openTab(user, "상담 이력");
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });
});
