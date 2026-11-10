// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { server } from "@/mocks/server";
import {
  EMPTY_PAGE,
  installSystemTestLifecycle,
  renderWithMonitor,
} from "../system-common/system-testing";
import { ContractCopiesScreen } from "./contract-copies-screen";
import { EMPTY_COPY_INPUT, toCopyBody, validateCopy } from "./contract-copies-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/integrations/1/contract-copies",
  useSearchParams: () => new URLSearchParams(),
}));

installSystemTestLifecycle();

const HASH = "b".repeat(64);

function renderCopies(
  integrationId = 1,
  roles: Parameters<typeof renderWithMonitor>[1] = ["PRIVACY"],
) {
  return renderWithMonitor(<ContractCopiesScreen integrationId={integrationId} />, roles);
}

function fillForm(version = "v2") {
  fireEvent.change(screen.getByRole("combobox", { name: /^문서 종류/ }), {
    target: { value: "PROCESSING_TERMS" },
  });
  fireEvent.change(screen.getByLabelText(/^버전 이름/), { target: { value: version } });
  fireEvent.change(screen.getByLabelText(/^저장 키/), { target: { value: "private/key/2" } });
  fireEvent.change(screen.getByLabelText(/^사본 해시/), { target: { value: HASH.toUpperCase() } });
}

describe("계약서 사본 모델", () => {
  it("필수 입력이 비면 검증 오류를 돌려준다", () => {
    const errors = validateCopy(EMPTY_COPY_INPUT);
    expect(errors.documentKind).toBeTruthy();
    expect(errors.versionLabel).toBeTruthy();
    expect(errors.storageKey).toBeTruthy();
    expect(errors.contentSha256).toBeTruthy();
  });

  it("해시는 64자리 16진수만 허용한다", () => {
    const base = {
      ...EMPTY_COPY_INPUT,
      documentKind: "OTHER",
      versionLabel: "v1",
      storageKey: "k",
    };
    expect(validateCopy({ ...base, contentSha256: "g".repeat(64) }).contentSha256).toBeTruthy();
    expect(validateCopy({ ...base, contentSha256: "a".repeat(63) }).contentSha256).toBeTruthy();
    expect(validateCopy({ ...base, contentSha256: "A".repeat(64) }).contentSha256).toBeUndefined();
  });

  it("버전 이름은 40자까지 저장 키는 300자까지 허용한다", () => {
    const base = { ...EMPTY_COPY_INPUT, documentKind: "OTHER", contentSha256: HASH };
    const long = validateCopy({
      ...base,
      versionLabel: "v".repeat(41),
      storageKey: "k".repeat(301),
    });
    expect(long.versionLabel).toBeTruthy();
    expect(long.storageKey).toBeTruthy();
    const ok = validateCopy({ ...base, versionLabel: "v".repeat(40), storageKey: "k".repeat(300) });
    expect(ok.versionLabel).toBeUndefined();
    expect(ok.storageKey).toBeUndefined();
  });

  it("유효 종료일이 체결일보다 앞서면 오류다", () => {
    const base = {
      ...EMPTY_COPY_INPUT,
      documentKind: "OTHER",
      versionLabel: "v1",
      storageKey: "k",
      contentSha256: HASH,
    };
    expect(
      validateCopy({ ...base, signedOn: "2026-11-20", validUntil: "2026-11-19" }).validUntil,
    ).toBeTruthy();
    expect(
      validateCopy({ ...base, signedOn: "2026-11-20", validUntil: "2026-11-20" }).validUntil,
    ).toBeUndefined();
  });

  it("등록 본문은 해시를 소문자로 바꾸고 비운 값은 뺀다", () => {
    const body = toCopyBody({
      ...EMPTY_COPY_INPUT,
      documentKind: "OTHER",
      versionLabel: " v1 ",
      storageKey: " key ",
      contentSha256: HASH.toUpperCase(),
    });
    expect(body).toEqual({
      documentKind: "OTHER",
      versionLabel: "v1",
      storageKey: "key",
      contentSha256: HASH,
    });
  });
});

