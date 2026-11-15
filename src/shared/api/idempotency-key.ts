import { useState } from "react";
import { createRequestId } from "./client";

export type IdempotencyKeyHolder = {
  /** 같은 본문이면 같은 키를, 본문이 바뀌었으면 새 키를 돌려준다. */
  keyFor: (body: unknown) => string;
  /** 등록이 성공했을 때 키를 버린다. 다음 등록은 새 키를 쓴다. */
  discard: () => void;
};

/**
 * 등록 요청 한 건의 재시도가 같은 Idempotency-Key를 쓰도록 키를 쥐고 있는다.
 * 서버는 같은 키에 다른 본문을 400으로 거절하므로 본문이 달라지면 새 키로 바꾼다.
 */
export function createIdempotencyKeyHolder(): IdempotencyKeyHolder {
  let current: { key: string; fingerprint: string } | null = null;
  return {
    keyFor(body) {
      const fingerprint = JSON.stringify(body);
      if (current === null || current.fingerprint !== fingerprint) {
        current = { key: createRequestId(), fingerprint };
      }
      return current.key;
    },
    discard() {
      current = null;
    },
  };
}

/** 폼이 열려 있는 동안 같은 홀더를 유지한다. 폼을 다시 열면 새 홀더가 된다. */
export function useIdempotencyKeyHolder(): IdempotencyKeyHolder {
  const [holder] = useState(createIdempotencyKeyHolder);
  return holder;
}
