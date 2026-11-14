"use client";

import type { ReactNode } from "react";
import { OfficeAccessGate } from "./office-access-gate";

export function AccountScreenFrame({ children }: { children: ReactNode }) {
  return <OfficeAccessGate>{children}</OfficeAccessGate>;
}
