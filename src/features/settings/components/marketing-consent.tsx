"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { MeResponse } from "@/lib/api/contracts/auth.schema";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { Checkbox, Toggle } from "@/shared/components/ui/select-field";
import { accountQueryKey, recordTermsAgreement } from "@/shared/consent/consent.api";
import { CONSENT_HISTORY_COPY } from "@/shared/consent/consent-copy";
import { LegalDocumentModal } from "@/shared/legal/legal-document-view";
import { findLegalDocumentByTermsCode } from "@/shared/legal/registry";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { updateNotificationChannels } from "../api/settings.api";
import { settingsKeys, useCurrentTerms } from "../hooks/settings-queries";
import { SETTINGS_COPY as COPY, describeSettingsError } from "../model/copy";

const MARKETING = "MARKETING";
const TOGGLE = CONSENT_HISTORY_COPY.marketingToggle;

export function MarketingConsent({ me, isReadOnly }: { me: MeResponse; isReadOnly: boolean }) {
  const queryClient = useQueryClient();
  const terms = useCurrentTerms();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [checkError, setCheckError] = useState<string>();
  const [isFullTextOpen, setIsFullTextOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const hasEmail = Boolean(me.email) && me.emailVerified;
  const isOn = me.notificationPreferences.channels.MARKETING;
  const document = findLegalDocumentByTermsCode(MARKETING);
  const currentVersion = terms.data?.items.find((item) => item.termsCode === MARKETING)?.version;
  const agreed = me.termsAgreements.find((item) => item.termsCode === MARKETING);
  const needsReconsent =
    agreed !== undefined &&
    agreed.agreed &&
    currentVersion !== undefined &&
    agreed.termsVersion !== currentVersion;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: accountQueryKey });
    await queryClient.invalidateQueries({ queryKey: settingsKeys.termsHistoryAll });
  }

  const offMutation = useMutation({
    mutationFn: () => updateNotificationChannels({ MARKETING: false }),
    onSuccess: async () => {
      setError(undefined);
      setIsConfirming(false);
      setMessage(TOGGLE.offDone(formatSeoulDateTime(new Date())));
      await refresh();
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeSettingsError(caught, "설정을 바꾸지 못했습니다. 다시 시도해 주세요."));
    },
  });

  const onMutation = useMutation({
    mutationFn: (version: string) =>
      recordTermsAgreement({ termsCode: MARKETING, version, agreed: true }),
    onSuccess: async () => {
      setError(undefined);
      setIsConfirming(false);
      setIsChecked(false);
      setMessage(TOGGLE.onDone(formatSeoulDateTime(new Date())));
      await refresh();
    },
    onError: async (caught) => {
      setMessage(undefined);
      setError(describeSettingsError(caught, "동의를 기록하지 못했습니다. 다시 시도해 주세요."));
      await queryClient.invalidateQueries({ queryKey: settingsKeys.currentTerms });
    },
  });

  function handleToggle(next: boolean) {
    setMessage(undefined);
    setError(undefined);
    if (next) {
      setIsConfirming(true);
      return;
    }
    offMutation.mutate();
  }

  function agree() {
    if (!isChecked) {
      setCheckError(COPY.marketingNeedsAgreement);
      return;
    }
    setCheckError(undefined);
    if (currentVersion === undefined) {
      setError("현재 약관 정보를 불러오지 못했습니다. 잠시 뒤에 다시 시도해 주세요.");
      return;
    }
    onMutation.mutate(currentVersion);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-body text-ink">{TOGGLE.label}</span>
        <Toggle
          label={TOGGLE.label}
          checked={isOn}
          disabled={isReadOnly || !hasEmail || offMutation.isPending || onMutation.isPending}
          onCheckedChange={handleToggle}
        />
      </div>
      {!hasEmail ? <p className="text-caption text-ink-2">{TOGGLE.noEmail}</p> : null}
      {needsReconsent && !isConfirming ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-control bg-tag-amber px-4 py-3 text-tag-amber-ink"
        >
          <p className="text-caption">{CONSENT_HISTORY_COPY.reconsentBanner}</p>
          <div>
            <Button variant="outlined" size="sm" onClick={() => setIsConfirming(true)}>
              {COPY.reconsentButton}
            </Button>
          </div>
        </div>
      ) : null}
      {isConfirming ? (
        <section
          aria-label="공지·혜택 안내 수신 동의"
          className="flex flex-col gap-3 rounded-control border border-line px-4 py-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              label={TOGGLE.confirmBeforeOn}
              checked={isChecked}
              onCheckedChange={(checked) => {
                setIsChecked(checked);
                setCheckError(undefined);
              }}
            />
            {document ? (
              <button
                type="button"
                onClick={() => setIsFullTextOpen(true)}
                className="text-caption font-semibold text-primary underline hover:text-primary-hover active:text-primary-pressed"
              >
                {COPY.marketingFullText}
              </button>
            ) : null}
          </div>
          {checkError ? (
            <p role="alert" className="text-caption text-danger">
              {checkError}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button size="sm" isLoading={onMutation.isPending} onClick={agree}>
              {COPY.marketingEnableConfirm}
            </Button>
            <Button
              size="sm"
              variant="cancel"
              onClick={() => {
                setIsConfirming(false);
                setIsChecked(false);
                setCheckError(undefined);
              }}
            >
              취소
            </Button>
          </div>
        </section>
      ) : null}
      {document ? (
        <LegalDocumentModal
          document={document}
          isOpen={isFullTextOpen}
          onClose={() => setIsFullTextOpen(false)}
        />
      ) : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {message ? (
        <p role="status" className="text-caption font-semibold text-primary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
