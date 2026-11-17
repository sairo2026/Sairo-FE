"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { fetchAuthContext } from "../api/auth-context.api";
import { landingPathFor } from "../model/landing";

/** 모의 API는 처음부터 로그인한 상태라 화면 점검이 막히지 않게 모의 환경에서는 쓰지 않는다. */
const IS_API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * 이미 로그인한 사람이 로그인·가입 화면을 열면(뒤로 가기, 즐겨찾기 등) 원래 가던 화면으로 보낸다.
 * 로그인하지 않았거나 확인에 실패하면 아무 일도 하지 않고 화면을 그대로 둔다.
 */
export function SignedInRedirect({ next }: { next?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (IS_API_MOCKING) return;
    let isActive = true;
    fetchAuthContext()
      .then((context) => {
        if (isActive) router.replace(next ?? landingPathFor(context));
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [router, next]);
  return null;
}
