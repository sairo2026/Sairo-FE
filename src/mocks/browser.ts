import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { setMockPhoneVerificationRequired } from "./handlers/account";
import { MOCK_ACTIVE_CONTEXT, setMockAuthContext } from "./handlers/auth";
import { legalReviewHandlers } from "./handlers/legal-review";

const ROLE_STORAGE_KEY = "sairo-mock-office-role";

function applyStoredRole(): void {
  try {
    const role = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (role === "OWNER" || role === "AGENT" || role === "DEPUTY") {
      setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT, role });
    }
    if (role === "OWNER_OVERDUE") {
      setMockAuthContext({
        ...MOCK_ACTIVE_CONTEXT,
        role: "OWNER",
        accessCondition: "PAYMENT_OVERDUE",
      });
    }
    if (role === "NEW") {
      setMockAuthContext({
        ...MOCK_ACTIVE_CONTEXT,
        accessCondition: "PRE_VERIFICATION",
        officeId: null,
        role: null,
      });
    }
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
applyStoredPhoneVerification();

export const worker = setupWorker(...legalReviewHandlers, ...handlers);
