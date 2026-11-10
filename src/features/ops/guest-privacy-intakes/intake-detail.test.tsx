// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { resetMockOpsSupport } from "@/mocks/handlers/ops-support";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { IntakeDetailScreen } from "./intake-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/guest-privacy-intakes/41",
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
  resetMockOpsSupport();
});
afterAll(() => stopServer());

type User = ReturnType<typeof userEvent.setup>;

function renderDetail(id: number, roles: OpsRole[] = ["PRIVACY"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<IntakeDetailScreen intakeId={id} />, roles);
}

async function loaded(id: number, roles?: OpsRole[]) {
  renderDetail(id, roles);
  await screen.findByRole("heading", { name: "접수 정보" });
}

function isBlocked(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

function submitButton(name: string) {
  return screen.getByRole("button", { name });
}

async function pickConvert(user: User) {
  await user.click(screen.getByRole("radio", { name: "본인 확인됨" }));
  await user.click(screen.getByRole("radio", { name: "권리 요청으로 전환" }));
}

async function fillConvert(user: User) {
  await user.type(screen.getByLabelText("적용 법적 근거"), "검토 중, 개인정보 보호법");
  await user.type(screen.getByLabelText("요청 범위"), "방문 조건 열람");
}

describe("접수 상세 표시", () => {
  it("마스킹한 연락처와 사무소·링크 종류·요청 종류·구분·기한을 보인다", async () => {
    await loaded(41);
    expect(screen.getByText("re***@example.com")).toBeTruthy();
    expect(screen.getByText("이메일")).toBeTruthy();
    expect(screen.getByText("사무소 예시", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("승인자 매물 링크")).toBeTruthy();
    expect(screen.getByText("열람", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("본인", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("내부 목표 기한")).toBeTruthy();
    expect(screen.getByText(/서버가 가린 값만 보이며/)).toBeTruthy();
  });

  it("변호사 검토 전 초안이라는 안내를 보인다", async () => {
    await loaded(41);
    expect(
      screen.getByText(/변호사 검토 전 초안입니다. 법적 효력과 적합성은 검토 뒤 확정합니다/),
    ).toBeTruthy();
  });

  it("연락처를 지운 접수는 연락처 삭제됨으로 보인다", async () => {
    await loaded(44);
    expect(screen.getByText("연락처 삭제됨")).toBeTruthy();
  });

  it("이미 전환된 접수는 권리 요청 번호를 보이고 처리 폼이 없다", async () => {
    await loaded(43);
    expect(screen.getByText(/이미 권리 요청으로 전환된 접수입니다/)).toBeTruthy();
    expect(screen.getByText("8801")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "본인 확인 결과와 처리" })).toBeNull();
  });

  it("종결된 접수는 종결 안내를 보이고 처리 폼이 없다", async () => {
    await loaded(44);
    expect(screen.getByText(/종결된 접수입니다/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "본인 확인 결과와 처리" })).toBeNull();
  });

  it("없는 접수는 찾을 수 없다고 안내한다", async () => {
    renderDetail(999);
    expect(await screen.findByText("접수를 찾을 수 없습니다")).toBeTruthy();
  });

  it("조회가 서버 오류이면 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/ops/guest-privacy-intakes", () => mockErrors.server(), { once: true }),
    );
    renderDetail(41);
    await user.click(await screen.findByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByRole("heading", { name: "접수 정보" })).toBeTruthy();
  });

  it("조회가 403이면 접근 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/guest-privacy-intakes", () => mockErrors.forbidden()));
    renderDetail(41);
    expect(await screen.findByText("접근 권한이 없습니다")).toBeTruthy();
  });

  it("개인정보담당이 아니면 접근 불가 안내만 보인다", () => {
    renderDetail(41, ["SUPPORT"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "본인 확인됨" })).toBeNull();
  });
});

