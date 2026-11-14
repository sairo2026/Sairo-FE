import { z } from "zod";
import {
  OperatorInvitationAcceptResponseSchema,
  OperatorInvitationKakaoStartResponseSchema,
  OperatorInvitationPreviewResponseSchema,
  OperatorMfaEnrollmentResponseSchema,
  OpsMfaVerifyResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { ApiError, ApiNetworkError, apiFetch, ensureCsrfToken } from "@/shared/api/client";

export const OPS_AUTH_PATHS = {
  kakaoStart: "/api/ops/auth/kakao/start",
  mfaVerify: "/api/ops/auth/mfa/verify",
  invitationPreview: "/api/ops/auth/invitations/preview",
  invitationKakaoStart: "/api/ops/auth/invitations/kakao-start",
  invitationMfaEnrollment: "/api/ops/auth/invitations/mfa-enrollment",
  invitationAccept: "/api/ops/auth/invitations/accept",
} as const;

export function verifyOperatorMfa(otpCode: string) {
  return apiFetch(OPS_AUTH_PATHS.mfaVerify, {
    method: "POST",
    body: { otpCode },
    schema: OpsMfaVerifyResponseSchema,
    skipAuthEvents: true,
    skipStepUp: true,
  });
}

export type InvitationState = "EXPIRED" | "CANCELLED" | "ACCEPTED";

export function toInvitationState(value: unknown): InvitationState | null {
  return value === "EXPIRED" || value === "CANCELLED" || value === "ACCEPTED" ? value : null;
}

/** 초대 확인 오류의 invitationState는 공통 오류 본문에 없는 필드라 이 클래스로 따로 보관한다. */
export class InvitationApiError extends ApiError {
  readonly invitationState: InvitationState | null;

  constructor(error: ApiError, invitationState: InvitationState | null) {
    super(error.status, error.details, error.requestId);
    this.invitationState = invitationState;
  }
}

const ErrorBodySchema = z.looseObject({
  code: z.string().optional(),
  message: z.string().optional(),
  traceId: z.string().optional(),
  retryAfterSeconds: z.number().optional(),
  invitationState: z.string().optional(),
  fieldErrors: z
    .array(z.object({ field: z.string(), code: z.string().optional(), message: z.string() }))
    .optional(),
});

/** 초대 수락 흐름은 세션이 없는 공개 요청이라 전역 세션 만료 처리 없이 오류 본문을 직접 해석한다. */
async function invitationPost<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  // 메일 링크로 새 브라우저에서 열면 CSRF 쿠키가 없어 첫 POST가 403이 된다. apiFetch처럼 먼저 받아 온다.
  const csrf = await ensureCsrfToken();
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "include",
      signal,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(csrf === null ? {} : { "X-XSRF-TOKEN": csrf }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiNetworkError("network");
  }
  if (!response.ok) {
    const parsed = ErrorBodySchema.safeParse(await response.json().catch(() => null));
    const data = parsed.success ? parsed.data : {};
    const retryHeader = Number(response.headers.get("Retry-After"));
    const error = new ApiError(response.status, {
      code: data.code ?? "UNKNOWN_ERROR",
      message: data.message ?? "요청을 처리하지 못했습니다.",
      traceId: data.traceId,
      fieldErrors: data.fieldErrors,
      retryAfterSeconds:
        data.retryAfterSeconds ??
        (response.status === 429 && retryHeader > 0 ? retryHeader : undefined),
    });
    throw new InvitationApiError(error, toInvitationState(data.invitationState));
  }
  const json: unknown = await response.json();
  return schema.parse(json);
}

export function previewInvitation(token: string, signal?: AbortSignal) {
  return invitationPost(
    OPS_AUTH_PATHS.invitationPreview,
    { token },
    OperatorInvitationPreviewResponseSchema,
    signal,
  );
}

export function startInvitationKakao(token: string) {
  return invitationPost(
    OPS_AUTH_PATHS.invitationKakaoStart,
    { token },
    OperatorInvitationKakaoStartResponseSchema,
  );
}

export const MfaEnrollmentSchema = OperatorMfaEnrollmentResponseSchema.extend({
  qrImageUrl: z.string().nullable().optional(),
});
export type MfaEnrollment = z.infer<typeof MfaEnrollmentSchema>;

export function enrollInvitationMfa() {
  return invitationPost(OPS_AUTH_PATHS.invitationMfaEnrollment, undefined, MfaEnrollmentSchema);
}

export function acceptInvitation(otpCode: string) {
  return invitationPost(
    OPS_AUTH_PATHS.invitationAccept,
    { otpCode },
    OperatorInvitationAcceptResponseSchema,
  );
}
