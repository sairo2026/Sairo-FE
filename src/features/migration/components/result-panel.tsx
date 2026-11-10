"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { cancelImport, retryFailedImport } from "../api/migration.api";
import type { ImportBatchDetail } from "../api/wire";
import { migrationKeys } from "../hooks/migration-queries";
import { ENTITY_TYPE_LABEL, NOT_CANCELLED_REASONS } from "../model/labels";
import { IMPORT_COPY, describeMigrationError } from "../model/messages";

type Props = { batch: ImportBatchDetail; isLocked: boolean };

function Progress({ batch }: { batch: ImportBatchDetail }) {
  const counts = batch.counts;
  const total = counts?.total ?? 0;
  const done = counts ? counts.succeeded + counts.failed : 0;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label="이전 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-3 w-full overflow-hidden rounded-full bg-primary-soft"
      >
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-caption text-ink-2" role="status">
        {IMPORT_COPY.progress(done, total)} ({percent}%)
      </p>
    </div>
  );
}

export function ResultPanel({ batch, isLocked }: Props) {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [now] = useState(() => Date.now());
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: migrationKeys.batch(batch.batchId) });
    await queryClient.invalidateQueries({ queryKey: migrationKeys.batches });
  }

  const cancelMutation = useMutation({
    mutationFn: cancelImport,
    onSuccess: async () => {
      setIsCancelling(false);
      setError(undefined);
      await refresh();
    },
    onError: (caught) => {
      setIsCancelling(false);
      setError(describeMigrationError(caught, "이전을 취소하지 못했습니다."));
    },
  });

  const retryMutation = useMutation({
    mutationFn: retryFailedImport,
    onSuccess: async () => {
      setError(undefined);
      setMessage(IMPORT_COPY.retryDone);
      await refresh();
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeMigrationError(caught, "실패한 줄을 다시 처리하지 못했습니다."));
    },
  });

  const counts = batch.counts;
  const isExecuting = batch.status === "EXECUTING";
  const isCompleted = batch.status === "COMPLETED";
  const cancellableUntil = batch.cancellableUntil ?? null;
  const canCancel =
    isCompleted && cancellableUntil !== null && new Date(cancellableUntil).getTime() > now;

  return (
    <Card title="실행 결과">
      <div className="flex flex-col gap-5">
        {isExecuting ? <Progress batch={batch} /> : null}
        {counts ? (
          <DetailList
            items={[
              { label: "전체", value: `${counts.total}건` },
              { label: "성공", value: `${counts.succeeded}건` },
              { label: "실패", value: `${counts.failed}건` },
              { label: "미처리", value: `${counts.unprocessed}건` },
            ]}
          />
        ) : null}
        {batch.failureReason && !isExecuting ? (
          <FormNotice>{batch.failureReason}</FormNotice>
        ) : null}
        {batch.executedAt ? (
          <p className="text-caption text-ink-2">
            실행 시각 {formatSeoulDateTime(batch.executedAt)}
          </p>
        ) : null}
        {isCompleted ? (
          <p className="text-caption text-ink-2">
            {canCancel && cancellableUntil
              ? IMPORT_COPY.cancelWindow(formatSeoulDateTime(cancellableUntil))
              : IMPORT_COPY.cancelExpired}
          </p>
        ) : null}
        {batch.status === "CANCELLED" && batch.cancelSummary ? (
          <section aria-label="취소 결과" className="flex flex-col gap-3">
            <p className="text-body text-ink">
              {batch.cancelSummary.cancelledCount}건을 취소했습니다.
            </p>
            {batch.cancelSummary.notCancelled.length > 0 ? (
              <>
                <p className="text-caption text-ink-2">취소되지 않고 남은 항목</p>
                <ul className="flex flex-col gap-1 text-caption text-ink">
                  {batch.cancelSummary.notCancelled.map((item) => (
                    <li key={`${item.entityType}-${item.entityId}`}>
                      {ENTITY_TYPE_LABEL[item.entityType] ?? item.entityType} {item.entityId}:{" "}
                      {NOT_CANCELLED_REASONS[item.reason] ?? item.reason}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}
        {error ? <FormAlert>{error}</FormAlert> : null}
        {message ? (
          <p role="status" className="text-caption font-semibold text-primary">
            {message}
          </p>
        ) : null}
        {isCompleted ? (
          <div className="flex flex-wrap gap-3">
            {counts && counts.failed > 0 ? (
              <Button
                variant="outlined"
                disabled={isLocked}
                isLoading={retryMutation.isPending}
                onClick={() => retryMutation.mutate(batch.batchId)}
              >
                실패한 줄만 다시 처리
              </Button>
            ) : null}
            <Button
              variant="ghost"
              disabled={isLocked || !canCancel}
              onClick={() => setIsCancelling(true)}
            >
              이전 취소
            </Button>
          </div>
        ) : null}
        <ConfirmDialog
          isOpen={isCancelling}
          title="이전을 취소할까요?"
          message={IMPORT_COPY.cancelConfirm}
          confirmLabel="이전 취소"
          isPending={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate(batch.batchId)}
          onCancel={() => setIsCancelling(false)}
        />
      </div>
    </Card>
  );
}
