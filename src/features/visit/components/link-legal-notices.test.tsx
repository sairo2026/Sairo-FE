// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { REVIEW_COMPANY_INFO } from "@/mocks/handlers/legal-review";
import { server, startMockServer } from "@/mocks/server";
import { renderWithQuery } from "@/features/auth/components/test-utils";
import {
  ApproverLinkPrivacyNotice,
  CustomerLinkPrivacyNotice,
  LinkCommonNotices,
  LinkIssueGuidance,
} from "./link-legal-notices";
import { LinkNoticePage } from "./link-notice-page";
import {
  GUEST_RIGHTS_REQUEST_COPY,
  linkExpiredNotice,
  linkRightsFooter,
} from "../model/legal-copy";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => stopServer());

const CONTEXT = {
  officeName: "새봄공인중개사사무소",
  officeContactPhone: "010-1234-5678",
  operatorName: null,
  privacyContact: null,
  retentionDays: 90,
};

describe("승인자 링크 개인정보 안내", () => {
  it("문서 항목을 사무소 이름과 보관 일수로 채워 보여준다", () => {
    renderWithQuery(
      <ApproverLinkPrivacyNotice
        officeName="새봄공인중개사사무소"
        officeContactPhone="010-1234-5678"
        retentionDays={90}
        isPreRegistered
      />,
    );
    expect(
      screen.getByText("새봄공인중개사사무소이 방문 일정을 조율하기 위해 아래 조건을 받습니다."),
    ).not.toBeNull();
    expect(
      screen.getByText("이용 목적: 방문 신청을 받을지 판단하고 방문 일정을 확정하는 일"),
    ).not.toBeNull();
    expect(
      screen.getByText("보관: 출입승인 기간이 끝난 뒤 90일 동안 보관하고 삭제합니다."),
    ).not.toBeNull();
    expect(screen.getByText("입력하지 않으면 방문 조율에 참여할 수 없습니다.")).not.toBeNull();
    expect(screen.getByText("문의: 010-1234-5678")).not.toBeNull();
    expect(screen.getByText(/미리 등록했을 수 있습니다/)).not.toBeNull();
  });

  it("사무소 정보가 없으면 값을 만들어 내지 않고 문의 줄을 뺀다", () => {
    renderWithQuery(<ApproverLinkPrivacyNotice />);
    expect(
      screen.getByText("보관: 출입승인 기간이 끝난 뒤 정해진 기간 동안 보관하고 삭제합니다."),
    ).not.toBeNull();
    expect(screen.queryByText(/^문의:/)).toBeNull();
  });

  it("공개 회사 정보가 있으면 위탁 보관 주체에 운영사 상호를 쓴다", async () => {
    server.use(http.get("/api/public/company-info", () => HttpResponse.json(REVIEW_COMPANY_INFO)));
    renderWithQuery(<ApproverLinkPrivacyNotice officeName="새봄공인중개사사무소" />);
    expect(
      await screen.findByText(/사이로\(SAIRO\)가 사무소의 위탁을 받아 보관합니다/),
    ).not.toBeNull();
  });
});

describe("고객 링크 개인정보 안내", () => {
  it("받는 항목은 방문 가능한 시간뿐이다", () => {
    renderWithQuery(
      <CustomerLinkPrivacyNotice
        officeName="새봄공인중개사사무소"
        officeContactPhone="010-1234-5678"
        retentionDays={30}
      />,
    );
    expect(screen.getByText("받는 항목: 방문 가능한 시간")).not.toBeNull();
    expect(screen.getByText("보관: 조율이 끝난 뒤 30일이 지나면 삭제합니다.")).not.toBeNull();
    expect(
      screen.getByText("시간을 입력하지 않으면 방문 조율에 참여할 수 없습니다."),
    ).not.toBeNull();
  });
});

describe("링크 화면 공통 문구", () => {
  it("승인자 화면에는 승인 철회 안내를, 고객 화면에는 넣지 않는다", () => {
    const { unmount } = renderWithQuery(<LinkCommonNotices audience="approver" />);
    expect(screen.getByText(/승인 철회는 개인정보 삭제 요청과 별개이며/)).not.toBeNull();
    expect(screen.getByText("제출하면 위 안내를 확인한 것으로 처리됩니다.")).not.toBeNull();
    unmount();
    renderWithQuery(<LinkCommonNotices audience="customer" />);
    expect(screen.queryByText(/승인 철회는 개인정보 삭제 요청과 별개이며/)).toBeNull();
    expect(screen.getByText(/내 정보 요청하기/)).not.toBeNull();
  });

  it("권리 안내와 만료 안내는 문의처를 채워 쓴다", () => {
    expect(linkRightsFooter(CONTEXT)).toBe(
      "입력하신 내용의 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 링크가 만료되었다면 새봄공인중개사사무소 010-1234-5678로 요청해 주세요.",
    );
    expect(linkExpiredNotice(CONTEXT)).toBe(
      "이 링크는 사용할 수 없습니다. 만료되었거나 새 링크로 바뀌었을 수 있습니다. 새 링크가 필요하면 새봄공인중개사사무소 010-1234-5678로 문의해 주세요.",
    );
  });

  it("내 정보 요청하기 접수 완료 문구와 오류 문구를 그대로 가진다", () => {
    expect(GUEST_RIGHTS_REQUEST_COPY.received("2026-11-10 10:00", "2026-11-20")).toBe(
      "요청을 접수했습니다. 2026-11-10 10:00에 접수되었고 2026-11-20까지 결과를 알려 드립니다. 접수 번호는 따로 드리지 않습니다.",
    );
    expect(GUEST_RIGHTS_REQUEST_COPY.errors.contact).toBe(
      "연락처 형식이 올바르지 않습니다. 다시 확인해 주세요.",
    );
  });
});

describe("링크 발급 안내", () => {
  it("사무소용 안내 네 가지를 보여준다", () => {
    renderWithQuery(<LinkIssueGuidance />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText(/링크를 문자나 알림톡으로 발송하지 않습니다/)).not.toBeNull();
  });
});

describe("링크 개인정보 안내 공개 페이지", () => {
  it("승인자와 고객 안내를 각각 보여준다", () => {
    const { unmount } = renderWithQuery(<LinkNoticePage audience="approver" />);
    expect(screen.getByRole("heading", { name: "승인자 링크 개인정보 안내" })).not.toBeNull();
    expect(screen.getByText("받는 항목: 방문 가능한 시간과 방문 조건")).not.toBeNull();
    unmount();
    renderWithQuery(<LinkNoticePage audience="customer" />);
    expect(screen.getByRole("heading", { name: "고객 링크 개인정보 안내" })).not.toBeNull();
    expect(screen.getByText("받는 항목: 방문 가능한 시간")).not.toBeNull();
  });
});
