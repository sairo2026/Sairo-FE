// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  MOCK_CO_APPROVER_TOKEN,
  MOCK_PRIMARY_TOKEN,
  resetMockApproverState,
} from "@/mocks/handlers/visit-approver";
import {
  buildMockReview,
  getMockVisitReviewState,
  resetMockVisitReviewState,
  setMockVisitReviewState,
} from "@/mocks/handlers/visit-review";
import { server, startMockServer } from "@/mocks/server";
import { createQueryClient } from "@/shared/api/query-client";
import { ApproverLinkScreen } from "./approver-link-screen";
import { allSkipped } from "./approver-reviews";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockApproverState();
  resetMockVisitReviewState();
});

afterAll(() => stopServer());

function renderLink(token: string = MOCK_PRIMARY_TOKEN) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ApproverLinkScreen token={token} />
    </QueryClientProvider>,
  );
}

async function openTab(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("tab", { name }));
}

async function openReviews(user: ReturnType<typeof userEvent.setup>, token?: string) {
  renderLink(token);
  await openTab(user, "방문 평가");
}

function answer(question: string, label: string) {
  const group = screen.getByRole("group", { name: new RegExp(question) });
  return within(group).getByLabelText(label);
}

describe("승인자 방문 평가", () => {
  it("모든 답이 답하지 않음이면 제출 버튼이 비활성이다", () => {
    expect(allSkipped({ punctuality: "SKIP", advanceContact: "SKIP", asRequested: "SKIP" })).toBe(
      true,
    );
    expect(allSkipped({ punctuality: "YES", advanceContact: "SKIP", asRequested: "SKIP" })).toBe(
      false,
    );
  });

  it("로딩 뒤 고정 안내와 완료 방문 목록을 보여주고 자유 서술과 별점은 없다", async () => {
    setMockVisitReviewState({ reviews: [buildMockReview({ scheduleItemId: 5001 })] });
    const user = userEvent.setup();
    await openReviews(user);
    expect(await screen.findByText(/정릉부동산 김중개/)).not.toBeNull();
    expect(screen.getByText(/낮은 평가를 받은 것이 아닙니다/)).not.toBeNull();
    expect(screen.getByText(/남은 수정 횟수 2회/)).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "김중개 평가 제출" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getAllByRole("radio")).toHaveLength(9);
  });

  it("빈 목록이면 안내를 보여준다", async () => {
    const user = userEvent.setup();
    await openReviews(user);
    expect(await screen.findByText("평가할 완료 방문이 없습니다")).not.toBeNull();
  });

  it("세 문항에 답해 제출하면 입력됨으로 바뀌고 다시 제출할 때 평가 버전을 보낸다", async () => {
    setMockVisitReviewState({ reviews: [buildMockReview({ scheduleItemId: 5001 })] });
    const sent: Array<string | null> = [];
    server.use(
      http.put(
        "/api/public/approver-property-links/:token/visit-reviews/:itemId",
        ({ request }) => {
          sent.push(request.headers.get("If-Match"));
          return undefined;
        },
      ),
    );
    const user = userEvent.setup();
    await openReviews(user);
    await screen.findByText(/정릉부동산 김중개/);
    await user.click(answer("약속한 방문 시각", "예"));
    await user.click(answer("방문 전에 방문 확인", "아니오"));
    await user.click(screen.getByRole("button", { name: "김중개 평가 제출" }));
    expect(await screen.findByText("평가를 저장했습니다.")).not.toBeNull();
    expect(await screen.findByText("입력됨")).not.toBeNull();
    expect(getMockVisitReviewState().reviews[0]?.answers?.advanceContact).toBe("NO");
    await user.click(await screen.findByRole("button", { name: "김중개 평가 수정" }));
    await waitFor(() => expect(sent).toEqual([null, "1"]));
    expect(await screen.findByText(/남은 수정 횟수 1회/)).not.toBeNull();
  });

  it("철회하면 철회됨으로 바뀌고 기한 안에서 다시 입력할 수 있다", async () => {
    setMockVisitReviewState({
      reviews: [
        buildMockReview({
          scheduleItemId: 5001,
          reviewStatus: "SUBMITTED",
          version: 1,
          answers: { punctuality: "YES", advanceContact: "YES", asRequested: "NO" },
        }),
      ],
    });
    const user = userEvent.setup();
    await openReviews(user);
    await user.click(await screen.findByRole("button", { name: "평가 철회" }));
    expect(await screen.findByText(/평가를 철회했습니다/)).not.toBeNull();
    expect(await screen.findByText("철회됨")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "평가 철회" })).toBeNull();
  });

  it("기한이 지난 평가와 잠긴 평가와 수정 횟수를 모두 쓴 평가는 읽기 전용이다", async () => {
    setMockVisitReviewState({
      reviews: [
        buildMockReview({
          scheduleItemId: 5001,
          editable: false,
          reviewStatus: "SUBMITTED",
          version: 2,
        }),
        buildMockReview({ scheduleItemId: 5002, reviewStatus: "LOCKED", version: 2 }),
        buildMockReview({
          scheduleItemId: 5003,
          reviewStatus: "SUBMITTED",
          revisionCount: 2,
          revisionsRemaining: 0,
          version: 3,
        }),
      ],
    });
    const user = userEvent.setup();
    await openReviews(user);
    await screen.findAllByText(/정릉부동산 김중개/);
    expect(screen.getAllByText(/기한이 지났거나 잠긴 평가는 읽기 전용입니다/).length).toBe(2);
    expect(screen.getByText(/수정 횟수를 모두 사용해 더 이상 바꿀 수 없습니다/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "김중개 평가 제출" })).toBeNull();
  });

  it("공동 승인자는 평가를 읽기만 할 수 있다", async () => {
    setMockVisitReviewState({
      reviews: [buildMockReview({ scheduleItemId: 5001, approvalId: 7002 })],
    });
    const user = userEvent.setup();
    await openReviews(user, MOCK_CO_APPROVER_TOKEN);
    expect(await screen.findByText(/공동 승인자는 평가를 읽기만 할 수 있습니다/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "김중개 평가 제출" })).toBeNull();
  });

  it("다른 사용자가 먼저 바꾸면 버전 충돌 안내를 보여준다", async () => {
    setMockVisitReviewState({
      reviews: [
        buildMockReview({
          scheduleItemId: 5001,
          reviewStatus: "SUBMITTED",
          version: 1,
          answers: { punctuality: "YES", advanceContact: "YES", asRequested: "YES" },
        }),
      ],
    });
    server.use(
      http.put("/api/public/approver-property-links/:token/visit-reviews/:itemId", () =>
        mockErrors.versionConflict(5),
      ),
    );
    const user = userEvent.setup();
    await openReviews(user);
    await user.click(await screen.findByRole("button", { name: "김중개 평가 수정" }));
    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
  });

  it("이의가 접수되어 잠긴 평가는 잠금 안내를 보여준다", async () => {
    setMockVisitReviewState({
      reviews: [
        buildMockReview({
          scheduleItemId: 5001,
          reviewStatus: "SUBMITTED",
          version: 1,
          answers: { punctuality: "YES", advanceContact: "YES", asRequested: "YES" },
        }),
      ],
    });
    server.use(
      http.put("/api/public/approver-property-links/:token/visit-reviews/:itemId", () =>
        errorResponse(409, "VISIT_REVIEW_LOCKED", "잠긴 평가입니다."),
      ),
    );
    const user = userEvent.setup();
    await openReviews(user);
    await user.click(await screen.findByRole("button", { name: "김중개 평가 수정" }));
    expect(await screen.findByText(/이의가 접수되었거나 수정 횟수를 모두 사용해/)).not.toBeNull();
  });

  it("평가 목록 조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(
      http.get("/api/public/approver-property-links/:token/visit-reviews", () =>
        mockErrors.server(),
      ),
    );
    const user = userEvent.setup();
    await openReviews(user);
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    expect(screen.getByRole("button", { name: /다시 시도/ })).not.toBeNull();
  });

  it("429를 받으면 대기 안내를 보여준다", async () => {
    server.use(
      http.get("/api/public/approver-property-links/:token/visit-reviews", () =>
        mockErrors.rateLimited(30),
      ),
    );
    const user = userEvent.setup();
    await openReviews(user);
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });
});

