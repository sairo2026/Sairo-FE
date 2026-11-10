// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockVisitState } from "@/mocks/handlers/visit";
import {
  buildMockReceived,
  getMockVisitReviewState,
  resetMockVisitReviewState,
  setMockVisitReviewState,
} from "@/mocks/handlers/visit-review";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { TrustSummaryScreen } from "./trust-summary-screen";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockVisitState();
  resetMockVisitReviewState();
});

afterAll(() => stopServer());

function seed() {
  setMockVisitReviewState({
    received: [
      buildMockReceived({ reviewId: 1, propertyName: "국민대 앞 아파트" }),
      buildMockReceived({
        reviewId: 2,
        propertyName: "정릉 빌라",
        canDispute: false,
        reviewStatus: "ACTIVE",
      }),
      buildMockReceived({
        reviewId: 3,
        propertyName: "길음 오피스텔",
        canDispute: false,
        reviewStatus: "REMOVED",
        dispute: {
          disputeId: 9,
          status: "REMOVED",
          filedAt: "2026-10-01T09:00:00+09:00",
          decidedAt: "2026-10-08T09:00:00+09:00",
          decisionNote: "사실과 달라 평가를 삭제했습니다.",
        },
      }),
      buildMockReceived({
        reviewId: 4,
        propertyName: "동료 매물",
        reviewedBrokerName: "박중개",
        mine: false,
      }),
    ],
  });
}

