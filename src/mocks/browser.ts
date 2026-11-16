import { setupWorker } from "msw/browser";
import { toOpsRoles } from "@/features/ops/model/roles";
import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import { handlers } from "./handlers";
import { setMockPhoneVerificationRequired } from "./handlers/account";
import { MOCK_ACTIVE_CONTEXT, setMockAuthContext } from "./handlers/auth";
import { legalReviewHandlers } from "./handlers/legal-review";
import { setMockOperatorRoles } from "./handlers/ops-session";

const ROLE_STORAGE_KEY = "sairo-mock-office-role";
const OPS_ROLES_STORAGE_KEY = "sairo-mock-ops-roles";

/** 접근 상태를 점검할 때 쓰는 모의 역할. 저장소 값 하나로 접근 상태와 역할을 함께 정한다. */
const ACCESS_STATE_ROLES: Record<string, Partial<AuthContextResponse>> = {
  OWNER_OVERDUE: { role: "OWNER", accessCondition: "PAYMENT_OVERDUE" },
  AGENT_OVERDUE: { role: "AGENT", accessCondition: "PAYMENT_OVERDUE" },
  DEPUTY_OVERDUE: { role: "DEPUTY", accessCondition: "PAYMENT_OVERDUE" },
  OWNER_UNPAID: { role: "OWNER", accessCondition: "VERIFIED_UNPAID" },
  AGENT_UNPAID: { role: "AGENT", accessCondition: "VERIFIED_UNPAID" },
  OWNER_REVIEW: { role: "OWNER", accessCondition: "OFFICE_UNDER_REVIEW" },
  AGENT_REVIEW: { role: "AGENT", accessCondition: "OFFICE_UNDER_REVIEW" },
  OWNER_REVOKED: {
    role: "OWNER",
    accessCondition: "AUTH_REVOKED",
    restrictionReason: "REVOKED",
  },
  OWNER_SUSPENDED: {
    role: "OWNER",
    accessCondition: "AUTH_REVOKED",
    restrictionReason: "REVERIFICATION_SUSPENDED",
  },
  AGENT_REVOKED: {
    role: "AGENT",
    accessCondition: "AUTH_REVOKED",
    restrictionReason: "REVOKED",
  },
  REMOVED: { role: null, accessCondition: "REMOVED", removalReason: "REMOVED" },
  RETURN_EXPIRED: { role: null, accessCondition: "RETURN_EXPIRED" },
  NEW: { accessCondition: "PRE_VERIFICATION", officeId: null, role: null },
};

function applyStoredRole(): void {
  try {
    const role = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (role === "OWNER" || role === "AGENT" || role === "DEPUTY") {
      setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT, role });
    } else if (role !== null && role in ACCESS_STATE_ROLES) {
      setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT, ...ACCESS_STATE_ROLES[role] });
    }
  } catch {
    return;
  }
}

/** 운영 콘솔의 하위 역할 점검용. 쉼표로 나눈 역할 목록으로 운영자 역할을 줄인다. */
function applyStoredOpsRoles(): void {
  try {
    const stored = window.localStorage.getItem(OPS_ROLES_STORAGE_KEY);
    if (stored === null) return;
    setMockOperatorRoles(toOpsRoles(stored.split(",").map((value) => value.trim())));
  } catch {
    return;
  }
}

/** 화면 대조용 캡처에서만 쓴다. 휴대폰 인증을 요구하는 가입 화면을 열 때 저장소 값으로 켠다. */
function applyStoredPhoneVerification(): void {
  try {
    if (window.localStorage.getItem("sairo-mock-phone-verification") === "required") {
      setMockPhoneVerificationRequired(true);
    }
  } catch {
    return;
  }
}

applyStoredRole();
applyStoredOpsRoles();
applyStoredPhoneVerification();

export const worker = setupWorker(...legalReviewHandlers, ...handlers);
