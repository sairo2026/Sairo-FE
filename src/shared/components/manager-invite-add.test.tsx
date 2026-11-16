// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resetMockPropertyState } from "@/mocks/handlers/property";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { PropertyCreateScreen } from "@/features/property/components/property-form-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/properties/new",
}));

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

const OPEN_LABEL = "직접 입력해서 추가하기";

function openButton() {
  const group = screen.queryByRole("group", { name: "공인중개사 초대로 추가" });
  return group ? within(group).queryByRole("button", { name: OPEN_LABEL }) : null;
}
const EMAIL_LABEL = "초대할 공인중개사 이메일";

describe("공인중개사 초대로 추가", () => {
  it("대표가 이메일만 입력하면 소속공인중개사 초대를 보내고 승인 전까지 지정할 수 없다고 안내한다", async () => {
    const user = userEvent.setup();
    let sent: { email?: string; role?: string } | undefined;
    server.use(
      http.post("/api/offices/current/memberships/invite", async ({ request }) => {
        sent = (await request.json()) as { email?: string; role?: string };
        return HttpResponse.json({
          membershipId: 61,
          status: "PENDING",
          role: "AGENT",
          officeId: 12,
          createdAt: "2026-11-01T00:00:00+09:00",
          updatedAt: "2026-11-01T00:00:00+09:00",
          version: 1,
          expiresAt: "2026-11-08T00:00:00+09:00",
        });
      }),
    );
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await screen.findByRole("option", { name: "이중개" });
    await user.click(openButton() as HTMLElement);
    await user.type(screen.getByLabelText(EMAIL_LABEL), " new.agent@example.com ");
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(
      await screen.findByText(/수락하고 대표가 승인하면 담당 공인중개사로 지정/),
    ).not.toBeNull();
    expect(sent).toEqual({ email: "new.agent@example.com", role: "AGENT" });
    expect(screen.queryByLabelText(EMAIL_LABEL)).toBeNull();
    expect(screen.queryByRole("option", { name: "초대받은분" })).toBeNull();
  });

  it("이메일 형식이 틀리면 보내지 않고 서버 오류는 문구로 알린다", async () => {
    const user = userEvent.setup();
    renderOffice(<PropertyCreateScreen />, { role: "OWNER" });
    await user.click(openButton() as HTMLElement);
    await user.type(screen.getByLabelText(EMAIL_LABEL), "not-an-email");
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    expect(await screen.findByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();

    await user.clear(screen.getByLabelText(EMAIL_LABEL));
    await user.type(screen.getByLabelText(EMAIL_LABEL), "unknown@example.com");
    await user.click(screen.getByRole("button", { name: "초대 보내기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("사이로에 가입한 이메일이 아닙니다"),
    );
  });

  it("대표가 아니면 직접 추가 입구를 보이지 않는다", async () => {
    renderOffice(<PropertyCreateScreen />, { role: "AGENT" });
    await screen.findByRole("option", { name: "이중개" });
    expect(openButton()).toBeNull();
  });

  it("읽기 전용 상태에서는 입구가 비활성이다", async () => {
    renderOffice(<PropertyCreateScreen />, { role: "OWNER", isReadOnly: true });
    expect((openButton() as HTMLButtonElement).disabled).toBe(true);
  });
});
