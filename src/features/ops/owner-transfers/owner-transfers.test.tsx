// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse } from "@/mocks/error-responses";
import { resetMockOwnerTransfers } from "@/mocks/handlers/ops-owner-transfers";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { OwnerTransferListScreen } from "./transfer-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/owner-transfers",
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
  resetMockOwnerTransfers();
});
afterAll(() => stopServer());

function renderList(roles: OpsRole[] = ["REVIEW"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<OwnerTransferListScreen />, roles);
}

describe("대표 이전 승인 대기 목록", () => {
  it("기본으로 운영자 승인을 기다리는 건만 보인다", async () => {
    renderList();
    expect(await screen.findByText("한강공인중개사사무소 (7)")).toBeTruthy();
    expect(screen.getByText("정릉공인중개사사무소 (8)")).toBeTruthy();
    expect(screen.queryByText("마포공인중개사사무소 (9)")).toBeNull();
    expect(screen.getAllByRole("button", { name: "최종 승인" })).toHaveLength(2);
  });

  it("승인하면 목록에서 빠지고 완료 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("한강공인중개사사무소 (7)");
    await user.click(screen.getAllByRole("button", { name: "최종 승인" }).at(0) as HTMLElement);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("대표 이전 41번을 승인했습니다.")).toBeTruthy();
    expect(screen.queryByText("한강공인중개사사무소 (7)")).toBeNull();
  });

  it("재검사 실패로 409가 오면 사유를 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/owner-transfers/:transferId/approve", () =>
        errorResponse(409, "TRANSFER_PRECONDITION_FAILED", "조건 불충족"),
      ),
    );
    renderList();
    await screen.findByText("한강공인중개사사무소 (7)");
    await user.click(screen.getAllByRole("button", { name: "최종 승인" }).at(0) as HTMLElement);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/조건이 맞지 않아 승인하지 못했습니다/)).toBeTruthy();
  });

  it("심사담당이 아니면 접근 불가 안내만 보인다", () => {
    renderList(["SUPPORT"]);
    expect(screen.getByRole("alert").textContent).toContain("심사담당");
  });
});
