"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { archiveProperty } from "../api/property.api";
import { propertyKeys } from "../hooks/property-queries";
import { describePropertyError } from "../model/messages";

export type ArchiveTarget = {
  propertyId: number;
  name: string;
  registrationStage: string;
};

export type ArchiveOutcome =
  { target: ArchiveTarget; ok: true } | { target: ArchiveTarget; ok: false; reason: string };

/** 임시저장 매물은 참조가 없으면 완전히 삭제되고, 그 밖의 매물은 보관된다. */
export function archiveCompletionTitle(targets: readonly ArchiveTarget[]): string {
  if (targets.length === 0) return "처리할 수 있는 매물이 없습니다.";
  const draftCount = targets.filter((item) => item.registrationStage === "DRAFT").length;
  if (draftCount === targets.length) return "매물 삭제가 완료되었습니다.";
  if (draftCount === 0) return "매물 보관이 완료되었습니다.";
  return "매물 보관·삭제가 완료되었습니다.";
}

/** 보관 또는 삭제를 마친 뒤 보여 주는 안내. 확인을 누르면 다음 화면으로 넘어간다. */
export function ArchiveCompletedModal({
  title,
  children,
  onConfirm,
}: {
  title: string;
  children?: ReactNode;
  onConfirm: () => void;
}) {
  return (
    <Modal
      size="notice"
      isOpen
      title={title}
      onClose={onConfirm}
      footer={<Button onClick={onConfirm}>확인</Button>}
    >
      {children}
    </Modal>
  );
}

/** 여러 매물을 차례로 보관한다. 보관할 수 없는 매물은 건마다 이유를 모아 알려 준다. */
export function BulkArchiveDialog({
  targets,
  onClose,
  onFinished,
}: {
  targets: ArchiveTarget[];
  onClose: () => void;
  /** 결과 안내의 확인을 누를 때 보관에 성공한 매물 번호를 넘긴다. */
  onFinished: (archivedIds: number[]) => void;
}) {
  const queryClient = useQueryClient();
  const [outcomes, setOutcomes] = useState<ArchiveOutcome[] | null>(null);
  const mutation = useMutation({
    mutationFn: async (): Promise<ArchiveOutcome[]> => {
      const results: ArchiveOutcome[] = [];
      for (const target of targets) {
        try {
          await archiveProperty(target.propertyId);
          results.push({ target, ok: true });
        } catch (caught) {
          results.push({
            target,
            ok: false,
            reason: describePropertyError(caught, "보관하지 못했습니다. 다시 시도해 주세요."),
          });
        }
      }
      return results;
    },
    onSuccess: async (results) => {
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      setOutcomes(results);
    },
  });

  if (outcomes) {
    const done = outcomes.filter((item) => item.ok).map((item) => item.target);
    const failed = outcomes.filter(
      (item): item is Extract<ArchiveOutcome, { ok: false }> => !item.ok,
    );
    return (
      <ArchiveCompletedModal
        title={archiveCompletionTitle(done)}
        onConfirm={() => onFinished(done.map((item) => item.propertyId))}
      >
        {failed.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p>
              {done.length > 0 ? `${done.length}건을 처리했고 ` : ""}
              {failed.length}건은 처리하지 못했습니다.
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-5" aria-label="처리하지 못한 매물">
              {failed.map((item) => (
                <li key={item.target.propertyId}>
                  <span className="font-semibold text-ink">{item.target.name}</span>
                  <span className="block text-caption">{item.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ArchiveCompletedModal>
    );
  }

  const draftCount = targets.filter((item) => item.registrationStage === "DRAFT").length;
  return (
    <Modal
      size="notice"
      isOpen
      title={`선택한 매물 ${targets.length}건을 보관할까요?`}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button isLoading={mutation.isPending} onClick={() => mutation.mutate()}>
            보관
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>
          보관한 매물은 목록에서 숨겨지고 활성 신청 허용이 회수됩니다. 보관된 매물 보기에서 복원할
          수 있습니다.
        </p>
        {draftCount > 0 ? (
          <p>
            임시저장 매물 {draftCount}건은 참조가 없으면 보관하지 않고 완전히 삭제되며 되돌릴 수
            없습니다.
          </p>
        ) : null}
        <p className="text-caption">
          진행 중인 방문 조율이나 계약이 있는 매물은 보관되지 않고 결과에서 따로 알려 드립니다.
        </p>
      </div>
    </Modal>
  );
}
