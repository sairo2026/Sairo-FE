"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { useFocusTrapDialog } from "@/shared/hooks/use-focus-trap-dialog";
import { cn } from "@/shared/lib/cn";
import { Button } from "./button";

export type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
};

/** 포커스를 가두고 ESC로 닫으며 닫을 때 열기 전 요소로 포커스를 돌려주는 대화상자. */
export function Modal({ isOpen, title, onClose, children, footer, size = "default" }: ModalProps) {
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const handleEscape = useCallback(() => closeRef.current(), []);
  const dialogRef = useFocusTrapDialog(isOpen, handleEscape);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "w-full rounded-card bg-white px-6 py-8 shadow-modal outline-none sm:px-10 sm:py-12",
          size === "wide" ? "flex max-h-[85vh] max-w-3xl flex-col" : "max-w-[640px]",
        )}
      >
        <h2 id={titleId} className="text-h1 font-bold text-ink">
          {title}
        </h2>
        <div
          className={cn(
            "mt-8 text-body text-ink-2",
            size === "wide" && "min-h-0 flex-1 overflow-y-auto",
          )}
        >
          {children}
        </div>
        {footer ? <div className="mt-8 flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="cancel" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="submit" isLoading={isPending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  );
}
