import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { createQueryClient } from "@/shared/api/query-client";

export function renderWithQuery(ui: ReactNode) {
  const queryClient = createQueryClient();
  const view = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { queryClient, ...view };
}
