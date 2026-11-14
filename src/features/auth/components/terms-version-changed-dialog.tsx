"use client";

import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { TERMS_CHANGED_COPY } from "../model/legal-copy";

export type ChangedTerm = {
  termsCode: string;
  title: string;
  changeSummary: string | null;
  documentUrl: string | null;
};

export function TermsVersionChangedDialog({
  items,
  onConfirm,
}: {
  items: ChangedTerm[];
  onConfirm: () => void;
}) {
  return (
    <Modal
      isOpen
      title={TERMS_CHANGED_COPY.dialogTitle}
      onClose={onConfirm}
      footer={<Button onClick={onConfirm}>{TERMS_CHANGED_COPY.confirmLabel}</Button>}
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">{TERMS_CHANGED_COPY.body}</p>
        <p className="text-caption text-ink-2">{TERMS_CHANGED_COPY.keptNotice}</p>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.termsCode} className="rounded-control bg-surface p-4">
              <p className="flex items-center gap-2 text-body font-semibold text-ink">
                {item.title}
                <span className="rounded-small bg-tag-amber px-2 py-0.5 text-caption font-semibold text-tag-amber-ink">
                  바뀜
                </span>
              </p>
              {item.changeSummary ? (
                <p className="mt-1 text-caption text-ink-2">{item.changeSummary}</p>
              ) : null}
              {item.documentUrl ? (
                <a
                  href={item.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-caption font-semibold text-primary hover:underline"
                >
                  새 약관 보기
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
