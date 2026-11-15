"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** 스크롤 끝에서 이 값(px) 이내면 맨 아래에 닿은 것으로 본다. 소수 픽셀 반올림 오차를 흡수한다. */
const BOTTOM_TOLERANCE = 4;

/** 스크롤 영역 아래쪽에 아직 보이지 않는 내용이 있는지 알려 준다. 내용이 늘거나 줄어도 다시 계산한다. */
export function useMoreBelow<T extends HTMLElement>(ref: RefObject<T | null>): boolean {
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () =>
      setHasMore(
        element.scrollHeight - element.scrollTop - element.clientHeight > BOTTOM_TOLERANCE,
      );
    update();
    element.addEventListener("scroll", update, { passive: true });
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resizeObserver?.observe(element);
    const mutationObserver =
      typeof MutationObserver === "undefined" ? null : new MutationObserver(update);
    mutationObserver?.observe(element, { childList: true, subtree: true });
    return () => {
      element.removeEventListener("scroll", update);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [ref]);

  return hasMore;
}

/** 문서(window) 아래쪽에 아직 보이지 않는 내용이 있는지 알려 준다. */
export function useWindowMoreBelow(): boolean {
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const update = () =>
      setHasMore(root.scrollHeight - window.scrollY - window.innerHeight > BOTTOM_TOLERANCE);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resizeObserver?.observe(document.body);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver?.disconnect();
    };
  }, []);

  return hasMore;
}
