// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetSupportInquiryState, supportInquiryState } from "@/mocks/handlers/support";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { EnterpriseScreen } from "./enterprise-screen";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetSupportInquiryState();
});

afterAll(() => stopServer());

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/회사·사무소명/), "해든부동산");
  await user.type(screen.getByLabelText(/담당자 이름/), "김대표");
  await user.type(screen.getByLabelText(/담당자 이메일/), "boss@example.com");
  await user.type(screen.getByLabelText(/담당자 연락처/), "01012345678");
  await user.type(screen.getByLabelText(/예상 인원/), "12");
  await user.type(screen.getByLabelText("문의 내용"), "지점 세 곳에 도입하고 싶습니다");
}

function seedLead(overrides: Record<string, unknown> = {}) {
  supportInquiryState.leads = [
    {
      leadId: 7,
      status: "QUOTED",
      quoteId: 70,
      quoteVersion: 1,
      quoteAmount: 1200000,
      quoteExpiresAt: "2099-01-01T00:00:00+09:00",
      createdAt: "2026-11-10T09:00:00+09:00",
      updatedAt: "2026-11-10T09:00:00+09:00",
      version: 2,
      trackingKey: "secret-key",
      ...overrides,
    },
  ];
}

async function lookup(user: ReturnType<typeof userEvent.setup>, key = "secret-key") {
  await user.type(screen.getByLabelText("문의 번호"), "7");
  await user.type(screen.getByLabelText("조회키"), key);
  await user.click(screen.getByRole("button", { name: "조회" }));
}

describe("기업 도입 문의 접수", () => {
  it("비어 있으면 항목별 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(screen.getAllByText("필수 항목입니다.").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("이메일 형식이 올바르지 않습니다.")).not.toBeNull();
    expect(screen.getByText("개인정보 수집·이용 안내를 확인해 주세요.")).not.toBeNull();
  });

  it("지점 수와 인원은 1 이상이어야 한다", async () => {
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await user.clear(screen.getByLabelText(/지점 수/));
    await user.type(screen.getByLabelText(/지점 수/), "0");
    await user.type(screen.getByLabelText(/예상 인원/), "0");
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(screen.getAllByText("1 이상의 숫자를 입력해 주세요.")).toHaveLength(2);
  });

  it("접수하면 문의 번호와 조회키를 한 번 보여주고 조회 칸을 채운다", async () => {
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await fillForm(user);
    await user.click(screen.getByLabelText("개인정보 수집·이용 안내를 확인했습니다."));
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(await screen.findByText(/조회키는 지금 한 번만 보여 드립니다/)).not.toBeNull();
    expect(screen.getByText("key-70", { selector: "strong" })).not.toBeNull();
    expect((screen.getByLabelText("문의 번호") as HTMLInputElement).value).toBe("70");
    expect((screen.getByLabelText("조회키") as HTMLInputElement).value).toBe("key-70");
  });

  it("접수가 실패하면 오류를 보여준다", async () => {
    server.use(http.post("/api/enterprise-leads", () => mockErrors.rateLimited(15)));
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await fillForm(user);
    await user.click(screen.getByLabelText("개인정보 수집·이용 안내를 확인했습니다."));
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(await screen.findByText(/15초 뒤에 다시 시도/)).not.toBeNull();
  });
});

describe("진행 상태 확인과 견적", () => {
  it("번호와 조회키가 비어 있으면 막는다", async () => {
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(screen.getAllByText("필수 항목입니다.").length).toBeGreaterThanOrEqual(2);
  });

  it("조회키가 틀리면 같은 문구로 알려 준다", async () => {
    seedLead();
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await lookup(user, "wrong");
    expect(await screen.findByText("문의 번호나 조회키가 맞지 않습니다.")).not.toBeNull();
  });

  it("견적 금액과 유효기한을 보여주되 문의 원문과 연락처는 보여주지 않는다", async () => {
    seedLead();
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await lookup(user);
    const section = await screen.findByRole("region", { name: "문의 진행 상태" });
    expect(within(section).getByText("견적 도착")).not.toBeNull();
    expect(within(section).getByText("1,200,000원")).not.toBeNull();
    expect(within(section).getByRole("button", { name: "견적 수락" })).not.toBeNull();
    expect(screen.queryByText("boss@example.com")).toBeNull();
  });

  it("견적을 수락한다", async () => {
    seedLead();
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await lookup(user);
    await user.click(await screen.findByRole("button", { name: "견적 수락" }));
    expect(await screen.findByText(/견적을 수락했습니다/)).not.toBeNull();
    expect(screen.getByText("견적 수락", { selector: "span" })).not.toBeNull();
    expect(supportInquiryState.leads[0]?.status).toBe("ACCEPTED");
  });

  it("견적을 거절한다", async () => {
    seedLead();
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await lookup(user);
    await user.click(await screen.findByRole("button", { name: "견적 거절" }));
    expect(await screen.findByText("견적을 거절했습니다.")).not.toBeNull();
    expect(supportInquiryState.leads[0]?.status).toBe("REJECTED");
  });

  it("유효기한이 지난 견적은 버튼 없이 안내한다", async () => {
    seedLead({ quoteExpiresAt: "2020-01-01T00:00:00+09:00" });
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await lookup(user);
    expect(
      await screen.findByText(/견적 유효기한이 지났습니다. 새 견적이 도착하면/),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "견적 수락" })).toBeNull();
  });

  it("더 새로운 견적으로 대체됐으면 새로 고침을 안내한다", async () => {
    seedLead();
    server.use(
      http.post("/api/enterprise-leads/:leadId/quotes/:quoteId/accept", () =>
        errorResponse(409, "QUOTE_SUPERSEDED", "대체"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await lookup(user);
    await user.click(await screen.findByRole("button", { name: "견적 수락" }));
    expect(await screen.findByText(/더 새로운 견적이 도착했습니다/)).not.toBeNull();
  });

  it("견적이 없는 문의는 상태만 보여준다", async () => {
    seedLead({ status: "CONSULTING", quoteId: null, quoteAmount: null, quoteExpiresAt: null });
    const user = userEvent.setup();
    renderOffice(<EnterpriseScreen />);
    await lookup(user);
    expect(await screen.findByText("상담 중")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "견적 수락" })).toBeNull();
  });
});
