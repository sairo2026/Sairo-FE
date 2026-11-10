"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WithdrawalPreviewResponse } from "@/lib/api/contracts/auth.schema";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Checkbox } from "@/shared/components/ui/select-field";
import { fetchWithdrawalPreview, withdrawAccount } from "../api/account.api";
import { WITHDRAWAL_COPY, describeRetentionPeriod } from "../model/withdrawal-copy";

const previewQueryKey = ["auth", "withdrawal-preview"] as const;

function isLastOwnerError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "LAST_OWNER";
}

function describeWithdrawalError(error: unknown): string {
  if (error instanceof ApiError && error.code === "STEP_UP_REQUIRED") {
    return WITHDRAWAL_COPY.errors.stepUp;
  }
  return WITHDRAWAL_COPY.errors.failed;
}

function RetainedItemsTable({ items }: { items: WithdrawalPreviewResponse["retainedItems"] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={WITHDRAWAL_COPY.retainedTitle} className="flex flex-col gap-3">
      <h2 className="text-h2 font-semibold text-ink">{WITHDRAWAL_COPY.retainedTitle}</h2>
      <p className="text-caption text-ink-2">{WITHDRAWAL_COPY.retainedIntro}</p>
      <div className="overflow-x-auto rounded-control border border-line">
        <table className="w-full min-w-[34rem] border-collapse text-left text-caption">
          <thead className="bg-surface">
            <tr>
              {WITHDRAWAL_COPY.retainedColumns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-semibold text-ink">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.itemCode} className="border-t border-line align-top">
                <td className="px-3 py-2 text-ink">{item.itemName}</td>
                <td className="px-3 py-2 text-ink-2">{item.reason}</td>
                <td className="px-3 py-2 text-ink-2">{item.reviewTargetLaws.join(", ")}</td>
                <td className="px-3 py-2 text-ink-2">
                  {describeRetentionPeriod(item.retentionDays, item.anchorEvent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-ink-2">{WITHDRAWAL_COPY.retainedFooter}</p>
    </section>
  );
}

function LastOwnerRestriction() {
  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-control bg-tag-amber px-4 py-4 text-tag-amber-ink"
    >
      <p className="text-body">{WITHDRAWAL_COPY.lastOwner.body}</p>
      <div className="flex flex-wrap gap-4 text-body font-semibold">
        <Link href="/members/owner-transfer" className="underline">
          {WITHDRAWAL_COPY.lastOwner.transfer}
        </Link>
        <Link href="/office/close" className="underline">
          {WITHDRAWAL_COPY.lastOwner.close}
        </Link>
      </div>
    </section>
  );
}

function WithdrawalView({ preview }: { preview: WithdrawalPreviewResponse }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [isBlockedByOwner, setIsBlockedByOwner] = useState(false);

  const mutation = useMutation({
    mutationFn: withdrawAccount,
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
    },
    onError: (caught) => {
      if (isLastOwnerError(caught)) {
        setIsBlockedByOwner(true);
        return;
      }
      setError(describeWithdrawalError(caught));
    },
  });

  function submit() {
    if (!isConfirmed) {
      setError(WITHDRAWAL_COPY.errors.confirmRequired);
      return;
    }
    setError(undefined);
    mutation.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-col gap-3">
          {WITHDRAWAL_COPY.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-body text-ink">
              {paragraph}
            </p>
          ))}
          {preview.kakaoLinked ? (
            <p className="text-body text-ink">{WITHDRAWAL_COPY.kakao}</p>
          ) : null}
        </div>
      </Card>
      <Card>
        <RetainedItemsTable items={preview.retainedItems} />
      </Card>
      {preview.isLastOwner || isBlockedByOwner ? (
        <LastOwnerRestriction />
      ) : (
        <Card>
          <div className="flex flex-col gap-4">
            <Checkbox
              checked={isConfirmed}
              onCheckedChange={(checked) => {
                setIsConfirmed(checked);
                setError(undefined);
              }}
              label={WITHDRAWAL_COPY.confirmLabel}
            />
            {error ? <FormAlert>{error}</FormAlert> : null}
            <div className="flex gap-3">
              <Button isLoading={mutation.isPending} onClick={submit}>
                {WITHDRAWAL_COPY.submit}
              </Button>
              <Button variant="cancel" onClick={() => router.back()}>
                {WITHDRAWAL_COPY.cancel}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function WithdrawalScreen() {
  const query = useQuery({ queryKey: previewQueryKey, queryFn: fetchWithdrawalPreview });
  if (query.isPending) return <PageSkeleton label="탈퇴 안내를 불러오는 중입니다." />;
  if (query.isError) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-10">
      <PageHeader title={WITHDRAWAL_COPY.title} />
      <WithdrawalView preview={query.data} />
    </main>
  );
}
