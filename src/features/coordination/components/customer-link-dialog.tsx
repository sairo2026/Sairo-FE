"use client";

import { useMemo, useState } from "react";
import { useFocusTrapDialog } from "@/shared/hooks/use-focus-trap-dialog";
import { formatRemainingLinkTime } from "../model/coordination";

type CustomerLinkDialogProps = {
  title: string;
  customerLinkUrl: string;
  linkExpiresAt: string;
  onClose: () => void;
};

export function CustomerLinkDialog({
  title,
  customerLinkUrl,
  linkExpiresAt,
  onClose,
}: CustomerLinkDialogProps) {
  const [isCopied, setIsCopied] = useState(false);
  const dialogRef = useFocusTrapDialog(true, onClose);
  const remainingLabel = useMemo(
    () => formatRemainingLinkTime(linkExpiresAt, new Date()),
    [linkExpiresAt],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(customerLinkUrl);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-link-dialog-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 outline-none"
    >
      <div className="w-full max-w-[720px] rounded-3xl bg-white px-10 py-12 text-center shadow-xl">
        <h2 id="customer-link-dialog-title" className="mb-2 text-2xl font-bold">
          {title}
        </h2>
        <p className="mb-8 text-slate-500">{remainingLabel}</p>
        <div className="mb-10 flex items-center gap-3 rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-5 py-4 text-left">
          <span className="min-w-0 flex-1 truncate text-sm">{customerLinkUrl}</span>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="shrink-0 rounded-lg bg-[#3937b8] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            복사
          </button>
        </div>
        {isCopied ? (
          <p role="status" className="mb-8 -mt-6 text-sm font-semibold text-[#3937b8]">
            복사가 완료됐습니다.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-[#3937b8] px-10 py-4 font-semibold text-white transition-opacity hover:opacity-90"
        >
          확인
        </button>
      </div>
    </div>
  );
}
