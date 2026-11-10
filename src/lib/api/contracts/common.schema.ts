// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const AuthContextResponseSchema = z.object({
  accessCondition: z.enum([
    "PRE_VERIFICATION",
    "OFFICE_UNDER_REVIEW",
    "VERIFIED_UNPAID",
    "ACTIVE",
    "PAYMENT_OVERDUE",
    "AUTH_REVOKED",
    "REMOVED",
    "RETURN_EXPIRED",
  ]),
  officeId: z.number().nullable().optional(),
  role: z.enum(["OWNER", "AGENT", "DEPUTY"]).nullable().optional(),
  pendingRegistrationId: z.number().nullable().optional(),
  pendingMembershipId: z.number().nullable().optional(),
  unresolvedRejection: z.record(z.string(), z.unknown()).nullable().optional(),
  graceUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  returnPeriodEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  restrictionReason: z.enum(["REVOKED", "REVERIFICATION_SUSPENDED"]).nullable().optional(),
  removalReason: z.enum(["RESIGNED", "REMOVED", "SUSPENDED"]).nullable().optional(),
  reconsentRequired: z.boolean(),
});
export type AuthContextResponse = z.infer<typeof AuthContextResponseSchema>;

export const CurrentSessionResponseSchema = z.object({
  authenticatedAt: z.iso.datetime({ offset: true }),
  lastAccessedAt: z.iso.datetime({ offset: true }),
  idleExpiresAt: z.iso.datetime({ offset: true }),
  absoluteExpiresAt: z.iso.datetime({ offset: true }),
  stepUpValid: z.boolean(),
  stepUpExpiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type CurrentSessionResponse = z.infer<typeof CurrentSessionResponseSchema>;
