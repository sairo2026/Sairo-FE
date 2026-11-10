import { z } from "zod";

export const API_ERROR_CODES = {
  invalidRequest: "INVALID_REQUEST",
  unauthenticated: "UNAUTHENTICATED",
  invalidCredentials: "INVALID_CREDENTIALS",
  stepUpRequired: "STEP_UP_REQUIRED",
  forbidden: "FORBIDDEN",
  reconsentRequired: "RECONSENT_REQUIRED",
  resourceNotFound: "RESOURCE_NOT_FOUND",
  versionConflict: "VERSION_CONFLICT",
  termsVersionChanged: "TERMS_VERSION_CHANGED",
  rateLimited: "RATE_LIMITED",
  loginLocked: "LOGIN_LOCKED",
  visitRequestQuotaExceeded: "VISIT_REQUEST_QUOTA_EXCEEDED",
  unknown: "UNKNOWN_ERROR",
} as const;

export const FieldErrorSchema = z.object({
  field: z.string(),
  code: z.string().optional(),
  message: z.string(),
});
export type FieldError = z.infer<typeof FieldErrorSchema>;

export const QuotaScopeSchema = z.enum(["MEMBERSHIP", "APPROVAL"]);

/** 모든 오류 응답의 공통 본문과 상태별로 덧붙는 선택 필드. */
export const ApiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  traceId: z.string().optional(),
  actionUrl: z.string().nullable().optional(),
  fieldErrors: z.array(FieldErrorSchema).optional(),
  retryAfterSeconds: z.number().optional(),
  quotaScope: QuotaScopeSchema.optional(),
  limit: z.number().optional(),
  current: z.number().nullable().optional(),
  remainingAttempts: z.number().optional(),
  currentVersion: z.number().optional(),
  changedItems: z.array(z.record(z.string(), z.unknown())).optional(),
  violatedRules: z.array(z.string()).optional(),
  affectedItems: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
