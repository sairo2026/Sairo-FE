import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { createQueryClient } from "@/shared/api/query-client";
import { OpsSessionProvider } from "../../model/ops-session";
import type { OpsRole } from "../../model/roles";

export function renderOpsScreen(ui: ReactNode, roles: OpsRole[]) {
  const queryClient = createQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <OpsSessionProvider value={{ operatorId: 1, name: "운영 김사이", roles }}>
        {ui}
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

export function renderPublicScreen(ui: ReactNode) {
  const queryClient = createQueryClient();
  const view = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { queryClient, ...view };
}
