"use client";

import { useState } from "react";
import { useFocusTrapDialog } from "@/shared/hooks/use-focus-trap-dialog";

type BuyerLinkCreatedDialogProps = {
  customerLinkUrl: string;
  onClose: () => void;
};

export function BuyerLinkCreatedDialog({ customerLinkUrl, onClose }: BuyerLinkCreatedDialogProps) {
  const [isCopied, setIsCopied] = useState(false);

  function confirmLeaveIfNotCopied(): boolean {
    if (isCopied) return true;
    return window.confirm(
      "링크를 아직 복사하지 않았습니다. 이 링크는 이 화면에서 한 번만 표시됩니다. 그래도 나가시겠습니까?",
    );
  }

  function handleClose() {
    if (confirmLeaveIfNotCopied()) onClose();
  }

  const dialogRef = useFocusTrapDialog(true, handleClose);

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
      aria-labelledby="buyer-link-created-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 outline-none"
    >
      <div className="w-full max-w-[720px] rounded-3xl bg-white px-10 py-12 text-center shadow-xl">
        <h2 id="buyer-link-created-title" className="mb-2 text-2xl font-bold">
          구매희망자용 링크가 생성되었습니다.
        </h2>
        <p className="mb-8 text-slate-500">
          링크를 복사해 구매희망자에게 전송하면 조율이 시작됩니다.
        </p>
        <div className="mb-10 flex items-center gap-3 rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-5 py-4 text-left">
          <span className="min-w-0 flex-1 truncate text-sm">{customerLinkUrl}</span>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="shrink-0 rounded-lg bg-[#3937b8] px-5 py-2 text-sm font-semibold text-white"
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
          onClick={handleClose}
          className="rounded-lg bg-[#3937b8] px-10 py-4 font-semibold text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}
