"use client";

import { Button } from "@/shared/components/ui/button";

/** 서버가 재시작하는 동안 자동으로 다시 연결을 시도하고 있음을 알린다. 연결되면 이 화면은 저절로 사라진다. */
export function ReconnectingScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby="reconnecting-title"
      className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
    >
      <h1 id="reconnecting-title" className="text-h1 font-bold text-ink">
        서비스에 다시 연결하는 중입니다
      </h1>
      <p className="text-body text-ink-2">
        서비스가 다시 시작되고 있습니다. 잠시만 기다려 주세요. 연결되면 자동으로 이어서 보여
        드립니다.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button variant="submit" onClick={onRetry}>
          지금 다시 시도
        </Button>
      </div>
    </section>
  );
}
