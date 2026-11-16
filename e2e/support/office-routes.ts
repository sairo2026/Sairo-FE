export type Role = "OWNER" | "AGENT" | "DEPUTY";
export const ROLES: readonly Role[] = ["OWNER", "AGENT", "DEPUTY"];

/** 접근 규칙(access-policy, role-menu)에서 기대하는 역할별 접근 표. */
export const OFFICE_ROUTES: ReadonlyArray<{
  path: string;
  label: string;
  roles: readonly Role[];
  finalPath?: string;
}> = [
  { path: "/home", label: "홈", roles: ROLES },
  { path: "/tasks", label: "오늘 할 일", roles: ROLES },
  { path: "/properties", label: "매물", roles: ["OWNER", "AGENT"] },
  { path: "/properties/new", label: "매물 등록", roles: ["OWNER", "AGENT"] },
  { path: "/customers", label: "고객", roles: ["OWNER", "AGENT"] },
  { path: "/customers/new", label: "고객 등록", roles: ["OWNER", "AGENT"] },
  { path: "/coordinations", label: "방문 조율", roles: ROLES },
  { path: "/coordinations/new", label: "방문 조율 생성", roles: ROLES },
  { path: "/granted-properties", label: "열람 허용 매물", roles: ROLES },
  { path: "/contracts", label: "계약", roles: ["OWNER", "AGENT"] },
  { path: "/contracts/new", label: "계약 등록", roles: ["OWNER", "AGENT"] },
  { path: "/import", label: "데이터 이전", roles: ["OWNER"] },
  { path: "/exports", label: "데이터 내보내기", roles: ["OWNER", "AGENT"] },
  { path: "/settlements", label: "월말결산", roles: ["OWNER", "AGENT"] },
  { path: "/members", label: "구성원", roles: ROLES },
  { path: "/billing", label: "구독·결제", roles: ["OWNER"] },
  { path: "/billing/plans", label: "요금제", roles: ["OWNER"] },
  { path: "/office", label: "사무소 정보", roles: ["OWNER"] },
  { path: "/notifications", label: "알림", roles: ROLES },
  { path: "/settings", label: "계정 설정", roles: ROLES, finalPath: "/account" },
  { path: "/properties/1", label: "매물 상세", roles: ["OWNER", "AGENT"] },
  { path: "/customers/1", label: "고객 상세", roles: ["OWNER", "AGENT"] },
  { path: "/contracts/1", label: "계약 상세", roles: ["OWNER", "AGENT"] },
  { path: "/account", label: "내 계정", roles: ROLES },
];
