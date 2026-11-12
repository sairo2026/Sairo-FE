import { z } from "zod";
import {
  PrivacyRequestResponseSchema,
  SupportInquiryResponseSchema,
} from "@/lib/api/contracts/support.schema";

/**
 * 최초 문의 본문은 대화 목록에 들어가지 않고 상세 최상위 content·requestScope로 온다(백엔드 SupportInquiryResponse,
 * 운영 상세와 같은 방식). 명세 고객 상세 표에 아직 없어 값이 없을 수 있게 받는다.
 */
export const SupportInquiryWireSchema = SupportInquiryResponseSchema.extend({
  content: z.string().optional(),
  requestScope: z.string().nullable().optional(),
});
export type SupportInquiryDetail = z.infer<typeof SupportInquiryWireSchema>;

/** 보완 대기 때 운영자가 요청한 보완 내용이다(백엔드 PrivacyRequestResponse.supplementRequest). */
export const PrivacyRequestWireSchema = PrivacyRequestResponseSchema.extend({
  supplementRequest: z.string().nullable().optional(),
});
export type PrivacyRequestDetail = z.infer<typeof PrivacyRequestWireSchema>;
