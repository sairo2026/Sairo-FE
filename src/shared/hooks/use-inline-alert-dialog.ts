"use client";

import { useEffect, useRef } from "react";

/** ESC는 캡처 단계에서 받아 바깥 Modal의 ESC 처리보다 먼저 닫는다. */
export function useInlineAlertDialog(isOpen: boolean, onDismiss: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const dialog = dialogRef.current;
      if (!dialog || !(event.target instanceof Node) || !dialog.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      dismissRef.current();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      trigger?.focus();
    };
  }, [isOpen]);

  return dialogRef;
}
