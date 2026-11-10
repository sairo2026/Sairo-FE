import { GuestPrivacyIntakeResponseSchema } from "@/lib/api/contracts/visit.schema";
import { apiFetch } from "@/shared/api/client";

export type GuestRightsTarget =
  | { kind: "CUSTOMER" | "APPROVER_PROPERTY"; token: string; noticeVersion: string }
  | { kind: "APPROVER_PORTAL"; approvalId: number; noticeVersion: string };

export type GuestRightsInput = {
  requestType: string;
  requesterRole: string;
  contactChannel: string;
  contact: string;
  requestNote: string | null;
};

export function submitGuestPrivacyIntake(request: {
  target: GuestRightsTarget;
  input: GuestRightsInput;
}) {
  const { target, input } = request;
  const common = {
    ...input,
    acknowledgedNoticeVersion: target.noticeVersion,
  };
  if (target.kind === "APPROVER_PORTAL") {
    return apiFetch("/api/approver-portal/privacy-intakes", {
      method: "POST",
      body: { approvalId: target.approvalId, ...common },
      schema: GuestPrivacyIntakeResponseSchema,
      skipStepUp: true,
    });
  }
  return apiFetch("/api/public/privacy-intakes", {
    method: "POST",
    body: { linkKind: target.kind, token: target.token, ...common },
    schema: GuestPrivacyIntakeResponseSchema,
    skipAuthEvents: true,
    skipStepUp: true,
  });
}
