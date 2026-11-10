"use client";

import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";

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
      title="약관이 바뀌었습니다"
      onClose={onConfirm}
      footer={<Button onClick={onConfirm}>바뀐 약관 확인</Button>}
    >
      <div className="flex flex-col gap-4">
        <p className="text-body font-semibold text-ink">아직 가입되지 않았습니다.</p>
        <p className="text-body text-ink-2">
          가입하는 동안 약관이 바뀌었습니다. 이름과 인증 정보는 그대로 두었고, 바뀐 항목은 체크가
          비워져 있으니 내용을 확인한 뒤 다시 동의해 주세요.
        </p>
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