describe("승인자 선호 중개사", () => {
  function withCandidates() {
    setMockVisitReviewState({
      candidates: [
        {
          approvalId: 7001,
          sourceRequestId: 9001,
          sourceScheduleItemId: null,
          applicantOfficeName: "정릉부동산",
          applicantBrokerName: "김중개",
        },
        {
          approvalId: 7001,
          sourceRequestId: null,
          sourceScheduleItemId: 5002,
          applicantOfficeName: "길음공인",
          applicantBrokerName: "이중개",
        },
      ],
    });
  }

  async function openPreferred(user: ReturnType<typeof userEvent.setup>) {
    renderLink();
    await openTab(user, "선호 중개사");
  }

  it("고정 안내와 지정 후보를 보여주고 지정과 해제를 한다", async () => {
    withCandidates();
    const user = userEvent.setup();
    await openPreferred(user);
    expect(await screen.findByText(/지정 여부는 중개사에게 보이지 않습니다/)).not.toBeNull();
    await user.click(await screen.findByRole("button", { name: "김중개 선호 지정" }));
    expect(await screen.findByText("선호 중개사로 지정했습니다.")).not.toBeNull();
    expect(await screen.findByText(/지정한 중개사 1\/5명/)).not.toBeNull();
    await user.click(await screen.findByRole("button", { name: "김중개 선호 해제" }));
    expect(await screen.findByText("선호 중개사를 해제했습니다.")).not.toBeNull();
    expect(await screen.findByText(/지정한 중개사 0\/5명/)).not.toBeNull();
  });

  it("활성 지정이 5명이면 지정 버튼이 비활성이고 해제를 안내한다", async () => {
    withCandidates();
    setMockVisitReviewState({
      preferred: [1, 2, 3, 4, 5].map((index) => ({
        approvalId: 7001,
        preferredBrokerId: index,
        applicantOfficeName: `사무소${index}`,
        applicantBrokerName: `중개사${index}`,
        designatedAt: "2026-11-01T09:00:00+09:00",
        releasedAt: null,
      })),
    });
    const user = userEvent.setup();
    await openPreferred(user);
    expect(await screen.findByText(/한 명을 해제한 뒤 다시 지정해 주세요/)).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "김중개 선호 지정" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("서버가 상한 초과를 거절하면 안내 문구를 보여준다", async () => {
    withCandidates();
    server.use(
      http.post("/api/public/approver-property-links/:token/preferred-brokers", () =>
        errorResponse(422, "PREFERRED_BROKER_LIMIT_EXCEEDED", "상한"),
      ),
    );
    const user = userEvent.setup();
    await openPreferred(user);
    await user.click(await screen.findByRole("button", { name: "김중개 선호 지정" }));
    expect(await screen.findByText(/최대 5명까지 지정할 수 있습니다/)).not.toBeNull();
  });

  it("후보가 없으면 빈 안내를 보여주고 공동 승인자는 지정할 수 없다", async () => {
    withCandidates();
    const user = userEvent.setup();
    renderLink(MOCK_CO_APPROVER_TOKEN);
    await openTab(user, "선호 중개사");
    expect(await screen.findByText("지정할 수 있는 후보가 없습니다")).not.toBeNull();
  });

  it("신청 비교 화면에서 바로 선호 중개사로 지정한다", async () => {
    const user = userEvent.setup();
    setMockVisitReviewState({
      candidates: [
        {
          approvalId: 7001,
          sourceRequestId: 9001,
          sourceScheduleItemId: null,
          applicantOfficeName: "정릉부동산",
          applicantBrokerName: "김중개",
        },
      ],
    });
    renderLink();
    await openTab(user, "신청 비교·선택");
    await user.click(await screen.findByRole("button", { name: "김중개 선호 중개사로 지정" }));
    await waitFor(() =>
      expect(getMockVisitReviewState().preferred.map((item) => item.applicantBrokerName)).toEqual([
        "김중개",
      ]),
    );
    expect(screen.getAllByText(/표시 순서가 위쪽인 것은 표시 편의일 뿐입니다/).length).toBe(1);
  });

  it("방문 평가 화면에서 선호 중개사로 지정한다", async () => {
    setMockVisitReviewState({
      reviews: [buildMockReview({ scheduleItemId: 5001 })],
      candidates: [
        {
          approvalId: 7001,
          sourceRequestId: null,
          sourceScheduleItemId: 5001,
          applicantOfficeName: "정릉부동산",
          applicantBrokerName: "김중개",
        },
      ],
    });
    const user = userEvent.setup();
    await openReviews(user);
    await user.click(await screen.findByRole("button", { name: "선호 중개사로 지정" }));
    expect(await screen.findByText("선호 중개사로 지정했습니다.")).not.toBeNull();
  });
});
