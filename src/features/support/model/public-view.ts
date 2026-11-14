import type { SupportInquiryResponse } from "@/lib/api/contracts/support.schema";

export type CustomerInquiryView = {
  messages: SupportInquiryResponse["messages"];
  attachments: SupportInquiryResponse["attachments"];
};

/**
 * 고객 화면에는 공개 대화와 그에 속한 첨부만 보인다.
 * 서버가 내부 메모와 내부 첨부를 빼고 주는 것이 원칙이며, 섞여 와도 화면에 올리지 않는다.
 */
export function toCustomerView(detail: SupportInquiryResponse): CustomerInquiryView {
  const messages = detail.messages.filter((message) => message.visibility === "PUBLIC");
  const publicIds = new Set(messages.map((message) => message.messageId));
  const internalIds = new Set(
    detail.messages
      .filter((message) => message.visibility !== "PUBLIC")
      .map((message) => message.messageId),
  );
  const attachments = detail.attachments.filter((attachment) => {
    if (attachment.messageId === null || attachment.messageId === undefined) return true;
    if (internalIds.has(attachment.messageId)) return false;
    return publicIds.has(attachment.messageId);
  });
  return { messages, attachments };
}
