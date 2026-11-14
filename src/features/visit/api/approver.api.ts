import { z } from "zod";
import {
  ApproverConditionImpactPreviewResponseSchema,
  ApproverConditionResponseSchema,
  ApproverConfirmedScheduleResponseSchema,
  ApproverSelectionResponseSchema,
  ApproverVisitRequestCompareResponseSchema,
} from "@/lib/api/contracts/visit.schema";
import type {
  ApproverConditionUpsertRequest,
  ApproverSelectionRequest,
} from "@/lib/api/contracts/visit.schema";
import { apiFetch } from "@/shared/api/client";

/** 선택 요청의 If-Match 출처다. 백엔드가 항목마다 필수로 준다. */
const CompareItemSchema = ApproverVisitRequestCompareResponseSchema.shape.items.element.extend({
  version: z.number(),
});

export const ApproverCompareSchema = ApproverVisitRequestCompareResponseSchema.extend({
  items: z.array(CompareItemSchema),
});
export type ApproverCompare = z.infer<typeof ApproverCompareSchema>;
export type ApproverCompareItem = ApproverCompare["items"][number];

export const ConditionHistorySchema = z.object({
  items: z.array(
    ApproverConditionResponseSchema.omit({
      normalizedRanges: true,
      normalizationApplied: true,
      privacyNotice: true,
    }),
  ),
});
export type ConditionHistory = z.infer<typeof ConditionHistorySchema>;

export type ApproverTarget = { kind: "link"; token: string };

export function approverBase(target: ApproverTarget): string {
  return `/api/public/approver-property-links/${encodeURIComponent(target.token)}`;
}

const GUEST = { skipAuthEvents: true } as const;

export function fetchApproverConditions(base: string, signal?: AbortSignal) {
  return apiFetch(`${base}/conditions`, {
    ...GUEST,
    signal,
    retry: false,
    schema: ApproverConditionResponseSchema,
  });
}

export function previewApproverConditions(base: string, request: ApproverConditionUpsertRequest) {
  return apiFetch(`${base}/conditions/impact-preview`, {
    ...GUEST,
    method: "POST",
    body: request,
    schema: ApproverConditionImpactPreviewResponseSchema,
  });
}

export function saveApproverConditions(base: string, request: ApproverConditionUpsertRequest) {
  return apiFetch(`${base}/conditions`, {
    ...GUEST,
    method: "PUT",
    body: request,
    schema: ApproverConditionResponseSchema,
  });
}

export function fetchApproverRequests(base: string, signal?: AbortSignal) {
  return apiFetch(`${base}/visit-requests`, {
    ...GUEST,
    signal,
    retry: false,
    schema: ApproverCompareSchema,
  });
}

export function selectApproverRequest(
  base: string,
  requestId: number,
  request: ApproverSelectionRequest,
  version: number,
) {
  return apiFetch(`${base}/visit-requests/${requestId}/select`, {
    ...GUEST,
    method: "POST",
    body: request,
    headers: { "If-Match": String(version) },
    schema: ApproverSelectionResponseSchema,
  });
}

export function fetchApproverConfirmed(base: string, signal?: AbortSignal) {
  return apiFetch(`${base}/confirmed-schedules`, {
    ...GUEST,
    signal,
    retry: false,
    schema: ApproverConfirmedScheduleResponseSchema,
  });
}

export function fetchProxyConditionHistory(propertyId: number, approvalId: number) {
  return apiFetch(
    `/api/properties/${propertyId}/access-approvals/${approvalId}/approver-conditions`,
    { schema: ConditionHistorySchema },
  );
}

export function saveProxyConditions(
  propertyId: number,
  approvalId: number,
  request: ApproverConditionUpsertRequest,
) {
  const { acknowledgedNoticeVersion, ...body } = request;
  void acknowledgedNoticeVersion;
  return apiFetch(
    `/api/properties/${propertyId}/access-approvals/${approvalId}/approver-conditions/proxy`,
    { method: "PUT", body, schema: ApproverConditionResponseSchema },
  );
}
