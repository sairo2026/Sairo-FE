"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { describeContentError } from "./content-error";

export function ActionDialog({
  isOpen,
  title,
  confirmLabel,
  children,
  isReady = true,
  size,
  describeError = (caught) => describeContentError(caught, "처리하지 못했습니다."),
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  confirmLabel?: string;
  children?: ReactNode;
  isReady?: boolean;
  size?: "default" | "wide";
  describeError?: (caught: unknown) => string;
  onConfirm?: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function close() {
    setErrorMessage(null);
    onClose();
  }

  async function confirm() {
    setIsPending(true);
    setErrorMessage(null);
    try {
      const result = await onConfirm?.();
      if (result !== false) onClose();
    } catch (caught) {
      setErrorMessage(describeError(caught));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      size={size}
      onClose={close}
      footer={
        <>
          <Button variant="cancel" onClick={close}>
            {confirmLabel ? "취소" : "닫기"}
          </Button>
          {confirmLabel ? (
            <Button
              variant="submit"
              disabled={!isReady || isPending}
              isLoading={isPending}
              onClick={() => void confirm()}
            >
              {confirmLabel}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        {errorMessage ? (
          <p role="alert" className="text-caption text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
