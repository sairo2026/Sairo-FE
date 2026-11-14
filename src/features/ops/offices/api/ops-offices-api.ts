import {
  OpsAuditLogResponseSchema,
  OpsBillingInvoiceListResponseSchema,
  OpsImportSupportRequestListResponseSchema,
  OpsSupportInquiryListResponseSchema,
  OperatorOfficeListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../../api/ops-api";
import { OfficeDetailWireSchema } from "./wire";
import type { OpsListParams } from "../../api/ops-api";

export type OfficeListFilter = {
  keyword: string;
  registrationStatus: string;
  subscriptionStatus: string;
};

export const opsOfficeKeys = {
  list: (filter: OfficeListFilter, page: number, size: number) =>
    opsKeys.scope("offices", "list", filter, page, size),
  detail: (officeId: number) => opsKeys.scope("offices", "detail", officeId),
  tab: (officeId: number, tab: string, page: number, size: number) =>
    opsKeys.scope("offices", "tab", officeId, tab, page, size),
};

export function fetchOfficeList(filter: OfficeListFilter, page: number, size: number) {
  return apiFetch(
    opsPath("/api/ops/offices", {
      keyword: filter.keyword.trim(),
      registrationStatus: filter.registrationStatus,
      subscriptionStatus: filter.subscriptionStatus,
      page,
      size,
    }),
    { schema: OperatorOfficeListResponseSchema },
  );
}

export function fetchOfficeDetail(officeId: number) {
  return apiFetch(`/api/ops/offices/${officeId}`, { schema: OfficeDetailWireSchema });
}

function tabParams(officeId: number, page: number, size: number): OpsListParams {
  return { officeId, page, size };
}

export function fetchOfficeInvoices(officeId: number, page: number, size: number) {
  return apiFetch(opsPath("/api/ops/billing/invoices", tabParams(officeId, page, size)), {
    schema: OpsBillingInvoiceListResponseSchema,
  });
}

export function fetchOfficeInquiries(officeId: number, page: number, size: number) {
  return apiFetch(opsPath("/api/ops/support-inquiries", tabParams(officeId, page, size)), {
    schema: OpsSupportInquiryListResponseSchema,
  });
}

export function fetchOfficeImportRequests(officeId: number, page: number, size: number) {
  return apiFetch(opsPath("/api/ops/import-support-requests", tabParams(officeId, page, size)), {
    schema: OpsImportSupportRequestListResponseSchema,
  });
}

export function fetchOfficeAuditLog(officeId: number, page: number, size: number) {
  return apiFetch(
    opsPath("/api/ops/audit-log", {
      targetType: "OFFICE",
      targetId: officeId,
      page,
      size,
    }),
    { schema: OpsAuditLogResponseSchema },
  );
}
