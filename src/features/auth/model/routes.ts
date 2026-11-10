/** 접근 제한 때문에 이동하는 안내 화면과 제한 중에도 열려 있는 화면의 주소. */
export const AUTH_ROUTES = {
  login: "/login",
  accessNotice: "/access",
  reconsent: "/reconsent",
  account: "/account",
  support: "/support",
  privacyRequests: "/privacy-requests",
  officeVerification: "/office/verification",
  billing: "/billing",
  opsLogin: "/ops/login",
  opsHome: "/ops",
} as const;
