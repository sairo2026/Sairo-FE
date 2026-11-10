"use client";

import type { PrivacyRequestResponse } from "@/lib/api/contracts/support.schema";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList, TextLink } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { PRIVACY_RIGHTS_COPY } from "@/shared/legal/data-rights-copy";
import { PrivacyRightsNotice } from "@/shared/legal/data-rights-notices";
import { useLegalCompanyInfo } from "@/shared/legal/use-legal-values";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { usePrivacyRequest } from "../hooks/support-queries";
import { IDENTITY_STATUS, privacyTypeLabel } from "../model/labels";
import { PRIVACY_COPY as COPY } from "../model/messages";
import { PrivacyStatusBadge } from "./privacy-requests-screen";

function handlerText(detail: PrivacyRequestResponse): string {
  if (detail.handlerType === "SAIRO") return COPY.handlerSairo;
  return detail.responsibleOfficeName
    ? COPY.handlerOffice(detail.responsibleOfficeName)
    : COPY.handlerOfficeNoName;
}

function Body({ detail, justReceived }: { detail: PrivacyRequestResponse; justReceived: boolean }) {
  const company = useLegalCompanyInfo();
  const contact = company.data?.privacyContact ?? COPY.noContact;
  const typeLabel = privacyTypeLabel(detail.requestType);
  const identity = IDENTITY_STATUS[detail.identityStatus];
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <PageHeader
        title={`${typeLabel} 요청`}
        actions={
          <>
            <PrivacyStatusBadge status={detail.status} />
            <TextLink href="/privacy-requests">권리 요청</TextLink>
          </>
        }
      />
      {justReceived ? <FormNotice>{COPY.received}</FormNotice> : null}
      <Card title={COPY.detailTitle}>
        <div className="flex flex-col gap-5">
          <DetailList
            items={[
              { label: COPY.receivedAt, value: formatSeoulDateTime(detail.receivedAt) },
              { label: COPY.legalDue, value: formatSeoulDateTime(detail.legalDueAt) },
              { label: COPY.internalDue, value: formatSeoulDateTime(detail.internalDueAt) },
              {
                label: COPY.completedAt,
                value: detail.completedAt ? formatSeoulDateTime(detail.completedAt) : "-",
              },
              { label: COPY.identity, value: identity?.label ?? detail.identityStatus },
              { label: COPY.handler, value: handlerText(detail) },
            ]}
          />
          {detail.status === "WAITING_FOR_INFO" ? (
            <FormNotice>
              {detail.decisionReason
                ? PRIVACY_RIGHTS_COPY.identity(detail.decisionReason)
                : COPY.waitingGeneric}
            </FormNotice>
          ) : null}
          {detail.status === "REJECTED" && detail.decisionReason ? (
            <FormNotice>
              {PRIVACY_RIGHTS_COPY.rejection(typeLabel, detail.decisionReason, contact)}
            </FormNotice>
          ) : null}
          {detail.status === "PARTIALLY_RESTRICTED" && detail.decisionReason ? (
            <FormNotice>
              {COPY.partialTitle} {COPY.decisionReason}: {detail.decisionReason}
            </FormNotice>
          ) : null}
          {detail.status !== "REJECTED" &&
          detail.status !== "WAITING_FOR_INFO" &&
          detail.status !== "PARTIALLY_RESTRICTED" &&
          detail.decisionReason ? (
            <p className="text-caption text-ink">
              {COPY.decisionReason}: {detail.decisionReason}
            </p>
          ) : null}
        </div>
      </Card>
      <PrivacyRightsNotice />
    </main>
  );
}

export function PrivacyRequestDetailScreen({
  requestId,
  justReceived = false,
}: {
  requestId: number;
  justReceived?: boolean;
}) {
  const query = usePrivacyRequest(requestId);
  return (
    <QueryGate query={query} loadingLabel="요청 처리 상태를 불러오는 중입니다.">
      {(detail) => <Body detail={detail} justReceived={justReceived} />}
    </QueryGate>
  );
}
