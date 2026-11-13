"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type ErrorAudience = "office" | "ops" | "guest";

const ErrorAudienceContext = createContext<ErrorAudience>("office");

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
  return useContext(ErrorAudienceContext);
}
