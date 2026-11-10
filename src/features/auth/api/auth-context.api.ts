import { z } from "zod";
import { AuthContextResponseSchema } from "@/lib/api/contracts/common.schema";
import {
  PasswordStepUpResponseSchema,
  TermsReconsentResponseSchema,
} from "@/lib/api/contracts/auth.schema";
import type { StepUpPasswordRequest, TermsAgreementRequest } from "@/lib/api/contracts/auth.schema";
import { OpsMeResponseSchema } from "@/lib/api/contracts/ops-session.schema";
import { apiFetch } from "@/shared/api/client";

/** 접근 상태를 직접 판정하는 요청이라 만료 전역 처리 없이 호출자가 401을 해석한다. */
export function fetchAuthContext() {
  return apiFetch("/api/auth/context", {
    schema: AuthContextResponseSchema,
    skipAuthEvents: true,
  });
}

export function fetchTermsReconsent() {
  return apiFetch("/api/me/terms-reconsent", {
    schema: TermsReconsentResponseSchema,
    skipAuthEvents: true,
  });
}

export function recordTermsAgreement(request: TermsAgreementRequest) {
  return apiFetch<void>("/api/me/terms-agreements", {
    method: "POST",
    body: request,
    schema: z.void(),
    skipAuthEvents: true,
  });
}

export function logout() {
  return apiFetch<void>("/api/auth/logout", { method: "POST", skipAuthEvents: true });
}

export function stepUpWithPassword(request: StepUpPasswordRequest) {
  return apiFetch("/api/auth/step-up/password", {
    method: "POST",
    body: request,
    schema: PasswordStepUpResponseSchema,
    skipStepUp: true,
    skipAuthEvents: true,
  });
}

export const KAKAO_STEP_UP_START_PATH = "/api/auth/step-up/kakao/start";

export function fetchOperatorMe() {
  return apiFetch("/api/ops/me", { schema: OpsMeResponseSchema, skipAuthEvents: true });
}
