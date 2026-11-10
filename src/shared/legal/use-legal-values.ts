"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { PublicCompanyInfoResponseSchema } from "@/lib/api/contracts/public-site.schema";
import { apiFetch } from "@/shared/api/client";
import type { LegalValues } from "./placeholders";

const COMPANY_INFO_QUERY_KEY = ["billing", "company-info"] as const;

export const LegalCompanyInfoSchema = PublicCompanyInfoResponseSchema.partial({
  versionNo: true,
  publishedAt: true,
  contactPhone: true,
  supportEmail: true,
  privacyContact: true,
  privacyRequestPath: true,
  links: true,
  ecommerceNotice: true,
}).extend({ ecommerceNotice: z.string().nullable().optional() });
export type LegalCompanyInfo = z.infer<typeof LegalCompanyInfoSchema>;

export function fetchLegalCompanyInfo() {
  return apiFetch("/api/public/company-info", {
    schema: LegalCompanyInfoSchema,
    retry: false,
    skipAuthEvents: true,
  });
}

export function useLegalCompanyInfo() {
  return useQuery({
    queryKey: COMPANY_INFO_QUERY_KEY,
    queryFn: fetchLegalCompanyInfo,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function buildLegalValues(
  version: string,
  info: LegalCompanyInfo | undefined,
  effectiveDate?: string,
): LegalValues {
  return {
    버전: version,
    시행일: effectiveDate,
    연락처: info?.contactPhone || undefined,
    "지원 이메일": info?.supportEmail || undefined,
    "개인정보 문의 이메일": info?.privacyContact || undefined,
    "운영사 상호": info?.businessName || undefined,
    상호: info?.businessName || undefined,
    대표자: info?.representativeName || undefined,
    사업자등록번호: info?.businessNumber || undefined,
    주소: info?.address || undefined,
    신고번호: info?.ecommerceNotice || undefined,
  };
}
