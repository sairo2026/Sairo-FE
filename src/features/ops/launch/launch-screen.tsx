"use client";

import Link from "next/link";
import { useState } from "react";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useCompanyInfo } from "../company-info/company-api";
import { MISSING_ITEM_LABELS } from "../company-info/company-model";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { FailureNotice, SuccessNotice } from "../content-common/notice-banner";
import { useIntegrations, useUpdateIntegration } from "../integrations/integrations-api";
import { CHECK_RESULT, CONSENT_STATUS, CONTRACT_STATUS } from "../integrations/integrations-model";
import type { Integration } from "../integrations/integrations-model";
import { describeSystemError, prerequisiteLabels } from "../system-common/system-form";
import { missingLaunchItems, summarizeLaunch } from "./launch-model";

function ReadinessCard({
  launchReady,
  missingItems,
}: {
  launchReady: boolean;
  missingItems: readonly string[];
}) {
  return (
    <Card title="회사 정보 준비 상태">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge tone={launchReady ? "green" : "red"}>
            {launchReady ? "출시 준비 완료" : "출시 활성화 차단"}
          </Badge>
        </div>
        {missingItems.length > 0 ? (
          <div>
            <p className="text-caption font-semibold text-ink-2">빠진 항목</p>
            <ul aria-label="회사 정보에서 빠진 항목" className="list-disc pl-5 text-body text-ink">
              {missingItems.map((item) => (
                <li key={item}>{MISSING_ITEM_LABELS[item] ?? item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-body text-ink-2">
          회사 정보 게시와 실제 문의 수신 시험은{" "}
          <Link href="/ops/company-info" className="text-primary underline">
            회사 정보
          </Link>
          에서 기록합니다.
        </p>
      </div>
    </Card>
  );
}

function ActivationCard({ companyMissingItems }: { companyMissingItems: readonly string[] }) {
  const paging = useOpsPaging();
  const query = useIntegrations({ page: paging.page, size: paging.size }, "PRODUCTION");
  const update = useUpdateIntegration();
  const [target, setTarget] = useState<Integration | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const summary = summarizeLaunch(query.data?.items ?? [], companyMissingItems);

  async function activate() {
    if (!target) return;
    const current = target;
    setTarget(null);
    setNotice(null);
    setFailure(null);
    try {
      await update.mutateAsync({ integrationId: current.integrationId, body: { enabled: true } });
      setNotice(`연동 ${current.integrationId}을 운영 환경에서 활성화했습니다.`);
    } catch (caught) {
      setFailure(describeSystemError(caught, "연동을 활성화하지 못했습니다."));
    }
  }

  return (
    <Card title="운영 환경 연동 활성화">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">
          계약 체결, 동의, 계약·고지 점검, 회사 정보 게시와 수신 시험이 모두 끝난 연동만 활성화할 수
          있습니다. 조건은 서버가 다시 검사하며 활성화한 운영자가 승인자로 남고 처리 내용은 감사
          로그에 기록됩니다.
        </p>
        <ul
          aria-label="운영 환경 연동 현황"
          className="flex flex-wrap gap-4 text-caption text-ink-2"
        >
          <li>이 페이지 연동 {summary.total}건</li>
          <li>활성 {summary.enabled}건</li>
          <li>조건 미충족 {summary.blocked}건</li>
        </ul>
        <SuccessNotice message={notice} />
        <FailureNotice message={failure} />
        <OpsTable
          caption="운영 환경 연동 목록"
          query={query}
          paging={paging}
          getRowId={(row) => String(row.integrationId)}
          emptyMessage="운영 환경에 등록된 연동이 없습니다."
          columns={[
            { key: "id", header: "연동", render: (row) => row.integrationId },
            { key: "provider", header: "공급자", render: (row) => row.provider },
            { key: "function", header: "기능", render: (row) => row.functionCode },
            {
              key: "contract",
              header: "계약",
              render: (row) => <OpsStatusBadge status={row.contractStatus} map={CONTRACT_STATUS} />,
            },
            {
              key: "consent",
              header: "동의",
              render: (row) => <OpsStatusBadge status={row.consentStatus} map={CONSENT_STATUS} />,
            },
            {
              key: "review",
              header: "계약·고지 점검",
              render: (row) =>
                row.contractNoticeReviewedAt
                  ? formatSeoulDateTime(row.contractNoticeReviewedAt)
                  : "점검 전",
            },
            {
              key: "check",
              header: "연결 검사",
              render: (row) => (
                <OpsStatusBadge status={row.lastCheckResult ?? "NOT_TESTED"} map={CHECK_RESULT} />
              ),
            },
            {
              key: "state",
              header: "상태",
              render: (row) => (
                <Badge tone={row.enabled ? "green" : "gray"}>
                  {row.enabled ? "활성" : "비활성"}
                </Badge>
              ),
            },
            {
              key: "approver",
              header: "승인 운영자",
              render: (row) =>
                row.approvedByOperatorId === null ? "승인 전" : row.approvedByOperatorId,
            },
            {
              key: "action",
              header: "활성화",
              render: (row) => {
                if (row.enabled) return "-";
                const missing = missingLaunchItems(row, companyMissingItems);
                if (missing.length > 0) {
                  return (
                    <span className="text-caption text-ink-2">
                      남은 조건: {prerequisiteLabels(missing).join(", ")}
                    </span>
                  );
                }
                return (
                  <Button
                    size="sm"
                    variant="outlined"
                    aria-label={`연동 ${row.integrationId} 활성화`}
                    onClick={() => setTarget(row)}
                  >
                    활성화
                  </Button>
                );
              },
            },
          ]}
        />
        <p className="text-caption text-ink-2">
          계약 상태, 동의 상태, 계약·고지 점검은{" "}
          <Link href="/ops/integrations" className="text-primary underline">
            연동 설정
          </Link>
          에서 바꿉니다.
        </p>
      </div>
      <ConfirmDialog
        isOpen={target !== null}
        title="운영 환경에서 활성화할까요?"
        message={
          target
            ? `연동 ${target.integrationId}(${target.provider}, ${target.functionCode})을 운영 환경에서 활성화합니다. 활성화 뒤에는 실제 고객 요청이 이 공급자로 전달됩니다.`
            : ""
        }
        confirmLabel="활성화"
        isPending={update.isPending}
        onConfirm={() => void activate()}
        onCancel={() => setTarget(null)}
      />
    </Card>
  );
}

export function LaunchScreen() {
  const query = useCompanyInfo();
  return (
    <OpsScreen
      title="출시 활성화"
      description="회사 정보 준비 상태를 확인하고 운영 환경 연동을 활성화합니다."
      roles={["OPS"]}
    >
      <QueryGate query={query} loadingLabel="출시 준비 상태를 불러오는 중입니다">
        {(data) => (
          <>
            <ReadinessCard launchReady={data.launchReady} missingItems={data.missingItems} />
            <ActivationCard companyMissingItems={data.missingItems} />
          </>
        )}
      </QueryGate>
    </OpsScreen>
  );
}
