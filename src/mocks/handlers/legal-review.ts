import { http, HttpResponse } from "msw";
import type { PublicCompanyInfoResponse } from "@/lib/api/contracts/public-site.schema";

export const REVIEW_COMPANY_INFO: PublicCompanyInfoResponse = {
  versionNo: 1,
  publishedAt: "2026-11-10T09:00:00+09:00",
  businessName: "사이로(SAIRO)",
  representativeName: "김태환",
  businessNumber: "704-16-02872",
  address: "경기도 고양시 덕양구 백양로 51, 902호 A-5(화정동, 네이버타운)",
  contactPhone: "",
  ecommerceNotice: null,
  supportEmail: "support@example.com",
  privacyContact: "privacy@example.com",
  privacyRequestPath: "/privacy-requests",
  links: [
    { kind: "TERMS", title: "이용약관", url: "/legal/policies/TERMS/1.0" },
    { kind: "PRIVACY", title: "개인정보처리방침", url: "/legal/policies/PRIVACY/1.0" },
    { kind: "REFUND", title: "환불정책", url: "/legal/policies/REFUND/1.0" },
  ],
};

export const legalReviewHandlers = [
  http.get("/api/public/company-info", () => HttpResponse.json(REVIEW_COMPANY_INFO)),
];