describe("신뢰 요약과 받은 평가", () => {
  it("로딩 뒤 요약 카드와 고정 안내와 받은 평가 목록을 보여준다", async () => {
    seed();
    renderOffice(<TrustSummaryScreen />, { role: "AGENT" });
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(await screen.findByText("국민대 앞 아파트")).not.toBeNull();
    expect(screen.getByText(/점수나 순위가 아니고/)).not.toBeNull();
    expect(screen.getByText(/완료 방문 12건 · 평가 반영 방문 8건/)).not.toBeNull();
    expect(screen.getByText(/집계 기간 최근 12개월/)).not.toBeNull();
    expect(screen.getByText(/약속한 시각에 방문 시작: 대부분 지킴/)).not.toBeNull();
    expect(screen.queryByText("동료 매물")).toBeNull();
    expect(screen.queryByRole("tab", { name: "사무소 전체" })).toBeNull();
  });

  it("자료 없음과 표본 부족은 낮은 평가가 아니라고 안내한다", async () => {
    setMockVisitReviewState({
      trust: { ...getMockVisitReviewState().trust, state: "INSUFFICIENT", overallBand: null },
    });
    renderOffice(<TrustSummaryScreen />, { role: "AGENT" });
    expect(await screen.findByText("표본 부족")).not.toBeNull();
    expect(screen.getAllByText(/낮은 평가가 아닙니다/).length).toBeGreaterThan(0);
  });

  it("중개보조원에게는 화면을 보이지 않는다", () => {
    renderOffice(<TrustSummaryScreen />, { role: "DEPUTY" });
    expect(screen.getByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("대표는 사무소 전체 탭으로 전환해 동료의 평가도 본다", async () => {
    seed();
    const user = userEvent.setup();
    renderOffice(<TrustSummaryScreen />, { role: "OWNER" });
    await screen.findByText("국민대 앞 아파트");
    await user.click(screen.getByRole("tab", { name: "사무소 전체" }));
    expect(await screen.findByText("동료 매물")).not.toBeNull();
    expect(screen.getByText("박중개")).not.toBeNull();
  });

  it("받은 평가가 없으면 빈 안내를 보여준다", async () => {
    renderOffice(<TrustSummaryScreen />, { role: "AGENT" });
    expect(await screen.findByText("받은 평가가 없습니다.")).not.toBeNull();
  });

  it("요약 조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/visit-trust/me", () => mockErrors.server()));
    renderOffice(<TrustSummaryScreen />, { role: "AGENT" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });

  it("목록 조회가 429이면 오류 표를 보여준다", async () => {
    server.use(http.get("/api/visit-reviews/received", () => mockErrors.rateLimited(10)));
    renderOffice(<TrustSummaryScreen />, { role: "AGENT" });
    expect(await screen.findByText("받은 평가를 불러오지 못했습니다.")).not.toBeNull();
  });

  it("처리 결과와 결정 사유를 보여주고 기한이 지난 평가는 버튼을 숨긴다", async () => {
    seed();
    renderOffice(<TrustSummaryScreen />, { role: "AGENT" });
    expect(await screen.findByText("평가 삭제")).not.toBeNull();
    expect(screen.getByText("사실과 달라 평가를 삭제했습니다.")).not.toBeNull();
    expect(screen.getByText(/같은 평가에는 다시 이의를 낼 수 없습니다/)).not.toBeNull();
    expect(screen.getAllByText(/30일이 지나 이의를 낼 수 없습니다/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "정릉 빌라 평가 이의 제기" })).toBeNull();
  });
});

describe("평가 이의 제기", () => {
  async function openDispute(user: ReturnType<typeof userEvent.setup>) {
    seed();
    renderOffice(<TrustSummaryScreen />, { role: "AGENT" });
    await user.click(
      await screen.findByRole("button", { name: "국민대 앞 아파트 평가 이의 제기" }),
    );
    return screen.findByRole("dialog");
  }

  it("사유를 고르고 설명을 입력해 접수하면 이의 처리 중이 된다", async () => {
    const user = userEvent.setup();
    await openDispute(user);
    expect(screen.getByText(/평가당 한 번이며/)).not.toBeNull();
    expect(screen.getByText(/7영업일은 목표일일 뿐/)).not.toBeNull();
    await user.selectOptions(screen.getByLabelText("이의 사유"), "FACT_INCORRECT");
    await user.type(screen.getByLabelText("사유 설명"), "그날 방문하지 않았습니다.");
    await user.click(screen.getByRole("button", { name: "이의 제기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(getMockVisitReviewState().received[0]?.reviewStatus).toBe("DISPUTED");
    expect(await screen.findByText("이의 처리 중")).not.toBeNull();
  });

  it("사유와 설명이 비어 있으면 접수하지 않고 안내한다", async () => {
    const user = userEvent.setup();
    await openDispute(user);
    await user.click(screen.getByRole("button", { name: "이의 제기" }));
    expect(await screen.findByText("사유를 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("사유 설명을 입력해 주세요.")).not.toBeNull();
    expect(getMockVisitReviewState().received[0]?.dispute).toBeNull();
  });

  it("500자를 넘으면 글자 수와 오류를 보여준다", async () => {
    const user = userEvent.setup();
    await openDispute(user);
    await user.selectOptions(screen.getByLabelText("이의 사유"), "OTHER");
    fireEvent.change(screen.getByLabelText("사유 설명"), { target: { value: "가".repeat(501) } });
    expect(screen.getByText(/501\/500자/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "이의 제기" }));
    expect(await screen.findByText("500자 이내로 입력해 주세요.")).not.toBeNull();
  });

  it("민감 정보가 감지되면 지우라고 안내한다", async () => {
    const user = userEvent.setup();
    await openDispute(user);
    await user.selectOptions(screen.getByLabelText("이의 사유"), "OTHER");
    await user.type(screen.getByLabelText("사유 설명"), "900101-1234567");
    await user.click(screen.getByRole("button", { name: "이의 제기" }));
    expect(
      await screen.findByText(/주민등록번호나 전체 계좌번호는 입력할 수 없습니다/),
    ).not.toBeNull();
  });

  it("이미 접수된 평가이면 안내하고 목록을 새로 고친다", async () => {
    const user = userEvent.setup();
    await openDispute(user);
    server.use(
      http.post("/api/visit-reviews/:reviewId/disputes", () =>
        errorResponse(409, "VISIT_REVIEW_DISPUTE_EXISTS", "중복"),
      ),
    );
    await user.selectOptions(screen.getByLabelText("이의 사유"), "WRONG_TARGET");
    await user.type(screen.getByLabelText("사유 설명"), "다른 중개사입니다.");
    await user.click(screen.getByRole("button", { name: "이의 제기" }));
    expect(await screen.findByText(/이미 이의가 접수되었습니다/)).not.toBeNull();
  });

  it("권한이 없으면 서버 오류 문구를 보여준다", async () => {
    const user = userEvent.setup();
    await openDispute(user);
    server.use(http.post("/api/visit-reviews/:reviewId/disputes", () => mockErrors.forbidden()));
    await user.selectOptions(screen.getByLabelText("이의 사유"), "OTHER");
    await user.type(screen.getByLabelText("사유 설명"), "사유");
    await user.click(screen.getByRole("button", { name: "이의 제기" }));
    expect(await screen.findByText("이 작업을 할 권한이 없습니다.")).not.toBeNull();
  });
});
