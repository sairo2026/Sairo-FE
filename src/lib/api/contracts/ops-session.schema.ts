// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const OpsMeResponseSchema = z.object({
  operatorId: z.number(),
  name: z.string(),
  roles: z.array(z.string()),
});
export type OpsMeResponse = z.infer<typeof OpsMeResponseSchema>;

export const OpsMfaVerifyRequestSchema = z.object({ otpCode: z.string() });
export type OpsMfaVerifyRequest = z.infer<typeof OpsMfaVerifyRequestSchema>;

export const OpsStepUpRequestSchema = z.object({ otpCode: z.string() });
export type OpsStepUpRequest = z.infer<typeof OpsStepUpRequestSchema>;
