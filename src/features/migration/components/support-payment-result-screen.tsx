"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { TextLink } from "@/shared/components/feedback/page-parts";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { confirmImportSupportPayment } from "../api/support-request.api";
import { supportRequestKeys } from "../hooks/support-queries";
import { describeMigrationError } from "../model/messages";
import { SUPPORT_REQUEST_COPY as COPY } from "../model/support-copy";

type Props = {
  requestId: number;
  paymentKey: string | null;
  orderId: string | null;
  amount: string | null;
  failCode: string | null;
};

export function SupportPaymentResultScreen({
  requestId,
  paymentKey,
  orderId,
  amount,
  failCode,
}: Props) {
  const { role } = useOfficeAccess();
  const queryClient = useQueryClient();
  const hasSent = useRef(false);
  const parsedAmount = Number(amount);
  const isComplete =
    failCode === null &&
    Boolean(paymentKey) &&
    Boolean(orderId) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0;

  const mutation = useMutation({
    mutationFn: confirmImportSupportPayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportRequestKeys.all }),
  });
  const { mutate } = mutation;

  useEffect(() => {
    if (!isComplete || hasSent.current || role !== "OWNER") return;
    hasSent.current = true;
    mutate({
      requestId,
      body: { paymentKey: paymentKey ?? "", orderId: orderId ?? "", amount: parsedAmount },
    });
  }, [isComplete, mutate, requestId, paymentKey, orderId, parsedAmount, role]);

  if (role !== "OWNER") return <ErrorScreen kind="forbidden" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={COPY.paymentResultTitle} />
      <Card>
        <div className="flex flex-col gap-4" aria-live="polite">
          {failCode !== null ? <FormAlert>{COPY.paymentCanceled}</FormAlert> : null}
          {failCode === null && !isComplete ? <FormAlert>{COPY.paymentMissing}</FormAlert> : null}
          {isComplete && (mutation.isPending || mutation.isIdle) ? (
            <PageSkeleton label={COPY.paymentConfirming} />
          ) : null}
          {mutation.isSuccess ? <FormNotice>{COPY.paymentDone}</FormNotice> : null}
          {mutation.isError ? (
            <FormAlert>{describeMigrationError(mutation.error, COPY.paymentFailedTitle)}</FormAlert>
          ) : null}
          <TextLink href={`/import/support/${requestId}`}>{COPY.backToRequest}</TextLink>
        </div>
      </Card>
    </div>
  );
}
