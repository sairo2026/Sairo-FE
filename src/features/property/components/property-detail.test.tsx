// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockProperty,
  getMockPropertyState,
  resetMockPropertyState,
  setMockPropertyState,
} from "@/mocks/handlers/property";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { PropertyDetailScreen } from "./property-detail-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/properties/501",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockPropertyState();
  navigation.push.mockClear();
});

afterAll(() => stopServer());

function withProperty(partial: Parameters<typeof buildMockProperty>[0]) {
  setMockPropertyState({ properties: [buildMockProperty(partial)] });
}

function conflict(code: string) {
  return errorResponse(409, code, "충돌");
}

describe("매물 상세", () => {
  it("불러오는 동안 로딩을 보여주고 기본 정보와 전용 정보를 표시한다", async () => {
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    expect(screen.getByText("매물 정보를 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByRole("heading", { name: "국민대 앞 아파트" })).not.toBeNull();
    expect(screen.getByText("서울특별시 성북구 정릉로 77 101동 1201호")).not.toBeNull();
    expect(screen.getByText("해당층")).not.toBeNull();
    expect(screen.getByText("12")).not.toBeNull();
    expect(screen.getByText(/2027-03-31 · 계약/)).not.toBeNull();
  });

  it("출입승인 화면으로 가는 링크를 보여준다", async () => {
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    const link = await screen.findByRole("link", { name: "출입승인" });
    expect(link.getAttribute("href")).toBe("/properties/501/access-approvals");
  });

  it("없는 매물이면 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<PropertyDetailScreen propertyId={9999} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("서버 오류가 나면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/properties/501", () => mockErrors.server()));
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("카테고리 변경으로 보관된 이전 값을 따로 보여준다", async () => {
    withProperty({
      propertyId: 501,
      name: "변경된 매물",
      archivedCustomFields: [
        {
          fieldDefinitionId: 41,
          fieldName: "해당층",
          fieldType: "NUMBER",
          value: 7,
          previousCategoryId: 3,
          previousCategoryName: "상가·사무실",
        },
      ],
    });
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("이전 카테고리에서 보관된 값")).not.toBeNull();
    expect(screen.getByText("상가·사무실 · 해당층")).not.toBeNull();
  });

  it("소유·점유 관계와 방문 이력, 계약을 한 탭에서 보여준다", async () => {
    withProperty({
      propertyId: 501,
      name: "이력 매물",
      ownerOccupants: [
        {
          linkId: 1,
          customerId: 301,
          customerName: "김소유",
          role: "OWNER",
          startDate: "2024-01-01",
          endDate: null,
        },
      ],
      visits: [
        {
          scheduleItemId: 1,
          coordinationId: 9,
          customerId: 5,
          customerName: "이수요",
          scheduledStartAt: "2026-09-12T14:00:00+09:00",
          result: "COMPLETED",
          actualVisitedAt: "2026-09-12T14:03:00+09:00",
        },
      ],
      contracts: [
        {
          contractId: 7,
          dealType: "JEONSE",
          contractStatus: "SIGNED",
          signedDate: "2026-09-15",
          leaseStartDate: null,
          leaseEndDate: null,
        },
      ],
    });
    const user = userEvent.setup();
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "소유·점유·이력" }));
    expect(screen.getByRole("link", { name: "김소유" }).getAttribute("href")).toBe(
      "/customers/301",
    );
    expect(screen.getByText(/이수요 · 방문 완료/)).not.toBeNull();
    expect(screen.getByText(/전세 · 체결/)).not.toBeNull();
  });
});

describe("매물 보관과 복원", () => {
  it("진행 중인 조율과 체결 계약이 있으면 정리할 대상을 보여주고 보관을 막는다", async () => {
    withProperty({
      propertyId: 501,
      name: "막힌 매물",
      activeCoordinations: [{ coordinationId: 9, status: "CONFIRMED", customerName: "이수요" }],
      contracts: [
        {
          contractId: 7,
          dealType: "JEONSE",
          contractStatus: "SIGNED",
          signedDate: "2026-09-15",
          leaseStartDate: null,
          leaseEndDate: null,
        },
      ],
    });
    const user = userEvent.setup();
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "보관" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/정리하기 전에는 보관할 수 없습니다/)).not.toBeNull();
    expect(within(dialog).getByText(/이수요 · 확정/)).not.toBeNull();
    expect(within(dialog).getByText(/계약 전세 · 체결/)).not.toBeNull();
    expect(within(dialog).getByRole("button", { name: "보관" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("보관하면 목록으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "보관" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "보관" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/properties"));
    expect(getMockPropertyState().properties[0]?.deletedAt).toBeTruthy();
  });

  it("서버가 진행 중인 계약을 알려 오면 오류 문구를 보여준다", async () => {
    server.use(http.delete("/api/properties/501", () => conflict("PROPERTY_HAS_ACTIVE_CONTRACT")));
    const user = userEvent.setup();
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "보관" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "보관" }));
    expect(await screen.findByText(/진행 중인 계약이 있어 보관할 수 없습니다/)).not.toBeNull();
  });

  it("임시저장 매물은 완전 삭제된다는 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyDetailScreen propertyId={502} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "보관" }));
    expect(screen.getByText(/완전히 삭제됩니다/)).not.toBeNull();
  });

  it("보관된 매물은 복원 버튼만 보이고 복원하면 안내를 보여준다", async () => {
    withProperty({ propertyId: 501, name: "보관 매물", deletedAt: "2026-11-01T09:00:00+09:00" });
    const user = userEvent.setup();
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    expect(await screen.findByText("보관됨")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "수정" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "복원" }));
    expect(await screen.findByText("매물을 복원했습니다.")).not.toBeNull();
  });

  it("이미 활성인 매물을 복원하면 충돌 문구를 보여준다", async () => {
    withProperty({ propertyId: 501, name: "보관 매물", deletedAt: "2026-11-01T09:00:00+09:00" });
    server.use(http.post("/api/properties/501/restore", () => conflict("PROPERTY_NOT_ARCHIVED")));
    const user = userEvent.setup();
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "복원" }));
    expect(await screen.findByText(/이미 활성 상태인 매물입니다/)).not.toBeNull();
  });

  it("읽기 전용 상태에서는 보관 버튼이 막힌다", async () => {
    renderOffice(<PropertyDetailScreen propertyId={501} />, { role: "OWNER", isReadOnly: true });
    const button = await screen.findByRole("button", { name: "보관" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });
});
