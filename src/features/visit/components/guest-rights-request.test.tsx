// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { renderWithQuery } from "@/features/auth/components/test-utils";
import { errorResponse } from "@/mocks/error-responses";
import { resetSupportInquiryState, supportInquiryState } from "@/mocks/handlers/support";
import { server, startMockServer } from "@/mocks/server";
import type { GuestRightsTarget } from "../api/guest-privacy.api";
import { LinkCommonNotices } from "./link-legal-notices";
import { GuestRightsRequestButton, isContactValid } from "./guest-rights-request";

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

const CONTEXT = {
  officeName: "새봄공인중개사사무소",
  officeContactPhone: "010-1234-5678",
  operatorName: "사이로",
  privacyContact: null,
  retentionDays: 90,
};

const CUSTOMER: GuestRightsTarget = {
  kind: "CUSTOMER",
  token: "customer-token",
  noticeVersion: "2026-11-20",
};

async function openDialog(user: ReturnType<typeof userEvent.setup>, target = CUSTOMER) {
  renderWithQuery(<GuestRightsRequestButton target={target} context={CONTEXT} />);
  await user.click(screen.getByRole("button", { name: "내 정보 요청하기" }));
  return screen.getByRole("dialog");
}

describe("연락처 형식 검사", () => {
  it.each([
    ["EMAIL", "a@b.com", true],
    ["EMAIL", "a@b", false],
    ["EMAIL", "010-1234-5678", false],
    ["PHONE", "010-1234-5678", true],
    ["PHONE", "0212345678", true],
    ["PHONE", "1234", false],
    ["PHONE", "abc@b.com", false],
  ])("%s %s는 %s", (channel, contact, expected) => {
    expect(isContactValid(channel, contact)).toBe(expected);
  });
});

describe("내 정보 요청하기", () => {
  it("링크 하단 안내에서 대화상자를 열고 입력 안내와 사무소 연락처를 보여준다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<LinkCommonNotices audience="customer" rightsTarget={CUSTOMER} {...CONTEXT} />);
    await user.click(screen.getByRole("button", { name: "내 정보 요청하기" }));
    const dialog = screen.getByRole("dialog", { name: "내 정보 요청하기" });
    expect(
      within(dialog).getByText(/주민등록번호, 계좌번호, 카드번호는 입력하지 마세요/),
    ).not.toBeNull();
    expect(
      within(dialog).getByText(
        /링크로 입력하신 내용의 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다/,
      ),
    ).not.toBeNull();
    expect(
      within(dialog).getByText(/링크가 만료되었다면 새봄공인중개사사무소 010-1234-5678/),
    ).not.toBeNull();
  });

  it("대상 정보가 없으면 버튼 없이 문구만 보여준다", () => {
    renderWithQuery(<LinkCommonNotices audience="customer" {...CONTEXT} />);
    expect(screen.queryByRole("button", { name: "내 정보 요청하기" })).toBeNull();
    expect(screen.getByText(/\[내 정보 요청하기\]/)).not.toBeNull();
  });

  it("대리인을 고르면 위임 서류 안내를 보여준다", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByLabelText("대리인"));
    expect(
      within(dialog).getByText(/위임을 확인할 수 있는 서류를 따로 요청드립니다/),
    ).not.toBeNull();
  });

  it("연락처 형식이 틀리면 접수하지 않는다", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByRole("textbox", { name: /이메일/ }), "not-an-email");
    await user.click(within(dialog).getByRole("button", { name: "요청 접수" }));
    expect(
      within(dialog).getByText("연락처 형식이 올바르지 않습니다. 다시 확인해 주세요."),
    ).not.toBeNull();
    expect(supportInquiryState.guestIntakeCount).toBe(0);
  });

  it("요청 내용에 주민등록번호로 보이는 숫자가 있으면 접수하지 않는다", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByRole("textbox", { name: /이메일/ }), "me@example.com");
    await user.type(within(dialog).getByLabelText("요청 내용 (선택)"), "900101-1234567");
    await user.click(within(dialog).getByRole("button", { name: "요청 접수" }));
    expect(
      within(dialog).getByText(/주민등록번호나 전체 계좌번호로 보이는 숫자가 있습니다/),
    ).not.toBeNull();
    expect(supportInquiryState.guestIntakeCount).toBe(0);
  });

  it("접수하면 접수 시각과 결과 통보 목표 일자를 보여준다", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByLabelText("삭제"));
    await user.type(within(dialog).getByRole("textbox", { name: /이메일/ }), "me@example.com");
    await user.click(within(dialog).getByRole("button", { name: "요청 접수" }));
    expect(
      await within(dialog).findByText(
        "요청을 접수했습니다. 2026-11-10 09:00에 접수되었고 2026-11-20까지 결과를 알려 드립니다. 접수 번호는 따로 드리지 않습니다.",
      ),
    ).not.toBeNull();
    expect(within(dialog).getByText(/re\*\*\*@example.com\(이메일\)/)).not.toBeNull();
    expect(supportInquiryState.guestIntakeCount).toBe(1);
  });

  it("승인자 계정 경로는 승인 번호로 접수한다", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, {
      kind: "APPROVER_PORTAL",
      approvalId: 9,
      noticeVersion: "2026-11-20",
    });
    await user.click(within(dialog).getByRole("radio", { name: "전화번호" }));
    await user.type(within(dialog).getByRole("textbox", { name: /전화번호/ }), "010-1234-5678");
    await user.click(within(dialog).getByRole("button", { name: "요청 접수" }));
    expect(await within(dialog).findByText(/010-\*\*\*\*-5678\(전화번호\)/)).not.toBeNull();
  });

  it("안내 버전이 바뀌었으면 다시 확인하라고 안내한다", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, { ...CUSTOMER, noticeVersion: "2020-01-01" });
    await user.type(within(dialog).getByRole("textbox", { name: /이메일/ }), "me@example.com");
    await user.click(within(dialog).getByRole("button", { name: "요청 접수" }));
    expect(await within(dialog).findByText(/개인정보 안내가 바뀌었습니다/)).not.toBeNull();
  });

  it("만료된 링크는 연락처로 요청하라고 안내한다", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, { ...CUSTOMER, token: "expired-token" });
    await user.type(within(dialog).getByRole("textbox", { name: /이메일/ }), "me@example.com");
    await user.click(within(dialog).getByRole("button", { name: "요청 접수" }));
    expect(
      await within(dialog).findByText(/이 링크는 사용할 수 없습니다. 아래 연락처로 요청해 주세요/),
    ).not.toBeNull();
  });

  it("서버가 연락처를 거절하면 같은 문구를 보여준다", async () => {
    server.use(
      http.post("/api/public/privacy-intakes", () =>
        errorResponse(422, "GUEST_CONTACT_INVALID", "연락처"),
      ),
    );
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByRole("textbox", { name: /이메일/ }), "me@example.com");
    await user.click(within(dialog).getByRole("button", { name: "요청 접수" }));
    expect(
      await within(dialog).findByText("연락처 형식이 올바르지 않습니다. 다시 확인해 주세요."),
    ).not.toBeNull();
  });

  it("접수 한도를 넘으면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    supportInquiryState.guestIntakeCount = 3;
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByRole("textbox", { name: /이메일/ }), "me@example.com");
    await user.click(within(dialog).getByRole("button", { name: "요청 접수" }));
    expect(
      await within(dialog).findByText("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."),
    ).not.toBeNull();
  });
});
