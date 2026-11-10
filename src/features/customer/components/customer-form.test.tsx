// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import {
  buildMockCustomer,
  getMockCustomerState,
  resetMockCustomerState,
  setMockCustomerState,
} from "@/mocks/handlers/customer";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CustomerCreateScreen, CustomerEditScreen } from "./customer-form-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/customers/new",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockCustomerState();
  navigation.push.mockClear();
});

afterAll(() => stopServer());

type User = ReturnType<typeof userEvent.setup>;

async function fillRequired(user: User, name = "신규고객") {
  await screen.findByRole("option", { name: "이중개" });
  await user.type(screen.getByLabelText(/^이름/), name);
  await user.selectOptions(screen.getByLabelText(/담당 공인중개사/), "2");
  await user.type(screen.getByLabelText(/수집 경로/), "전화 문의");
  await user.selectOptions(screen.getByLabelText(/처리 근거/), "CONSENT");
  await user.type(screen.getByLabelText(/수집 목적/), "매물 상담");
  await user.type(screen.getByLabelText(/보유 기한/), "2029-11-10");
}

describe("고객 등록", () => {
  it("수집 목적과 처리 근거와 민감정보 금지 안내를 보여준다", async () => {
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    expect(
      screen.getByText(/주민등록번호와 전체 금융계좌번호는 입력할 수 없습니다/),
    ).not.toBeNull();
    expect(screen.getByText(/변호사 검토 전 초안/)).not.toBeNull();
    expect(screen.getByLabelText(/수집 경로/)).not.toBeNull();
  });

  it("필수 항목이 비어 있으면 저장하지 않고 항목별 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText("이름을 입력해 주세요.")).not.toBeNull();
    const alerts = screen.getAllByRole("alert").map((item) => item.textContent);
    expect(alerts).toContain("담당 공인중개사를 선택해 주세요.");
    expect(alerts).toContain("처리 근거를 선택해 주세요.");
    expect(getMockCustomerState().customers).toHaveLength(3);
  });

  it("법인을 고르면 법인명 입력으로 바뀐다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await user.click(screen.getByRole("radio", { name: "법인" }));
    expect(screen.getByLabelText(/^법인명/)).not.toBeNull();
  });

  it("주민등록번호 형태를 입력하면 저장 전에 막는다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await fillRequired(user, "홍길동");
    await user.type(screen.getByLabelText("업무 메모"), "900101-1234567");
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(
      await screen.findByText(/주민등록번호나 전체 금융계좌번호는 입력할 수 없습니다. 해당 내용을/),
    ).not.toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("서버가 민감정보를 감지하면 안내 문구를 보여준다", async () => {
    server.use(
      http.post("/api/customers", () =>
        Response.json(
          { code: "SENSITIVE_DATA_DETECTED", message: "감지", traceId: "t" },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(
      await screen.findByText(/금융계좌번호는 입력할 수 없습니다. 해당 내용을 지워 주세요/),
    ).not.toBeNull();
  });

  it("서버의 필드 오류를 해당 입력에 보여준다", async () => {
    server.use(
      http.post("/api/customers", () =>
        mockErrors.validation([{ field: "email", message: "이미 쓰는 이메일입니다." }]),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText("이미 쓰는 이메일입니다.")).not.toBeNull();
  });

  it("이름과 연락처가 겹치지 않으면 바로 등록하고 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await fillRequired(user);
    await user.type(screen.getByLabelText("연락처"), "01099998888");
    await user.click(screen.getByRole("button", { name: "등록" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const created = getMockCustomerState().customers[0];
    expect(created?.name).toBe("신규고객");
    expect(created?.phone).toBe("010-9999-8888");
    expect(navigation.push).toHaveBeenCalledWith(`/customers/${created?.customerId}`);
  });

  it("같은 이름과 연락처가 있으면 자동으로 합치지 않고 기존 고객을 쓸지 묻는다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await fillRequired(user, "김수요");
    await user.type(screen.getByLabelText("연락처"), "01012345678");
    await user.click(screen.getByRole("button", { name: "등록" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/자동으로 합치지 않습니다/)).not.toBeNull();
    expect(within(dialog).getAllByRole("button", { name: "기존 고객 사용" })).toHaveLength(2);
    await user.click(
      within(dialog).getAllByRole("button", { name: "기존 고객 사용" })[0] as HTMLElement,
    );
    expect(navigation.push).toHaveBeenCalledWith("/customers/301");
    expect(getMockCustomerState().customers).toHaveLength(3);
  });

  it("새 고객으로 등록을 고르면 별도 고객을 만든다", async () => {
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await fillRequired(user, "김수요");
    await user.type(screen.getByLabelText("연락처"), "01012345678");
    await user.click(screen.getByRole("button", { name: "등록" }));
    await user.click(await screen.findByRole("button", { name: "새 고객으로 등록" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect(getMockCustomerState().customers).toHaveLength(4);
  });

  it("보관된 고객 후보에는 보관됨 표시를 단다", async () => {
    setMockCustomerState({
      customers: [
        buildMockCustomer({
          customerId: 500,
          name: "보관후보",
          phone: "010-5555-6666",
          deletedAt: "2026-11-01T09:00:00+09:00",
          status: "ARCHIVED",
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<CustomerCreateScreen />, { role: "AGENT" });
    await fillRequired(user, "보관후보");
    await user.type(screen.getByLabelText("연락처"), "01055556666");
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(await within(await screen.findByRole("dialog")).findByText("보관됨")).not.toBeNull();
  });

  it("읽기 전용 상태에서는 저장 버튼이 막힌다", async () => {
    renderOffice(<CustomerCreateScreen />, { role: "AGENT", isReadOnly: true });
    expect(screen.getByText(/읽기만 가능합니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "등록" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("고객 수정", () => {
  it("불러오는 동안 로딩을 보여주고 현재 값을 채운다", async () => {
    renderOffice(<CustomerEditScreen customerId={301} />, { role: "AGENT" });
    expect(screen.getByText("고객 정보를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByDisplayValue("010-1234-5678")).not.toBeNull();
    expect(screen.getByDisplayValue("방문상담")).not.toBeNull();
  });

  it("없는 고객이면 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<CustomerEditScreen customerId={9999} />, { role: "AGENT" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("수정하면 버전을 함께 보내 저장하고 상세로 이동한다", async () => {
    let ifMatch: string | null = null;
    server.use(
      http.patch("/api/customers/301", async ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return Response.json(getMockCustomerState().customers[0]);
      }),
    );
    const user = userEvent.setup();
    renderOffice(<CustomerEditScreen customerId={301} />, { role: "AGENT" });
    const memo = await screen.findByLabelText("업무 메모");
    await user.type(memo, "새 메모");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/customers/301"));
    expect(ifMatch).toBe("1");
  });

  it("다른 사용자가 먼저 고쳤으면 충돌을 알리고 최신 내용을 다시 불러온다", async () => {
    server.use(http.patch("/api/customers/301", () => mockErrors.versionConflict(3)));
    const user = userEvent.setup();
    renderOffice(<CustomerEditScreen customerId={301} />, { role: "AGENT" });
    await user.click(await screen.findByRole("button", { name: "저장" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "최신 내용 불러오기" }));
    expect(await screen.findByDisplayValue("010-1234-5678")).not.toBeNull();
  });

  it("병합된 고객은 수정할 수 없다고 안내하고 남은 고객으로 보낸다", async () => {
    setMockCustomerState({
      customers: [
        buildMockCustomer({
          customerId: 302,
          name: "병합됨",
          status: "MERGED",
          mergedIntoCustomerId: 301,
        }),
      ],
    });
    renderOffice(<CustomerEditScreen customerId={302} />, { role: "AGENT" });
    expect(await screen.findByText(/병합된 고객은 수정할 수 없습니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "남은 고객으로 이동" }).getAttribute("href")).toBe(
      "/customers/301",
    );
  });

  it("보관된 고객은 수정할 수 없다고 안내한다", async () => {
    setMockCustomerState({
      customers: [
        buildMockCustomer({
          customerId: 301,
          name: "보관",
          status: "ARCHIVED",
          deletedAt: "2026-11-01T09:00:00+09:00",
        }),
      ],
    });
    renderOffice(<CustomerEditScreen customerId={301} />, { role: "AGENT" });
    expect(await screen.findByText(/보관된 고객은 수정할 수 없습니다/)).not.toBeNull();
  });
});
