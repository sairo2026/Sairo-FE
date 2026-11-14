// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockInquiry,
  resetSupportInquiryState,
  supportInquiryState,
} from "@/mocks/handlers/support";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { toCustomerView } from "../model/public-view";
import { InquiryDetailScreen } from "./inquiry-detail-screen";

let stopServer: () => void;
let originalFetch: typeof fetch;
let sentForms: FormData[] = [];

beforeAll(() => {
  stopServer = startMockServer();
  originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    if (init?.body instanceof FormData) {
      sentForms.push(init.body);
      return originalFetch(input, { ...init, body: undefined });
    }
    return originalFetch(input, init);
  };
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetSupportInquiryState();
  sentForms = [];
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  stopServer();
});

function seed(overrides: Parameters<typeof buildMockInquiry>[0]) {
  supportInquiryState.inquiries = [buildMockInquiry({ inquiryId: 11, ...overrides })];
}

function open(justReceived = false) {
  return renderOffice(<InquiryDetailScreen inquiryId={11} justReceived={justReceived} />, {
    role: "AGENT",
  });
}

const requesterReply = {
  messageId: 1,
  visibility: "PUBLIC" as const,
  content: "추가로 영수증을 확인해 주세요.",
  createdAt: "2026-11-10T09:30:00+09:00",
  authorType: "REQUESTER",
  authorDisplayName: null,
};

const operatorMessage = {
  messageId: 2,
  visibility: "PUBLIC" as const,
  content: "확인 후 안내드렸습니다.",
  createdAt: "2026-11-10T10:00:00+09:00",
  authorType: "OPERATOR",
  authorDisplayName: "김지원",
};

describe("고객에게 보이는 범위", () => {
  const base = buildMockInquiry({
    messages: [
      requesterReply,
      operatorMessage,
      {
        messageId: 3,
        visibility: "INTERNAL",
        content: "내부 메모 환불 처리 필요",
        createdAt: "2026-11-10T11:00:00+09:00",
        authorType: "OPERATOR",
        authorDisplayName: "김지원",
      },
    ],
    attachments: [
      {
        attachmentId: 1,
        fileName: "공개.pdf",
        mediaType: "application/pdf",
        sizeBytes: 100,
        scanStatus: "CLEAN",
        createdAt: "2026-11-10T11:00:00+09:00",
        messageId: null,
      },
      {
        attachmentId: 2,
        fileName: "내부증빙.pdf",
        mediaType: "application/pdf",
        sizeBytes: 100,
        scanStatus: "CLEAN",
        createdAt: "2026-11-10T11:00:00+09:00",
        messageId: 3,
      },
      {
        attachmentId: 3,
        fileName: "답변첨부.png",
        mediaType: "image/png",
        sizeBytes: 100,
        scanStatus: "CLEAN",
        createdAt: "2026-11-10T11:00:00+09:00",
        messageId: 2,
      },
    ],
  });

  it("내부 메모와 내부 메모에 붙은 첨부를 걸러낸다", () => {
    const view = toCustomerView(base);
    expect(view.messages.map((message) => message.messageId)).toEqual([1, 2]);
    expect(view.attachments.map((item) => item.attachmentId)).toEqual([1, 3]);
  });

  it("서버가 내부 메모를 섞어 보내도 화면에 나오지 않는다", async () => {
    supportInquiryState.inquiries = [base];
    open();
    expect(await screen.findByText("확인 후 안내드렸습니다.")).not.toBeNull();
    expect(screen.queryByText(/내부 메모/)).toBeNull();
    expect(screen.queryByText("내부증빙.pdf")).toBeNull();
    expect(screen.getByText("공개.pdf")).not.toBeNull();
    expect(screen.getByText("답변첨부.png")).not.toBeNull();
  });
});