describe("본인 확인 결과와 처리 입력", () => {
  it("아무것도 고르지 않으면 처리 버튼이 꺼져 있다", async () => {
    await loaded(41);
    expect(isBlocked(submitButton("권리 요청으로 전환"))).toBe(true);
  });

  it("본인 확인 실패를 고르면 종결만 할 수 있다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await user.click(screen.getByRole("radio", { name: "본인 확인 실패" }));
    expect(
      (screen.getByRole("radio", { name: "권리 요청으로 전환" }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect((screen.getByRole("radio", { name: "종결" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/종결만 할 수 있습니다/)).toBeTruthy();
    expect(screen.getByLabelText("종결 사유")).toBeTruthy();
  });

  it("종결 사유를 고르기 전에는 종결 버튼이 꺼져 있다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await user.click(screen.getByRole("radio", { name: "본인 확인 실패" }));
    expect(isBlocked(submitButton("접수 종결"))).toBe(true);
    await user.selectOptions(screen.getByLabelText("종결 사유"), "UNVERIFIABLE");
    expect(isBlocked(submitButton("접수 종결"))).toBe(false);
  });

  it("종결 사유는 네 가지 중에서 고른다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await user.click(screen.getByRole("radio", { name: "본인 확인됨" }));
    await user.click(screen.getByRole("radio", { name: "종결" }));
    const labels = within(screen.getByLabelText("종결 사유"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(labels).toEqual([
      "사유를 선택해 주세요",
      "중복 접수",
      "처리 대상 아님",
      "본인 확인 불가",
      "요청자가 철회",
    ]);
  });

  it("전환은 법적 근거와 요청 범위가 있어야 활성이 된다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await pickConvert(user);
    expect(isBlocked(submitButton("권리 요청으로 전환"))).toBe(true);
    await user.type(screen.getByLabelText("적용 법적 근거"), "검토 중");
    expect(isBlocked(submitButton("권리 요청으로 전환"))).toBe(true);
    await user.type(screen.getByLabelText("요청 범위"), "방문 조건 열람");
    expect(isBlocked(submitButton("권리 요청으로 전환"))).toBe(false);
  });

  it("법적 근거를 확인하지 못했을 때 적는 방법을 안내한다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await pickConvert(user);
    expect(screen.getByText(/검토 중과 검토 대상 법령 이름을 적습니다/)).toBeTruthy();
    expect(screen.getByText(/접수일 10일 뒤.*접수일 7일 뒤/)).toBeTruthy();
  });

  it("법정 기한이 내부 기한보다 앞서면 오류를 보이고 전환할 수 없다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    fireEvent.change(screen.getByLabelText("법정 기한 날짜"), { target: { value: "2026-12-10" } });
    fireEvent.change(screen.getByLabelText("내부 기한 날짜"), { target: { value: "2026-12-17" } });
    expect(screen.getByText("법정 기한은 내부 기한 이후여야 합니다.")).toBeTruthy();
    expect(isBlocked(submitButton("권리 요청으로 전환"))).toBe(true);
  });

  it("전환을 고르면 종결 사유 입력이 사라진다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await user.click(screen.getByRole("radio", { name: "본인 확인됨" }));
    await user.click(screen.getByRole("radio", { name: "종결" }));
    expect(screen.getByLabelText("종결 사유")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "권리 요청으로 전환" }));
    expect(screen.queryByLabelText("종결 사유")).toBeNull();
  });
});

