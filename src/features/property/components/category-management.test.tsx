// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { getMockPropertyState, resetMockPropertyState } from "@/mocks/handlers/property";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CategoryManagementScreen } from "./category-management-screen";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockPropertyState();
});

afterAll(() => stopServer());

describe("카테고리·입력 항목 관리", () => {
  it("불러오는 동안 로딩을 보여주고 기본 카테고리는 잠금 표시를 단다", async () => {
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    expect(screen.getByText("카테고리를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByRole("button", { name: "아파트" })).not.toBeNull();
    expect(screen.getAllByText("기본 · 수정 불가")).toHaveLength(10);
    expect(screen.getByRole("button", { name: "주차장" })).not.toBeNull();
  });

  it("중개보조원이 직접 들어오면 권한 없음을 안내한다", async () => {
    renderOffice(<CategoryManagementScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("조회가 실패하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/property-categories", () => mockErrors.server()));
    renderOffice(<CategoryManagementScreen />, { role: "AGENT" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("새 카테고리 이름을 검증하고 만든다", async () => {
    const user = userEvent.setup();
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "카테고리 만들기" }));
    expect(screen.getByText("카테고리 이름을 입력해 주세요.")).not.toBeNull();
    await user.type(screen.getByLabelText("새 카테고리 이름"), "창고형 상가");
    await user.click(screen.getByRole("button", { name: "카테고리 만들기" }));
    expect(await screen.findByRole("button", { name: "창고형 상가" })).not.toBeNull();
    expect(screen.getByText("카테고리를 만들었습니다.")).not.toBeNull();
  });

  it("같은 이름의 카테고리는 중복으로 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    await screen.findByRole("button", { name: "아파트" });
    await user.type(screen.getByLabelText("새 카테고리 이름"), "주차장");
    await user.click(screen.getByRole("button", { name: "카테고리 만들기" }));
    expect(await screen.findByText("같은 이름의 카테고리가 이미 있습니다.")).not.toBeNull();
  });

  it("활성 카테고리가 상한을 넘으면 상한 안내를 보여준다", async () => {
    server.use(
      http.post("/api/property-categories", () =>
        errorResponse(409, "CATEGORY_LIMIT_EXCEEDED", "상한"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    await screen.findByRole("button", { name: "아파트" });
    await user.type(screen.getByLabelText("새 카테고리 이름"), "스물한 번째");
    await user.click(screen.getByRole("button", { name: "카테고리 만들기" }));
    expect(
      await screen.findByText("카테고리는 사무소당 활성 20개까지 만들 수 있습니다."),
    ).not.toBeNull();
  });

  it("커스텀 카테고리 이름을 고치고 비활성화한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    const row = (await screen.findByRole("button", { name: "주차장" })).closest(
      "li",
    ) as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "이름 수정" }));
    const input = within(row).getByLabelText("카테고리 이름");
    await user.clear(input);
    await user.type(input, "옥외 주차장");
    await user.click(within(row).getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("button", { name: "옥외 주차장" })).not.toBeNull();
    const renamed = screen
      .getByRole("button", { name: "옥외 주차장" })
      .closest("li") as HTMLElement;
    await user.click(within(renamed).getByRole("button", { name: "비활성화" }));
    expect(await screen.findByText("비활성")).not.toBeNull();
    expect(getMockPropertyState().categories.find((item) => item.categoryId === 11)?.active).toBe(
      false,
    );
  });

  it("서버가 기본 카테고리 수정을 거절하면 잠금 문구를 보여준다", async () => {
    server.use(
      http.patch("/api/property-categories/11", () =>
        errorResponse(403, "SYSTEM_CATEGORY_IMMUTABLE", "불가"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    const row = (await screen.findByRole("button", { name: "주차장" })).closest(
      "li",
    ) as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "비활성화" }));
    expect(
      await screen.findByText("기본 카테고리는 수정하거나 비활성화할 수 없습니다."),
    ).not.toBeNull();
  });

  it("기본 카테고리의 입력 항목은 수정할 수 없다고 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "아파트" }));
    expect(await screen.findByText("동·호")).not.toBeNull();
    expect(
      screen.getByText(/기본 카테고리의 입력 항목은 수정하거나 보관할 수 없습니다/),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "입력 항목 추가" })).toBeNull();
  });

  it("커스텀 카테고리에 입력 항목을 추가하고 이름을 고치고 보관한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "주차장" }));
    expect(await screen.findByText("차량 높이 제한")).not.toBeNull();
    await user.type(screen.getByLabelText("새 입력 항목 이름"), "층수");
    await user.selectOptions(screen.getByLabelText("입력 항목 형식"), "NUMBER");
    await user.click(screen.getByRole("button", { name: "입력 항목 추가" }));
    expect(await screen.findByText("입력 항목을 추가했습니다.")).not.toBeNull();
    const row = (await screen.findByText("층수")).closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "보관" }));
    expect(await screen.findByText("보관됨")).not.toBeNull();
  });

  it("같은 이름의 입력 항목은 중복으로 안내한다", async () => {
    const user = userEvent.setup();
    renderOffice(<CategoryManagementScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "주차장" }));
    await screen.findByText("차량 높이 제한");
    await user.type(screen.getByLabelText("새 입력 항목 이름"), "차량 높이 제한");
    await user.click(screen.getByRole("button", { name: "입력 항목 추가" }));
    expect(await screen.findByText("같은 이름의 입력 항목이 이미 있습니다.")).not.toBeNull();
  });
});
