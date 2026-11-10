"use client";

import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { APPROVER_ACCOUNT_NOTICE, COAPPROVER_NOTICE } from "../model/legal-copy";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Tabs } from "@/shared/components/ui/tabs";
import { normalizeLinkToken } from "@/shared/lib/link-token";
import {
  approverBase,
  previewApproverConditions,
  saveApproverConditions,
} from "../api/approver.api";
import {
  useApproverConditions,
  useApproverConfirmed,
  useApproverRequests,
} from "../hooks/approver-queries";
import { isApiCode } from "../model/messages";
import { ApproverConfirmed } from "./approver-confirmed";
import { ApproverRequestList } from "./approver-requests";
import { ConditionEditor } from "./condition-editor";
import { ApproverLinkPrivacyNotice, LinkCommonNotices } from "./link-legal-notices";

function LinkProblem({ error }: { error: unknown }) {
  const expired = isApiCode(error, "PUBLIC_LINK_EXPIRED");
  return (
    <ErrorScreen
      kind="not-found"
      title="링크를 열 수 없습니다"
      description={
        expired
          ? "링크가 만료되었습니다. 방문을 조율하는 사무소에 새 링크를 요청해 주세요."
          : "링크가 잘못되었거나 만료되었습니다. 받은 링크를 다시 확인해 주세요."
      }
    />
  );
}

function isLinkError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "PUBLIC_LINK_EXPIRED" ||
      error.code === "PUBLIC_LINK_NOT_FOUND" ||
      (error.status === 404 && error.code !== "RESOURCE_NOT_FOUND"))
  );
}

export function ApproverLinkScreen({ token }: { token: string | undefined }) {
  const normalized = normalizeLinkToken(token);
  const base = approverBase({ kind: "link", token: normalized ?? "" });
  const enabled = normalized !== null;
  const conditions = useApproverConditions(base, enabled);
  const requests = useApproverRequests(base, enabled);
  const confirmed = useApproverConfirmed(base, enabled);
  const [tab, setTab] = useState("conditions");

  if (!enabled) return <LinkProblem error={null} />;
  if (conditions.isPending || requests.isPending || confirmed.isPending) return <PageSkeleton />;

  const linkError = [conditions.error, requests.error, confirmed.error].find(isLinkError);
  if (linkError) return <LinkProblem error={linkError} />;

  const readOnly = isApiCode(requests.error, "APPROVER_READ_ONLY");
  const noConditionYet = isApiCode(conditions.error, "RESOURCE_NOT_FOUND");
  const noticeVersion =
    conditions.data?.privacyNotice.noticeVersion ?? requests.data?.privacyNotice.noticeVersion;

  const hardError = [
    noConditionYet ? null : conditions.error,
    readOnly ? null : requests.error,
    confirmed.error,
  ].find((error) => error !== null && error !== undefined);
  if (hardError) {
    const retry = () => {
      void conditions.refetch();
      void requests.refetch();
      void confirmed.refetch();
    };
    return (
      <ErrorScreen
        kind={toErrorScreenKind(hardError)}
        traceId={hardError instanceof ApiError ? hardError.traceId : undefined}
        retryAfterSeconds={hardError instanceof ApiError ? hardError.retryAfterSeconds : undefined}
        onRetry={retry}
      />
    );
  }

  const retentionDays =
    conditions.data?.privacyNotice.retentionDays ?? requests.data?.privacyNotice.retentionDays;

  const conditionPanel =
    readOnly && !conditions.data ? (
      <FormNotice>대표 승인자가 아직 조건을 등록하지 않았습니다.</FormNotice>
    ) : noticeVersion === undefined ? (
      <FormNotice>개인정보 안내를 불러오지 못했습니다. 화면을 새로 고쳐 주세요.</FormNotice>
    ) : (
      <ConditionEditor
        initial={conditions.data ?? null}
        noticeVersion={noticeVersion}
        readOnly={readOnly}
        submitLabel="조건 저장"
        save={(request) => saveApproverConditions(base, request)}
        preview={(request) => previewApproverConditions(base, request)}
        onSaved={() => {
          void conditions.refetch();
        }}
      />
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="방문 조건과 신청"
        description="출입 가능한 시간 조건을 등록하고 들어온 방문 신청을 비교해 선택합니다."
      />
      <FormNotice>{APPROVER_ACCOUNT_NOTICE}</FormNotice>
      <Card>
        <Tabs
          label="승인자 링크 화면"
          activeKey={tab}
          onActiveKeyChange={setTab}
          items={[
            { key: "conditions", label: "조건 등록", panel: conditionPanel },
            {
              key: "requests",
              label: "신청 비교·선택",
              panel:
                requests.data && noticeVersion ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-caption text-ink-2">
                      {requests.data.propertyAddress} · 대표 승인자 출입승인
                      {requests.data.grantedOfficeNames.length > 0
                        ? ` · 이 매물을 허용한 사무소: ${requests.data.grantedOfficeNames.join(", ")}`
                        : ""}
                    </p>
                    <ApproverRequestList
                      base={base}
                      data={requests.data}
                      kind="NEW"
                      readOnly={false}
                      noticeVersion={noticeVersion}
                    />
                  </div>
                ) : (
                  <FormNotice>{COAPPROVER_NOTICE}</FormNotice>
                ),
            },
            {
              key: "confirmed",
              label: "확정 일정",
              panel: confirmed.data ? (
                <ApproverConfirmed
                  base={base}
                  data={confirmed.data}
                  changeData={requests.data ?? null}
                  readOnly={readOnly}
                  noticeVersion={noticeVersion ?? null}
                />
              ) : null,
            },
          ]}
        />
      </Card>
      <ApproverLinkPrivacyNotice
        officeName={confirmed.data?.officeName}
        officeContactPhone={confirmed.data?.officeContactPhone}
        retentionDays={retentionDays}
      />
      <LinkCommonNotices
        audience="approver"
        officeName={confirmed.data?.officeName}
        officeContactPhone={confirmed.data?.officeContactPhone}
        retentionDays={retentionDays}
      />
    </div>
  );
}
