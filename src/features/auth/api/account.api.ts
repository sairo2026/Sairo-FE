import { z } from "zod";
import {
  ContactChangeResponseSchema,
  ContactEmailVerificationSendResponseSchema,
  ContactEmailVerifyResponseSchema,
  EmailLoginMethodLinkResponseSchema,
  EmailLoginMethodVerificationResponseSchema,
  EmailVerificationSendResponseSchema,
  EmailVerifyResponseSchema,
  KakaoLoginMethodLinkResponseSchema,
  LoginMethodEmailVerifyResponseSchema,
  LoginResponseSchema,
  MarketingUnsubscribeResponseSchema,
  MeResponseSchema,
  PasswordResetLinkResponseSchema,
  PhoneVerificationSendResponseSchema,
  PhoneVerifyResponseSchema,
  RecoveryOptionsResponseSchema,
  SignupEmailResponseSchema,
  SignupKakaoResponseSchema,
  TermsCatalogResponseSchema,
  WithdrawalPreviewResponseSchema,
} from "@/lib/api/contracts/auth.schema";
import type {
  ContactChangeRequest,
  LoginMethodLinkRequest,
  LoginRequest,
  PasswordResetLinkRequest,
  PasswordResetRequest,
  PhoneVerifyRequest,
  PhoneVerificationSendRequest,
  SignupEmailRequest,
  SignupKakaoRequest,
} from "@/lib/api/contracts/auth.schema";
import { CurrentSessionResponseSchema } from "@/lib/api/contracts/common.schema";
import { apiFetch, withQuery } from "@/shared/api/client";
import { getStepUpHandler } from "@/shared/api/auth-events";

const PUBLIC_FLOW = { skipAuthEvents: true, skipStepUp: true } as const;

export const KAKAO_LOGIN_START_PATH = "/api/auth/kakao/start";
export const KAKAO_LINK_START_PATH = "/api/me/login-methods/kakao/start";

export function login(request: LoginRequest) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: request,
    schema: LoginResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function fetchSignupTerms() {
  return apiFetch(withQuery("/api/terms", { context: "SIGNUP" }), {
    schema: TermsCatalogResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function sendSignupEmailVerification(email: string) {
  return apiFetch("/api/auth/signup/email/verification", {
    method: "POST",
    body: { email },
    schema: EmailVerificationSendResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function verifySignupEmail(token: string) {
  return apiFetch("/api/auth/signup/email/verify", {
    method: "POST",
    body: { token },
    schema: EmailVerifyResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function sendPhoneVerification(request: PhoneVerificationSendRequest) {
  return apiFetch("/api/auth/phone-verification", {
    method: "POST",
    body: request,
    schema: PhoneVerificationSendResponseSchema,
    skipStepUp: true,
  });
}

export function verifyPhone(request: PhoneVerifyRequest) {
  return apiFetch("/api/auth/phone-verification/verify", {
    method: "POST",
    body: request,
    schema: PhoneVerifyResponseSchema,
    skipStepUp: true,
  });
}

export function signupWithEmail(request: SignupEmailRequest) {
  return apiFetch("/api/auth/signup/email", {
    method: "POST",
    body: request,
    schema: SignupEmailResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function signupWithKakao(request: SignupKakaoRequest) {
  return apiFetch("/api/auth/signup/kakao", {
    method: "POST",
    body: request,
    schema: SignupKakaoResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function fetchRecoveryOptions(tickets: {
  verifiedEmailTicket?: string;
  verifiedPhoneTicket?: string;
}) {
  return apiFetch(withQuery("/api/auth/recovery-options", tickets), {
    schema: RecoveryOptionsResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function requestPasswordReset(request: PasswordResetLinkRequest) {
  return apiFetch("/api/auth/password/reset-request", {
    method: "POST",
    body: request,
    schema: PasswordResetLinkResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function resetPassword(request: PasswordResetRequest) {
  return apiFetch<void>("/api/auth/password/reset", {
    method: "POST",
    body: request,
    schema: z.void(),
    ...PUBLIC_FLOW,
  });
}

export function unsubscribeMarketing(token: string) {
  return apiFetch("/api/public/marketing-unsubscribe", {
    method: "POST",
    body: { token },
    schema: MarketingUnsubscribeResponseSchema,
    ...PUBLIC_FLOW,
  });
}

export function fetchMe() {
  return apiFetch("/api/me", { schema: MeResponseSchema, skipAuthEvents: true });
}

export function sendLoginMethodEmailVerification(email: string) {
  return apiFetch("/api/me/login-methods/email/verification", {
    method: "POST",
    body: { email },
    schema: EmailLoginMethodVerificationResponseSchema,
  });
}

export function verifyLoginMethodEmail(token: string) {
  return apiFetch("/api/me/login-methods/email/verify", {
    method: "POST",
    body: { token },
    schema: LoginMethodEmailVerifyResponseSchema,
  });
}

export function linkEmailLoginMethod(request: LoginMethodLinkRequest) {
  return apiFetch("/api/me/login-methods/email", {
    method: "POST",
    body: request,
    schema: EmailLoginMethodLinkResponseSchema,
  });
}

export function linkKakaoLoginMethod(request: { code: string; state: string }) {
  return apiFetch("/api/me/login-methods/kakao", {
    method: "POST",
    body: request,
    schema: KakaoLoginMethodLinkResponseSchema,
  });
}

export function unlinkLoginMethod(method: "email" | "kakao") {
  return apiFetch<void>(`/api/me/login-methods/${method}`, {
    method: "DELETE",
    schema: z.void(),
  });
}

export function sendContactEmailVerification(email: string) {
  return apiFetch("/api/me/contact/email/verification", {
    method: "POST",
    body: { email },
    schema: ContactEmailVerificationSendResponseSchema,
  });
}

export function verifyContactEmail(token: string) {
  return apiFetch("/api/me/contact/email/verify", {
    method: "POST",
    body: { token },
    schema: ContactEmailVerifyResponseSchema,
  });
}

export function changeContact(request: ContactChangeRequest) {
  return apiFetch("/api/me/contact", {
    method: "PATCH",
    body: request,
    schema: ContactChangeResponseSchema,
  });
}

export async function ensureStepUp(): Promise<boolean> {
  const session = await apiFetch("/api/me/session", { schema: CurrentSessionResponseSchema });
  if (session.stepUpValid) return true;
  const handler = getStepUpHandler();
  return handler ? handler() : false;
}

export function fetchWithdrawalPreview() {
  return apiFetch("/api/me/withdrawal-preview", { schema: WithdrawalPreviewResponseSchema });
}

export function withdrawAccount() {
  return apiFetch<void>("/api/me", { method: "DELETE", schema: z.void() });
}
