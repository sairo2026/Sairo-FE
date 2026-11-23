"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const CspNonceContext = createContext<string | undefined>(undefined);

/** 서버가 요청마다 만든 nonce를 직접 만든 인라인 스크립트에 전달한다. */
export function CspNonceProvider({ nonce, children }: { nonce?: string; children: ReactNode }) {
  return <CspNonceContext.Provider value={nonce}>{children}</CspNonceContext.Provider>;
}

export function useCspNonce(): string | undefined {
  return useContext(CspNonceContext);
}
