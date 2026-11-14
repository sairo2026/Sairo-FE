"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { hasAnyRole } from "./roles";
import type { OpsRole } from "./roles";

export type OpsSession = { operatorId: number; name: string; roles: OpsRole[] };

const OpsSessionContext = createContext<OpsSession | null>(null);

export function OpsSessionProvider({
  value,
  children,
}: {
  value: OpsSession;
  children: ReactNode;
}) {
  return <OpsSessionContext.Provider value={value}>{children}</OpsSessionContext.Provider>;
}

export function useOpsSession(): OpsSession {
  const value = useContext(OpsSessionContext);
  if (value === null) {
    throw new Error("useOpsSession은 OpsAccessGate 안에서만 쓸 수 있습니다.");
  }
  return value;
}

/** 현재 운영자가 required 중 하나라도 가졌는지 본다. */
export function useHasOpsRole(required: readonly OpsRole[]): boolean {
  return hasAnyRole(useOpsSession().roles, required);
}
