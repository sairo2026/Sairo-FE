"use client";

import type { ReactNode } from "react";
import { AuthEventsProvider } from "@/features/auth/components/auth-events-provider";
import { QueryProvider } from "@/shared/api/query-provider";
import { MockProvider } from "./mock-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MockProvider>
      <QueryProvider>
        <AuthEventsProvider>{children}</AuthEventsProvider>
      </QueryProvider>
    </MockProvider>
  );
}
