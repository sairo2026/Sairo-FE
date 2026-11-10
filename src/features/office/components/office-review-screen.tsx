"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { formatSeoulDateTime } from "@/shared/lib/format";
import type { OfficeRegistrationStatusResponse } from "@/lib/api/contracts/office.schema";
import { cancelRegistration, startReapplication } from "../api/office.api";
import { useLatestRegistration, useRefreshOfficeState } from "../hooks/office-queries";
import { REGISTRATION_STATUS_LABEL, REGISTRATION_STATUS_TONE } from "../model/labels";
import { describeOfficeError } from "../model/messages";
import {
  ButtonRow,
  DetailList,
  FlowFrame,
  MutedNote,
  StatusBadge,
  TextLink,
} from "@/shared/components/feedback/page-parts";

const REVIEW_TARGET_NOTE =
  "정상 접수 건은 접수 후 2영업일 이내 처리를 목표로 하며 법정 기한은 아닙니다.";
const REREVIEW_NOTE =
  "인증 완료 뒤에도 핵심 정보가 바뀌거나 허위 확인이 드러나면 재심사하거나 인증이 회수될 수 있습니다.";

const CANCELLABLE = ["DRAFT", "PENDING_REVIEW", "SUPPLEMENT_REQUESTED"];

function evidenceHref(registrationId: number) {
  return `/office/register/evidence?registrationId=${registrationId}`;
}

function StatusBody({ registration }: { registration: OfficeRegistrationStatusResponse }) {
  const router = useRouter();
  const refresh = useRefreshOfficeState();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const cancelMutation = useMutation({
    mutationFn: () => cancelRegistration(registration.registrationId),
    onSuccess: async () => {
      setConfirmingCancel(false);
      setNotice("신청을 철회했습니다.");
      await refresh();
    },
    onError: (caught) => {
      setConfirmingCancel(false);
      setError(describeOfficeError(caught, "신청을 철회하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  const reapplyMutation = useMutation({
    mutationFn: () => startReapplication(registration.registrationId),
    onSuccess: async () => {
      await refresh();
      router.push("/office/start");
    },
    onError: (caught) =>
      setError(describeOfficeError(caught, "재신청을 시작하지 못했습니다. 다시 시도해 주세요.")),
  });

  const status = registration.status;
  const details: Array<{ label: string; value: string }> = [];
  if (status === "SUPPLEMENT_REQUESTED") {
    if (registration.supplementReason) {
      details.push({ label: "보완 사유", value: registration.supplementReason });
    }
    if (registration.supplementDueAt) {
      details.push({
        label: "보완 기한",
        value: formatSeoulDateTime(registration.supplementDueAt),
      });
    }
  }
  if (status === "REJECTED" && registration.rejectionReason) {
    details.push({ label: "반려 사유", value: registration.rejectionReason });
  }
  if (status === "REVOKED") {
    if (registration.revocationReason) {
      details.push({ label: "회수 사유", value: registration.revocationReason });
    }
    if (registration.revokedAt) {
      details.push({ label: "회수 시각", value: formatSeoulDateTime(registration.revokedAt) });
    }
  }

  const headline: Record<typeof status, string> = {
    DRAFT: "신규 사무소 신청을 작성 중입니다.",
    PENDING_REVIEW: "신규 사무소 등록 심사 진행 중입니다.",
    SUPPLEMENT_REQUESTED: "서류 보완이 필요합니다.",
    APPROVED: "사무소 인증이 완료되었습니다.",
    REJECTED: "신규 사무소 등록이 반려되었습니다.",
    REVOKED: "사무소 인증이 회수되었습니다.",
    CANCELLED: "신청을 철회했습니다.",
  };

  const isRejectedOpen = status === "REJECTED" && registration.resolved !== true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge
          tone={REGISTRATION_STATUS_TONE[status]}
          label={REGISTRATION_STATUS_LABEL[status]}
        />
        <p className="text-body font-semibold text-ink">{headline[status]}</p>
      </div>

      {details.length > 0 ? <DetailList items={details} /> : null}

      {status === "DRAFT" ? (
        <MutedNote>증빙을 제출하면 심사가 시작됩니다. 이어서 증빙을 올려 주세요.</MutedNote>
      ) : null}
      {status === "SUPPLEMENT_REQUESTED" ? (
        <MutedNote>안내된 서류를 다시 올리면 심사가 이어집니다.</MutedNote>
      ) : null}
      {status === "REJECTED" ? (
        <MutedNote>재신청을 시작하면 처음부터 새로 신청할 수 있습니다.</MutedNote>
      ) : null}
      {status === "REVOKED" ? (
        <MutedNote>
          별도의 소명 경로는 없습니다. 새 사무소 인증을 신청해 다시 심사받아 주세요.
        </MutedNote>
      ) : null}
      {status === "PENDING_REVIEW" || status === "DRAFT" || status === "SUPPLEMENT_REQUESTED" ? (
        <MutedNote>{REVIEW_TARGET_NOTE}</MutedNote>
      ) : null}
      {status === "APPROVED" || status === "PENDING_REVIEW" ? (
        <MutedNote>{REREVIEW_NOTE}</MutedNote>
      ) : null}

      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}

      <ButtonRow>
        {status === "DRAFT" ? (
          <Button onClick={() => router.push(evidenceHref(registration.registrationId))}>
            증빙 업로드 이어가기
          </Button>
        ) : null}
        {status === "SUPPLEMENT_REQUESTED" ? (
          <Button onClick={() => router.push(evidenceHref(registration.registrationId))}>
            보완 서류 재제출
          </Button>
        ) : null}
        {isRejectedOpen ? (
          <Button isLoading={reapplyMutation.isPending} onClick={() => reapplyMutation.mutate()}>
            재신청 시작
          </Button>
        ) : null}
        {status === "REVOKED" || status === "CANCELLED" ? (
          <Button onClick={() => router.push("/office/start")}>새 신청 시작</Button>
        ) : null}
        {status === "APPROVED" ? <Button onClick={() => router.push("/")}>확인</Button> : null}
        {CANCELLABLE.includes(status) ? (
          <Button variant="cancel" onClick={() => setConfirmingCancel(true)}>
            신청 철회
          </Button>
        ) : null}
      </ButtonRow>

      <ConfirmDialog
        isOpen={confirmingCancel}
        title="신청을 철회할까요"
        message="철회하면 지금까지 올린 서류로는 심사를 이어갈 수 없고 새로 신청해야 합니다."
        confirmLabel="철회"
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  );
}

export function OfficeReviewScreen() {
  const query = useLatestRegistration();
  return (
    <FlowFrame title="사무소 인증 심사 상태">
      <QueryGate query={query} loadingLabel="심사 상태를 불러오는 중입니다.">
        {(registration) =>
          registration === null ? (
            <div className="flex flex-col gap-4">
              <p className="text-body text-ink-2">진행 중인 사무소 인증 신청이 없습니다.</p>
              <TextLink href="/office/start">사무소 생성/참여 선택으로 이동</TextLink>
            </div>
          ) : (
            <StatusBody registration={registration} />
          )
        }
      </QueryGate>
    </FlowFrame>
  );
}
