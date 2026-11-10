"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList, TextLink } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Checkbox, RadioGroup } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { closeOffice } from "../api/settings.api";
import type { OfficeCloseResult } from "../api/settings.api";
import { useOfficeMemberships, useSubscriptionSummary } from "../hooks/settings-queries";
import { SETTINGS_COPY as COPY, describeSettingsError } from "../model/copy";

const SUBSCRIPTION_LABEL: Record<string, string> = {
  PRE_PAYMENT: "결제 전",
  TRIAL: "무료 이용 중",
  ACTIVE: "구독 중",
  PAST_DUE_GRACE: "미납 유예",
  PAST_DUE_RESTRICTED: "미납 제한",
  SUSPENDED: "인증 중단",
  ENDED: "종료",
};

function Summary() {
  const members = useOfficeMemberships();
  const subscription = useSubscriptionSummary();
  const approved = members.data?.items.filter((item) => item.status === "APPROVED").length;
  return (
    <DetailList
      items={[
        {
          label: COPY.closeMembers,
          value: members.isError
            ? "불러오지 못했습니다"
            : approved === undefined
              ? "불러오는 중"
              : `${approved}명`,
        },
        {
          label: COPY.closeSubscription,
          value: subscription.isError
            ? "불러오지 못했습니다"
            : subscription.data
              ? (SUBSCRIPTION_LABEL[subscription.data.status] ?? subscription.data.status)
              : "불러오는 중",
        },
      ]}
    />
  );
}

function Done({ result }: { result: OfficeCloseResult }) {
  return (
    <Card title={COPY.closeDoneTitle}>
      <div className="flex flex-col gap-4">
        <FormNotice>{COPY.closeDone(formatSeoulDateTime(result.returnExpiresAt))}</FormNotice>
        {result.archiveRequestStatus === "REQUESTED" ? (
          <p className="text-caption text-ink">{COPY.closeArchiveRequested}</p>
        ) : null}
        <p className="text-caption text-ink-2">{COPY.closeReturn}</p>
        <TextLink href="/billing/return-guide">{COPY.closeReturnLink}</TextLink>
      </div>
    </Card>
  );
}

export function OfficeCloseScreen() {
  const { role } = useOfficeAccess();
  const queryClient = useQueryClient();
  const [archiveChoice, setArchiveChoice] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<OfficeCloseResult>();

  const mutation = useMutation({
    mutationFn: closeOffice,
    onSuccess: async (closed) => {
      setError(undefined);
      setResult(closed);
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (caught) => setError(describeSettingsError(caught, "사무소를 종료하지 못했습니다.")),
  });

  if (role !== "OWNER") return <ErrorScreen kind="forbidden" />;
  if (result) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={COPY.closeTitle} />
        <Done result={result} />
      </div>
    );
  }

  function submit() {
    const next: Record<string, string> = {};
    if (archiveChoice !== "REQUEST" && archiveChoice !== "DECLINE") {
      next.archive = COPY.closeArchiveRequired;
    }
    if (!isConfirmed) next.confirm = COPY.closeConfirmRequired;
    setErrors(next);
    setError(undefined);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({ archiveChoice: archiveChoice === "REQUEST" ? "REQUEST" : "DECLINE" });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={COPY.closeTitle} description={COPY.closeDescription} />
      <Card title="종료하면 이렇게 됩니다">
        <div className="flex flex-col gap-4">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-ink">
            {COPY.closeEffects.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Summary />
          <p className="text-caption text-ink-2">{COPY.closeReturn}</p>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col gap-5">
          <RadioGroup
            legend={COPY.closeArchiveLegend}
            name="archive-choice"
            value={archiveChoice}
            options={[
              { value: "REQUEST", label: COPY.closeArchiveRequest },
              { value: "DECLINE", label: COPY.closeArchiveDecline },
            ]}
            onValueChange={(value) => {
              setArchiveChoice(value);
              setErrors((current) => ({ ...current, archive: "" }));
            }}
            error={errors.archive || undefined}
          />
          <p className="text-caption text-ink-2">{COPY.closeArchiveNote}</p>
          <div className="flex flex-col gap-1">
            <Checkbox
              label={COPY.closeConfirmLabel}
              checked={isConfirmed}
              onCheckedChange={(checked) => {
                setIsConfirmed(checked);
                setErrors((current) => ({ ...current, confirm: "" }));
              }}
            />
            {errors.confirm ? (
              <p role="alert" className="text-caption text-danger">
                {errors.confirm}
              </p>
            ) : null}
          </div>
          {error ? <FormAlert>{error}</FormAlert> : null}
          <div className="flex gap-3">
            <Button isLoading={mutation.isPending} onClick={submit}>
              {COPY.closeSubmit}
            </Button>
            <TextLink href="/account">취소</TextLink>
          </div>
        </div>
      </Card>
    </div>
  );
}
