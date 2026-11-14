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
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { CustomerMergeScreen } from "./customer-merge-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/customers/merge",
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

function paragraph(pattern: RegExp) {
  return screen.getByText(
    (_, element) => element?.tagName === "P" && pattern.test(element.textContent ?? ""),
  );
}

function renderMerge(primaryId = 302, mergedId = 301, role: "OWNER" | "AGENT" = "OWNER") {
  return renderOffice(<CustomerMergeScreen primaryId={primaryId} mergedId={mergedId} />, { role });
}

async function completeChoices(user: User) {
  await screen.findByRole("heading", { name: "고객 병합" });
  await user.click(screen.getByRole("radio", { name: "업무 메모 고객 A 값 선택" }));
  await user.click(screen.getByRole("radio", { name: "담당 공인중개사 고객 A 값 선택" }));
  await user.click(screen.getAllByRole("radio", { name: /최초문의/ })[0] as HTMLElement);
  await user.type(screen.getByLabelText(/충돌 정리 메모/), "같은 고객으로 확인");
  await user.click(screen.getByRole("checkbox", { name: /되돌릴 수 없다는 점을 확인했습니다/ }));
}

describe("고객 병합", () => {
  it("대표가 아니면 권한 없음 화면을 보여준다", async () => {
    renderMerge(301, 302, "AGENT");
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("같은 고객끼리는 병합할 수 없다고 안내한다", async () => {
    renderMerge(301, 301);
    expect(await screen.findByText(/같은 고객끼리는 병합할 수 없습니다/)).not.toBeNull();
  });

  it("불러오는 동안 로딩을 보여준다", async () => {
    renderMerge();
    expect(screen.getByText("병합할 고객을 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByRole("heading", { name: "고객 병합" })).not.toBeNull();
  });

  it("고객을 불러오지 못하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/customers/301", () => mockErrors.server()));
    renderMerge();
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("먼저 등록된 고객을 남는 고객 A로 하고 같은 항목은 동일로 표시한다", async () => {
    renderMerge(302, 301);
    await screen.findByRole("heading", { name: "고객 병합" });
    expect(paragraph(/고객 A\s*병합 후 남는 고객: 김수요 \(고객 ID 301\)/)).not.toBeNull();
    expect(paragraph(/고객 B\s*합쳐질 고객: 김수요 \(고객 ID 302\)/)).not.toBeNull();
    expect(screen.getAllByText("동일").length).toBeGreaterThanOrEqual(4);
    const memoRow = screen.getByRole("row", { name: /업무 메모/ });
    expect(within(memoRow).getByText("없음")).not.toBeNull();
    expect(screen.getByText("중복 등록")).not.toBeNull();
    expect(screen.getByText(/병합은 되돌릴 수 없습니다/)).not.toBeNull();
  });

  it("모든 선택을 마치기 전에는 병합 버튼이 막히고 부족한 항목을 알려 준다", async () => {
    renderMerge();
    const button = await screen.findByRole("button", { name: "고객 A로 병합하기" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("서로 다른 항목의 값을 모두 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("충돌 정리 메모를 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("최초문의로 남길 상담을 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("되돌릴 수 없다는 안내를 확인해 주세요.")).not.toBeNull();
    expect(
      screen.getByText(/최초문의로 남길 상담을 선택해 주세요. 나머지는 후속상담으로 바뀝니다./),
    ).not.toBeNull();
  });

  it("남길 고객을 바꾸면 선택과 확인은 해제되고 정리 메모는 남는다", async () => {
    const user = userEvent.setup();
    renderMerge();
    await completeChoices(user);
    expect(
      (await screen.findByRole("button", { name: "고객 A로 병합하기" })).getAttribute(
        "aria-disabled",
      ),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "남길 고객 바꾸기" }));
    expect(paragraph(/고객 A\s*병합 후 남는 고객: 김수요 \(고객 ID 302\)/)).not.toBeNull();
    expect(
      (screen.getByRole("radio", { name: "업무 메모 고객 A 값 선택" }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (
        screen.getByRole("checkbox", {
          name: /되돌릴 수 없다는 점을 확인했습니다/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
    expect((screen.getByLabelText(/충돌 정리 메모/) as HTMLTextAreaElement).value).toBe(
      "같은 고객으로 확인",
    );
    expect(
      screen.getByRole("button", { name: "고객 A로 병합하기" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("병합하면 두 고객 버전과 선택을 보내고 남는 고객 상세로 이동한다", async () => {
    let body: Record<string, unknown> = {};
    let ifMatch: string | null = null;
    server.use(
      http.post("/api/customers/merge", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        ifMatch = request.headers.get("If-Match");
        return Response.json({
          primaryCustomerId: 301,
          mergedCustomerId: 302,
          mergedAt: "2026-11-10T09:00:00+09:00",
          version: 2,
        });
      }),
    );
    const user = userEvent.setup();
    renderMerge();
    await completeChoices(user);
    await user.click(screen.getByRole("button", { name: "고객 A로 병합하기" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/customers/301"));
    expect(ifMatch).toBe("1");
    expect(body).toMatchObject({
      primaryCustomerId: 301,
      mergedCustomerId: 302,
      mergedCustomerVersion: 1,
      conflictResolutionNote: "같은 고객으로 확인",
      fieldChoices: { memo: "PRIMARY", managingMembershipId: "PRIMARY" },
    });
    expect(typeof body.keepFirstInquiryId).toBe("number");
  });

  it("병합이 끝나면 합쳐진 고객은 병합됨 상태가 된다", async () => {
    const user = userEvent.setup();
    renderMerge();
    await completeChoices(user);
    await user.click(screen.getByRole("button", { name: "고객 A로 병합하기" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const merged = getMockCustomerState().customers.find((item) => item.customerId === 302);
    expect(merged?.status).toBe("MERGED");
    expect(merged?.mergedIntoCustomerId).toBe(301);
  });

  it("확정 방문 일정이 겹치면 일정을 정리한 뒤 다시 병합하라고 안내한다", async () => {
    server.use(
      http.post("/api/customers/merge", () => errorResponse(409, "SCHEDULE_CONFLICT", "겹침")),
    );
    const user = userEvent.setup();
    renderMerge();
    await completeChoices(user);
    await user.click(screen.getByRole("button", { name: "고객 A로 병합하기" }));
    expect(
      await screen.findByText(/일정을 취소하거나 재조율한 뒤 다시 병합해 주세요/),
    ).not.toBeNull();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("이미 병합된 고객 오류를 안내한다", async () => {
    server.use(
      http.post("/api/customers/merge", () => errorResponse(409, "INVALID_TRANSITION", "이미")),
    );
    const user = userEvent.setup();
    renderMerge();
    await completeChoices(user);
    await user.click(screen.getByRole("button", { name: "고객 A로 병합하기" }));
    expect(
      await screen.findByText(/이미 병합되었거나 지금은 처리할 수 없는 상태입니다/),
    ).not.toBeNull();
  });

  it("버전이 어긋나면 충돌을 안내한다", async () => {
    server.use(http.post("/api/customers/merge", () => mockErrors.versionConflict(5)));
    const user = userEvent.setup();
    renderMerge();
    await completeChoices(user);
    await user.click(screen.getByRole("button", { name: "고객 A로 병합하기" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("보관된 고객이 끼어 있으면 병합을 막고 안내한다", async () => {
    setMockCustomerState({
      customers: getMockCustomerState().customers.map((item) =>
        item.customerId === 302
          ? { ...item, status: "ARCHIVED" as const, deletedAt: "2026-11-01T09:00:00+09:00" }
          : item,
      ),
    });
    renderMerge();
    expect(await screen.findByText(/보관된 고객은 병합할 수 없습니다/)).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "고객 A로 병합하기" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("이미 병합된 고객이 끼어 있으면 병합을 막고 안내한다", async () => {
    setMockCustomerState({
      customers: [
        ...getMockCustomerState().customers.filter((item) => item.customerId !== 302),
        buildMockCustomer({
          customerId: 302,
          name: "병합됨",
          status: "MERGED",
          mergedIntoCustomerId: 303,
        }),
      ],
    });
    renderMerge();
    expect(await screen.findByText(/이미 병합된 고객은 다시 병합할 수 없습니다/)).not.toBeNull();
  });

  it("한쪽에만 최초문의가 있으면 선택 영역 없이 그대로 유지된다고 안내한다", async () => {
    setMockCustomerState({
      customers: getMockCustomerState().customers.map((item) =>
        item.customerId === 302 ? { ...item, consultations: [] } : item,
      ),
    });
    renderMerge();
    expect(await screen.findByText("한쪽에만 최초문의가 있어 그대로 유지됩니다.")).not.toBeNull();
    expect(screen.queryByRole("radio", { name: /최초문의/ })).toBeNull();
  });

  it("처리 중에는 선택 영역이 잠긴다", async () => {
    server.use(
      http.post("/api/customers/merge", async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return errorResponse(409, "CUSTOMER_ARCHIVED", "보관");
      }),
    );
    const user = userEvent.setup();
    renderMerge();
    await completeChoices(user);
    await user.click(screen.getByRole("button", { name: "고객 A로 병합하기" }));
    const fieldset = screen.getByRole("group", { name: "" });
    expect(fieldset.hasAttribute("disabled")).toBe(true);
    expect(await screen.findByText(/보관된 고객은 수정할 수 없습니다/)).not.toBeNull();
    expect(within(document.body).getByRole("button", { name: "남길 고객 바꾸기" })).not.toBeNull();
  });
});
