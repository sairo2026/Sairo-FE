// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const PublicCompanyInfoResponseSchema = z.object({
  versionNo: z.number(),
  publishedAt: z.iso.datetime({ offset: true }),
  businessName: z.string(),
  representativeName: z.string(),
  businessNumber: z.string(),
  address: z.string(),
  contactPhone: z.string(),
  ecommerceNotice: z.string().nullable(),
  supportEmail: z.string(),
  privacyContact: z.string(),
  privacyRequestPath: z.string(),
  links: z.array(z.object({ kind: z.string(), title: z.string(), url: z.string() })),
});
export type PublicCompanyInfoResponse = z.infer<typeof PublicCompanyInfoResponseSchema>;
