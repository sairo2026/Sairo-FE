"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { formatSeoulDateTime } from "@/shared/lib/format";

export type IssuedLink = { publicUrl: string; expiresAt: string };

export function IssuedLinkDialog({
  title,
  link,
  notice,
  onClose,
}: {
  title: string;
  link: IssuedLink | null;
  notice: string;
  onClose: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.publicUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <Modal
      isOpen={link !== null}
      title={title}
      onClose={onClose}
      footer={
        <Button variant="cancel" onClick={onClose}>
          닫기
        </Button>
      }
    >
      {link ? (
        <div className="flex flex-col gap-3">
          <p className="text-caption text-ink-2">{notice}</p>
          <input
            readOnly
            aria-label="발급된 링크"
            value={link.publicUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="h-12 rounded-control border border-line bg-surface px-4 text-body text-ink"
          />
          <p className="text-caption text-ink-2">만료 {formatSeoulDateTime(link.expiresAt)}</p>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => void copy()}>
              링크 복사
            </Button>
            {copyState === "copied" ? (
              <span role="status" className="text-caption text-ink-2">
                복사했습니다.
              </span>
            ) : null}
            {copyState === "failed" ? (
              <span role="alert" className="text-caption text-danger">
                복사하지 못했습니다. 링크를 직접 선택해 복사해 주세요.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
