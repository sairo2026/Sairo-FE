// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { setMockTermsOutcome } from "@/mocks/handlers/ops-system-monitor";
import { server } from "@/mocks/server";
import { installSystemTestLifecycle, renderWithMonitor } from "../system-common/system-testing";
import { TermsHashScreen } from "./terms-hash-screen";
import { MISMATCH_WARNING, hasMismatch } from "./terms-hash-model";
import type { TermsHashRow } from "./terms-hash-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/terms-hash-checks",
  useSearchParams: () => new URLSearchParams(),
}));

installSystemTestLifecycle();

const EXACT_WARNING =
  "게시된 약관 원문이 등록 시점과 다릅니다. 게시를 멈추고 원문을 확인해 주세요.";

function row(patch: Partial<TermsHashRow>): TermsHashRow {
  return {
    termsCode: "TOS",
    version: "2026-09-01",
    status: "ACTIVE",
    effectiveAt: "2026-09-01T04:00:00+09:00",
    lastCheckedAt: null,
    lastResult: null,
    ...patch,
  };
}

async function renderTerms(roles: Parameters<typeof renderWithMonitor>[1] = ["OPS"]) {
  renderWithMonitor(<TermsHashScreen />, roles);
  await screen.findByText("PRIVACY_POLICY");
}

function allMatch() {
  server.use(
    http.get("/api/ops/terms-hash-checks", () =>
      HttpResponse.json({
        items: [row({ lastCheckedAt: "2026-11-09T04:00:00+09:00", lastResult: "MATCH" })],
      }),
    ),
  );
}

describe("약관 해시 모델", () => {
  it("불일치 경고 문구는 명세와 정확히 같다", () => {
    expect(MISMATCH_WARNING).toBe(EXACT_WARNING);
  });

  it("목록 결과나 즉시 점검 결과에 불일치가 있으면 경고 대상이다", () => {
    expect(hasMismatch([row({ lastResult: "MATCH" })], null)).toBe(false);
    expect(hasMismatch([row({ lastResult: "MISMATCH" })], null)).toBe(true);
    expect(hasMismatch([row({ lastResult: "ERROR" })], null)).toBe(false);
    expect(
      hasMismatch([], {
        checkedAt: "2026-11-10T09:00:00+09:00",
        mismatchCount: 1,
        errorCount: 0,
        items: [],
      }),
    ).toBe(true);
  });
});

