"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export type ErrorAudience = "office" | "ops" | "guest";

const ErrorAudienceContext = createContext<ErrorAudience | null>(null);

export function audienceForPath(pathname: string | null): ErrorAudience {
  if (pathname === "/ops" || pathname?.startsWith("/ops/")) return "ops";
  if (pathname?.startsWith("/approver/") || pathname?.startsWith("/visit-responses/")) {
    return "guest";
  }
  return "office";
}

export function ErrorAudienceProvider({
  audience,
  children,
}: {
  audience: ErrorAudience;
  children: ReactNode;
}) {
  return <ErrorAudienceContext.Provider value={audience}>{children}</ErrorAudienceContext.Provider>;
}

export function useErrorAudience(): ErrorAudience {
  const explicitAudience = useContext(ErrorAudienceContext);
  const pathname = usePathname();
  return explicitAudience ?? audienceForPath(pathname);
}
