// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockTask,
  getMockWorkState,
  resetMockWorkState,
  setMockWorkState,
} from "@/mocks/handlers/work";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { TaskListScreen } from "./task-list-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/tasks",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

function mockMe(membershipId: number, role: "OWNER" | "AGENT" | "DEPUTY") {
  server.use(
    http.get("/api/memberships/me", () =>
      HttpResponse.json({
        membershipId,
        officeId: 12,
        officeName: "사이로 공인중개사사무소",
        role,
        status: "APPROVED",
        requestSource: "REQUEST",
        createdAt: "2026-11-10T09:00:00+09:00",
        updatedAt: "2026-11-10T09:00:00+09:00",
        version: 1,
      }),
    ),
  );
}

beforeEach(() => mockMe(2, "OWNER"));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockWorkState();
});

afterAll(() => stopServer());

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "+ 업무 만들기" }));
  return screen.findByRole("dialog");
}

describe("업무 목록과 업무 팝업", () => {
  it("로딩 뒤 미완료 업무를 보여주고 완료 탭으로 바꾼다", async () => {
    setMockWorkState({
      tasks: [
        buildMockTask({ taskId: 1, title: "미완료 업무" }),
        buildMockTask({ taskId: 2, title: "끝낸 업무", status: "DONE" }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    expect(document.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(await screen.findByText("미완료 업무")).not.toBeNull();
    expect(screen.queryByText("끝낸 업무")).toBeNull();
    await user.click(screen.getByRole("button", { name: "완료" }));
    expect(await screen.findByText("끝낸 업무")).not.toBeNull();
  });

  it("업무가 없으면 빈 안내를 보여준다", async () => {
    setMockWorkState({ tasks: [] });
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    expect(await screen.findByText("표시할 업무가 없습니다.")).not.toBeNull();
  });

  it("목록 조회 오류는 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/tasks", () => mockErrors.server()));
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    expect(
      await screen.findByText("일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요."),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("제목을 비우면 필드 오류를 보이고 저장하지 않는다", async () => {
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    const dialog = await openCreate(user);
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("제목을 입력해 주세요.")).not.toBeNull();
    expect(getMockWorkState().tasks).toHaveLength(1);
  });

  it("제목이 100자를 넘으면 막는다", async () => {
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    const dialog = await openCreate(user);
    const title = within(dialog).getByLabelText(/제목/);
    title.removeAttribute("maxlength");
    await user.click(title);
    await user.paste("가".repeat(101));
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("제목은 100자까지 입력할 수 있습니다.")).not.toBeNull();
  });

  it("업무를 만들면 목록에 나타난다", async () => {
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText(/제목/), "새 업무");
    await waitFor(() =>
      expect((within(dialog).getByLabelText(/담당자/) as HTMLSelectElement).value).not.toBe(""),
    );
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("새 업무")).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("서버가 필드 오류를 돌려주면 해당 입력 아래에 보인다", async () => {
    server.use(
      http.post("/api/tasks", () =>
        mockErrors.validation([{ field: "dueDate", message: "예정일이 올바르지 않습니다." }]),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText(/제목/), "새 업무");
    await waitFor(() =>
      expect((within(dialog).getByLabelText(/담당자/) as HTMLSelectElement).value).not.toBe(""),
    );
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("예정일이 올바르지 않습니다.")).not.toBeNull();
  });

  it("자동 생성 업무는 제목 수정과 삭제가 막히고 완료 처리와 메모만 가능하다", async () => {
    setMockWorkState({
      tasks: [buildMockTask({ taskId: 3, title: "잔금 예정", sourceType: "CONTRACT_BALANCE" })],
    });
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "업무 잔금 예정 열기" }));
    const dialog = await screen.findByRole("dialog");
    expect((within(dialog).getByLabelText(/제목/) as HTMLInputElement).disabled).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "삭제" })).toBeNull();
    expect(within(dialog).getByText(/원천이 바뀌면 함께 갱신/)).not.toBeNull();
    await user.type(within(dialog).getByLabelText(/메모/), "확인함");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    await waitFor(() => expect(getMockWorkState().tasks[0]?.memo).toBe("확인함"));
  });

  it("완료 처리와 완료 취소를 할 수 있다", async () => {
    setMockWorkState({ tasks: [buildMockTask({ taskId: 4, title: "전화하기" })] });
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "업무 전화하기 열기" }));
    await user.click(await screen.findByRole("button", { name: "완료 처리" }));
    await waitFor(() => expect(getMockWorkState().tasks[0]?.status).toBe("DONE"));
    await user.click(screen.getByRole("button", { name: "완료" }));
    await user.click(await screen.findByRole("button", { name: "업무 전화하기 열기" }));
    await user.click(await screen.findByRole("button", { name: "완료 취소" }));
    await waitFor(() => expect(getMockWorkState().tasks[0]?.status).toBe("TODO"));
  });

  it("직접 만든 업무는 확인 뒤 삭제한다", async () => {
    setMockWorkState({ tasks: [buildMockTask({ taskId: 5, title: "지울 업무" })] });
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "업무 지울 업무 열기" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    await user.click(await within(dialog).findByRole("button", { name: "삭제 확인" }));
    await waitFor(() => expect(getMockWorkState().tasks).toHaveLength(0));
  });

  it("삭제 확인은 포커스를 받고 ESC로 닫히며 업무 대화상자는 남는다", async () => {
    setMockWorkState({ tasks: [buildMockTask({ taskId: 6, title: "지킬 업무" })] });
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "업무 지킬 업무 열기" }));
    const dialog = await screen.findByRole("dialog");
    const deleteButton = within(dialog).getByRole("button", { name: "삭제" });
    await user.click(deleteButton);
    const confirm = await within(dialog).findByRole("alertdialog", { name: "업무 삭제 확인" });
    expect(document.activeElement).toBe(confirm);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(within(dialog).queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(document.activeElement).toBe(deleteButton);
    expect(getMockWorkState().tasks).toHaveLength(1);
  });

  it("자동 업무 삭제가 403이면 안내 문구를 보여준다", async () => {
    server.use(
      http.patch("/api/tasks/:taskId", () =>
        errorResponse(403, "AUTO_TASK_IMMUTABLE", "자동 생성 업무는 고칠 수 없습니다."),
      ),
    );
    setMockWorkState({ tasks: [buildMockTask({ taskId: 6, title: "고칠 업무" })] });
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "업무 고칠 업무 열기" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText(/자동으로 만들어진 업무는 제목·담당자·예정일/),
    ).not.toBeNull();
  });

  it("다른 사용자가 먼저 고치면 버전 충돌 안내를 보여준다", async () => {
    server.use(http.patch("/api/tasks/:taskId", () => mockErrors.versionConflict(3)));
    setMockWorkState({ tasks: [buildMockTask({ taskId: 7, title: "충돌 업무" })] });
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "업무 충돌 업무 열기" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "완료 처리" }));
    expect(await within(dialog).findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("삭제 대상이 이미 없으면 404 안내를 보여준다", async () => {
    server.use(http.delete("/api/tasks/:taskId", () => mockErrors.notFound()));
    setMockWorkState({ tasks: [buildMockTask({ taskId: 8, title: "사라질 업무" })] });
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "업무 사라질 업무 열기" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    await user.click(await within(dialog).findByRole("button", { name: "삭제 확인" }));
    expect(await within(dialog).findByText(/이미 삭제되었을 수 있습니다/)).not.toBeNull();
  });

  it("제출이 너무 잦으면 429 안내를 보여준다", async () => {
    server.use(http.post("/api/tasks", () => mockErrors.rateLimited(30)));
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER" });
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText(/제목/), "새 업무");
    await waitFor(() =>
      expect((within(dialog).getByLabelText(/담당자/) as HTMLSelectElement).value).not.toBe(""),
    );
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/요청이 너무 많습니다/)).not.toBeNull();
  });

  it("중개보조원은 담당자를 바꾸지 못하고 본인 업무만 보인다", async () => {
    setMockWorkState({
      callerRole: "DEPUTY",
      callerMembershipId: 7,
      tasks: [
        buildMockTask({ taskId: 1, title: "내 서무", assigneeMembershipId: 7 }),
        buildMockTask({ taskId: 2, title: "남의 업무", assigneeMembershipId: 2 }),
      ],
    });
    mockMe(7, "DEPUTY");
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "DEPUTY" });
    expect(await screen.findByText("내 서무")).not.toBeNull();
    expect(screen.queryByText("남의 업무")).toBeNull();
    const dialog = await openCreate(user);
    expect((within(dialog).getByLabelText(/담당자/) as HTMLSelectElement).disabled).toBe(true);
    expect(
      within(dialog).getByText("중개보조원은 본인 업무만 만들고 고칠 수 있습니다."),
    ).not.toBeNull();
  });

  it("읽기 전용 상태에서는 저장 버튼이 비활성이다", async () => {
    const user = userEvent.setup();
    renderOffice(<TaskListScreen />, { role: "OWNER", isReadOnly: true });
    expect(
      ((await screen.findByRole("button", { name: "+ 업무 만들기" })) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    void user;
  });
});