describe("문의 상세", () => {
  it("상태, 담당, 첫 답변 목표와 대화를 보여주고 본인과 운영자를 구분한다", async () => {
    seed({
      status: "ANSWERED",
      assignedOperatorName: "김지원",
      messages: [requesterReply, operatorMessage],
    });
    open();
    expect(await screen.findByText("결제 문의")).not.toBeNull();
    expect(screen.getByText("답변됨")).not.toBeNull();
    expect(screen.getByText("김지원", { selector: "dd" })).not.toBeNull();
    const list = screen.getByRole("list", { name: "대화" });
    expect(within(list).getByText("나")).not.toBeNull();
    expect(within(list).getByText(/^김지원/)).not.toBeNull();
    expect(screen.getByText("첫 답변 목표")).not.toBeNull();
  });

  it.each([
    ["OPEN", "접수"],
    ["ASSIGNED", "처리 중"],
    ["WAITING_FOR_CUSTOMER", "보완 대기"],
    ["CLOSED", "완료"],
  ])("%s 상태를 %s로 표시한다", async (status, label) => {
    seed({ status });
    open();
    expect(await screen.findByText(label, { selector: "span" })).not.toBeNull();
  });

  it("최초 문의 본문과 요청 범위는 대화가 아니라 문의 내용으로 보여준다", async () => {
    seed({ content: "환불 금액을 확인하고 싶습니다.", requestScope: "11월 청구서", messages: [] });
    open();
    expect(await screen.findByText("환불 금액을 확인하고 싶습니다.")).not.toBeNull();
    expect(screen.getByText(/요청 범위: 11월 청구서/)).not.toBeNull();
  });

  it("방금 접수했다면 접수 완료 문구를 보여준다", async () => {
    seed({});
    open(true);
    expect(
      await screen.findByText(/문의가 접수되었습니다. 영업일 기준으로 순서대로 답변드립니다/),
    ).not.toBeNull();
  });

  it("없는 문의나 남의 문의는 찾을 수 없음을 보여준다", async () => {
    supportInquiryState.inquiries = [];
    open();
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/support-inquiries/:id", () => mockErrors.server()));
    open();
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
  });
});

describe("답글", () => {
  it("내용이 없으면 막는다", async () => {
    seed({});
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "답글 등록" }));
    expect(screen.getByText("추가할 내용을 입력해 주세요.")).not.toBeNull();
  });

  it("답글을 등록하면 대화에 더해진다", async () => {
    seed({ status: "ANSWERED", assignedOperatorName: "김지원" });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText("추가 내용"), "추가로 알려 드립니다");
    await user.click(screen.getByRole("button", { name: "답글 등록" }));
    expect(await screen.findByText("답글을 등록했습니다.")).not.toBeNull();
    expect(await screen.findByText("추가로 알려 드립니다", { selector: "p" })).not.toBeNull();
  });

  it("완료된 문의에 답글을 달면 다시 처리 대기로 올라간다고 알려 준다", async () => {
    seed({ status: "CLOSED" });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText("추가 내용"), "다시 확인 부탁드립니다");
    await user.click(screen.getByRole("button", { name: "답글 등록" }));
    expect(await screen.findByText(/완료된 문의는 다시 처리 대기로 올라갑니다/)).not.toBeNull();
    expect(await screen.findByText("접수", { selector: "span" })).not.toBeNull();
  });

  it("답글 등록이 실패하면 문구를 보여준다", async () => {
    seed({});
    server.use(http.post("/api/support-inquiries/:id/replies", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText("추가 내용"), "내용");
    await user.click(screen.getByRole("button", { name: "답글 등록" }));
    expect(await screen.findByText("이 작업을 할 권한이 없습니다.")).not.toBeNull();
  });
});

