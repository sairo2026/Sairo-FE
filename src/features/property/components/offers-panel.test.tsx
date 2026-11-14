// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockProperty,
  getMockPropertyState,
  resetMockPropertyState,
  setMockPropertyState,
} from "@/mocks/handlers/property";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { OffersPanel } from "./offers-panel";

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

function renderPanel(options: { categoryName?: string; isArchived?: boolean } = {}) {
  return renderOffice(
    <OffersPanel
      propertyId={501}
      categoryName={options.categoryName ?? "아파트"}
      isArchived={options.isArchived ?? false}
    />,
    { role: "AGENT" },
  );
}

describe("거래 제안", () => {
  it("불러오는 동안 로딩을 보여주고 진행 중인 월세 제안과 상태 전환 버튼을 표시한다", async () => {
    renderPanel();
    expect(screen.getByText("거래 제안을 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("2,000만원 / 90만원")).not.toBeNull();
    expect(screen.getByText("거래 가능")).not.toBeNull();
    expect(screen.getByRole("button", { name: "협의 시작" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "협의 중단" })).toBeNull();
  });

  it("조회가 실패하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/properties/501/offers", () => mockErrors.server()));
    renderPanel();
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("협의를 시작하면 협의 중으로 바뀌고 협의 중단 버튼이 나타난다", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: "협의 시작" }));
    expect(await screen.findByText("협의 중")).not.toBeNull();
    expect(screen.getByRole("button", { name: "협의 중단" })).not.toBeNull();
    expect(getMockPropertyState().properties[0]?.offers[0]?.status).toBe("NEGOTIATING");
  });

  it("진행 중인 제안이 없는 거래유형은 새 제안 등록 폼을 보여주고 검증한다", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: "매매" }));
    await user.click(screen.getByRole("button", { name: "제안 등록" }));
    expect(screen.getByText("매매가를 0 이상의 정수(원)로 입력해 주세요.")).not.toBeNull();
    await user.type(screen.getByLabelText("매매가 (원)"), "300000000");
    expect(screen.getByText("3억원")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "제안 등록" }));
    expect(await screen.findByText("매매 제안을 등록했습니다.")).not.toBeNull();
    expect(getMockPropertyState().properties[0]?.offers).toHaveLength(2);
  });

  it("같은 거래유형의 진행 중인 제안이 이미 있다는 충돌을 안내한다", async () => {
    server.use(
      http.post("/api/properties/501/offers", () =>
        errorResponse(409, "OFFER_ALREADY_ACTIVE", "중복"),
      ),
    );
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: "전세" }));
    await user.type(screen.getByLabelText("보증금 (원)"), "100000000");
    await user.click(screen.getByRole("button", { name: "제안 등록" }));
    expect(
      await screen.findByText("같은 거래유형의 진행 중인 제안이 이미 있습니다."),
    ).not.toBeNull();
  });

  it("종료된 제안은 상태 전환 버튼 없이 되돌리지 않는다는 안내만 보여준다", async () => {
    const state = getMockPropertyState();
    const base = state.properties[0];
    if (!base) throw new Error("모의 매물이 없습니다");
    setMockPropertyState({
      properties: [
        buildMockProperty({
          ...base,
          offers: [
            {
              offerId: 701,
              dealType: "MONTHLY",
              status: "COMPLETED",
              salePrice: null,
              depositAmount: 10_000_000,
              monthlyRentAmount: 500_000,
              premiumAmount: null,
            },
          ],
        }),
      ],
    });
    renderPanel();
    expect(await screen.findByText("종료된 제안")).not.toBeNull();
    expect(screen.getByText(/완료된 제안은 되돌아가지 않습니다/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "협의 시작" })).toBeNull();
  });

  it("버전이 어긋나면 충돌 안내를 보여준다", async () => {
    server.use(http.patch("/api/properties/501/offers/701", () => mockErrors.versionConflict(5)));
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: "협의 시작" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("종료 상태를 바꾸려는 요청은 서버의 상태 전이 오류를 안내한다", async () => {
    server.use(
      http.patch("/api/properties/501/offers/701", () =>
        errorResponse(409, "INVALID_TRANSITION", "전이 불가"),
      ),
    );
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: "철회" }));
    expect(await screen.findByText(/지금은 바꿀 수 없는 상태입니다/)).not.toBeNull();
  });

  it("가격을 수정하면 If-Match로 제안 버전을 보낸다", async () => {
    let ifMatch: string | null = null;
    server.use(
      http.patch("/api/properties/501/offers/701", ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return errorResponse(429, "RATE_LIMITED", "많음", { retryAfterSeconds: 30 });
      }),
    );
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: "가격 수정" }));
    const rent = screen.getByLabelText("월세 (원)");
    await user.clear(rent);
    await user.type(rent, "1000000");
    await user.click(screen.getByRole("button", { name: "가격 저장" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).not.toBeNull();
    expect(ifMatch).toBe("1");
  });

  it("분양권 매물에서만 프리미엄에 음수를 입력할 수 있다", async () => {
    const user = userEvent.setup();
    const view = renderPanel({ categoryName: "분양권" });
    await user.click(await screen.findByRole("button", { name: "매매" }));
    await user.type(screen.getByLabelText("매매가 (원)"), "300000000");
    await user.type(screen.getByLabelText("합의한 프리미엄 (원)"), "-5000000");
    await user.click(screen.getByRole("button", { name: "제안 등록" }));
    expect(await screen.findByText("매매 제안을 등록했습니다.")).not.toBeNull();
    view.unmount();
    renderPanel({ categoryName: "아파트" });
    await user.click(await screen.findByRole("button", { name: "전세" }));
    expect(screen.queryByLabelText("합의한 프리미엄 (원)")).toBeNull();
  });

  it("보관된 매물은 제안 등록과 수정을 막는다고 안내한다", async () => {
    renderPanel({ isArchived: true });
    expect(
      await screen.findByText(/보관된 매물의 제안은 등록하거나 수정할 수 없습니다/),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "가격 수정" })).toBeNull();
    expect(screen.queryByRole("button", { name: "협의 시작" })).toBeNull();
  });
});
