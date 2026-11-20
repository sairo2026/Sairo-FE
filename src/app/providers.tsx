"use client";

import type { ReactNode } from "react";
import { AuthEventsProvider } from "@/features/auth/components/auth-events-provider";
import { QueryProvider } from "@/shared/api/query-provider";
import { ReloadOnPageRestore } from "@/shared/session/reload-on-page-restore";
import { MockProvider } from "./mock-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MockProvider>
      <QueryProvider>
        <AuthEventsProvider>
          <ReloadOnPageRestore />
          {children}
        </AuthEventsProvider>
      </QueryProvider>
    </MockProvider>
  );
}
