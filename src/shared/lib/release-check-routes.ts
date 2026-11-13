export type GateExposure = "always-open" | "review-open" | "blocked";

export type ReleaseCheckGroup = {
  name: string;
  exposure: GateExposure;
  routes: readonly string[];
};

export const RELEASE_CHECK_GROUPS: readonly ReleaseCheckGroup[] = [
  {
    name: "공개 안내",
    exposure: "always-open",
    routes: [
      "/pricing",
      "/legal",
      "/legal/terms",
      "/legal/privacy",
      "/legal/refund-policy",
      "/legal/policies/TERMS/1.0",
      "/legal/link-notice/customer",
    ],
  },
  {
    name: "첫 화면과 가입·로그인",
    exposure: "review-open",
    routes: [
      "/",
      "/home",
      "/login",
      "/login/email",
      "/signup",
      "/signup/email",
      "/signup/kakao",
      "/signup/verify-email",
      "/password/forgot",
      "/password/reset",
      "/reconsent",
      "/access",
      "/removed",
    ],
  },
  {
    name: "사무소 시작과 구성원",
    exposure: "review-open",
    routes: [
      "/office/start",
      "/office/register",
      "/office/register/evidence",
      "/office/review",
      "/office/verification",
      "/office/join",
      "/office/membership",
      "/members",
      "/members/requests",
      "/members/owner-transfer",
    ],
  },
  {
    name: "계정과 설정",
    exposure: "review-open",
    routes: [
      "/account",
      "/account/consents",
      "/account/withdrawal",
      "/account/step-up/kakao-callback",
      "/settings",
      "/settings/contact",
      "/settings/login-methods",
      "/settings/login-methods/kakao-callback",
    ],
  },
  {
    name: "구독·결제와 지원",
    exposure: "review-open",
    routes: [
      "/billing",
      "/billing/plans",
      "/billing/card",
      "/billing/card-guide",
      "/billing/consent",
      "/billing/invoices",
      "/billing/refunds",
      "/billing/return-guide",
      "/support",
      "/support/new",
      "/support/enterprise",
    ],
  },
  {
    name: "업무 화면",
    exposure: "blocked",
    routes: [
      "/properties",
      "/properties/new",
      "/properties/1",
      "/customers",
      "/customers/1",
      "/coordinations",
      "/coordinations/1",
      "/granted-properties",
      "/contracts",
      "/contracts/1",
      "/settlements",
      "/tasks",
      "/notifications",
      "/import",
      "/exports",
      "/privacy-requests",
    ],
  },
  {
    name: "반환·보관과 링크 화면",
    exposure: "blocked",
    routes: [
      "/grant",
      "/grant/verify",
      "/return",
      "/archive",
      "/unsubscribe",
      "/approver/token-value",
      "/approver/account/login",
      "/visit-responses/token-value",
    ],
  },
  {
    name: "운영 콘솔",
    exposure: "blocked",
    routes: [
      "/ops/login",
      "/ops/mfa",
      "/ops/invitations/accept",
      "/ops",
      "/ops/offices",
      "/ops/registrations",
      "/ops/billing",
      "/ops/billing/reconciliation",
      "/ops/company-info",
      "/ops/launch",
      "/ops/integrations",
      "/ops/system-jobs",
    ],
  },
];

export const RELEASE_CHECK_APIS = {
  alwaysOpen: ["/api/public/pricing", "/api/public/company-info"],
  gated: ["/api/auth/context", "/api/me", "/api/ops/me", "/api/terms"],
} as const;
