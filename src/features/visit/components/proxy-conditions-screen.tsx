"use client";

import Link from "next/link";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { saveProxyConditions } from "../api/approver.api";
import type { ConditionHistory } from "../api/approver.api";
import { useAccessApprovals } from "../hooks/visit-queries";
import { approverKeys, useProxyConditionHistory } from "../hooks/approver-queries";
import { APPROVAL_SOURCE_LABEL, labelOf } from "../model/labels";
import { useQueryClient } from "@tanstack/react-query";
import { ConditionEditor } from "./condition-editor";

function History({ items }: { items: ConditionHistory["items"] }) {
  if (items.length === 0) {
    return <p className="text-caption text-ink-2">등록된 조건 이력이 없습니다.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.conditionId}
          className="flex flex-wrap items-center gap-2 rounded-control bg-surface px-4 py-3 text-caption text-ink-2"
        >
          <span className="font-semibold text-ink">{item.versionNo}번 버전</span>
          <Badge
            tone={item.status === "ACTIVE" ? "green" : "gray"}
            className="h-7 min-w-0 px-3 text-caption"
          >
            {item.status === "ACTIVE" ? "적용 중" : "대체됨"}
          </Badge>
          <span>{labelOf(APPROVAL_SOURCE_LABEL, item.source)}</span>
          <span>{formatSeoulDateTime(item.registeredAt)} 등록</span>
        </li>
      ))}
    </ul>
  );
}

export function ProxyConditionsScreen({
  propertyId,
  approvalId,
}: {
  propertyId: number;
  approvalId: number;
}) {
  const { role } = useOfficeAccess();
  const queryClient = useQueryClient();
  const history = useProxyConditionHistory(propertyId, approvalId);
  const approvals = useAccessApprovals(propertyId);

  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="승인자 조건 대리 입력"
        description="승인자에게 전화 등으로 받은 조건을 대신 입력합니다. 출처는 중개사 대리 입력으로 기록됩니다."
        actions={
          <Link
            href={`/properties/${propertyId}/access-approvals`}
            className="text-body font-semibold text-primary hover:underline"
          >
            출입승인으로 돌아가기
          </Link>
        }
      />
      <QueryGate query={history} loadingLabel="승인자 조건을 불러오는 중입니다.">
        {(data) => {
          const active = data.items.find((item) => item.status === "ACTIVE") ?? null;
          const approval = approvals.data?.items.find((item) => item.approvalId === approvalId);
          const isCoApprover = approval?.approvalRole === "CO_APPROVER";
          const directActive = active?.source === "DIRECT";
          return (
            <>
              <Card title="조건 이력">
                <History items={data.items} />
              </Card>
              <Card title="조건 입력">
                {directActive ? (
                  <div className="mb-4">
                    <FormNotice>
                      승인자 본인이 입력한 조건이 적용 중이라 대리 입력할 수 없습니다. 승인자가 본인
                      링크에서 바꾸면 새 버전으로 대체됩니다.
                    </FormNotice>
                  </div>
                ) : null}
                {isCoApprover ? (
                  <div className="mb-4">
                    <FormNotice>
                      공동 승인자 출입승인에는 조건을 만들 수 없습니다. 대표 승인자 출입승인에서
                      입력해 주세요.
                    </FormNotice>
                  </div>
                ) : null}
                <ConditionEditor
                  initial={active}
                  noticeVersion=""
                  readOnly={directActive || isCoApprover}
                  lockedMessage="지금은 이 출입승인에 조건을 대리 입력할 수 없습니다."
                  submitLabel="대리 입력으로 저장"
                  save={(request) => saveProxyConditions(propertyId, approvalId, request)}
                  onSaved={() => {
                    void queryClient.invalidateQueries({
                      queryKey: approverKeys.history(propertyId, approvalId),
                    });
                  }}
                />
              </Card>
            </>
          );
        }}
      </QueryGate>
    </div>
  );
}