describe("약관 원문 해시 점검 화면", () => {
  it("약관 항목별 시행 버전과 마지막 점검 시각과 결과를 보여준다", async () => {
    await renderTerms();
    const table = screen.getByRole("table", { name: "약관 원문 해시 점검 결과" });
    expect(within(table).getByText("TOS")).toBeTruthy();
    expect(within(table).getByText("2026-09-01")).toBeTruthy();
    expect(within(table).getByText("일치")).toBeTruthy();
    expect(within(table).getByText("불일치")).toBeTruthy();
    expect(within(table).getByText("점검 전")).toBeTruthy();
    expect(within(table).getByText("시행 예정")).toBeTruthy();
  });

  it("불일치 항목이 있으면 경고 문구를 정확히 보인다", async () => {
    await renderTerms();
    const warning = screen.getByRole("alert");
    expect(warning.textContent).toBe(EXACT_WARNING);
  });

  it("불일치가 없으면 경고를 보이지 않는다", async () => {
    allMatch();
    renderWithMonitor(<TermsHashScreen />, ["OPS"]);
    await screen.findByText("TOS");
    expect(screen.queryByText(EXACT_WARNING)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("변호사 검토 전 초안 안내를 둔다", async () => {
    await renderTerms();
    expect(
      screen.getByText(/변호사 검토 전 초안이며 법적 효력과 적합성은 검토 뒤 확정합니다/),
    ).toBeTruthy();
  });

  it("로딩 중에는 표를 바쁨 상태로 표시한다", async () => {
    server.use(
      http.get("/api/ops/terms-hash-checks", async () => {
        await delay("infinite");
        return HttpResponse.json({ items: [] });
      }),
    );
    renderWithMonitor(<TermsHashScreen />, ["OPS"]);
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).not.toBeNull());
  });

  it("목록이 비면 안내한다", async () => {
    server.use(http.get("/api/ops/terms-hash-checks", () => HttpResponse.json({ items: [] })));
    renderWithMonitor(<TermsHashScreen />, ["OPS"]);
    expect(await screen.findByText("점검할 약관이 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/ops/terms-hash-checks", () => {
        calls += 1;
        return calls === 1 ? mockErrors.server() : HttpResponse.json({ items: [] });
      }),
    );
    renderWithMonitor(<TermsHashScreen />, ["OPS"]);
    await userEvent.setup().click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("점검할 약관이 없습니다.")).toBeTruthy();
  });

  it("목록이 403이면 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/terms-hash-checks", () => mockErrors.forbidden()));
    renderWithMonitor(<TermsHashScreen />, ["OPS"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("목록이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.get("/api/ops/terms-hash-checks", () => mockErrors.rateLimited(45)));
    renderWithMonitor(<TermsHashScreen />, ["OPS"]);
    expect(await screen.findByText(/45초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("운영담당이 아니면 접근 불가 안내를 보인다", () => {
    renderWithMonitor(<TermsHashScreen />, ["PRIVACY"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });
});

describe("즉시 점검", () => {
  it("실행하면 점검 결과 요약과 해시 앞부분을 보인다", async () => {
    await renderTerms();
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    expect(await screen.findByText(/불일치 1건, 오류 0건입니다/)).toBeTruthy();
    const summary = screen.getByRole("table", { name: "즉시 점검 항목별 결과" });
    expect(within(summary).getAllByText("ab12cd34").length).toBeGreaterThan(1);
    expect(within(summary).getByText("ff00ee11")).toBeTruthy();
  });

  it("불일치가 해소되면 경고가 사라지고 불일치 0건을 보인다", async () => {
    setMockTermsOutcome("PRIVACY_POLICY", "MATCH");
    await renderTerms();
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    expect(await screen.findByText(/불일치 0건, 오류 0건입니다/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(EXACT_WARNING)).toBeNull());
  });

  it("원문을 읽지 못한 항목은 오류로 보이고 현재 해시는 비운다", async () => {
    setMockTermsOutcome("TOS", "ERROR");
    await renderTerms();
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    expect(await screen.findByText(/불일치 1건, 오류 1건입니다/)).toBeTruthy();
    const summary = screen.getByRole("table", { name: "즉시 점검 항목별 결과" });
    expect(within(summary).getByText("오류")).toBeTruthy();
    expect(within(summary).getByText("-")).toBeTruthy();
  });

  it("점검 뒤 목록의 마지막 점검 시각이 채워진다", async () => {
    await renderTerms();
    expect(screen.getByText("점검 전")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    await waitFor(() => expect(screen.queryByText("점검 전")).toBeNull());
  });

  it("점검이 불일치를 알리면 경고 문구가 계속 보인다", async () => {
    allMatch();
    server.use(
      http.post("/api/ops/terms-hash-checks", () =>
        HttpResponse.json({
          checkedAt: "2026-11-10T09:00:00+09:00",
          mismatchCount: 1,
          errorCount: 0,
          items: [
            {
              termsCode: "TOS",
              version: "2026-09-01",
              result: "MISMATCH",
              expectedHashPrefix: "aaaaaaaa",
              actualHashPrefix: "bbbbbbbb",
            },
          ],
        }),
      ),
    );
    renderWithMonitor(<TermsHashScreen />, ["OPS"]);
    await screen.findByText("TOS");
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    expect((await screen.findByRole("alert")).textContent).toBe(EXACT_WARNING);
  });

  it("실행이 403이면 권한 안내를 보인다", async () => {
    server.use(http.post("/api/ops/terms-hash-checks", () => mockErrors.forbidden()));
    await renderTerms();
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("실행이 429이면 기다릴 시간을 안내한다", async () => {
    server.use(http.post("/api/ops/terms-hash-checks", () => mockErrors.rateLimited(60)));
    await renderTerms();
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    expect(await screen.findByText(/1분 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("실행이 서버 오류이면 실패 문구를 보인다", async () => {
    server.use(http.post("/api/ops/terms-hash-checks", () => mockErrors.server()));
    await renderTerms();
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
  });

  it("실행이 점검 중 503이면 서버 연결 문구를 보인다", async () => {
    server.use(http.post("/api/ops/terms-hash-checks", () => mockErrors.maintenance()));
    await renderTerms();
    await userEvent.setup().click(screen.getByRole("button", { name: "즉시 점검" }));
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
  });
});
