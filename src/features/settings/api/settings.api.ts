import { z } from "zod";
import {
  LoginHistoryResponseSchema,
  MeUpdateResponseSchema,
  NotificationPreferenceUpdateResponseSchema,
  TermsAgreementHistoryResponseSchema,
  TermsCatalogResponseSchema,
} from "@/lib/api/contracts/auth.schema";
import {
  OfficeDetailResponseSchema,
  OfficeMembershipListResponseSchema,
} from "@/lib/api/contracts/office.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

export function updateDisplayName(displayName: string) {
  return apiFetch("/api/me", {
    method: "PATCH",
    body: { displayName },
    schema: MeUpdateResponseSchema,
  });
}

export function updateNotificationChannels(channels: Record<string, boolean>) {
  return apiFetch("/api/me/notification-preferences", {
    method: "PATCH",
    body: { channels },
    schema: NotificationPreferenceUpdateResponseSchema,
  });
}

export function fetchLoginHistory(params: { page: number; size: number }) {
  return apiFetch(withQuery("/api/me/login-history", params), {
    schema: LoginHistoryResponseSchema,
  });
}

export function fetchTermsHistory(params: { page: number; size: number }) {
  return apiFetch(withQuery("/api/me/terms-agreements", params), {
    schema: TermsAgreementHistoryResponseSchema,
  });
}

export function fetchCurrentTerms() {
  return apiFetch(withQuery("/api/terms", { context: "SIGNUP" }), {
    schema: TermsCatalogResponseSchema,
    skipAuthEvents: true,
  });
}

export function fetchCurrentOffice() {
  return apiFetch("/api/offices/current", { schema: OfficeDetailResponseSchema });
}

export function leaveCurrentOffice() {
  return apiFetch<void>("/api/memberships/me/leave", { method: "POST", schema: z.void() });
}

export function logoutSession() {
  return apiFetch<void>("/api/auth/logout", {
    method: "POST",
    schema: z.void(),
    skipAuthEvents: true,
  });
}

const SubscriptionSummarySchema = z.object({
  status: z.string(),
  plan: z.string().optional(),
  memberCount: z.number().optional(),
});

const OfficeCloseResultSchema = z.object({
  officeId: z.number(),
  subscriptionStatus: z.string(),
  returnGrantId: z.number(),
  returnExpiresAt: z.iso.datetime({ offset: true }),
  archiveRequestStatus: z.string(),
});
export type OfficeCloseResult = z.infer<typeof OfficeCloseResultSchema>;

export function fetchOfficeMemberships() {
  return apiFetch("/api/offices/current/memberships", {
    schema: OfficeMembershipListResponseSchema,
  });
}

export function fetchSubscriptionSummary() {
  return apiFetch("/api/subscriptions/current", { schema: SubscriptionSummarySchema });
}

export function closeOffice(request: { archiveChoice: "REQUEST" | "DECLINE" }) {
  return apiFetch("/api/offices/current/close", {
    method: "POST",
    body: { confirmed: true, archiveChoice: request.archiveChoice },
    schema: OfficeCloseResultSchema,
  });
}
