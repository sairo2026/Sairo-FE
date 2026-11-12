import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsBusinessCalendarResponseSchema,
  OpsBusinessCalendarUpdateResponseSchema,
  OpsCompanyServiceInfoInquiryTestResponseSchema,
  OpsPolicyDocumentListResponseSchema,
  OpsPriceScheduleListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { IntegrationListSchema } from "../integrations/integrations-model";
import { CompanyInfoCreateSchema, CompanyInfoListSchema } from "./company-model";
import type { OpsCompanyServiceInfoRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "company-info";
const BASE = "/api/ops/company-service-info";

export function useCompanyInfo() {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "info"),
    queryFn: () =>
      apiFetch(opsPath(BASE, { page: 0, size: 100 }), {
        schema: CompanyInfoListSchema,
      }),
  });
}

export function useCompanyActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "info") });
  return {
    create: useMutation({
      mutationFn: (body: OpsCompanyServiceInfoRequest) =>
        apiFetch(BASE, {
          method: "POST",
          body,
          schema: CompanyInfoCreateSchema,
        }),
      onSuccess: refresh,
    }),
    inquiryTest: useMutation({
      mutationFn: (input: { infoId: number; result: "SUCCESS" | "FAILED" }) =>
        apiFetch(`${BASE}/${input.infoId}/inquiry-test`, {
          method: "POST",
          body: { result: input.result },
          schema: OpsCompanyServiceInfoInquiryTestResponseSchema,
        }),
      onSettled: refresh,
    }),
  };
}

export function useBusinessCalendar(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "calendar", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/business-calendar", params), {
        schema: OpsBusinessCalendarResponseSchema,
      }),
  });
}

export function useCalendarUpdate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { date: string; isBusinessDay: boolean; reason: string | null }) =>
      apiFetch(`/api/ops/business-calendar/${input.date}`, {
        method: "PUT",
        body: { isBusinessDay: input.isBusinessDay, reason: input.reason },
        schema: OpsBusinessCalendarUpdateResponseSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "calendar") }),
  });
}

export function useIntegrationsForCompany(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "integrations", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/integrations", params), {
        schema: IntegrationListSchema,
      }),
  });
}

export function useActivePrices(enabled: boolean) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "prices"),
    enabled,
    retry: false,
    queryFn: () =>
      apiFetch(opsPath("/api/ops/price-schedules", { page: 0, size: 100 }), {
        schema: OpsPriceScheduleListResponseSchema,
      }),
  });
}

export function useRefundDocuments() {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "refund"),
    retry: false,
    queryFn: () =>
      apiFetch(opsPath("/api/ops/policy-documents", { page: 0, size: 100 }), {
        schema: OpsPolicyDocumentListResponseSchema,
      }),
  });
}
