"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

const loadMockWorker =
  process.env.NEXT_PUBLIC_API_MOCKING === "enabled" ? () => import("@/mocks/browser") : null;

/** NEXT_PUBLIC_API_MOCKING=enabled일 때만 브라우저에서 모의 API를 켠다. 켜지 않으면 아무 일도 하지 않는다. */
export function MockProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(loadMockWorker === null);

  useEffect(() => {
    if (loadMockWorker === null) return;
    let isActive = true;
    void loadMockWorker()
      .then(({ worker }) =>
        worker.start({
          onUnhandledRequest(request, print) {
            if (new URL(request.url).pathname.startsWith("/api/")) print.warning();
          },
        }),
      )
      .then(() => {
        if (isActive) setIsReady(true);
      });
    return () => {
      isActive = false;
    };
  }, []);

  return isReady ? children : null;
}
