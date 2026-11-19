"use client";

import { useEffect } from "react";

/**
 * 브라우저가 뒤로 가기로 이전 화면을 통째로 되살리면(back/forward cache) 로그아웃 전의 목록과 상세가 그대로 보일 수 있다.
 * 그렇게 되살아난 화면은 다시 불러와서 지금 로그인한 계정의 상태로 보여 준다.
 */
export function ReloadOnPageRestore() {
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