describe("공급자 계약서 사본 화면", () => {
  it("사본 목록의 종류와 버전과 체결일과 해시를 보여준다", async () => {
    renderCopies();
    const table = await screen.findByRole("table", { name: "계약서 사본 목록" });
    expect(within(table).getByText("서비스 계약")).toBeTruthy();
    expect(within(table).getByText("v1")).toBeTruthy();
    expect(within(table).getByText("a".repeat(64))).toBeTruthy();
    expect(within(table).queryByRole("link")).toBeNull();
  });

  it("저장 위치는 목록에 보이지 않고 공개 링크가 없다는 안내를 둔다", async () => {
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    expect(screen.getByText(/사본 파일의 공개 링크는 두지 않습니다/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("private-object-key");
  });

  it("출시 후 확장과 변호사 검토 전 초안 안내를 둔다", async () => {
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    expect(
      screen.getByText(
        /출시 후 확장 기능입니다\. 변호사 검토 전 초안이며 법적 효력과 적합성은 검토 뒤 확정합니다/,
      ),
    ).toBeTruthy();
  });

  it("연동 목록으로 돌아가는 링크가 있다", async () => {
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    expect(screen.getByRole("link", { name: "연동 목록으로" }).getAttribute("href")).toBe(
      "/ops/integrations",
    );
  });

  it("사본이 없는 연동은 경고를 보인다", async () => {
    renderCopies(2);
    expect(await screen.findByText("이 연동에 등록된 계약서 사본이 없습니다")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("저장 키와 해시를 등록해 주세요");
  });

  it("없는 연동이면 찾을 수 없다는 화면을 보인다", async () => {
    renderCopies(999);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("목록 조회가 403이면 권한 화면을 보인다", async () => {
    server.use(http.get("/api/ops/integrations/:id/contract-copies", () => mockErrors.forbidden()));
    renderCopies();
    expect(await screen.findByText("접근 권한이 없습니다")).toBeTruthy();
  });

  it("목록 조회가 429이면 잠시 기다리라는 화면을 보인다", async () => {
    server.use(
      http.get("/api/ops/integrations/:id/contract-copies", () => mockErrors.rateLimited(30)),
    );
    renderCopies();
    expect(await screen.findByText("요청이 너무 많습니다")).toBeTruthy();
  });

  it("목록 조회가 서버 오류이면 다시 시도할 수 있다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/ops/integrations/:id/contract-copies", () => {
        calls += 1;
        return calls === 1 ? mockErrors.server() : HttpResponse.json({ items: [] });
      }),
    );
    renderCopies();
    await userEvent.setup().click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("이 연동에 등록된 계약서 사본이 없습니다")).toBeTruthy();
  });

  it("개인정보담당이 아니면 접근 불가 안내를 보인다", () => {
    renderCopies(1, ["OPS"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("필수 입력이 비면 등록하지 않고 오류를 보인다", async () => {
    const calls = vi.fn();
    server.use(
      http.post("/api/ops/integrations/:id/contract-copies", () => {
        calls();
        return mockErrors.server();
      }),
    );
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(await screen.findByText("문서 종류를 선택해 주세요.")).toBeTruthy();
    expect(screen.getByText("버전 이름을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("비공개 저장소의 저장 키를 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("64자리 16진수 해시를 입력해 주세요.")).toBeTruthy();
    expect(calls).not.toHaveBeenCalled();
  });

  it("해시가 올바르지 않으면 오류를 보인다", async () => {
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fillForm();
    fireEvent.change(screen.getByLabelText(/^사본 해시/), { target: { value: "xyz" } });
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(await screen.findByText("64자리 16진수 해시를 입력해 주세요.")).toBeTruthy();
  });

  it("유효 종료일이 체결일보다 앞서면 오류를 보인다", async () => {
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fillForm();
    fireEvent.change(screen.getByLabelText("체결일"), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByLabelText("유효 종료일"), { target: { value: "2026-11-01" } });
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(await screen.findByText("유효 종료일은 체결일 이후여야 합니다.")).toBeTruthy();
  });

  it("등록하면 목록에 추가되고 저장 키는 목록에 나오지 않는다", async () => {
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fillForm("v2");
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(await screen.findByText(/사본 82\(v2\)를 등록했습니다/)).toBeTruthy();
    const table = screen.getByRole("table", { name: "계약서 사본 목록" });
    expect(await within(table).findByText("처리 조건")).toBeTruthy();
    expect(document.body.textContent).not.toContain("private/key/2");
  });

  it("등록 본문에 저장 키와 소문자 해시와 재수탁자 고지 일시를 보낸다", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post("/api/ops/integrations/:id/contract-copies", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            copyId: 90,
            integrationId: 1,
            documentKind: "PROCESSING_TERMS",
            versionLabel: "v2",
            signedOn: null,
            validUntil: null,
            contentSha256: HASH,
            subprocessorChangeNotifiedAt: "2026-11-05T10:00:00+09:00",
            uploadedByOperatorId: 1,
            uploadedAt: "2026-11-10T09:00:00+09:00",
            retentionUntil: null,
          },
          { status: 201 },
        );
      }),
    );
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fillForm("v2");
    fireEvent.change(screen.getByLabelText("재수탁자 변경 사전 고지 일시 날짜"), {
      target: { value: "2026-11-05" },
    });
    fireEvent.change(screen.getByLabelText("재수탁자 변경 사전 고지 일시 시각"), {
      target: { value: "10:00" },
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    await screen.findByText(/사본 90\(v2\)를 등록했습니다/);
    expect(body).toEqual({
      documentKind: "PROCESSING_TERMS",
      versionLabel: "v2",
      storageKey: "private/key/2",
      contentSha256: HASH,
      subprocessorChangeNotifiedAt: "2026-11-05T10:00:00+09:00",
    });
  });

  it("같은 종류와 버전을 다시 등록하면 409 안내를 보인다", async () => {
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fireEvent.change(screen.getByRole("combobox", { name: /^문서 종류/ }), {
      target: { value: "SERVICE_CONTRACT" },
    });
    fireEvent.change(screen.getByLabelText(/^버전 이름/), { target: { value: "v1" } });
    fireEvent.change(screen.getByLabelText(/^저장 키/), { target: { value: "k" } });
    fireEvent.change(screen.getByLabelText(/^사본 해시/), { target: { value: HASH } });
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(
      await screen.findByText("같은 연동에 같은 종류와 버전의 사본이 이미 등록되어 있습니다."),
    ).toBeTruthy();
  });

  it("등록이 400이면 서버 입력 오류를 보인다", async () => {
    server.use(
      http.post("/api/ops/integrations/:id/contract-copies", () =>
        mockErrors.validation([
          { field: "storageKey", message: "저장 키 형식이 올바르지 않습니다." },
        ]),
      ),
    );
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fillForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(await screen.findByText(/저장 키 형식이 올바르지 않습니다/)).toBeTruthy();
  });

  it("등록이 403이면 권한 안내를 보인다", async () => {
    server.use(
      http.post("/api/ops/integrations/:id/contract-copies", () => mockErrors.forbidden()),
    );
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fillForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("등록이 404이면 안내한다", async () => {
    server.use(http.post("/api/ops/integrations/:id/contract-copies", () => mockErrors.notFound()));
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fillForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("등록이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(
      http.post("/api/ops/integrations/:id/contract-copies", () => mockErrors.rateLimited(9)),
    );
    renderCopies();
    await screen.findByRole("table", { name: "계약서 사본 목록" });
    fillForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "사본 등록" }));
    expect(await screen.findByText(/9초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("빈 응답을 받아도 빈 목록 경고와 등록 폼을 함께 보인다", async () => {
    server.use(
      http.get("/api/ops/integrations/:id/contract-copies", () => HttpResponse.json({ items: [] })),
    );
    renderCopies();
    expect(await screen.findByText("이 연동에 등록된 계약서 사본이 없습니다")).toBeTruthy();
    expect(screen.getByRole("button", { name: "사본 등록" })).toBeTruthy();
    expect(EMPTY_PAGE.items).toEqual([]);
  });
});
