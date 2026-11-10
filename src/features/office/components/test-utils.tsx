import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import { createQueryClient } from "@/shared/api/query-client";
import { OfficeAccessProvider } from "@/shared/session/office-access-context";
import type { OfficeRole } from "@/shared/session/office-access-context";

export function accessContext(partial: Partial<AuthContextResponse> = {}): AuthContextResponse {
  return {
    accessCondition: "PRE_VERIFICATION",
    officeId: null,
    role: null,
    pendingRegistrationId: null,
    pendingMembershipId: null,
    unresolvedRejection: null,
    graceUntil: null,
    returnPeriodEndsAt: null,
    restrictionReason: null,
    removalReason: null,
    reconsentRequired: false,
    ...partial,
  };
}

export type RenderOptions = {
  role?: OfficeRole | null;
  isReadOnly?: boolean;
  context?: Partial<AuthContextResponse>;
};

export function renderOffice(ui: ReactNode, options: RenderOptions = {}) {
  const queryClient = createQueryClient();
  const role = options.role ?? null;
  const context = accessContext({
    ...(role ? { accessCondition: "ACTIVE" as const, officeId: 12, role } : {}),
    ...options.context,
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <OfficeAccessProvider value={{ context, role, isReadOnly: options.isReadOnly ?? false }}>
        {ui}
      </OfficeAccessProvider>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}
