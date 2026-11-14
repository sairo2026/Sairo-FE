"use client";

import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";

export function SessionExpiredDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Modal
      isOpen
      title="로그인 시간이 끝났습니다"
      onClose={onConfirm}
      footer={<Button onClick={onConfirm}>로그인하기</Button>}
    >
      보안을 위해 로그인이 해제되었습니다. 다시 로그인해 주세요. 작성 중이던 내용은 저장되지 않았을
      수 있습니다.
    </Modal>
  );
}
