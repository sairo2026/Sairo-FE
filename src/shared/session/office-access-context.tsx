"use client";

import { createContext, useContext } from "react";
import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";

export type OfficeRole = "OWNER" | "AGENT" | "DEPUTY";

export type OfficeAccess = {
  context: AuthContextResponse;
  role: OfficeRole | null;
  /** 미납 기간이 길어져 읽기만 가능한 상태. 저장·제출 버튼을 숨기거나 비활성으로 둔다. */
  isReadOnly: boolean;
};

const OfficeAccessContext = createContext<OfficeAccess | null>(null);

export const OfficeAccessProvider = OfficeAccessContext.Provider;

export function useOfficeAccess(): OfficeAccess {
  const value = useContext(OfficeAccessContext);
  if (value === null) {
    throw new Error("useOfficeAccess는 OfficeAccessGate 안에서만 쓸 수 있습니다.");
  }
  return value;
}
