"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/** NEXT_PUBLIC_API_MOCKING=enabled일 때만 브라우저에서 모의 API를 켠다. 켜지 않으면 아무 일도 하지 않는다. */
export function MockProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(process.env.NEXT_PUBLIC_API_MOCKING !== "enabled");

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") return;
    let isActive = true;
    void import("@/mocks/browser")
      .then(({ worker }) => worker.start({ onUnhandledFrame: "bypass" }))
      .then(() => {
        if (isActive) setIsReady(true);
      });
    return () => {
      isActive = false;
    };
  }, []);

  return isReady ? children : null;
}
