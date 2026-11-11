import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { MOCK_ACTIVE_CONTEXT, setMockAuthContext } from "./handlers/auth";
import { legalReviewHandlers } from "./handlers/legal-review";

const ROLE_STORAGE_KEY = "sairo-mock-office-role";

function applyStoredRole(): void {
  try {
    const role = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (role === "OWNER" || role === "AGENT" || role === "DEPUTY") {
      setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT, role });
    }
  } catch {
    return;
  }
}

applyStoredRole();

export const worker = setupWorker(...legalReviewHandlers, ...handlers);
