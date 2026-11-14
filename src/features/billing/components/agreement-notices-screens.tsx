"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type {
  PriceChangeNoticeListResponse,
  StartCustomerAgreementResponse,
} from "@/lib/api/contracts/billing.schema";
import { ApiError } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import {
  DetailList,
  MutedNote,
  StatusBadge,
  TextLink,
} from "@/shared/components/feedback/page-parts";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { acknowledgeStartCustomerAgreement, declinePriceChangeNotice } from "../api/billing.api";
import { billingKeys, usePriceNotices, useStartAgreement } from "../hooks/billing-queries";
import { NOTICE_DECISION } from "../model/labels";
import { describeBillingError } from "../model/messages";

function AgreementView({ agreement }: { agreement: StartCustomerAgreementResponse }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>();
  const acknowledge = useMutation({
    mutationFn: acknowledgeStartCustomerAgreement,
    onSuccess: async () => {
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: billingKeys.agreement });
    },
    onError: (caught) =>
      setError(
        describeBillingError(caught, "확인을 기록하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."),
      ),
  });
  const { conditions } = agreement;
  return (
    <div className="flex flex-col gap-6">
      <Card title="합의 내용">
        <DetailList
          items={[
            { label: "무료 종료", value: formatSeoulDateTime(agreement.freeEndsAt) },
            { label: "시작 고객 가격 버전", value: agreement.priceVersion },
            {
              label: "가격 보장 기간",
              value: `${formatSeoulDateTime(agreement.priceStartsAt)} ~ ${formatSeoulDateTime(agreement.priceEndsAt)}`,
            },
            {
              label: "현재 인원 기준 월 금액",
              value: `${agreement.monthlyAmountPreview.memberCount}명 · ${formatKrw(agreement.monthlyAmountPreview.amountInclVat)} (VAT 포함)`,
            },
            { label: "합의서 문안 버전", value: agreement.agreementTextVersion },
            { label: "체결일", value: formatSeoulDate(agreement.contractedOn) },
          ]}
        />
      </Card>
      <Card title="협력 조건">
        <ul className="flex flex-col gap-2 text-body">
          <li>주간 사용 확인: {conditions.weeklyUseConfirmed ? "예" : "아니오"}</li>
          <li>
            월 1회 피드백 인터뷰 확인: {conditions.monthlyInterviewConfirmed ? "예" : "아니오"}
          </li>
          <li>
            사례 공개 선택 동의: {conditions.casePublicationConsent ? "동의" : "동의하지 않음"}
          </li>
        </ul>
      </Card>
      <Card title="확인">
        <MutedNote>확인은 선택이며 자격과 가격에 영향이 없습니다.</MutedNote>
        {agreement.ownerAcknowledgedAt ? (
          <p className="mt-3 text-body text-ink">
            {formatSeoulDateTime(agreement.ownerAcknowledgedAt)}에 확인했습니다.
          </p>
        ) : (
          <div className="mt-3">
            <Button isLoading={acknowledge.isPending} onClick={() => acknowledge.mutate()}>
              합의 내용 확인
            </Button>
          </div>
        )}
        {error ? <FormAlert>{error}</FormAlert> : null}
      </Card>
    </div>
  );
}

export function StartAgreementScreen() {
  const query = useStartAgreement();
  const isMissing = query.error instanceof ApiError && query.error.status === 404;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="시작 고객 합의"
        description="시작 고객 합의 내용을 확인합니다."
        actions={<TextLink href="/billing">구독 현황으로</TextLink>}
      />
      {isMissing ? (
        <EmptyState title="확인할 시작 고객 합의가 없습니다." />
      ) : (
        <QueryGate query={query} loadingLabel="합의 내용을 불러오는 중입니다.">
          {(agreement) => <AgreementView agreement={agreement} />}
        </QueryGate>
      )}
    </div>
  );
}

type Notice = PriceChangeNoticeListResponse["items"][number];

function NoticeCard({ notice }: { notice: Notice }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const decline = useMutation({
    mutationFn: () => declinePriceChangeNotice(notice.noticeId),
    onSuccess: async () => {
      setConfirming(false);
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
    onError: async (caught) => {
      setConfirming(false);
      setError(describeBillingError(caught, "거절하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."));
      await queryClient.invalidateQueries({ queryKey: billingKeys.noticesAll });
    },
  });
  const isIncrease = notice.changeKind === "INCREASE";
  const canRespond = isIncrease && notice.consentRequired && notice.decision === "PENDING";
  return (
    <Card title={isIncrease ? "가격 인상 안내" : "가격 인하·동일 안내"}>
      <div className="mb-3 flex items-center gap-2">
        <StatusBadge
          tone={notice.decision === "PENDING" ? "amber" : "gray"}
          label={NOTICE_DECISION[notice.decision] ?? notice.decision}
        />
      </div>
      <DetailList
        items={[
          { label: "가격 버전", value: `${notice.fromPriceVersion} → ${notice.toPriceVersion}` },
          {
            label: "현재 금액",
            value: `${notice.memberCount}명 · ${formatKrw(notice.currentAmountInclVat)}`,
          },
          { label: "새 금액", value: `${formatKrw(notice.newAmountInclVat)} (VAT 포함)` },
          { label: "안내 시각", value: formatSeoulDateTime(notice.notifiedAt) },
          { label: "효력 시각", value: formatSeoulDateTime(notice.effectiveAt) },
          { label: "새 가격 첫 적용", value: formatSeoulDateTime(notice.appliesFromPeriodStart) },
          { label: "응답 기한", value: formatSeoulDateTime(notice.responseDueAt) },
        ]}
      />
      {isIncrease ? (
        <p className="mt-3 text-caption text-ink-2">
          응답 기한까지 동의하지 않으면 결제되지 않고 구독이 종료됩니다. 종료 뒤 자료 반환 30일이
          있습니다.
        </p>
      ) : (
        <p className="mt-3 text-caption text-ink-2">따로 하실 일은 없습니다.</p>
      )}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {canRespond ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/billing/consent?noticeId=${notice.noticeId}`}
            className="inline-flex h-12 items-center rounded-control bg-primary px-8 font-bold text-white hover:bg-primary-hover"
          >
            새 금액 확인하고 동의
          </Link>
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            거절
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        isOpen={confirming}
        title="가격 인상 거절"
        message="거절하면 응답 기한이 지난 뒤 결제되지 않고 구독이 종료됩니다. 종료 뒤 자료 반환 30일이 있습니다. 거절할까요?"
        confirmLabel="거절"
        isPending={decline.isPending}
        onConfirm={() => decline.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}

export function PriceNoticesScreen() {
  const query = usePriceNotices({ page: 0, size: 50 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="가격 변경 안내"
        description="사무소에 적용될 가격 변경 안내를 확인하고 응답합니다."
        actions={<TextLink href="/billing">구독 현황으로</TextLink>}
      />
      {query.isPending ? (
        <PageSkeleton label="가격 변경 안내를 불러오는 중입니다." />
      ) : query.isError ? (
        <ErrorScreen
          kind={toErrorScreenKind(query.error)}
          retryAfterSeconds={
            query.error instanceof ApiError ? query.error.retryAfterSeconds : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="처리할 가격 변경 안내가 없습니다." />
      ) : (
        <>
          {query.data.items.map((notice) => (
            <NoticeCard key={notice.noticeId} notice={notice} />
          ))}
          <FormNotice>가격 변경 안내는 대표에게만 보입니다.</FormNotice>
        </>
      )}
    </div>
  );
}