describe("전환과 종결 실행", () => {
  it("되돌릴 수 없다는 확인 뒤 전환하고 권리 요청 번호를 안내한다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    await user.click(submitButton("권리 요청으로 전환"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/전환한 접수는 되돌릴 수 없고/)).toBeTruthy();
    expect(within(dialog).getByText(/감사 로그에 남습니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "전환" }));
    expect(
      await screen.findByText("권리 요청으로 전환했습니다. 권리 요청 번호는 8901입니다."),
    ).toBeTruthy();
    expect(await screen.findByText(/이미 권리 요청으로 전환된 접수입니다/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "본인 확인 결과와 처리" })).toBeNull();
  });

  it("전환 요청에 확인 결과·근거·범위·기한을 담아 보낸다", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined;
      }),
    );
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    fireEvent.change(screen.getByLabelText("법정 기한 날짜"), { target: { value: "2026-12-20" } });
    fireEvent.change(screen.getByLabelText("내부 기한 날짜"), { target: { value: "2026-12-17" } });
    await user.click(submitButton("권리 요청으로 전환"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "전환" }));
    await screen.findAllByText(/권리 요청 번호는/);
    expect(bodies).toEqual([
      {
        verificationResult: "VERIFIED",
        action: "CONVERT",
        legalBasis: "검토 중, 개인정보 보호법",
        requestScope: "방문 조건 열람",
        legalDueAt: "2026-12-20T18:00:00+09:00",
        internalDueAt: "2026-12-17T18:00:00+09:00",
        closeReason: null,
      },
    ]);
  });

  it("기한을 비우면 서버 기본값을 쓰도록 비워서 보낸다", async () => {
    const user = userEvent.setup();
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", async ({ request }) => {
        bodies.push((await request.clone().json()) as Record<string, unknown>);
        return undefined;
      }),
    );
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    await user.click(submitButton("권리 요청으로 전환"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "전환" }));
    await screen.findAllByText(/권리 요청 번호는/);
    expect(bodies[0]?.legalDueAt).toBeNull();
    expect(bodies[0]?.internalDueAt).toBeNull();
  });

  it("종결하면 종결 사유를 안내하고 종결 상태로 바뀐다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await user.click(screen.getByRole("radio", { name: "본인 확인됨" }));
    await user.click(screen.getByRole("radio", { name: "종결" }));
    await user.selectOptions(screen.getByLabelText("종결 사유"), "DUPLICATE");
    await user.click(submitButton("접수 종결"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "종결" }));
    expect(await screen.findByText("접수를 종결했습니다. 사유: 중복 접수")).toBeTruthy();
    expect(await screen.findByText(/종결된 접수입니다/)).toBeTruthy();
  });

  it("본인 확인 실패 접수를 종결 요청으로 보낸다", async () => {
    const user = userEvent.setup();
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", async ({ request }) => {
        bodies.push((await request.clone().json()) as Record<string, unknown>);
        return undefined;
      }),
    );
    await loaded(42);
    await user.click(screen.getByRole("radio", { name: "본인 확인 실패" }));
    await user.selectOptions(screen.getByLabelText("종결 사유"), "UNVERIFIABLE");
    await user.click(submitButton("접수 종결"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "종결" }));
    await screen.findByText(/접수를 종결했습니다/);
    expect(bodies[0]).toMatchObject({
      verificationResult: "FAILED",
      action: "CLOSE",
      closeReason: "UNVERIFIABLE",
      legalBasis: null,
    });
  });

  it("확인 대화상자에서 취소하면 처리하지 않는다", async () => {
    const user = userEvent.setup();
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    await user.click(submitButton("권리 요청으로 전환"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "본인 확인 결과와 처리" })).toBeTruthy();
  });

  it("다른 운영자가 먼저 전환했으면 이미 전환됐다고 안내하고 상태를 새로 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", () =>
        errorResponse(409, "GUEST_INTAKE_ALREADY_CONVERTED", "이미 전환"),
      ),
    );
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    await user.click(submitButton("권리 요청으로 전환"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "전환" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("이미 권리 요청으로 전환된 접수입니다.");
  });

  it("이미 처리된 접수를 다시 처리하면 상태 변경 불가 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", () =>
        errorResponse(409, "INVALID_TRANSITION", "처리됨"),
      ),
    );
    await loaded(41);
    await user.click(screen.getByRole("radio", { name: "본인 확인됨" }));
    await user.click(screen.getByRole("radio", { name: "종결" }));
    await user.selectOptions(screen.getByLabelText("종결 사유"), "NOT_SUBJECT");
    await user.click(submitButton("접수 종결"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "종결" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("처리가 403이면 권한 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", () => mockErrors.forbidden()),
    );
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    await user.click(submitButton("권리 요청으로 전환"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "전환" }));
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });

  it("처리 대상이 없으면 404 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", () => mockErrors.notFound()),
    );
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    await user.click(submitButton("권리 요청으로 전환"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "전환" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("처리 요청이 429이면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", () => mockErrors.rateLimited(20)),
    );
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    await user.click(submitButton("권리 요청으로 전환"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "전환" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 입력 검증 오류를 주면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/guest-privacy-intakes/:id/resolve", () =>
        mockErrors.validation([{ field: "legalBasis", message: "근거가 필요합니다." }]),
      ),
    );
    await loaded(41);
    await pickConvert(user);
    await fillConvert(user);
    await user.click(submitButton("권리 요청으로 전환"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "전환" }));
    await waitFor(() => expect(screen.getByText("입력값을 확인해 주세요.")).toBeTruthy());
  });
});
