// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const PublicCompanyInfoResponseSchema = z.object({
  versionNo: z.number().nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  businessName: z.string().nullable(),
  representativeName: z.string().nullable(),
  businessNumber: z.string().nullable(),
  address: z.string().nullable(),
  contactPhone: z.string().nullable(),
  ecommerceNotice: z.string().nullable(),
  supportEmail: z.string().nullable(),
  privacyContact: z.string().nullable(),
  privacyRequestPath: z.string().nullable(),
  links: z.array(z.object({ kind: z.string(), title: z.string(), url: z.string() })),
});
export type PublicCompanyInfoResponse = z.infer<typeof PublicCompanyInfoResponseSchema>;
