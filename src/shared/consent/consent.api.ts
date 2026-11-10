import { z } from "zod";
import { MeResponseSchema } from "@/lib/api/contracts/auth.schema";
import { apiFetch } from "@/shared/api/client";

export const accountQueryKey = ["auth", "me"] as const;

export function fetchAccountAgreements() {
  return apiFetch("/api/me", { schema: MeResponseSchema, skipAuthEvents: true });
}

export function recordTermsAgreement(request: {
  termsCode: string;
  version: string;
  agreed: boolean;
}) {
  return apiFetch<void>("/api/me/terms-agreements", {
    method: "POST",
    body: { ...request, consentPath: "ACCOUNT_SETTINGS" },
    schema: z.void(),
  });
}