describe("첨부", () => {
  const attachments = (status: string) => [
    {
      attachmentId: 1,
      fileName: "영수증.pdf",
      mediaType: "application/pdf",
      sizeBytes: 4096,
      scanStatus: status,
      createdAt: "2026-11-10T09:00:00+09:00",
      messageId: null,
    },
  ];

  it("검사가 끝난 파일만 내려받을 수 있다", async () => {
    seed({ attachments: attachments("CLEAN") });
    open();
    const link = await screen.findByRole("link", { name: "내려받기" });
    expect(link.getAttribute("href")).toBe("/api/support-inquiries/11/attachments/1");
  });

  it("검사 중과 거부 상태는 내려받기 없이 사유를 보여준다", async () => {
    seed({ attachments: attachments("PENDING") });
    open();
    expect(await screen.findByText("검사 중")).not.toBeNull();
    expect(screen.getByText("검사가 끝나면 내려받을 수 있습니다.")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "내려받기" })).toBeNull();
    cleanup();
    seed({ attachments: attachments("REJECTED") });
    open();
    expect(await screen.findByText("검사에서 거부된 파일입니다.")).not.toBeNull();
  });

  it("첨부가 없으면 빈 안내와 가림 안내를 보여준다", async () => {
    seed({});
    open();
    expect(await screen.findByText("첨부한 파일이 없습니다.")).not.toBeNull();
    expect(
      screen.getAllByText(/주민등록번호, 전체 계좌번호, 카드번호가 보이지 않게/).length,
    ).toBeGreaterThan(0);
  });

  it("PDF, JPG, PNG가 아니면 올리기 전에 막는다", async () => {
    seed({});
    const user = userEvent.setup({ applyAccept: false });
    open();
    await user.upload(
      await screen.findByLabelText(/파일 첨부/),
      new File(["x"], "악성.exe", { type: "application/x-msdownload" }),
    );
    expect(await screen.findByText("PDF, JPG, PNG 파일만 첨부할 수 있습니다.")).not.toBeNull();
    expect(sentForms).toHaveLength(0);
  });

  it("20MB를 넘으면 올리기 전에 막는다", async () => {
    seed({});
    const user = userEvent.setup();
    open();
    const big = new File(["x"], "큰.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    await user.upload(await screen.findByLabelText(/파일 첨부/), big);
    expect(await screen.findByText("파일은 한 개당 20MB를 넘을 수 없습니다.")).not.toBeNull();
  });

  it("열 개를 채웠으면 더 올릴 수 없다", async () => {
    seed({
      attachments: Array.from({ length: 10 }, (_, index) => ({
        attachmentId: index + 1,
        fileName: `파일${index + 1}.pdf`,
        mediaType: "application/pdf",
        sizeBytes: 100,
        scanStatus: "CLEAN",
        createdAt: "2026-11-10T09:00:00+09:00",
        messageId: null,
      })),
    });
    const user = userEvent.setup();
    open();
    await user.upload(
      await screen.findByLabelText(/파일 첨부/),
      new File(["x"], "열한번째.pdf", { type: "application/pdf" }),
    );
    expect(await screen.findByText("첨부는 문의 하나에 10개까지 가능합니다.")).not.toBeNull();
  });

  it("올리면 검사 중으로 표시한다", async () => {
    seed({});
    const user = userEvent.setup();
    open();
    await user.upload(
      await screen.findByLabelText(/파일 첨부/),
      new File(["x"], "증빙.pdf", { type: "application/pdf" }),
    );
    expect(
      await screen.findByText(/파일을 올렸습니다. 검사가 끝나면 내려받을 수 있습니다/),
    ).not.toBeNull();
    await waitFor(() => expect(screen.getByText("검사 중")).not.toBeNull());
    expect(sentForms[0]?.get("messageId")).toBeNull();
  });

  it("서버가 형식 위반으로 거절하면 사유를 보여준다", async () => {
    seed({});
    server.use(
      http.post("/api/support-inquiries/:id/attachments", () =>
        errorResponse(422, "ATTACHMENT_TYPE_NOT_ALLOWED", "형식"),
      ),
    );
    const user = userEvent.setup();
    open();
    await user.upload(
      await screen.findByLabelText(/파일 첨부/),
      new File(["x"], "a.pdf", { type: "application/pdf" }),
    );
    expect(await screen.findByText("PDF, JPG, PNG 파일만 첨부할 수 있습니다.")).not.toBeNull();
  });
});
