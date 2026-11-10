"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { MeResponse } from "@/lib/api/contracts/auth.schema";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { StatusBadge } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { describeAuthError, isApiCode } from "@/shared/lib/api-messages";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { CONSENT_HISTORY_COPY } from "./consent-copy";
import { accountQueryKey, recordTermsAgreement } from "./consent.api";

type Agreement = MeResponse["termsAgreements"][number];

const REQUIRED_BLOCKED_ERROR = "TERMS_WITHDRAWAL_NOT_ALLOWED";

export function ConsentTable({
  agreements,
  isReadOnly = false,
}: {
  agreements: Agreement[];
  isReadOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: recordTermsAgreement,
    onSuccess: async () => {
      setError(undefined);
      setMessage(CONSENT_HISTORY_COPY.withdrawDone);
      await queryClient.invalidateQueries({ queryKey: accountQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["auth", "terms-history"] });
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(
        isApiCode(caught, REQUIRED_BLOCKED_ERROR)
          ? CONSENT_HISTORY_COPY.marketingToggle.requiredWithdrawBlocked
          : describeAuthError(caught, "동의를 철회하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."),
      );
    },
  });

  if (agreements.length === 0) {
    return <p className="text-caption text-ink-2">{CONSENT_HISTORY_COPY.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-control border border-line">
        <table className="w-full min-w-[34rem] border-collapse text-left text-caption">
          <caption className="sr-only">{CONSENT_HISTORY_COPY.currentCaption}</caption>
          <thead className="bg-surface">
            <tr>
              {CONSENT_HISTORY_COPY.currentColumns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-semibold text-ink">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agreements.map((item) => (
              <tr key={item.termsCode} className="border-t border-line align-top">
                <td className="px-3 py-2 text-ink">{item.termsName}</td>
                <td className="px-3 py-2 text-ink-2">
                  {item.required ? CONSENT_HISTORY_COPY.required : CONSENT_HISTORY_COPY.optional}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    tone={item.agreed ? "green" : "gray"}
                    label={
                      item.agreed ? CONSENT_HISTORY_COPY.agreed : CONSENT_HISTORY_COPY.notAgreed
                    }
                  />
                </td>
                <td className="px-3 py-2 text-ink-2">{formatSeoulDateTime(item.recordedAt)}</td>
                <td className="px-3 py-2 text-ink-2">
                  {item.required ? (
                    <span>{CONSENT_HISTORY_COPY.marketingToggle.requiredWithdrawBlocked}</span>
                  ) : item.agreed && item.withdrawable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isReadOnly}
                      isLoading={
                        mutation.isPending && mutation.variables?.termsCode === item.termsCode
                      }
                      onClick={() =>
                        mutation.mutate({
                          termsCode: item.termsCode,
                          version: item.termsVersion,
                          agreed: false,
                        })
                      }
                    >
                      {CONSENT_HISTORY_COPY.withdraw}
                    </Button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <FormAlert>{error}</FormAlert> : null}
      {message ? (
        <p role="status" className="text-caption font-semibold text-primary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
